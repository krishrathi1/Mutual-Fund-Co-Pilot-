import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { monthlyExpenses, monthsCover = 6, buildMonths = 12 } = await request.json()
    const targetFund = monthlyExpenses * monthsCover

    // Liquid funds from database
    const liquidFunds = await db.fund.findMany({
      where: { category: 'Debt', subCategory: { in: ['Liquid', 'Corporate Bond', 'Short Duration'] } },
      orderBy: { aumCrore: 'desc' },
      take: 5,
      select: { id: true, schemeName: true, directReturn1y: true, directExpenseRatio: true, aumCrore: true, riskometer: true, minInvestment: true }
    })

    const savingsAccountRate = 3.5
    const liquidFundRate = liquidFunds.length > 0 ? (liquidFunds.reduce((s, f) => s + (f.directReturn1y || 6), 0) / liquidFunds.length) : 6

    const savingsAccountReturn = targetFund * savingsAccountRate / 100
    const liquidFundReturn = targetFund * liquidFundRate / 100
    const extraFromLiquid = liquidFundReturn - savingsAccountReturn

    // Build plan
    const monthlySavings = targetFund / buildMonths
    const buildPlan: { month: number; saved: number; total: number; projectedValue: number }[] = []
    let cumulative = 0
    for (let m = 1; m <= buildMonths; m++) {
      cumulative += monthlySavings
      const projected = cumulative * (1 + liquidFundRate / 100 / 12)
      buildPlan.push({ month: m, saved: Math.round(monthlySavings), total: Math.round(cumulative), projectedValue: Math.round(projected) })
    }

    return NextResponse.json({
      monthlyExpenses,
      monthsCover,
      targetFund: Math.round(targetFund),
      comparison: {
        savingsAccount: { rate: savingsAccountRate, annualReturn: Math.round(savingsAccountReturn), risk: 'Very Low', liquidity: 'Instant', note: 'Penalty for exceeding withdrawal limits' },
        liquidFund: { rate: Math.round(liquidFundRate * 100) / 100, annualReturn: Math.round(liquidFundReturn), risk: 'Low', liquidity: 'T+1 day', note: 'Redemption before 2pm → next day credit' },
        extraFromLiquidOverSavings: Math.round(extraFromLiquid),
      },
      recommendedFunds: liquidFunds,
      buildPlan: { monthlySavings: Math.round(monthlySavings), buildMonths, plan: buildPlan },
      rules: [
        'Keep 3-6 months of expenses as emergency fund',
        'Never invest emergency fund in equity/volatile assets',
        'Use Liquid or Overnight funds for better returns than savings account',
        'Redemption from liquid funds is T+1 (next business day)',
        'Keep some cash (₹10-20K) at home for immediate emergencies',
        'Review and adjust annually as expenses change',
      ]
    })
  } catch (error) {
    console.error('Emergency fund error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
