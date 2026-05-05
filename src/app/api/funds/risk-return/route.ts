import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const funds = await db.fund.findMany({
      select: {
        id: true, schemeName: true, category: true, subCategory: true,
        directReturn1y: true, directReturn3y: true, directReturn5y: true,
        directExpenseRatio: true, aumCrore: true, riskometer: true,
        directSharpe1y: true, regularExpenseRatio: true
      }
    })

    const riskMap: Record<string, number> = {
      'Low': 1, 'Low to Moderate': 2, 'Moderate': 3,
      'Moderately High': 4, 'High': 5, 'Very High': 6
    }

    const data = funds.map(f => ({
      id: f.id,
      schemeName: f.schemeName,
      category: f.category,
      subCategory: f.subCategory,
      return1y: f.directReturn1y,
      return3y: f.directReturn3y,
      return5y: f.directReturn5y,
      riskScore: riskMap[f.riskometer] || 3,
      riskometer: f.riskometer,
      aumCrore: f.aumCrore,
      expenseRatio: f.directExpenseRatio,
      sharpe1y: f.directSharpe1y,
      expenseSaving: Math.round((f.regularExpenseRatio - f.directExpenseRatio) * 100)
    }))

    return NextResponse.json({ funds: data })
  } catch (error) {
    console.error('Risk-return error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
