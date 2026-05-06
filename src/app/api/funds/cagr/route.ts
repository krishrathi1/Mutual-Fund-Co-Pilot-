import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fundId = searchParams.get('fundId')
    const startValue = parseFloat(searchParams.get('startValue') || '0')
    const endValue = parseFloat(searchParams.get('endValue') || '0')
    const period = parseFloat(searchParams.get('period') || '0')

    // Manual CAGR calculator
    if (startValue > 0 && endValue > 0 && period > 0) {
      const cagr = (Math.pow(endValue / startValue, 1 / period) - 1) * 100
      const yearsToDouble = 72 / cagr
      return NextResponse.json({
        mode: 'manual',
        startValue, endValue, period,
        cagr: Math.round(cagr * 100) / 100,
        totalReturn: Math.round((endValue / startValue - 1) * 10000) / 100,
        ruleOf72: Math.round(yearsToDouble * 10) / 10,
        interpretation: cagr > 12 ? 'Excellent long-term returns' : cagr > 8 ? 'Good returns, beats inflation' : cagr > 5 ? 'Moderate returns' : 'Below par returns'
      })
    }

    // Fund-specific CAGR
    if (!fundId) {
      // Return all funds with CAGR analysis
      const funds = await db.fund.findMany({
        select: {
          id: true, schemeName: true, category: true, subCategory: true,
          directReturn1y: true, directReturn3y: true, directReturn5y: true,
          directNav: true, launchDate: true, benchmarkReturn1y: true, benchmarkReturn3y: true, benchmarkReturn5y: true
        }
      })

      const results = funds.map(f => {
        const launchYear = new Date(f.launchDate).getFullYear()
        const currentYear = new Date().getFullYear()
        const sinceInceptionYears = currentYear - launchYear
        const sinceInceptionCAGR = sinceInceptionYears > 5 && f.directNav > 10 ? Math.round((Math.pow(f.directNav / 10, 1 / sinceInceptionYears) - 1) * 10000) / 100 : null

        return {
          id: f.id, schemeName: f.schemeName, category: f.category, subCategory: f.subCategory,
          cagr1y: f.directReturn1y,
          cagr3y: f.directReturn3y,
          cagr5y: f.directReturn5y,
          sinceInceptionCAGR,
          yearsSinceInception: sinceInceptionYears,
          benchmarkCagr1y: f.benchmarkReturn1y,
          benchmarkCagr3y: f.benchmarkReturn3y,
          benchmarkCagr5y: f.benchmarkReturn5y,
          alpha1y: f.directReturn1y && f.benchmarkReturn1y ? Math.round((f.directReturn1y - f.benchmarkReturn1y) * 100) / 100 : null,
          alpha3y: f.directReturn3y && f.benchmarkReturn3y ? Math.round((f.directReturn3y - f.benchmarkReturn3y) * 100) / 100 : null,
        }
      })

      return NextResponse.json({ mode: 'all', funds: results })
    }

    const fund = await db.fund.findUnique({ where: { id: fundId } })
    if (!fund) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({
      mode: 'fund',
      fund: { id: fund.id, schemeName: fund.schemeName, category: fund.category },
      cagr: {
        '1Y': fund.directReturn1y,
        '3Y': fund.directReturn3y,
        '5Y': fund.directReturn5y,
      },
      benchmarkCagr: {
        '1Y': fund.benchmarkReturn1y,
        '3Y': fund.benchmarkReturn3y,
        '5Y': fund.benchmarkReturn5y,
      }
    })
  } catch (error) {
    console.error('CAGR error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
