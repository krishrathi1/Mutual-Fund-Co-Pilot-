import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEFAULT_TARGET = { equity: 55, debt: 25, hybrid: 20 }

function normalizeCategory(category: string): 'equity' | 'debt' | 'hybrid' {
  const cat = category.toLowerCase()
  if (cat === 'equity' || cat === 'elss' || cat === 'index') return 'equity'
  if (cat === 'debt') return 'debt'
  return 'hybrid'
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, targetAllocation } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const target = targetAllocation || DEFAULT_TARGET

    // Validate target allocation sums to ~100
    const targetTotal = (target.equity || 0) + (target.debt || 0) + (target.hybrid || 0)
    if (Math.abs(targetTotal - 100) > 5) {
      return NextResponse.json(
        { error: `Target allocation should sum to ~100%, got ${targetTotal}%` },
        { status: 400 }
      )
    }

    const holdings = await db.holding.findMany({
      where: { sessionId },
      include: {
        fund: {
          select: {
            schemeName: true,
            category: true,
          },
        },
      },
    })

    if (holdings.length === 0) {
      return NextResponse.json(
        { error: 'No holdings found for this session' },
        { status: 404 }
      )
    }

    const totalPortfolio = holdings.reduce((sum, h) => sum + h.currentAmount, 0)

    // Compute current allocation by category
    const categoryAmounts: Record<string, number> = { equity: 0, debt: 0, hybrid: 0 }
    for (const holding of holdings) {
      const cat = normalizeCategory(holding.fund.category)
      categoryAmounts[cat] += holding.currentAmount
    }

    const currentAllocation = [
      { category: 'equity', amount: categoryAmounts.equity, pct: totalPortfolio > 0 ? Math.round((categoryAmounts.equity / totalPortfolio) * 10000) / 100 : 0 },
      { category: 'debt', amount: categoryAmounts.debt, pct: totalPortfolio > 0 ? Math.round((categoryAmounts.debt / totalPortfolio) * 10000) / 100 : 0 },
      { category: 'hybrid', amount: categoryAmounts.hybrid, pct: totalPortfolio > 0 ? Math.round((categoryAmounts.hybrid / totalPortfolio) * 10000) / 100 : 0 },
    ]

    // Calculate drift and suggestions
    const drift = [
      {
        category: 'equity',
        currentPct: currentAllocation[0].pct,
        targetPct: target.equity,
        driftPct: Math.round((currentAllocation[0].pct - target.equity) * 100) / 100,
        action: currentAllocation[0].pct > target.equity + 5
          ? 'decrease' as const
          : currentAllocation[0].pct < target.equity - 5
            ? 'increase' as const
            : 'hold' as const,
        suggestedAmount: Math.round(Math.abs(((target.equity / 100) * totalPortfolio) - categoryAmounts.equity) * 100) / 100,
      },
      {
        category: 'debt',
        currentPct: currentAllocation[1].pct,
        targetPct: target.debt,
        driftPct: Math.round((currentAllocation[1].pct - target.debt) * 100) / 100,
        action: currentAllocation[1].pct > target.debt + 5
          ? 'decrease' as const
          : currentAllocation[1].pct < target.debt - 5
            ? 'increase' as const
            : 'hold' as const,
        suggestedAmount: Math.round(Math.abs(((target.debt / 100) * totalPortfolio) - categoryAmounts.debt) * 100) / 100,
      },
      {
        category: 'hybrid',
        currentPct: currentAllocation[2].pct,
        targetPct: target.hybrid,
        driftPct: Math.round((currentAllocation[2].pct - target.hybrid) * 100) / 100,
        action: currentAllocation[2].pct > target.hybrid + 5
          ? 'decrease' as const
          : currentAllocation[2].pct < target.hybrid - 5
            ? 'increase' as const
            : 'hold' as const,
        suggestedAmount: Math.round(Math.abs(((target.hybrid / 100) * totalPortfolio) - categoryAmounts.hybrid) * 100) / 100,
      },
    ]

    return NextResponse.json({
      currentAllocation,
      targetAllocation: target,
      drift,
      totalPortfolio: Math.round(totalPortfolio * 100) / 100,
    })
  } catch (error) {
    console.error('Error calculating rebalancing:', error)
    return NextResponse.json(
      { error: 'Failed to calculate rebalancing suggestions' },
      { status: 500 }
    )
  }
}
