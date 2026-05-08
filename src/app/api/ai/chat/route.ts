import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { semanticSearchFunds, syncFundsToVectorDB } from '@/lib/vector-db'

// AI Co-pilot Chat - High-Speed Streaming & Semantic RAG

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ConversationHistory {
  messages: ChatMessage[]
  lastActivity: number
}

const conversationStore = new Map<string, ConversationHistory>()
const MAX_MESSAGES = 20
const CONVERSATION_TTL_MS = 24 * 60 * 60 * 1000

function cleanupOldConversations() {
  const now = Date.now()
  for (const [sessionId, history] of conversationStore.entries()) {
    if (now - history.lastActivity > CONVERSATION_TTL_MS) {
      conversationStore.delete(sessionId)
    }
  }
}

const SYSTEM_PROMPT_BASE = `You are "The FundVista Guru"—a sharp, no-nonsense Indian financial mentor. You lead the user to wealth.

PERSONA:
- **Tone**: Authoritative, casual (Hinglish), and deeply helpful. Think of yourself as a "Bade Bhaiya".
- **Inquisitive**: NEVER end a response without a probing follow-up question.
- **Aggressive on Leakage**: Call out Regular plans as a financial emergency.

CORE RULES:
1. Always end with a sharp follow-up question.
2. Use the [USER PORTFOLIO CONTEXT] for personalized auditing.
3. Use [FUND CONTEXT] for precise data-backed comparisons.
4. Budget 2024 Tax: 20% STCG, 12.5% LTCG.

Example: "Tera HDFC Midcap Regular mein hai... brokerage phoonk raha hai. Should we check your exact loss right now?"`

async function getAugmentedContext(message: string, sessionId: string) {
  let context = ''

  // 1. Portfolio Context (Real-time from SQLite)
  try {
    const holdings = await db.holding.findMany({
      where: { sessionId },
      include: { fund: true }
    })

    if (holdings.length > 0) {
      const portfolioSummary = holdings.map(h => {
        const gain = h.currentAmount - h.investedAmount
        const gainPct = (gain / h.investedAmount) * 100
        return `- ${h.fund.schemeName} (${h.planType}): Invested ₹${h.investedAmount.toLocaleString()}, Current ₹${h.currentAmount.toLocaleString()}, Gain: ${gainPct.toFixed(1)}%`
      }).join('\n')
      
      context += `\n\n[USER PORTFOLIO CONTEXT]\n${portfolioSummary}\n[/USER PORTFOLIO CONTEXT]`
    }
  } catch (err) {
    console.error('Portfolio context error:', err)
  }

  // 2. Semantic Search (LanceDB - High Speed Vector RAG)
  try {
    const semanticResults = await semanticSearchFunds(message, 4)
    if (semanticResults.length > 0) {
      const fundData = semanticResults.map(f => `
Fund: ${f.schemeName}
Type: ${f.category} | AUM: ₹${f.aum} Cr | Risk: ${f.risk}
Expense: Direct ${f.directExpense}% vs Regular ${f.regularExpense}%
Returns: 1Y: ${f.return1y}%, 3Y: ${f.return3y}%, 5Y: ${f.return5y}%
`).join('\n---\n')
      
      context += `\n\n[FUND CONTEXT (LanceDB Semantic Search)]\n${fundData}\n[/FUND CONTEXT]`
    }
  } catch (err) {
    console.error('LanceDB RAG error:', err)
  }

  return context
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, message, history } = body as {
      sessionId: string
      message: string
      history?: ChatMessage[]
    }

    if (!sessionId || !message) {
      return NextResponse.json({ error: 'Missing sessionId or message' }, { status: 400 })
    }

    cleanupOldConversations()

    // 1. Semantic RAG
    const augmentedContext = await getAugmentedContext(message, sessionId)
    const dynamicSystemPrompt = SYSTEM_PROMPT_BASE + augmentedContext

    let conversation = conversationStore.get(sessionId)
    if (!conversation) {
      conversation = {
        messages: [{ role: 'system', content: dynamicSystemPrompt }],
        lastActivity: Date.now(),
      }
      conversationStore.set(sessionId, conversation)
    } else {
      conversation.messages[0] = { role: 'system', content: dynamicSystemPrompt }
    }

    if (history && Array.isArray(history) && history.length > 0) {
      conversation.messages = [
        { role: 'system', content: dynamicSystemPrompt },
        ...history.slice(-(MAX_MESSAGES - 1)),
      ]
    }

    conversation.messages.push({ role: 'user', content: message })
    conversation.lastActivity = Date.now()

    // 2. Streaming Response Logic
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Attempt Local Ollama Streaming
          const ollamaRes = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama3.2:latest',
              messages: conversation.messages,
              stream: true,
            }),
          })

          if (ollamaRes.ok && ollamaRes.body) {
            const reader = ollamaRes.body.getReader()
            let fullContent = ''
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              
              const chunk = new TextDecoder().decode(value)
              const jsonChunks = chunk.split('\n').filter(Boolean)
              
              for (const j of jsonChunks) {
                const parsed = JSON.parse(j)
                if (parsed.message?.content) {
                  const text = parsed.message.content
                  fullContent += text
                  controller.enqueue(encoder.encode(JSON.stringify({ content: text })))
                }
              }
            }
            conversation.messages.push({ role: 'assistant', content: fullContent })
          } else {
            // Fallback to ZAI (Non-streaming implementation for simplicity or if ZAI doesn't support easy node stream)
            const zai = await ZAI.create()
            const llmResponse = await zai.chat.completions.create({
              messages: conversation.messages,
              stream: false,
            })
            const text = llmResponse?.choices?.[0]?.message?.content || 'I apologize, bhai, but something went wrong. Ask me again?'
            controller.enqueue(encoder.encode(JSON.stringify({ content: text })))
            conversation.messages.push({ role: 'assistant', content: text })
          }
        } catch (err) {
          console.error('Streaming Error:', err)
          controller.enqueue(encoder.encode(JSON.stringify({ content: 'Bhai, lagta hai system slow ho gaya hai. Try again?' })))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  } catch (error) {
    console.error('Fatal Chat Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
