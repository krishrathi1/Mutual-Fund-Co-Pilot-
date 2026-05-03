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
    const {
      fundId,
      investedAmount,
      years,
      directExpenseRatio,
      regularExpenseRatio,
      expectedReturn,
      mode,
      monthlySip,
    } = body

    const calculationMode = mode === 'sip' ? 'sip' : 'lumpsum'

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

    // SIP mode validation
    if (calculationMode === 'sip') {
      if (monthlySip == null || monthlySip <= 0) {
        return NextResponse.json(
          { error: 'monthlySip must be a positive number for SIP mode' },
          { status: 400 }
        )
      }
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

    if (calculationMode === 'sip') {
      // SIP mode: Future Value of Annuity
      // FV = P * [((1+r)^n - 1) / r] * (1+r)
      // where P = monthly SIP amount, r = monthly rate, n = number of months
      const P = monthlySip
      const n = years * 12
      const directMonthlyRate = directRate / 12
      const regularMonthlyRate = regularRate / 12

      let directValue: number
      let regularValue: number

      if (directMonthlyRate === 0) {
        directValue = P * n
      } else {
        directValue = P * ((Math.pow(1 + directMonthlyRate, n) - 1) / directMonthlyRate) * (1 + directMonthlyRate)
      }

      if (regularMonthlyRate === 0) {
        regularValue = P * n
      } else {
        regularValue = P * ((Math.pow(1 + regularMonthlyRate, n) - 1) / regularMonthlyRate) * (1 + regularMonthlyRate)
      }

      const savings = directValue - regularValue
      const savingsPct = regularValue > 0 ? (savings / regularValue) * 100 : 0

      // Yearly breakdown for SIP
      const yearlyBreakdown: { year: number; directValue: number; regularValue: number; savings: number; cumulativeSavings: number }[] = []
      let cumulativeSavings = 0
      for (let year = 1; year <= years; year++) {
        const monthsSoFar = year * 12

        let dvYear: number
        let rvYear: number

        if (directMonthlyRate === 0) {
          dvYear = P * monthsSoFar
        } else {
          dvYear = P * ((Math.pow(1 + directMonthlyRate, monthsSoFar) - 1) / directMonthlyRate) * (1 + directMonthlyRate)
        }

        if (regularMonthlyRate === 0) {
          rvYear = P * monthsSoFar
        } else {
          rvYear = P * ((Math.pow(1 + regularMonthlyRate, monthsSoFar) - 1) / regularMonthlyRate) * (1 + regularMonthlyRate)
        }

        const yearSavings = dvYear - rvYear
        cumulativeSavings = yearSavings

        yearlyBreakdown.push({
          year,
          directValue: Math.round(dvYear),
          regularValue: Math.round(rvYear),
          savings: Math.round(yearSavings),
          cumulativeSavings: Math.round(cumulativeSavings),
        })
      }

      return NextResponse.json({
        mode: 'sip',
        monthlySip: P,
        totalInvested: P * n,
        directValue: Math.round(directValue),
        regularValue: Math.round(regularValue),
        savings: Math.round(savings),
        savingsPct: Math.round(savingsPct * 100) / 100,
        yearlyBreakdown,
      })
    } else {
      // Lumpsum mode (default, backward compatible)
      const directValue = investedAmount * Math.pow(1 + directRate, years)
      const regularValue = investedAmount * Math.pow(1 + regularRate, years)
      const savings = directValue - regularValue
      const savingsPct = regularValue > 0 ? (savings / regularValue) * 100 : 0

      // Yearly breakdown
      const yearlyBreakdown: { year: number; directValue: number; regularValue: number; savings: number; cumulativeSavings: number }[] = []
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
        mode: 'lumpsum',
        directValue: Math.round(directValue),
        regularValue: Math.round(regularValue),
        savings: Math.round(savings),
        savingsPct: Math.round(savingsPct * 100) / 100,
        yearlyBreakdown,
      })
    }
  } catch (error) {
    console.error('Error calculating savings:', error)
    return NextResponse.json(
      { error: 'Failed to calculate savings' },
      { status: 500 }
    )
  }
}
