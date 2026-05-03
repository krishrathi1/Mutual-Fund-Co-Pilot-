import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

interface InsightsRequest {
  fundName: string
  category: string
  subCategory: string
  directExpenseRatio: number
  regularExpenseRatio: number
  directReturn1y: number
  regularReturn1y: number
  directSharpe1y?: number
  regularSharpe1y?: number
  trackingErrorBps?: number
  benchmarkReturn1y?: number
  aumCrore?: number
  currentAmount?: number
}

function generateFallbackInsight(data: InsightsRequest): string {
  const expenseDiff = data.regularExpenseRatio - data.directExpenseRatio
  const returnDiff = data.directReturn1y - data.regularReturn1y
  const aumStr = data.aumCrore ? `₹${data.aumCrore.toLocaleString('en-IN')} Cr` : 'a substantial'

  let insight = `Switching from Regular to Direct plan of ${data.fundName} saves you ${expenseDiff.toFixed(2)}% in expense ratio annually. `
  insight += `Over time, this translates to ${returnDiff.toFixed(2)}% higher returns (Direct ${data.directReturn1y}% vs Regular ${data.regularReturn1y}% 1Y). `

  if (data.trackingErrorBps != null) {
    insight += `The tracking error between both plans is only ${data.trackingErrorBps} bps, meaning both plans follow nearly identical strategies. `
  }

  if (data.directSharpe1y != null && data.regularSharpe1y != null) {
    const sharpeDiff = data.directSharpe1y - data.regularSharpe1y
    insight += `Direct also delivers better risk-adjusted returns (Sharpe ${data.directSharpe1y.toFixed(2)} vs ${data.regularSharpe1y.toFixed(2)}). `
  }

  insight += `With ${aumStr} AUM, this fund is well-established — the only tradeoff is you won't get distributor advisory, but you keep more of your returns.`

  return insight
}

export async function POST(request: NextRequest) {
  try {
    const body: InsightsRequest = await request.json()
    const {
      fundName,
      category,
      subCategory,
      directExpenseRatio,
      regularExpenseRatio,
      directReturn1y,
      regularReturn1y,
      directSharpe1y,
      regularSharpe1y,
      trackingErrorBps,
      benchmarkReturn1y,
      aumCrore,
      currentAmount,
    } = body

    if (!fundName || directExpenseRatio == null || regularExpenseRatio == null) {
      return NextResponse.json(
        { error: 'fundName, directExpenseRatio, and regularExpenseRatio are required' },
        { status: 400 }
      )
    }

    const expenseDiff = regularExpenseRatio - directExpenseRatio
    const returnDiff = directReturn1y - regularReturn1y
    const aumStr = aumCrore ? `₹${aumCrore.toLocaleString('en-IN')} Cr` : 'N/A'
    const amountStr = currentAmount ? `₹${currentAmount.toLocaleString('en-IN')}` : 'N/A'

    const userPrompt = `Analyze this Indian mutual fund comparison:
Fund: ${fundName}
Category: ${category} - ${subCategory}
Direct Plan: Expense Ratio ${directExpenseRatio}%, 1Y Return ${directReturn1y}%
Regular Plan: Expense Ratio ${regularExpenseRatio}%, 1Y Return ${regularReturn1y}%
Expense Difference: ${expenseDiff.toFixed(2)}% (Direct saves this much)
Return Difference: ${returnDiff.toFixed(2)}% (Direct outperforms by this)
${trackingErrorBps != null ? `Tracking Error: ${trackingErrorBps} bps` : ''}
${directSharpe1y != null ? `Direct Sharpe Ratio (1Y): ${directSharpe1y}` : ''}
${regularSharpe1y != null ? `Regular Sharpe Ratio (1Y): ${regularSharpe1y}` : ''}
${benchmarkReturn1y != null ? `Benchmark 1Y Return: ${benchmarkReturn1y}%` : ''}
AUM: ${aumStr}
Current Investment: ${amountStr}

In 3-4 sentences, explain in plain language why switching from Regular to Direct makes sense for a retail investor. Include any tradeoffs. Use ₹ for amounts.`

    try {
      const zai = await ZAI.create()
      const response = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert Indian mutual fund advisor. Explain fund comparisons in simple, relatable terms for retail investors. Use Indian Rupee (₹) and Indian market context. Be concise but thorough. Highlight the key actionable insight.',
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        stream: false,
      })

      const insights = response?.choices?.[0]?.message?.content?.trim()

      if (insights) {
        return NextResponse.json({ insights })
      }
    } catch (llmError) {
      console.error('LLM call failed, using fallback:', llmError)
    }

    // Fallback: generate locally
    const fallbackInsight = generateFallbackInsight(body)
    return NextResponse.json({ insights: fallbackInsight })
  } catch (error) {
    console.error('Error generating AI insights:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}
