import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fundHouse = searchParams.get('fundHouse') || ''

    const where = fundHouse ? { fundHouse } : {}

    const funds = await db.fund.findMany({ where })

    if (funds.length === 0) {
      return NextResponse.json({ amcs: [] })
    }

    // Group by fund house
    const amcMap = new Map<string, typeof funds>()

    for (const fund of funds) {
      const key = fund.fundHouse
      if (!amcMap.has(key)) {
        amcMap.set(key, [])
      }
      amcMap.get(key)!.push(fund)
    }

    const amcs = Array.from(amcMap.entries()).map(([fundHouse, amcFunds]) => {
      const fundCount = amcFunds.length
      const totalAum = amcFunds.reduce((sum, f) => sum + f.aumCrore, 0)

      // Average expense ratios
      const avgDirectER = amcFunds.reduce((sum, f) => sum + f.directExpenseRatio, 0) / fundCount
      const avgRegularER = amcFunds.reduce((sum, f) => sum + f.regularExpenseRatio, 0) / fundCount

      // Average returns (only include non-null values)
      const directReturns1y = amcFunds.map((f) => f.directReturn1y).filter((v): v is number => v !== null)
      const regularReturns1y = amcFunds.map((f) => f.regularReturn1y).filter((v): v is number => v !== null)

      const avgDirectReturn1y = directReturns1y.length > 0
        ? directReturns1y.reduce((s, v) => s + v, 0) / directReturns1y.length
        : null
      const avgRegularReturn1y = regularReturns1y.length > 0
        ? regularReturns1y.reduce((s, v) => s + v, 0) / regularReturns1y.length
        : null

      // Category breakdown
      const categoryMap = new Map<string, { count: number; aum: number }>()
      for (const f of amcFunds) {
        const cat = f.category
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, { count: 0, aum: 0 })
        }
        const entry = categoryMap.get(cat)!
        entry.count += 1
        entry.aum += f.aumCrore
      }

      const categories = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        fundCount: data.count,
        aum: Math.round(data.aum * 100) / 100,
      }))

      return {
        fundHouse,
        fundCount,
        totalAum: Math.round(totalAum * 100) / 100,
        avgDirectER: Math.round(avgDirectER * 100) / 100,
        avgRegularER: Math.round(avgRegularER * 100) / 100,
        avgDirectReturn1y: avgDirectReturn1y !== null ? Math.round(avgDirectReturn1y * 100) / 100 : null,
        avgRegularReturn1y: avgRegularReturn1y !== null ? Math.round(avgRegularReturn1y * 100) / 100 : null,
        categories,
      }
    })

    // Sort by total AUM descending
    amcs.sort((a, b) => b.totalAum - a.totalAum)

    return NextResponse.json({ amcs })
  } catch (error) {
    console.error('Error fetching AMC analysis:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AMC analysis' },
      { status: 500 }
    )
  }
}
