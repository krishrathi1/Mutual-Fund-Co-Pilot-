import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Category-based max drawdown estimates (as decimal percentages)
const MAX_DRAWDOWN_BY_CATEGORY: Record<string, { low: number; high: number }> = {
  Equity: { low: 0.25, high: 0.35 },
  ELSS: { low: 0.25, high: 0.35 },
  Index: { low: 0.25, high: 0.35 },
  Hybrid: { low: 0.15, high: 0.20 },
  Debt: { low: 0.05, high: 0.10 },
}

function getMaxDrawdownEstimate(category: string, sharpeRatio: number | null): number {
  const range = MAX_DRAWDOWN_BY_CATEGORY[category] || MAX_DRAWDOWN_BY_CATEGORY['Equity']
  // Adjust within range based on Sharpe ratio: higher Sharpe → lower drawdown
  if (sharpeRatio !== null && sharpeRatio > 0) {
    // Sharpe > 2 → lower end of range, Sharpe < 0.5 → higher end
    const factor = Math.max(0, Math.min(1, (2 - sharpeRatio) / 1.5))
    return range.low + factor * (range.high - range.low)
  }
  // Default: midpoint
  return (range.low + range.high) / 2
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fundId } = body

    if (!fundId) {
      return NextResponse.json(
        { error: 'fundId is required' },
        { status: 400 }
      )
    }

    const fund = await db.fund.findUnique({
      where: { id: fundId },
    })

    if (!fund) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      )
    }

    // Get the 1-year return and Sharpe for calculations
    const directReturn1y = fund.directReturn1y ?? 0
    const sharpeRatio = fund.directSharpe1y
    const trackingErrorBps = fund.trackingErrorBps ?? 0

    // Annualized volatility estimate
    // If Sharpe = return / volatility, then vol ≈ return / Sharpe
    let annualizedVolatility: number
    if (sharpeRatio !== null && sharpeRatio > 0.1) {
      // Sharpe ratio = (return - riskFreeRate) / volatility
      // Using risk-free rate ≈ 6% (Indian context)
      const riskFreeRate = 6
      const excessReturn = directReturn1y - riskFreeRate
      annualizedVolatility = excessReturn / sharpeRatio
      // Ensure reasonable bounds (5% to 50%)
      annualizedVolatility = Math.max(5, Math.min(50, annualizedVolatility))
    } else if (trackingErrorBps > 0) {
      // Fallback: use tracking error as a proxy (tracking error is typically 0.5-3% for index funds)
      const tePct = trackingErrorBps / 100
      // For index funds, total vol ≈ benchmark vol + tracking error
      // Benchmark vol estimate by category
      const benchVol: Record<string, number> = {
        Equity: 18, ELSS: 18, Index: 17, Hybrid: 10, Debt: 5,
      }
      annualizedVolatility = (benchVol[fund.category] || 15) + tePct
    } else {
      // Final fallback: category-based estimate
      const catVol: Record<string, number> = {
        Equity: 20, ELSS: 20, Index: 18, Hybrid: 12, Debt: 6,
      }
      annualizedVolatility = catVol[fund.category] || 18
    }

    // Max drawdown estimate
    const maxDrawdown = getMaxDrawdownEstimate(fund.category, sharpeRatio)

    // Downside deviation ≈ 0.7 * total volatility
    const downsideDeviation = 0.7 * annualizedVolatility

    // Sortino ratio = (return - riskFreeRate) / downsideDeviation
    const riskFreeRate = 6
    const sortinoRatio = downsideDeviation > 0
      ? (directReturn1y - riskFreeRate) / downsideDeviation
      : 0

    // Calmar ratio = return / maxDrawdown
    const calmarRatio = maxDrawdown > 0 ? directReturn1y / (maxDrawdown * 100) : 0

    return NextResponse.json({
      fundId: fund.id,
      schemeName: fund.schemeName,
      category: fund.category,
      annualizedVolatility: Math.round(annualizedVolatility * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 10000) / 100, // as percentage (e.g., 30.5 for 30.5%)
      sortinoRatio: Math.round(sortinoRatio * 100) / 100,
      calmarRatio: Math.round(calmarRatio * 100) / 100,
      downsideDeviation: Math.round(downsideDeviation * 100) / 100,
      sharpeRatio: sharpeRatio !== null ? Math.round(sharpeRatio * 100) / 100 : null,
    })
  } catch (error) {
    console.error('Error calculating volatility metrics:', error)
    return NextResponse.json(
      { error: 'Failed to calculate volatility metrics' },
      { status: 500 }
    )
  }
}
