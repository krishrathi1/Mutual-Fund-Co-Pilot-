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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sourceFundId, targetFundId, lumpsumAmount, monthlyTransfer, years, sourceReturn, targetReturn } = body

    // Validate required fields
    if (!sourceFundId || !targetFundId) {
      return NextResponse.json(
        { error: 'sourceFundId and targetFundId are required' },
        { status: 400 }
      )
    }

    if (!lumpsumAmount || lumpsumAmount <= 0) {
      return NextResponse.json(
        { error: 'lumpsumAmount must be a positive number' },
        { status: 400 }
      )
    }

    if (!monthlyTransfer || monthlyTransfer <= 0) {
      return NextResponse.json(
        { error: 'monthlyTransfer must be a positive number' },
        { status: 400 }
      )
    }

    if (!years || years <= 0) {
      return NextResponse.json(
        { error: 'years must be a positive number' },
        { status: 400 }
      )
    }

    // Fetch fund details
    const [sourceFund, targetFund] = await Promise.all([
      db.fund.findUnique({ where: { id: sourceFundId } }),
      db.fund.findUnique({ where: { id: targetFundId } }),
    ])

    if (!sourceFund) {
      return NextResponse.json(
        { error: 'Source fund not found' },
        { status: 404 }
      )
    }

    if (!targetFund) {
      return NextResponse.json(
        { error: 'Target fund not found' },
        { status: 404 }
      )
    }

    const sourceCategoryReturn = getExpectedReturn(sourceFund.category)
    const targetCategoryReturn = getExpectedReturn(targetFund.category)
    const sourceAnnualReturn = (sourceReturn != null ? sourceReturn : sourceCategoryReturn) / 100
    const targetAnnualReturn = (targetReturn != null ? targetReturn : targetCategoryReturn) / 100
    const sourceMonthlyRate = sourceAnnualReturn / 12
    const targetMonthlyRate = targetAnnualReturn / 12
    const totalMonths = years * 12

    let sourceFundValue = lumpsumAmount
    let targetFundValue = 0
    let totalTransferred = 0
    let totalInvested = lumpsumAmount

    const yearlyBreakdown: {
      year: number
      sourceFundValue: number
      targetFundValue: number
      transferred: number
      sourceReturn: number
      targetReturn: number
    }[] = []

    let yearTransferred = 0
    let yearSourceReturn = 0
    let yearTargetReturn = 0

    for (let month = 1; month <= totalMonths; month++) {
      // Mark year boundary
      if ((month - 1) % 12 === 0) {
        yearTransferred = 0
        yearSourceReturn = 0
        yearTargetReturn = 0
      }

      // Calculate returns
      const sourceMonthReturn = sourceFundValue * sourceMonthlyRate
      const targetMonthReturn = targetFundValue * targetMonthlyRate

      yearSourceReturn += sourceMonthReturn
      yearTargetReturn += targetMonthReturn

      // Apply returns
      sourceFundValue += sourceMonthReturn
      targetFundValue += targetMonthReturn

      // Transfer from source to target
      const transferAmount = Math.min(monthlyTransfer, sourceFundValue)
      sourceFundValue -= transferAmount
      targetFundValue += transferAmount
      totalTransferred += transferAmount
      yearTransferred += transferAmount

      // End of year: record breakdown
      if (month % 12 === 0) {
        yearlyBreakdown.push({
          year: month / 12,
          sourceFundValue: Math.round(sourceFundValue * 100) / 100,
          targetFundValue: Math.round(targetFundValue * 100) / 100,
          transferred: Math.round(yearTransferred * 100) / 100,
          sourceReturn: Math.round(yearSourceReturn * 100) / 100,
          targetReturn: Math.round(yearTargetReturn * 100) / 100,
        })
      }
    }

    const sourceFundFinalValue = sourceFundValue
    const targetFundFinalValue = targetFundValue
    const totalReturns = (sourceFundFinalValue + targetFundFinalValue) - totalInvested

    return NextResponse.json({
      totalInvested: Math.round(totalInvested * 100) / 100,
      sourceFundFinalValue: Math.round(sourceFundFinalValue * 100) / 100,
      targetFundFinalValue: Math.round(targetFundFinalValue * 100) / 100,
      totalReturns: Math.round(totalReturns * 100) / 100,
      totalTransferred: Math.round(totalTransferred * 100) / 100,
      yearlyBreakdown,
      sourceFund: {
        id: sourceFund.id,
        schemeName: sourceFund.schemeName,
        category: sourceFund.category,
        expectedReturn: sourceReturn != null ? sourceReturn : sourceCategoryReturn,
        categoryReturn: sourceCategoryReturn,
        actualReturn: sourceReturn != null ? sourceReturn : null,
        directNav: sourceFund.directNav,
        regularNav: sourceFund.regularNav,
        directReturn1y: sourceFund.directReturn1y,
        directReturn3y: sourceFund.directReturn3y,
      },
      targetFund: {
        id: targetFund.id,
        schemeName: targetFund.schemeName,
        category: targetFund.category,
        expectedReturn: targetReturn != null ? targetReturn : targetCategoryReturn,
        categoryReturn: targetCategoryReturn,
        actualReturn: targetReturn != null ? targetReturn : null,
        directNav: targetFund.directNav,
        regularNav: targetFund.regularNav,
        directReturn1y: targetFund.directReturn1y,
        directReturn3y: targetFund.directReturn3y,
      },
    })
  } catch (error) {
    console.error('Error calculating STP:', error)
    return NextResponse.json(
      { error: 'Failed to calculate STP schedule' },
      { status: 500 }
    )
  }
}
