// Fresh build trigger
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const mutualFundCategoryBaselines: Record<string, { upside: number; downside: number }> = {
  'Equity': { upside: 105, downside: 85 },
  'Large Cap': { upside: 98, downside: 80 },
  'Mid Cap': { upside: 115, downside: 95 },
  'Small Cap': { upside: 125, downside: 105 },
  'Debt': { upside: 80, downside: 40 },
  'Hybrid': { upside: 90, downside: 65 },
  'Index': { upside: 99, downside: 100 },
  'ELSS': { upside: 110, downside: 90 }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fundId = searchParams.get('fundId')

    if (!fundId) {
      const funds = await db.fund.findMany({ 
        select: { 
          id: true, schemeName: true, category: true, subCategory: true, 
          directReturn1y: true, directReturn3y: true, 
          benchmarkReturn1y: true, benchmarkReturn3y: true, 
          riskometer: true, directSharpe1y: true 
        } 
      })
      
      const results = funds.map(f => {
        const baseline = mutualFundCategoryBaselines[f.subCategory] || mutualFundCategoryBaselines[f.category] || { upside: 100, downside: 90 }
        const riskFactor = f.riskometer === 'Very High' ? 1.2 : f.riskometer === 'High' ? 1.1 : 0.9
        const sharpeFactor = Math.max(0.7, 1.2 - (f.directSharpe1y || 1.0) * 0.2)

        const getCapture = (fundRet: number | null, bmRet: number | null, isUpside: boolean) => {
          if (!fundRet || !bmRet) return isUpside ? baseline.upside : Math.round(baseline.downside * riskFactor * sharpeFactor)
          if (isUpside) {
            return bmRet > 0 ? Math.round((fundRet / bmRet) * 100) : baseline.upside
          } else {
            return bmRet < 0 ? Math.round((fundRet / bmRet) * 100) : Math.round(baseline.downside * riskFactor * sharpeFactor)
          }
        }

        return { 
          ...f, 
          upsideCapture1y: getCapture(f.directReturn1y, f.benchmarkReturn1y, true),
          downsideCapture1y: getCapture(f.directReturn1y, f.benchmarkReturn1y, false),
          upsideCapture3y: getCapture(f.directReturn3y, f.benchmarkReturn3y, true)
        }
      })
      return NextResponse.json({ funds: results })
    }

    const fund = await db.fund.findUnique({ where: { id: fundId } })
    if (!fund) return NextResponse.json({ error: 'Fund not found' }, { status: 404 })

    const bmReturn1y = fund.benchmarkReturn1y || 0
    const bmReturn3y = fund.benchmarkReturn3y || 0
    const directReturn1y = fund.directReturn1y || 0
    const directReturn3y = fund.directReturn3y || 0

    const baseline = mutualFundCategoryBaselines[fund.subCategory] || mutualFundCategoryBaselines[fund.category] || { upside: 100, downside: 90 }
    
    // Risk adjustment factor (High risk = captures more downside)
    const riskFactor = fund.riskometer === 'Very High' ? 1.2 : fund.riskometer === 'High' ? 1.1 : fund.riskometer === 'Moderate' ? 0.9 : 0.8
    // Sharpe adjustment (Higher sharpe = better downside protection)
    const sharpeFactor = Math.max(0.7, 1.2 - (fund.directSharpe1y || 1.0) * 0.2)

    const calculateCapture = (fundReturn: number, bmReturn: number, isUpside: boolean) => {
      if (isUpside) {
        if (bmReturn > 0) return Math.round((fundReturn / bmReturn) * 100)
        return Math.round(baseline.upside * (fundReturn > 0 ? 1.1 : 0.9))
      } else {
        if (bmReturn < 0) return Math.round((fundReturn / bmReturn) * 100)
        // Estimate downside capture if benchmark is positive
        return Math.round(baseline.downside * riskFactor * sharpeFactor)
      }
    }

    const upsideCapture1y = calculateCapture(directReturn1y, bmReturn1y, true)
    const downsideCapture1y = calculateCapture(directReturn1y, bmReturn1y, false)
    const upsideCapture3y = calculateCapture(directReturn3y, bmReturn3y, true)
    const downsideCapture3y = calculateCapture(directReturn3y, bmReturn3y, false)

    const riskFreeRate = 6.5
    const alpha1y = directReturn1y - (riskFreeRate + (upsideCapture1y || 100) / 100 * (bmReturn1y - riskFreeRate))
    const alpha3y = directReturn3y - (riskFreeRate + (upsideCapture3y || 100) / 100 * (bmReturn3y - riskFreeRate))

    return NextResponse.json({
      fund: { id: fund.id, schemeName: fund.schemeName, benchmark: fund.benchmark, category: fund.category, subCategory: fund.subCategory },
      captureRatios: { upsideCapture1y, downsideCapture1y, upsideCapture3y, downsideCapture3y },
      alpha: { alpha1y: Math.round(alpha1y * 100) / 100, alpha3y: Math.round(alpha3y * 100) / 100 },
      interpretation: {
        upside: (upsideCapture1y || 0) > 100 ? 'Fund captures more upside than benchmark' : 'Fund captures less upside than benchmark',
        downside: bmReturn1y < 0 
          ? (downsideCapture1y || 0) < 100 ? 'Fund protects better in downturns' : 'Fund falls more than benchmark in downturns'
          : 'Estimated based on category volatility & risk profile (Positive benchmark year)',
        overall: (upsideCapture1y || 0) > 100 && (downsideCapture1y || 100) < 90 ? 'Excellent - strong upside, great protection' : 
                 (upsideCapture1y || 0) > 105 ? 'Aggressive - high upside, higher risk' : 'Consistent performer'
      }
    })
  } catch (error) {
    console.error('Capture ratio error:', error)
    return NextResponse.json({ error: 'Failed to calculate capture ratios' }, { status: 500 })
  }
}
