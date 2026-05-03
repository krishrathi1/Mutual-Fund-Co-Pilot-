import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { corpus, monthlyWithdrawal, expectedReturn, years } = body

    // Validate inputs
    if (!corpus || corpus <= 0) {
      return NextResponse.json(
        { error: 'corpus must be a positive number' },
        { status: 400 }
      )
    }

    if (!monthlyWithdrawal || monthlyWithdrawal <= 0) {
      return NextResponse.json(
        { error: 'monthlyWithdrawal must be a positive number' },
        { status: 400 }
      )
    }

    if (!years || years <= 0) {
      return NextResponse.json(
        { error: 'years must be a positive number' },
        { status: 400 }
      )
    }

    const annualReturn = (expectedReturn || 8) / 100
    const monthlyRate = annualReturn / 12
    const totalMonths = years * 12

    let currentBalance = corpus
    let totalWithdrawn = 0
    let totalReturnsEarned = 0
    let depletionYear: number | null = null

    const yearlyBreakdown: {
      year: number
      openingBalance: number
      totalWithdrawn: number
      returnsEarned: number
      closingBalance: number
    }[] = []

    let yearOpening = corpus
    let yearWithdrawn = 0
    let yearReturns = 0

    for (let month = 1; month <= totalMonths; month++) {
      // Mark year boundary
      if ((month - 1) % 12 === 0) {
        yearOpening = currentBalance
        yearWithdrawn = 0
        yearReturns = 0
      }

      // Calculate return before withdrawal
      const monthReturn = currentBalance * monthlyRate
      yearReturns += monthReturn
      totalReturnsEarned += monthReturn

      // Apply return then withdrawal
      currentBalance = currentBalance + monthReturn - monthlyWithdrawal
      yearWithdrawn += monthlyWithdrawal
      totalWithdrawn += monthlyWithdrawal

      // Check if corpus is depleted
      if (currentBalance <= 0) {
        currentBalance = 0
        depletionYear = Math.ceil(month / 12)
        yearlyBreakdown.push({
          year: Math.ceil(month / 12),
          openingBalance: Math.round(yearOpening * 100) / 100,
          totalWithdrawn: Math.round(yearWithdrawn * 100) / 100,
          returnsEarned: Math.round(yearReturns * 100) / 100,
          closingBalance: 0,
        })
        break
      }

      // End of year: record breakdown
      if (month % 12 === 0) {
        yearlyBreakdown.push({
          year: month / 12,
          openingBalance: Math.round(yearOpening * 100) / 100,
          totalWithdrawn: Math.round(yearWithdrawn * 100) / 100,
          returnsEarned: Math.round(yearReturns * 100) / 100,
          closingBalance: Math.round(currentBalance * 100) / 100,
        })
      }
    }

    return NextResponse.json({
      totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
      remainingCorpus: Math.round(currentBalance * 100) / 100,
      returnsEarned: Math.round(totalReturnsEarned * 100) / 100,
      yearlyBreakdown,
      depletionYear,
    })
  } catch (error) {
    console.error('Error calculating SWP:', error)
    return NextResponse.json(
      { error: 'Failed to calculate SWP schedule' },
      { status: 500 }
    )
  }
}
