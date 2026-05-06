import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { fundIds } = await request.json()
    if (!fundIds || !Array.isArray(fundIds) || fundIds.length < 2) {
      return NextResponse.json({ error: 'At least 2 fundIds required' }, { status: 400 })
    }

    const funds = await db.fund.findMany({
      where: { id: { in: fundIds } },
      select: { id: true, schemeName: true, category: true, subCategory: true, topHoldings: true, directReturn1y: true, directReturn3y: true, equityPercentage: true, debtPercentage: true }
    })

    const n = funds.length
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0))

    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1.0
      for (let j = i + 1; j < n; j++) {
        let corr = 0.3 // base correlation
        if (funds[i].category === funds[j].category) corr += 0.3
        if (funds[i].subCategory === funds[j].subCategory) corr += 0.25
        // Parse holdings and check overlap
        let holdingsOverlap = 0
        try {
          const h1 = funds[i].topHoldings ? JSON.parse(funds[i].topHoldings as string) : []
          const h2 = funds[j].topHoldings ? JSON.parse(funds[j].topHoldings as string) : []
          const names1 = new Set(h1.map((h: { name: string }) => h.name))
          const common = h2.filter((h: { name: string }) => names1.has(h.name))
          holdingsOverlap = common.length / Math.max(h1.length, h2.length, 1)
        } catch { /* ignore */ }
        corr += holdingsOverlap * 0.3
        // Return similarity
        const retDiff = Math.abs((funds[i].directReturn1y || 0) - (funds[j].directReturn1y || 0))
        corr -= retDiff * 0.01
        corr = Math.min(0.99, Math.max(-0.5, corr))
        matrix[i][j] = Math.round(corr * 100) / 100
        matrix[j][i] = matrix[i][j]
      }
    }

    return NextResponse.json({
      fundNames: funds.map(f => f.schemeName),
      fundIds: funds.map(f => f.id),
      matrix,
      diversificationTips: fundIds.length > 2 ? 'Look for pairs with correlation below 0.5 for better diversification' : 'Add more funds to see correlation patterns'
    })
  } catch (error) {
    console.error('Correlation error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
