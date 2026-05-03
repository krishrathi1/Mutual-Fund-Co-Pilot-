import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Seeded pseudo-random for deterministic simulation
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fundId, periods } = body

    if (!fundId) {
      return NextResponse.json(
        { error: 'fundId is required' },
        { status: 400 }
      )
    }

    const requestedPeriods: number[] = periods && Array.isArray(periods) && periods.length > 0
      ? periods.filter((p: number) => [1, 3, 5].includes(p))
      : [1, 3, 5]

    if (requestedPeriods.length === 0) {
      return NextResponse.json(
        { error: 'Valid periods are 1, 3, or 5' },
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

    // Map period to return field
    const getReturnForPeriod = (period: number): { direct: number | null; regular: number | null; benchmark: number | null } => {
      switch (period) {
        case 1:
          return {
            direct: fund.directReturn1y,
            regular: fund.regularReturn1y,
            benchmark: fund.benchmarkReturn1y,
          }
        case 3:
          return {
            direct: fund.directReturn3y,
            regular: fund.regularReturn3y,
            benchmark: fund.benchmarkReturn3y,
          }
        case 5:
          return {
            direct: fund.directReturn5y,
            regular: fund.regularReturn5y,
            benchmark: fund.benchmarkReturn5y,
          }
        default:
          return { direct: null, regular: null, benchmark: null }
      }
    }

    // Variance by category (equity is more volatile, debt is stable)
    const varianceByCategory: Record<string, number> = {
      Equity: 8,
      ELSS: 8,
      Index: 6,
      Hybrid: 5,
      Debt: 2,
    }
    const baseVariance = varianceByCategory[fund.category] || 6

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const rollingReturns = requestedPeriods.map((period) => {
      const returns = getReturnForPeriod(period)
      const directBase = returns.direct ?? 10
      const regularBase = returns.regular ?? 9.5
      const benchmarkBase = returns.benchmark ?? 9.8

      // Generate 12 monthly data points with some variance around the known return
      const data = MONTHS.map((month, idx) => {
        // Use a deterministic seed based on fund + period + month for consistency
        const seed1 = fundId.charCodeAt(0) * 100 + period * 10 + idx
        const seed2 = fundId.charCodeAt(1) * 100 + period * 10 + idx + 50
        const seed3 = fundId.charCodeAt(2) * 100 + period * 10 + idx + 100

        const rand1 = seededRandom(seed1)
        const rand2 = seededRandom(seed2)
        const rand3 = seededRandom(seed3)

        // Variance oscillates across months (simulating market cycles)
        const variance = baseVariance * Math.sin((idx / 12) * Math.PI * 2 + period)

        const directReturn = Math.round((directBase + (rand1 - 0.5) * variance) * 100) / 100
        const regularReturn = Math.round((regularBase + (rand2 - 0.5) * variance) * 100) / 100
        const benchmarkReturn = Math.round((benchmarkBase + (rand3 - 0.5) * variance * 0.8) * 100) / 100

        return {
          month,
          directReturn,
          regularReturn,
          benchmarkReturn,
        }
      })

      return {
        period,
        data,
      }
    })

    return NextResponse.json({
      fundId: fund.id,
      schemeName: fund.schemeName,
      rollingReturns,
    })
  } catch (error) {
    console.error('Error generating rolling returns:', error)
    return NextResponse.json(
      { error: 'Failed to generate rolling returns' },
      { status: 500 }
    )
  }
}
