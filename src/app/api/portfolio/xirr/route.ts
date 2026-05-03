import { NextRequest, NextResponse } from 'next/server'

// XIRR Calculator using Newton-Raphson method
// XIRR = Internal Rate of Return for irregular cash flows

interface XirrHolding {
  investedAmount: number
  currentAmount: number
  purchaseDate: string
  sipAmount?: number
}

interface CashFlow {
  amount: number
  date: Date
}

// Convert annual rate to daily rate factor
function annualToDailyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 365.25)
}

// Compute XNPV (Net Present Value with exact dates)
function xnpv(rate: number, cashFlows: CashFlow[]): number {
  if (rate <= -1) return -Infinity

  const dailyRate = annualToDailyRate(rate) - 1
  const baseDate = cashFlows[0].date

  let npv = 0
  for (const cf of cashFlows) {
    const daysDiff = (cf.date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)
    const discountFactor = Math.pow(1 + dailyRate, daysDiff)
    npv += cf.amount / discountFactor
  }
  return npv
}

// Compute derivative of XNPV with respect to rate
function xnpvDerivative(rate: number, cashFlows: CashFlow[]): number {
  if (rate <= -1) return Infinity

  const dailyRate = annualToDailyRate(rate) - 1
  const baseDate = cashFlows[0].date

  let derivative = 0
  for (const cf of cashFlows) {
    const daysDiff = (cf.date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)
    const discountFactor = Math.pow(1 + dailyRate, daysDiff)
    // d(NPV)/d(rate) using chain rule
    // NPV_i = amount / (1+daily)^days
    // d(NPV_i)/d(daily) = -amount * days / (1+daily)^(days+1)
    // d(daily)/d(annual) = 1/(365.25 * (1+annual)^((365.25-1)/365.25))
    const dDailyDAnnual = (1 / 365.25) * Math.pow(1 + rate, (1 / 365.25) - 1)
    derivative += -cf.amount * daysDiff / Math.pow(1 + dailyRate, daysDiff + 1) * dDailyDAnnual
  }
  return derivative
}

// Newton-Raphson solver for XIRR
function solveXirr(cashFlows: CashFlow[], guess: number = 0.1, maxIter: number = 1000, tolerance: number = 1e-8): number {
  let rate = guess

  for (let i = 0; i < maxIter; i++) {
    const npv = xnpv(rate, cashFlows)
    const deriv = xnpvDerivative(rate, cashFlows)

    if (Math.abs(deriv) < 1e-12) {
      // Derivative too small, try a different guess
      rate = rate + 0.1
      continue
    }

    const newRate = rate - npv / deriv

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate
    }

    rate = newRate

    // Guard against divergence
    if (rate < -0.99 || rate > 100 || isNaN(rate) || !isFinite(rate)) {
      // Reset with a different guess
      rate = 0.05 + (i * 0.1)
      if (rate > 5) return 0 // Give up, return 0
    }
  }

  return rate
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { holdings }: { holdings: XirrHolding[] } = body

    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      return NextResponse.json(
        { error: 'holdings array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Build cash flows
    const cashFlows: CashFlow[] = []
    let totalInvested = 0
    let currentValue = 0

    const today = new Date()

    for (const holding of holdings) {
      const invested = parseFloat(String(holding.investedAmount))
      const current = parseFloat(String(holding.currentAmount))
      const purchaseDate = new Date(holding.purchaseDate)
      const sipAmount = holding.sipAmount ? parseFloat(String(holding.sipAmount)) : null

      totalInvested += invested
      currentValue += current

      if (sipAmount && sipAmount > 0) {
        // SIP mode: Add initial investment as negative cash flow, then monthly SIPs
        cashFlows.push({
          amount: -invested,
          date: purchaseDate,
        })

        // Add monthly SIP cash flows from purchase date to now
        let sipDate = new Date(purchaseDate)
        sipDate.setMonth(sipDate.getMonth() + 1)

        while (sipDate <= today) {
          cashFlows.push({
            amount: -sipAmount,
            date: new Date(sipDate),
          })
          sipDate.setMonth(sipDate.getMonth() + 1)
        }
      } else {
        // Lumpsum mode: Single negative cash flow at purchase
        cashFlows.push({
          amount: -invested,
          date: purchaseDate,
        })
      }
    }

    // Add current value as positive cash flow (redemption value) at today's date
    cashFlows.push({
      amount: currentValue,
      date: today,
    })

    // Sort cash flows by date
    cashFlows.sort((a, b) => a.date.getTime() - b.date.getTime())

    if (cashFlows.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 cash flows to calculate XIRR' },
        { status: 400 }
      )
    }

    // Calculate XIRR using Newton-Raphson
    const xirr = solveXirr(cashFlows)

    // Calculate absolute return
    const absoluteReturn = totalInvested > 0
      ? ((currentValue - totalInvested) / totalInvested) * 100
      : 0

    // Calculate weighted average holding period
    let totalWeightedDays = 0
    let totalWeight = 0
    for (const holding of holdings) {
      const invested = parseFloat(String(holding.investedAmount))
      const purchaseDate = new Date(holding.purchaseDate)
      const days = (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
      totalWeightedDays += days * invested
      totalWeight += invested
    }
    const avgHoldingDays = totalWeight > 0 ? totalWeightedDays / totalWeight : 0

    // Annualized return (simple compound)
    const annualizedReturn = totalInvested > 0 && avgHoldingDays > 365
      ? (Math.pow(currentValue / totalInvested, 365.25 / avgHoldingDays) - 1) * 100
      : absoluteReturn

    return NextResponse.json({
      xirr: Math.round(xirr * 10000) / 100, // as percentage
      annualizedReturn: Math.round(annualizedReturn * 100) / 100,
      totalInvested: Math.round(totalInvested),
      currentValue: Math.round(currentValue),
      absoluteReturn: Math.round(absoluteReturn * 100) / 100,
      cashFlows: cashFlows.map(cf => ({
        amount: Math.round(cf.amount),
        date: cf.date.toISOString().split('T')[0],
      })),
      avgHoldingDays: Math.round(avgHoldingDays),
      avgHoldingYears: Math.round((avgHoldingDays / 365.25) * 100) / 100,
    })
  } catch (error) {
    console.error('Error calculating XIRR:', error)
    return NextResponse.json(
      { error: 'Failed to calculate XIRR' },
      { status: 500 }
    )
  }
}
