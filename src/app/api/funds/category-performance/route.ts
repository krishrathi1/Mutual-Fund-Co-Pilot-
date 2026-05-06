import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const funds = await db.fund.findMany({
      select: {
        category: true, subCategory: true,
        directReturn1y: true, directReturn3y: true, directReturn5y: true,
        directExpenseRatio: true, aumCrore: true, riskometer: true
      }
    })

    const categoryMap = new Map<string, {
      category: string; subCategory: string; count: number;
      return1y: number[]; return3y: number[]; return5y: number[];
      expenseRatios: number[]; aumValues: number[]
    }>()

    for (const f of funds) {
      const key = `${f.category}|${f.subCategory}`
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          category: f.category, subCategory: f.subCategory, count: 0,
          return1y: [], return3y: [], return5y: [],
          expenseRatios: [], aumValues: []
        })
      }
      const entry = categoryMap.get(key)!
      entry.count++
      if (f.directReturn1y !== null) entry.return1y.push(f.directReturn1y)
      if (f.directReturn3y !== null) entry.return3y.push(f.directReturn3y)
      if (f.directReturn5y !== null) entry.return5y.push(f.directReturn5y)
      entry.expenseRatios.push(f.directExpenseRatio)
      entry.aumValues.push(f.aumCrore)
    }

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

    const results = Array.from(categoryMap.values()).map(e => ({
      category: e.category,
      subCategory: e.subCategory,
      fundCount: e.count,
      avgReturn1y: Math.round(avg(e.return1y) * 100) / 100,
      avgReturn3y: Math.round(avg(e.return3y) * 100) / 100,
      avgReturn5y: Math.round(avg(e.return5y) * 100) / 100,
      avgExpenseRatio: Math.round(avg(e.expenseRatios) * 100) / 100,
      totalAumCrore: Math.round(e.aumValues.reduce((a, b) => a + b, 0)),
      avgAumCrore: Math.round(avg(e.aumValues)),
    })).sort((a, b) => b.avgReturn1y - a.avgReturn1y)

    return NextResponse.json({ categories: results })
  } catch (error) {
    console.error('Category performance error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
