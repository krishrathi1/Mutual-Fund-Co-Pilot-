import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fundId = searchParams.get('fundId')
    const riskFreeRate = 6.5

    if (fundId) {
      const fund = await db.fund.findUnique({ where: { id: fundId } })
      if (!fund) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const bmReturn1y = fund.benchmarkReturn1y || 0
      const bmReturn3y = fund.benchmarkReturn3y || 0
      const directReturn1y = fund.directReturn1y || 0
      const directReturn3y = fund.directReturn3y || 0

      const beta1y = bmReturn1y !== riskFreeRate ? (directReturn1y - riskFreeRate) / (bmReturn1y - riskFreeRate) : 1
      const beta3y = bmReturn3y !== riskFreeRate ? (directReturn3y - riskFreeRate) / (bmReturn3y - riskFreeRate) : 1
      const alpha1y = directReturn1y - (riskFreeRate + beta1y * (bmReturn1y - riskFreeRate))
      const alpha3y = directReturn3y - (riskFreeRate + beta3y * (bmReturn3y - riskFreeRate))
      const rSquared = fund.trackingErrorBps ? Math.max(0, Math.min(100, 100 - fund.trackingErrorBps * 5)) : 85

      return NextResponse.json({
        fund: { id: fund.id, schemeName: fund.schemeName, benchmark: fund.benchmark, category: fund.category },
        metrics: {
          beta1y: Math.round(beta1y * 100) / 100,
          beta3y: Math.round(beta3y * 100) / 100,
          alpha1y: Math.round(alpha1y * 100) / 100,
          alpha3y: Math.round(alpha3y * 100) / 100,
          rSquared: Math.round(rSquared),
          sharpe1y: fund.directSharpe1y,
          sharpe3y: fund.directSharpe3y,
        },
        interpretation: {
          beta: beta1y > 1.2 ? 'Aggressive - more volatile than benchmark' : beta1y < 0.8 ? 'Defensive - less volatile than benchmark' : 'Market-aligned volatility',
          alpha: alpha1y > 0 ? 'Positive - outperforming on risk-adjusted basis' : 'Negative - underperforming on risk-adjusted basis',
          rSquared: rSquared > 80 ? 'High correlation with benchmark' : 'Low correlation - different risk factors at play'
        }
      })
    }

    const funds = await db.fund.findMany({
      select: {
        id: true, schemeName: true, category: true, subCategory: true,
        directReturn1y: true, directReturn3y: true, directSharpe1y: true,
        benchmarkReturn1y: true, benchmarkReturn3y: true, trackingErrorBps: true,
        riskometer: true
      }
    })

    const results = funds.map(f => {
      const bmR1y = f.benchmarkReturn1y || 0
      const bmR3y = f.benchmarkReturn3y || 0
      const dr1y = f.directReturn1y || 0
      const dr3y = f.directReturn3y || 0
      const beta1y = bmR1y !== riskFreeRate ? (dr1y - riskFreeRate) / (bmR1y - riskFreeRate) : 1
      const beta3y = bmR3y !== riskFreeRate ? (dr3y - riskFreeRate) / (bmR3y - riskFreeRate) : 1
      const alpha1y = dr1y - (riskFreeRate + beta1y * (bmR1y - riskFreeRate))
      const rSq = f.trackingErrorBps ? Math.max(0, Math.min(100, 100 - f.trackingErrorBps * 5)) : 85

      return {
        id: f.id, schemeName: f.schemeName, category: f.category, subCategory: f.subCategory,
        directReturn1y: dr1y, directReturn3y: dr3y,
        beta1y: Math.round(beta1y * 100) / 100,
        beta3y: Math.round(beta3y * 100) / 100,
        alpha1y: Math.round(alpha1y * 100) / 100,
        rSquared: Math.round(rSq),
        sharpe1y: f.directSharpe1y,
        riskometer: f.riskometer
      }
    })

    return NextResponse.json({ funds: results })
  } catch (error) {
    console.error('Alpha-beta error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
