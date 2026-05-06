import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const funds = await db.fund.findMany({
      select: {
        id: true, schemeName: true, fundHouse: true, category: true, subCategory: true,
        directExpenseRatio: true, regularExpenseRatio: true, aumCrore: true,
        directReturn1y: true, directReturn3y: true,
      }
    })

    const commissionData = funds.map(f => {
      const commissionBps = Math.round((f.regularExpenseRatio - f.directExpenseRatio) * 100)
      const commissionPct = f.regularExpenseRatio - f.directExpenseRatio

      const amounts = [100000, 500000, 1000000, 5000000, 10000000]
      const annualCommission: Record<string, number> = {}
      for (const amt of amounts) {
        annualCommission[amt.toString()] = Math.round(amt * commissionPct / 100)
      }

      // Lifetime cost (compounding)
      const lifetimeCost10y = Math.round(amounts[2] * (Math.pow(1 + commissionPct / 100, 10) - 1))
      const lifetimeCost20y = Math.round(amounts[2] * (Math.pow(1 + commissionPct / 100, 20) - 1))
      const lifetimeCost30y = Math.round(amounts[2] * (Math.pow(1 + commissionPct / 100, 30) - 1))

      // Wealth destroyed = what that commission could have grown to
      const opportunityCost10y = Math.round(annualCommission['1000000'] * 12 * ((Math.pow(1 + 0.12, 10) - 1) / 0.12))

      return {
        id: f.id, schemeName: f.schemeName, fundHouse: f.fundHouse,
        category: f.category, subCategory: f.subCategory,
        directExpenseRatio: f.directExpenseRatio,
        regularExpenseRatio: f.regularExpenseRatio,
        commissionBps,
        commissionPct: Math.round(commissionPct * 100) / 100,
        annualCommissionOn10L: annualCommission['1000000'],
        annualCommission,
        lifetimeCost: { '10y': lifetimeCost10y, '20y': lifetimeCost20y, '30y': lifetimeCost30y },
        opportunityCost10y,
      }
    }).sort((a, b) => b.commissionBps - a.commissionBps)

    const totalAnnualCommission = commissionData.reduce((sum, f) => sum + f.annualCommissionOn10L, 0)

    return NextResponse.json({
      funds: commissionData,
      summary: {
        totalFunds: commissionData.length,
        avgCommissionBps: Math.round(commissionData.reduce((s, f) => s + f.commissionBps, 0) / commissionData.length),
        highestCommission: commissionData[0],
        totalAnnualCommissionAllFunds: totalAnnualCommission,
      }
    })
  } catch (error) {
    console.error('Commission error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
