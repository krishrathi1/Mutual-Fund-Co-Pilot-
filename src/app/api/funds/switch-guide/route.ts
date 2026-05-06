import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fundId = searchParams.get('fundId')
    const investmentAmount = parseFloat(searchParams.get('amount') || '500000')
    const holdingYears = parseFloat(searchParams.get('holdingYears') || '3')

    if (!fundId) return NextResponse.json({ error: 'fundId required' }, { status: 400 })

    const fund = await db.fund.findUnique({ where: { id: fundId } })
    if (!fund) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const expenseSaving = fund.regularExpenseRatio - fund.directExpenseRatio
    const annualSaving = investmentAmount * expenseSaving / 100
    const cumulativeSaving10y = Math.round(annualSaving * 10 + annualSaving * (Math.pow(1.12, 10) - 1) / 0.12 * 0.12)

    // Tax impact of switching
    const gain = investmentAmount * (fund.regularReturn1y || 10) / 100 * holdingYears
    const isEquity = fund.category === 'Equity' || fund.category === 'ELSS'
    const isLongTerm = holdingYears > 1 && isEquity
    const stcgRate = 0.20
    const ltcgRate = 0.125
    const ltcgExempt = 125000
    const taxRate = isLongTerm ? ltcgRate : stcgRate
    const taxOnSwitch = isLongTerm ? Math.max(0, gain - ltcgExempt) * ltcgRate : gain * stcgRate

    // Exit load
    const hasExitLoad = fund.exitLoad !== 'Nil' && fund.exitLoad !== 'nil'
    const exitLoadPct = hasExitLoad ? 0.01 : 0
    const exitLoadCost = investmentAmount * exitLoadPct

    const totalSwitchCost = taxOnSwitch + exitLoadCost
    const breakEvenMonths = totalSwitchCost > 0 && annualSaving > 0 ? Math.ceil(totalSwitchCost / annualSaving * 12) : 0
    const switchRecommended = annualSaving > totalSwitchCost / Math.min(holdingYears, 5)

    // Steps
    const steps = [
      { step: 1, title: 'Check Exit Load', detail: hasExitLoad ? `Exit load: ${fund.exitLoad}. Cost: ₹${Math.round(exitLoadCost).toLocaleString('en-IN')}` : 'No exit load - good!', status: hasExitLoad ? 'warning' : 'ok' },
      { step: 2, title: 'Calculate Tax Impact', detail: isLongTerm ? `LTCG tax: 12.5% on gains above ₹1.25L. Estimated tax: ₹${Math.round(taxOnSwitch).toLocaleString('en-IN')}` : `STCG tax: 20% on gains. Estimated tax: ₹${Math.round(taxOnSwitch).toLocaleString('en-IN')}`, status: taxOnSwitch > annualSaving ? 'warning' : 'ok' },
      { step: 3, title: 'Redeem from Regular Plan', detail: `Sell all units from Regular plan. You'll receive ₹${Math.round(investmentAmount - exitLoadCost).toLocaleString('en-IN')} after exit load.`, status: 'action' },
      { step: 4, title: 'Invest in Direct Plan', detail: `Immediately invest in Direct plan (ISIN: ${fund.directIsin}). Don't stay in cash - markets can go up anytime.`, status: 'action' },
      { step: 5, title: 'Verify & Monitor', detail: 'Verify the switch is complete. Set up SIP in Direct plan if applicable.', status: 'action' },
    ]

    return NextResponse.json({
      fund: { id: fund.id, schemeName: fund.schemeName, directIsin: fund.directIsin, regularIsin: fund.regularIsin },
      regularPlan: { expenseRatio: fund.regularExpenseRatio, nav: fund.regularNav, return1y: fund.regularReturn1y },
      directPlan: { expenseRatio: fund.directExpenseRatio, nav: fund.directNav, return1y: fund.directReturn1y },
      savings: { expenseDiffBps: Math.round(expenseSaving * 100), annualSaving: Math.round(annualSaving), cumulativeSaving10y },
      switchCost: { taxOnSwitch: Math.round(taxOnSwitch), exitLoadCost: Math.round(exitLoadCost), totalSwitchCost: Math.round(totalSwitchCost), isLongTerm, taxType: isLongTerm ? 'LTCG' : 'STCG' },
      recommendation: { switchRecommended, breakEvenMonths, verdict: switchRecommended ? `Switch to Direct! Break even in ${breakEvenMonths} months, then pure savings.` : `Stay in Regular. Switch costs (₹${Math.round(totalSwitchCost).toLocaleString('en-IN')}) exceed savings (₹${Math.round(annualSaving).toLocaleString('en-IN')}/yr).` },
      steps
    })
  } catch (error) {
    console.error('Switch guide error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
