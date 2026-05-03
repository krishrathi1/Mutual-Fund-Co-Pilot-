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
// We convert to bps for the expenseDiff field (e.g., 0.83% → 83 bps)

function calculateLifetimeSavings(
  directExpensePct: number,
  regularExpensePct: number,
  expectedReturn: number
): Record<string, Record<string, number>> {
  const amounts = ['100000', '500000', '1000000', '5000000', '10000000'] // 1L, 5L, 10L, 50L, 1Cr
  const years = ['3', '5', '10', '15', '20', '30']

  const result: Record<string, Record<string, number>> = {}

  for (const amount of amounts) {
    result[amount] = {}
    const pv = parseFloat(amount)

    for (const year of years) {
      const n = parseInt(year)
      const directRate = (expectedReturn - directExpensePct) / 100
      const regularRate = (expectedReturn - regularExpensePct) / 100

      const directFV = pv * Math.pow(1 + directRate, n)
      const regularFV = pv * Math.pow(1 + regularRate, n)

      result[amount][year] = Math.round(directFV - regularFV)
    }
  }

  return result
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids') || ''

    if (!idsParam) {
      return NextResponse.json(
        { error: 'Please provide fund IDs via the ids query parameter' },
        { status: 400 }
      )
    }

    const ids = idsParam.split(',').filter(Boolean)

    if (ids.length === 0 || ids.length > 10) {
      return NextResponse.json(
        { error: 'Please provide 1-10 fund IDs' },
        { status: 400 }
      )
    }

    const funds = await db.fund.findMany({
      where: { id: { in: ids } },
    })

    if (funds.length === 0) {
      return NextResponse.json(
        { error: 'No funds found with the provided IDs' },
        { status: 404 }
      )
    }

    const comparisons = funds.map((fund) => {
      // Expense diff in bps: convert percentage diff to basis points
      const expenseDiffPct = fund.regularExpenseRatio - fund.directExpenseRatio
      const expenseDiffBps = Math.round(expenseDiffPct * 100)

      const returnDiff1y = (fund.directReturn1y ?? 0) - (fund.regularReturn1y ?? 0)
      const returnDiff3y = (fund.directReturn3y ?? 0) - (fund.regularReturn3y ?? 0)
      const returnDiff5y = (fund.directReturn5y ?? 0) - (fund.regularReturn5y ?? 0)

      const expectedReturn = getExpectedReturn(fund.category)
      const lifetimeSavings = calculateLifetimeSavings(
        fund.directExpenseRatio,
        fund.regularExpenseRatio,
        expectedReturn
      )

      const riskAdjustedReturnDelta =
        (fund.directSharpe1y ?? 0) - (fund.regularSharpe1y ?? 0)

      return {
        fundId: fund.id,
        schemeName: fund.schemeName,
        fundHouse: fund.fundHouse,
        category: fund.category,
        subCategory: fund.subCategory,
        direct: {
          nav: fund.directNav,
          expenseRatio: fund.directExpenseRatio,
          return1y: fund.directReturn1y,
          return3y: fund.directReturn3y,
          return5y: fund.directReturn5y,
          isin: fund.directIsin,
          sharpe1y: fund.directSharpe1y,
          sharpe3y: fund.directSharpe3y,
        },
        regular: {
          nav: fund.regularNav,
          expenseRatio: fund.regularExpenseRatio,
          return1y: fund.regularReturn1y,
          return3y: fund.regularReturn3y,
          return5y: fund.regularReturn5y,
          isin: fund.regularIsin,
          sharpe1y: fund.regularSharpe1y,
          sharpe3y: fund.regularSharpe3y,
        },
        expenseDiff: expenseDiffBps, // in bps
        trackingErrorBps: fund.trackingErrorBps,
        benchmarkReturns: {
          return1y: fund.benchmarkReturn1y,
          return3y: fund.benchmarkReturn3y,
          return5y: fund.benchmarkReturn5y,
        },
        returnDiff1y: Math.round(returnDiff1y * 100) / 100,
        returnDiff3y: Math.round(returnDiff3y * 100) / 100,
        returnDiff5y: Math.round(returnDiff5y * 100) / 100,
        riskAdjustedReturnDelta: Math.round(riskAdjustedReturnDelta * 100) / 100,
        lifetimeSavings,
        // Extra fields for advanced visualizations
        equityPercentage: fund.equityPercentage,
        debtPercentage: fund.debtPercentage,
        riskometer: fund.riskometer,
        aumCrore: fund.aumCrore,
      }
    })

    return NextResponse.json(comparisons)
  } catch (error) {
    console.error('Error comparing funds:', error)
    return NextResponse.json(
      { error: 'Failed to compare funds' },
      { status: 500 }
    )
  }
}
