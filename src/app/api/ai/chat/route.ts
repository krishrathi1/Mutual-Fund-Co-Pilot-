import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'

// AI Co-pilot Chat - Multi-turn, Portfolio-Aware RAG Advisor

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

const SYSTEM_PROMPT_BASE = `You are "The FundVista Guru"—a sharp, no-nonsense Indian financial mentor. You don't just answer questions; you lead the user to wealth.

PERSONA:
- **Tone**: Authoritative, casual (use Hinglish), and deeply helpful. Think of yourself as a wise "Bade Bhaiya" who knows exactly where the user is losing money.
- **Inquisitive**: NEVER end a conversation. Always ask a probing follow-up question that makes the user think about their money.
- **Aggressive on Leakage**: If you see Regular plans, treat it like an emergency. "Bhai, you are literally giving away your retirement to brokers."

CORE RULES:
1. **Never End with a Period**: Always end with a sharp, relevant question.
2. **Portfolio-Aware**: Use the [USER PORTFOLIO CONTEXT] to call out specific funds.
3. **Budget 2024 Expert**: Use the new 20%/12.5% tax rates.
4. **No Hallucinations**: If data is missing, admit it and ask the user for it.

Example style: "Tera HDFC Midcap Regular plan mein hai, matlab tu har saal 1% extra brokerage de raha hai. Do you realize that over 20 years, this will cost you more than a luxury car? Chal, should we calculate your exact loss right now?"`

async function getRetrievedContext(message: string, sessionId: string) {
  const lowerMsg = message.toLowerCase()
  let context = ''

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
    console.error('Portfolio fetch error:', err)
  }

  const stopWords = new Set(['what', 'how', 'tell', 'about', 'fund', 'mutual', 'mein', 'batao', 'kaise', 'should', 'best', 'good', 'compare', 'switch'])
  const keywords = lowerMsg.split(/[\s,]+/).filter(w => w.length > 2 && !stopWords.has(w))
  
  if (keywords.length > 0) {
    try {
      const funds = await db.fund.findMany({
        where: {
          OR: keywords.slice(0, 3).map(k => ({
            OR: [
              { schemeName: { contains: k } },
              { fundHouse: { contains: k } },
              { category: { contains: k } },
              { subCategory: { contains: k } }
            ]
          }))
        },
        take: 4
      })

      if (funds.length > 0) {
        const fundData = funds.map(f => `
Fund: ${f.schemeName}
Type: ${f.category} | AUM: ₹${f.aumCrore} Cr | Risk: ${f.riskometer}
Expense: Direct ${f.directExpenseRatio}% vs Regular ${f.regularExpenseRatio}%
Returns: 1Y: ${f.directReturn1y}%, 3Y: ${f.directReturn3y}%, 5Y: ${f.directReturn5y}%
`).join('\n---\n')
        
        context += `\n\n[FUND SEARCH CONTEXT]\n${fundData}\n[/FUND SEARCH CONTEXT]`
      }
    } catch (err) {
      console.error('Fund RAG error:', err)
    }
  }

  return context
}

async function callLocalLlama(messages: ChatMessage[]) {
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:latest',
        messages: messages,
        stream: false,
      }),
    })
    
    if (!response.ok) return null
    const data = await response.json()
    return data.message?.content || null
  } catch (err) {
    return null
  }
}

function generateFallbackResponse(message: string): string {
  const lowerMsg = message.toLowerCase()

  if (lowerMsg.includes('direct') || lowerMsg.includes('regular') || lowerMsg.includes('commission')) {
    return `Regular plans are basically you paying a "brokerage tax" for no reason. Direct plans save you ~1% every year. Think about it, bhai... 1% over 20 years is massive. Shall we check which of your funds are stealing your wealth right now?`
  }

  return `I'm here to help you stop losing money to hidden commissions. I see your portfolio—want to see the breakdown of how much you're losing every month in Regular plans?`
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

    const augmentedContext = await getRetrievedContext(message, sessionId)
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

    let response: string | null = null

    // 1. Try Local Llama 3.2 first
    response = await callLocalLlama(conversation.messages)

    // 2. Fallback to ZAI SDK
    if (!response) {
      try {
        const zai = await ZAI.create()
        const llmResponse = await zai.chat.completions.create({
          messages: conversation.messages,
          stream: false,
        })
        response = llmResponse?.choices?.[0]?.message?.content?.trim() || null
      } catch (llmError) {
        console.error('AI SDK Error:', llmError)
      }
    }

    // 3. Final Fallback
    if (!response) {
      response = generateFallbackResponse(message)
    }

    conversation.messages.push({ role: 'assistant', content: response })
    conversation.lastActivity = Date.now()

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    return NextResponse.json({ response, messageId })
  } catch (error) {
    console.error('Fatal Chat Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
