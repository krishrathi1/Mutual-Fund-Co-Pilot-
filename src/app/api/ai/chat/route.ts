import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'

// AI Co-pilot Chat - Multi-turn conversation about mutual funds with basic RAG

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ConversationHistory {
  messages: ChatMessage[]
  lastActivity: number
}

// In-memory conversation store (sessionId -> history)
const conversationStore = new Map<string, ConversationHistory>()
const MAX_MESSAGES = 20
const CONVERSATION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

// Clean up old conversations periodically
function cleanupOldConversations() {
  const now = Date.now()
  for (const [sessionId, history] of conversationStore.entries()) {
    if (now - history.lastActivity > CONVERSATION_TTL_MS) {
      conversationStore.delete(sessionId)
    }
  }
}

const SYSTEM_PROMPT = `You are an expert Indian mutual fund advisor built into FundVista, a SEBI-compliant mutual fund analysis platform. Your role is to help Indian retail investors make informed decisions about mutual fund investments.

Rules you must always follow (Compliance & Quality):
1. **Vernacular Match**: Respond in the SAME LANGUAGE as the user. If they code-mix (e.g., Hinglish like "mujhe Large Cap funds ke baare mein batao"), match that register exactly.
2. **NEVER recommend a specific fund** as "best" or "should buy". Instead, describe trade-offs, category fits, and criteria.
3. **Budget 2024 Tax Rules**: Always use current rules (Equity STCG 20%, LTCG 12.5% > ₹1.25L; Debt at slab).
4. **Disclosures**: Always mention that mutual fund investments are subject to market risks.
5. **Direct vs Regular**: Explain the 0.5%–1.5% compounding advantage of Direct plans clearly.
6. **Data-Driven**: Use the [FUND DATA CONTEXT] provided below to give precise, cited answers. If a fund's data is in context, cite it like [Source: FundVista Database].
7. **No Hallucinations**: If you don't have specific data for a fund not in context, say "I don't have the live data for this fund in my database right now, but I can tell you about the category."
8. **No PII**: Never ask for or store full PAN, Aadhaar, or bank details.

Key Knowledge Areas:
- Direct vs Regular plan optimization (The core value prop)
- Tax implications (STCG/LTCG/Budget 2024)
- Portfolio construction & Risk profiling
- Exit loads & Break-even analysis

Tone: Professional, honest, and helpful. Avoid pressure language.`

async function getRetrievedData(message: string) {
  const lowerMsg = message.toLowerCase()
  
  // Basic keyword extraction for fund search
  const keywords = lowerMsg.split(' ').filter(w => w.length > 3 && !['what', 'how', 'tell', 'about', 'fund', 'mutual', 'mein', 'batao', 'kaise'].includes(w))
  
  if (keywords.length === 0) return null

  try {
    // Search for funds matching keywords
    const funds = await db.fund.findMany({
      where: {
        OR: [
          { schemeName: { contains: keywords[0] } },
          { fundHouse: { contains: keywords[0] } },
          { category: { contains: keywords[0] } }
        ]
      },
      take: 5
    })

    if (funds.length === 0) return null

    const context = funds.map(f => `
Fund: ${f.schemeName}
Category: ${f.category} (${f.subCategory})
Direct Expense: ${f.directExpenseRatio}% | Regular Expense: ${f.regularExpenseRatio}%
1Y Return: ${f.directReturn1y}% | 3Y Return: ${f.directReturn3y}% | 5Y Return: ${f.directReturn5y}%
AUM: ₹${f.aumCrore} Crore
Risk: ${f.riskometer}
`).join('\n---\n')

    return `\n\n[FUND DATA CONTEXT]\n${context}\n[/FUND DATA CONTEXT]`
  } catch (err) {
    console.error('Retrieval error:', err)
    return null
  }
}

function generateFallbackResponse(message: string): string {
  const lowerMsg = message.toLowerCase()

  // Support for Hinglish in fallback detection
  const isDirectReq = lowerMsg.includes('direct') || lowerMsg.includes('regular') || lowerMsg.includes('switch')
  const isTaxReq = lowerMsg.includes('tax') || lowerMsg.includes('stcg') || lowerMsg.includes('ltcg') || lowerMsg.includes('income')
  const isSipReq = lowerMsg.includes('sip') || lowerMsg.includes('systematic') || lowerMsg.includes('investment')
  
  if (isDirectReq) {
    return `Direct plans have lower expense ratios (typically 0.5%–1% lower) than Regular plans because they don't include distributor commissions. Over 20 years, this small difference can increase your wealth by 20-30% due to compounding. On a ₹10L investment, switching could save you ₹6-8L. The underlying stocks are exactly the same. Use our Switch Guide to check exit loads before moving. *Mutual fund investments are subject to market risks.*`
  }

  if (isTaxReq) {
    return `As per Budget 2024: Equity mutual funds (held > 1 year) are taxed at 12.5% for gains above ₹1.25L. STCG (held < 1 year) is 20%. Debt funds are taxed at your income slab rate. Always consult a tax professional for specific filing. *Mutual fund investments are subject to market risks.*`
  }

  if (isSipReq) {
    return `SIP (Systematic Investment Plan) uses Rupee Cost Averaging to lower your average purchase price over time. It's generally safer than Lumpsum for retail investors as it removes the need to "time the market." You can start with as little as ₹500 in many funds. *Mutual fund investments are subject to market risks.*`
  }

  return `I'm your FundVista AI Co-pilot! I can help you with:
- **Direct vs Regular**: Seeing how much hidden commission you're paying.
- **Tax Rules**: Understanding the new Budget 2024 STCG/LTCG rates.
- **Fund Analysis**: Breaking down risk, expense ratios, and performance.
- **Switching**: Guiding you through exit loads and taxes.

Aap mujhse kuch bhi pooch sakte hain, jaise "What are the tax rules for equity funds?" ya "Should I switch to direct plans?"`
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
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, message' },
        { status: 400 }
      )
    }

    cleanupOldConversations()

    // Get retrieved data (RAG)
    const retrievedContext = await getRetrievedData(message)
    const dynamicSystemPrompt = SYSTEM_PROMPT + (retrievedContext || '')

    // Get or create conversation history
    let conversation = conversationStore.get(sessionId)
    if (!conversation) {
      conversation = {
        messages: [{ role: 'system', content: dynamicSystemPrompt }],
        lastActivity: Date.now(),
      }
      conversationStore.set(sessionId, conversation)
    } else {
      // Update system prompt with fresh context
      conversation.messages[0] = { role: 'system', content: dynamicSystemPrompt }
    }

    // If history is provided, update
    if (history && Array.isArray(history) && history.length > 0) {
      conversation.messages = [
        { role: 'system', content: dynamicSystemPrompt },
        ...history.slice(-(MAX_MESSAGES - 1)),
      ]
    }

    // Add user message
    conversation.messages.push({ role: 'user', content: message })
    conversation.lastActivity = Date.now()

    // Trim
    if (conversation.messages.length > MAX_MESSAGES + 1) {
      conversation.messages = [
        conversation.messages[0],
        ...conversation.messages.slice(-(MAX_MESSAGES)),
      ]
    }

    let response: string
    try {
      const zai = await ZAI.create()
      const llmResponse = await zai.chat.completions.create({
        messages: conversation.messages,
        stream: false,
      })

      const assistantMessage = llmResponse?.choices?.[0]?.message?.content?.trim()

      if (assistantMessage) {
        response = assistantMessage
        conversation.messages.push({ role: 'assistant', content: response })
        conversation.lastActivity = Date.now()
      } else {
        response = generateFallbackResponse(message)
      }
    } catch (llmError) {
      console.error('LLM call failed, using fallback:', llmError)
      response = generateFallbackResponse(message)
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    return NextResponse.json({
      response,
      messageId,
    })
  } catch (error) {
    console.error('Error in AI chat:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}
