import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Expected return defaults by category (annualized %)
const EXPECTED_RETURN_BY_CATEGORY: Record<string, number> = {
  Equity: 12,
  ELSS: 12,
  Index: 11,
  Hybrid: 9,
  Debt: 7,
}

function getExpectedReturn(category: string): number {
  return EXPECTED_RETURN_BY_CATEGORY[category] || 10
}

// Expense ratios in the DB are stored as percentages (e.g., 0.72 = 0.72%)
// If directExpenseRatio/regularExpenseRatio are passed in the request body,
// they should also be in percentage format.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fundId, investedAmount, years, directExpenseRatio, regularExpenseRatio, expectedReturn } = body

    if (investedAmount == null || years == null) {
      return NextResponse.json(
        { error: 'investedAmount and years are required' },
        { status: 400 }
      )
    }

    if (investedAmount <= 0 || years <= 0) {
      return NextResponse.json(
        { error: 'investedAmount and years must be positive' },
        { status: 400 }
      )
    }

    let directExpense = directExpenseRatio
    let regularExpense = regularExpenseRatio
    let expectedReturnRate = expectedReturn

    // If fundId is provided, get expense ratios from the fund
    if (fundId) {
      const fund = await db.fund.findUnique({ where: { id: fundId } })
      if (!fund) {
        return NextResponse.json(
          { error: 'Fund not found' },
          { status: 404 }
        )
      }

      if (directExpense == null) directExpense = fund.directExpenseRatio
      if (regularExpense == null) regularExpense = fund.regularExpenseRatio
      if (expectedReturnRate == null) expectedReturnRate = getExpectedReturn(fund.category)
    }

    // Validate we have expense ratios
    if (directExpense == null || regularExpense == null) {
      return NextResponse.json(
        { error: 'Please provide directExpenseRatio and regularExpenseRatio (or a fundId)' },
        { status: 400 }
      )
    }

    if (expectedReturnRate == null) {
      expectedReturnRate = 10 // Default 10%
    }

    // Expense ratios are in percentage format (e.g., 0.72 = 0.72%)
    // Net return rate = expectedReturn - expenseRatio (both in %)
    const directRate = (expectedReturnRate - directExpense) / 100
    const regularRate = (expectedReturnRate - regularExpense) / 100

    // Calculate future values
    const directValue = investedAmount * Math.pow(1 + directRate, years)
    const regularValue = investedAmount * Math.pow(1 + regularRate, years)
    const savings = directValue - regularValue
    const savingsPct = regularValue > 0 ? (savings / regularValue) * 100 : 0

    // Yearly breakdown
    const yearlyBreakdown = []
    for (let year = 1; year <= years; year++) {
      const dv = investedAmount * Math.pow(1 + directRate, year)
      const rv = investedAmount * Math.pow(1 + regularRate, year)
      yearlyBreakdown.push({
        year,
        directValue: Math.round(dv),
        regularValue: Math.round(rv),
        savings: Math.round(dv - rv),
        cumulativeSavings: Math.round(dv - rv), // Same as savings for lump sum
      })
    }

    return NextResponse.json({
      directValue: Math.round(directValue),
      regularValue: Math.round(regularValue),
      savings: Math.round(savings),
      savingsPct: Math.round(savingsPct * 100) / 100,
      yearlyBreakdown,
    })
  } catch (error) {
    console.error('Error calculating savings:', error)
    return NextResponse.json(
      { error: 'Failed to calculate savings' },
      { status: 500 }
    )
  }
}
