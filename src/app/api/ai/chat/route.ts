import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

// AI Co-pilot Chat - Multi-turn conversation about mutual funds

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

const SYSTEM_PROMPT = `You are an expert Indian mutual fund advisor built into FundVista, a mutual fund analysis platform. Your role is to help Indian retail investors make informed decisions about mutual fund investments.

Key areas you can help with:
1. **Direct vs Regular plans**: Explain why Direct plans are better for self-directed investors (lower expense ratios, higher returns over time). Provide concrete savings calculations.
2. **Cost analysis**: Help users understand total expense ratios, exit loads, and their long-term impact on returns.
3. **Fund selection**: Guide users on choosing funds based on their risk profile, investment horizon, and financial goals.
4. **Tax implications**: Explain STCG (Short Term Capital Gains) and LTCG (Long Term Capital Gains) tax rules for Indian mutual funds (Budget 2024 rules: Equity STCG 20%, LTCG 12.5% above ₹1.25L exemption; Debt at slab rate).
5. **Portfolio construction**: Help build diversified portfolios across equity, debt, and hybrid categories.
6. **SIP vs Lumpsum**: Discuss the pros and cons of each approach.
7. **Goal-based investing**: Retirement, children's education, house purchase, etc.
8. **Risk assessment**: Explain riskometers, diversification, concentration risk.

Important guidelines:
- Always use Indian Rupee (₹) for amounts
- Reference Indian market context (SEBI, AMFI, Nifty, Sensex)
- Be concise but thorough (2-4 paragraphs typically)
- If asked about specific fund recommendations, suggest categories and criteria rather than specific funds
- Always mention that mutual fund investments are subject to market risks
- For tax questions, remind users to consult a tax professional for their specific situation
- Do not provide specific stock tips or guaranteed return promises
- If the user asks something outside your domain, politely redirect to mutual fund topics

Remember: You're helping real people make financial decisions. Be responsible, clear, and honest about risks.`

function generateFallbackResponse(message: string): string {
  const lowerMsg = message.toLowerCase()

  if (lowerMsg.includes('direct') && lowerMsg.includes('regular')) {
    return `Direct plans have lower expense ratios than Regular plans because they don't include distributor commissions. For example, if a Regular plan charges 1.5% and the Direct plan charges 0.75%, that 0.75% difference compounds significantly over time. On a ₹10 lakh investment over 20 years at 12% returns, switching from Regular to Direct could save you approximately ₹6-8 lakhs. The underlying portfolio is identical — the only difference is the commission. Use FundVista's Savings Calculator to see exact numbers for your holdings.`
  }

  if (lowerMsg.includes('tax') || lowerMsg.includes('stcg') || lowerMsg.includes('ltcg')) {
    return `For Indian mutual funds (Budget 2024 rules): **Equity funds** — STCG (held < 1 year) is taxed at 20% on gains, LTCG (held > 1 year) at 12.5% on gains above ₹1.25 lakh annual exemption. **Debt funds** — All gains (short or long term) are added to your income and taxed at your slab rate (no indexation benefit for purchases after April 2023). **Hybrid funds** with ≥65% equity are taxed like equity funds. Use FundVista's Tax Calculator for precise calculations on your portfolio.`
  }

  if (lowerMsg.includes('sip') || lowerMsg.includes('systematic')) {
    return `SIP (Systematic Investment Plan) is an excellent way to invest in mutual funds. Benefits include: 1) Rupee cost averaging — you buy more units when markets are low and fewer when high, 2) Disciplined investing — automatic monthly investments, 3) No need to time the market, 4) Power of compounding over long periods. For most retail investors, SIP is preferred over lumpsum as it reduces timing risk. FundVista's Savings Calculator can show you projected SIP returns over different time horizons.`
  }

  if (lowerMsg.includes('risk') || lowerMsg.includes('safe')) {
    return `Mutual fund risk varies by category: **Low risk** — Liquid/Overnight funds, **Low to Moderate** — Short Duration Debt funds, **Moderate** — Hybrid/Balanced Advantage funds, **Moderately High** — Large Cap Equity funds, **High** — Mid Cap funds, **Very High** — Small Cap and Sectoral funds. SEBI-mandated riskometers on each fund help you assess risk. Diversification across categories reduces overall portfolio risk. Use FundVista's Portfolio Analyzer to check your risk profile and diversification score.`
  }

  if (lowerMsg.includes('elss') || lowerMsg.includes('tax sav')) {
    return `ELSS (Equity Linked Savings Scheme) funds offer dual benefits: 1) Tax deduction under Section 80C up to ₹1.5 lakh per year, 2) Equity market returns. Key points: 3-year lock-in period (shortest among 80C options), returns are taxed as equity funds (LTCG at 12.5% above ₹1.25L exemption after 3 years), and you can invest via SIP. Popular ELSS categories include tax saver funds from major fund houses. Always choose Direct plans for lower expense ratios.`
  }

  return `I'm here to help with Indian mutual fund questions! I can assist with:
- **Direct vs Regular** plan comparisons and savings calculations
- **Tax implications** (STCG/LTCG rules post Budget 2024)
- **Fund selection** based on your risk profile and goals
- **SIP vs Lumpsum** investment strategies
- **Portfolio diversification** and risk assessment
- **Goal-based investing** (retirement, education, etc.)

Could you share more details about what you'd like to know? For example, "Should I switch from Regular to Direct?" or "How are my equity fund gains taxed?"`
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

    // Clean up old conversations
    cleanupOldConversations()

    // Get or create conversation history
    let conversation = conversationStore.get(sessionId)
    if (!conversation) {
      conversation = {
        messages: [{ role: 'system', content: SYSTEM_PROMPT }],
        lastActivity: Date.now(),
      }
      conversationStore.set(sessionId, conversation)
    }

    // If history is provided, use it to update the conversation
    if (history && Array.isArray(history) && history.length > 0) {
      conversation.messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.slice(-(MAX_MESSAGES - 1)),
      ]
    }

    // Add user message
    conversation.messages.push({ role: 'user', content: message })
    conversation.lastActivity = Date.now()

    // Trim to max messages (keep system prompt)
    if (conversation.messages.length > MAX_MESSAGES + 1) {
      conversation.messages = [
        conversation.messages[0], // Keep system prompt
        ...conversation.messages.slice(-(MAX_MESSAGES)),
      ]
    }

    // Try LLM call
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

        // Add to conversation history
        conversation.messages.push({ role: 'assistant', content: response })
        conversation.lastActivity = Date.now()
      } else {
        response = generateFallbackResponse(message)
      }
    } catch (llmError) {
      console.error('LLM call failed, using fallback:', llmError)
      response = generateFallbackResponse(message)
    }

    // Generate message ID
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
