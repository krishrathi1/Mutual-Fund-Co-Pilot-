import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ALLOCATIONS: Record<string, { equity: number; debt: number; gold: number; international: number }> = {
  conservative: { equity: 25, debt: 50, gold: 10, international: 15 },
  moderate: { equity: 50, debt: 25, gold: 10, international: 15 },
  aggressive: { equity: 70, debt: 10, gold: 8, international: 12 },
  veryAggressive: { equity: 85, debt: 5, gold: 5, international: 5 },
}

export async function POST(request: NextRequest) {
  try {
    const { riskProfile = 'moderate', investmentAmount = 100000, years = 10 } = await request.json()

    const alloc = ALLOCATIONS[riskProfile] || ALLOCATIONS.moderate

    // Find suitable funds for each asset class
    const equityFunds = await db.fund.findMany({
      where: { category: 'Equity', subCategory: { in: ['Large Cap', 'Flexi Cap', 'Mid Cap'] } },
      orderBy: { directReturn3y: 'desc' }, take: 3,
      select: { id: true, schemeName: true, directReturn3y: true, directExpenseRatio: true, aumCrore: true, riskometer: true }
    })
    const debtFunds = await db.fund.findMany({
      where: { category: 'Debt' },
      orderBy: { aumCrore: 'desc' }, take: 2,
      select: { id: true, schemeName: true, directReturn3y: true, directExpenseRatio: true, aumCrore: true, riskometer: true }
    })
    const hybridFunds = await db.fund.findMany({
      where: { category: 'Hybrid' },
      orderBy: { aumCrore: 'desc' }, take: 2,
      select: { id: true, schemeName: true, directReturn3y: true, directExpenseRatio: true, aumCrore: true, riskometer: true }
    })

    const equityExpectedReturn = 12
    const debtExpectedReturn = 7
    const goldExpectedReturn = 8
    const intlExpectedReturn = 10

    const weightedReturn = (alloc.equity * equityExpectedReturn + alloc.debt * debtExpectedReturn + alloc.gold * goldExpectedReturn + alloc.international * intlExpectedReturn) / 100

    const projectedValue = investmentAmount * Math.pow(1 + weightedReturn / 100, years)
    const projectedGain = projectedValue - investmentAmount

    return NextResponse.json({
      riskProfile,
      allocation: alloc,
      investmentAmount,
      years,
      expectedReturn: Math.round(weightedReturn * 100) / 100,
      projectedValue: Math.round(projectedValue),
      projectedGain: Math.round(projectedGain),
      fundSuggestions: {
        equity: equityFunds.map(f => ({ ...f, allocationPct: Math.round(alloc.equity / equityFunds.length) })),
        debt: debtFunds.map(f => ({ ...f, allocationPct: Math.round(alloc.debt / debtFunds.length) })),
        hybrid: hybridFunds.map(f => ({ ...f, allocationPct: Math.round(alloc.gold / hybridFunds.length) })),
      },
      riskReturnProfile: {
        expectedAnnualReturn: `${weightedReturn.toFixed(1)}%`,
        riskLevel: riskProfile === 'conservative' ? 'Low' : riskProfile === 'moderate' ? 'Medium' : 'High',
        maxDrawdownEstimate: riskProfile === 'conservative' ? '-8%' : riskProfile === 'moderate' ? '-20%' : '-35%',
      }
    })
  } catch (error) {
    console.error('Asset allocation error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
