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


// Robust XIRR solver using Bisection + Newton-Raphson
function solveXirr(cashFlows: CashFlow[]): number {
  if (cashFlows.length < 2) return 0

  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime())
  const d0 = sorted[0].date
  const years = sorted.map(cf => (cf.date.getTime() - d0.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  const amounts = sorted.map(cf => cf.amount)

  const xnpv = (rate: number) => {
    let result = 0
    for (let i = 0; i < amounts.length; i++) {
      result += amounts[i] / Math.pow(1 + rate, years[i])
    }
    return result
  }

  const dxnpv = (rate: number) => {
    let result = 0
    for (let i = 0; i < amounts.length; i++) {
      result -= (years[i] * amounts[i]) / Math.pow(1 + rate, years[i] + 1)
    }
    return result
  }

  // Initial guess
  let rate = 0.1
  
  // Try Newton-Raphson first
  for (let i = 0; i < 50; i++) {
    const val = xnpv(rate)
    const deriv = dxnpv(rate)
    if (Math.abs(deriv) < 1e-12) break
    const nextRate = rate - val / deriv
    if (Math.abs(nextRate - rate) < 1e-8) return nextRate
    rate = nextRate
    if (rate > 100 || rate < -0.99) break // Diverged
  }

  // Fallback to Bisection for robustness
  let low = -0.9999
  let high = 100
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2
    const val = xnpv(mid)
    if (Math.abs(val) < 1e-7) return mid
    if (val > 0) low = mid
    else high = mid
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

    // Calculate XIRR using robust solver
    const xirr = solveXirr(cashFlows)
    
    // Check for extreme values caused by short durations
    const minDate = new Date(Math.min(...cashFlows.map(cf => cf.date.getTime())))
    const maxDate = new Date(Math.max(...cashFlows.map(cf => cf.date.getTime())))
    const diffDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
    
    let adjustedXirr = xirr
    let warning = null
    
    if (diffDays < 30 && xirr > 1) {
      // For very short durations, XIRR is misleading. 
      // Example: 1% in 1 day = 3600% XIRR.
      // We cap it or mark as high volatility
      warning = "Short holding period (< 30 days) makes XIRR unreliable."
    }

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
      xirr: Math.round(adjustedXirr * 10000) / 100, // as percentage
      warning,
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
