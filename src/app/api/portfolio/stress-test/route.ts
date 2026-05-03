import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const STRESS_SCENARIOS = [
  { id: '2008-crisis', name: '2008 Financial Crisis', impact: { equity: -50, debt: 5, hybrid: -25 } },
  { id: 'covid-crash', name: 'COVID-19 Crash', impact: { equity: -35, debt: 2, hybrid: -18 } },
  { id: 'mild-correction', name: 'Mild Correction', impact: { equity: -15, debt: 1, hybrid: -8 } },
  { id: 'rate-hike', name: 'Rate Hike Shock', impact: { equity: -10, debt: -8, hybrid: -6 } },
  { id: 'bull-run', name: 'Bull Run', impact: { equity: 30, debt: 6, hybrid: 18 } },
]

function mapCategory(cat: string): 'equity' | 'debt' | 'hybrid' {
  const lower = cat.toLowerCase()
  if (lower === 'debt') return 'debt'
  if (lower === 'hybrid') return 'hybrid'
  return 'equity'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const holdings = await db.holding.findMany({
      where: { sessionId },
      include: { fund: true },
    })

    if (holdings.length === 0) {
      return NextResponse.json({ results: {} })
    }

    const results: Record<string, {
      scenarioId: string
      totalImpact: number
      totalImpactPct: number
      holdings: {
        name: string
        category: string
        currentValue: number
        impactPct: number
        impactAmount: number
        stressedValue: number
      }[]
    }> = {}

    for (const scenario of STRESS_SCENARIOS) {
      let totalImpact = 0
      let totalCurrent = 0

      const holdingImpacts = holdings.map((h) => {
        const cat = mapCategory(h.fund.category)
        const impactPct = scenario.impact[cat]
        const impactAmount = h.currentAmount * (impactPct / 100)
        const stressedValue = h.currentAmount + impactAmount

        totalImpact += impactAmount
        totalCurrent += h.currentAmount

        return {
          name: h.fund.schemeName,
          category: cat,
          currentValue: h.currentAmount,
          impactPct,
          impactAmount,
          stressedValue,
        }
      })

      results[scenario.id] = {
        scenarioId: scenario.id,
        totalImpact,
        totalImpactPct: totalCurrent > 0 ? (totalImpact / totalCurrent) * 100 : 0,
        holdings: holdingImpacts,
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Stress test error:', error)
    return NextResponse.json({ error: 'Failed to compute stress test' }, { status: 500 })
  }
}
