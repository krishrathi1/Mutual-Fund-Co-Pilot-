import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { investmentAmount, taxSlab } = await request.json()
    const maxDeduction = 150000
    const eligibleAmount = Math.min(investmentAmount, maxDeduction)

    // Tax saved under 80C
    const taxSaved = eligibleAmount * (taxSlab / 100)

    // Get ELSS funds from database
    const elssFunds = await db.fund.findMany({
      where: { subCategory: 'ELSS' },
      orderBy: { directReturn3y: 'desc' },
      select: {
        id: true, schemeName: true, fundHouse: true,
        directReturn1y: true, directReturn3y: true, directReturn5y: true,
        directExpenseRatio: true, regularExpenseRatio: true,
        aumCrore: true, riskometer: true, minInvestment: true
      }
    })

    // 80C options comparison
    const options80C = [
      { name: 'ELSS Mutual Fund', lockIn: '3 years', expectedReturn: '12-15%', risk: 'High', liquidity: 'After 3Y lock-in', taxOnWithdrawal: 'LTCG 12.5% above ₹1.25L', recommended: true },
      { name: 'PPF', lockIn: '15 years', expectedReturn: '7.1%', risk: 'Low', liquidity: 'Partial after 7Y', taxOnWithdrawal: 'Tax-free', recommended: false },
      { name: 'NSC', lockIn: '5 years', expectedReturn: '7.7%', risk: 'Low', liquidity: 'After 5Y', taxOnWithdrawal: 'Taxable', recommended: false },
      { name: '5-Year FD', lockIn: '5 years', expectedReturn: '6.5-7%', risk: 'Low', liquidity: 'Premature with penalty', taxOnWithdrawal: 'Taxable at slab', recommended: false },
      { name: 'NPS Tier 1', lockIn: 'Till 60 years', expectedReturn: '10-12%', risk: 'Moderate', liquidity: 'Partial withdrawal allowed', taxOnWithdrawal: '60% tax-free, 40% annuity', recommended: false },
      { name: 'Sukanya Samriddhi', lockIn: '21 years', expectedReturn: '8.2%', risk: 'Low', liquidity: 'Partial after 5Y', taxOnWithdrawal: 'Tax-free', recommended: false },
    ]

    // ELSS projected returns after lock-in
    const avgElssReturn = elssFunds.length > 0 ? (elssFunds.reduce((s, f) => s + (f.directReturn3y || 12), 0) / elssFunds.length) : 12
    const projectedValue3y = investmentAmount * Math.pow(1 + avgElssReturn / 100, 3)

    return NextResponse.json({
      investmentAmount,
      eligibleAmount,
      maxDeduction,
      taxSlab,
      taxSaved: Math.round(taxSaved),
      effectiveInvestment: Math.round(investmentAmount - taxSaved),
      elssFunds,
      options80C,
      projectedReturns: {
        avgElssReturn: Math.round(avgElssReturn * 100) / 100,
        projectedValue3y: Math.round(projectedValue3y),
        gainAfterLockIn: Math.round(projectedValue3y - investmentAmount),
      },
      advantages: [
        'Lowest lock-in period among all 80C options (only 3 years)',
        'Potential for highest returns among tax-saving instruments',
        'Direct plan saves additional 0.5-1% in expense ratio annually',
        'No TDS on redemption for resident individuals',
        'Can continue holding after lock-in for long-term wealth creation',
      ]
    })
  } catch (error) {
    console.error('ELSS error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
