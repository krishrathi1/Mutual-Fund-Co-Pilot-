import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fundId = searchParams.get('fundId')
    if (!fundId) return NextResponse.json({ error: 'fundId required' }, { status: 400 })

    const fund = await db.fund.findUnique({ where: { id: fundId } })
    if (!fund) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const candidates = await db.fund.findMany({ where: { id: { not: fundId } } })

    const scored = candidates.map(c => {
      let score = 0
      if (c.category === fund.category) score += 30
      if (c.subCategory === fund.subCategory) score += 25
      const aumDiff = Math.abs(c.aumCrore - fund.aumCrore) / Math.max(fund.aumCrore, 1)
      score += Math.max(0, 20 - aumDiff * 10)
      const retDiff1y = Math.abs((c.directReturn1y || 0) - (fund.directReturn1y || 0))
      score += Math.max(0, 15 - retDiff1y)
      const expDiff = Math.abs(c.directExpenseRatio - fund.directExpenseRatio)
      score += Math.max(0, 10 - expDiff * 20)
      if (c.riskometer === fund.riskometer) score += 10
      // Deduct for same fund house (less diversification)
      if (c.fundHouse === fund.fundHouse) score -= 5

      return {
        id: c.id, schemeName: c.schemeName, fundHouse: c.fundHouse,
        category: c.category, subCategory: c.subCategory,
        directReturn1y: c.directReturn1y, directReturn3y: c.directReturn3y,
        directExpenseRatio: c.directExpenseRatio, aumCrore: c.aumCrore,
        riskometer: c.riskometer,
        similarityScore: Math.min(100, Math.max(0, Math.round(score))),
        sameFundHouse: c.fundHouse === fund.fundHouse
      }
    }).sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 10)

    return NextResponse.json({ fund: { id: fund.id, schemeName: fund.schemeName, category: fund.category, subCategory: fund.subCategory }, similar: scored })
  } catch (error) {
    console.error('Similarity error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
