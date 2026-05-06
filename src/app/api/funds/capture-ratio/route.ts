import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fundId = searchParams.get('fundId')

    if (!fundId) {
      const funds = await db.fund.findMany({ select: { id: true, schemeName: true, category: true, subCategory: true, directReturn1y: true, directReturn3y: true, benchmarkReturn1y: true, benchmarkReturn3y: true, riskometer: true } })
      const results = funds.map(f => {
        const upsideCapture1y = f.benchmarkReturn1y && f.benchmarkReturn1y > 0 && f.directReturn1y ? Math.round((f.directReturn1y / f.benchmarkReturn1y) * 100) : null
        const downsideCapture1y = f.benchmarkReturn1y && f.benchmarkReturn1y < 0 && f.directReturn1y ? Math.round((f.directReturn1y / f.benchmarkReturn1y) * 100) : null
        const upsideCapture3y = f.benchmarkReturn3y && f.benchmarkReturn3y > 0 && f.directReturn3y ? Math.round((f.directReturn3y / f.benchmarkReturn3y) * 100) : null
        return { ...f, upsideCapture1y, downsideCapture1y, upsideCapture3y }
      })
      return NextResponse.json({ funds: results })
    }

    const fund = await db.fund.findUnique({ where: { id: fundId } })
    if (!fund) return NextResponse.json({ error: 'Fund not found' }, { status: 404 })

    const bmReturn1y = fund.benchmarkReturn1y || 0
    const bmReturn3y = fund.benchmarkReturn3y || 0
    const directReturn1y = fund.directReturn1y || 0
    const directReturn3y = fund.directReturn3y || 0

    const upsideCapture1y = bmReturn1y > 0 ? Math.round((directReturn1y / bmReturn1y) * 100) : null
    const downsideCapture1y = bmReturn1y < 0 ? Math.round((directReturn1y / bmReturn1y) * 100) : null
    const upsideCapture3y = bmReturn3y > 0 ? Math.round((directReturn3y / bmReturn3y) * 100) : null
    const downsideCapture3y = bmReturn3y < 0 ? Math.round((directReturn3y / bmReturn3y) * 100) : null

    const riskFreeRate = 6.5
    const alpha1y = directReturn1y - (riskFreeRate + (upsideCapture1y || 100) / 100 * (bmReturn1y - riskFreeRate))
    const alpha3y = directReturn3y - (riskFreeRate + (upsideCapture3y || 100) / 100 * (bmReturn3y - riskFreeRate))

    return NextResponse.json({
      fund: { id: fund.id, schemeName: fund.schemeName, benchmark: fund.benchmark, category: fund.category, subCategory: fund.subCategory },
      captureRatios: { upsideCapture1y, downsideCapture1y, upsideCapture3y, downsideCapture3y },
      alpha: { alpha1y: Math.round(alpha1y * 100) / 100, alpha3y: Math.round(alpha3y * 100) / 100 },
      interpretation: {
        upside: upsideCapture1y && upsideCapture1y > 100 ? 'Fund captures more upside than benchmark' : 'Fund captures less upside than benchmark',
        downside: downsideCapture1y === null ? 'No negative benchmark periods in 1Y' : downsideCapture1y < 100 ? 'Fund protects better in downturns' : 'Fund falls more than benchmark in downturns',
        overall: (upsideCapture1y || 0) > 100 && (downsideCapture1y || 100) < 100 ? 'Excellent - captures upside, protects downside' : 'Review risk-adjusted performance'
      }
    })
  } catch (error) {
    console.error('Capture ratio error:', error)
    return NextResponse.json({ error: 'Failed to calculate capture ratios' }, { status: 500 })
  }
}
