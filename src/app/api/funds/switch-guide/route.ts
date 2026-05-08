import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const fundId = searchParams.get('fundId')
    const investmentAmount = parseFloat(searchParams.get('amount') || '500000')
    const holdingYears = parseFloat(searchParams.get('holdingYears') || '3')
    const slabRate = parseFloat(searchParams.get('slabRate') || '30') / 100

    if (!fundId) return NextResponse.json({ error: 'fundId required' }, { status: 400 })

    const fund = await db.fund.findUnique({ where: { id: fundId } })
    if (!fund) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const expenseSaving = fund.regularExpenseRatio - fund.directExpenseRatio
    const annualSaving = investmentAmount * expenseSaving / 100
    // Future Value of an Annuity formula: P * ((1+r)^n - 1) / r
    // Projecting savings reinvestment at 12% CAGR over 10 years
    const savingRate = 0.12
    const savingYears = 10
    const cumulativeSaving10y = Math.round(annualSaving * (Math.pow(1 + savingRate, savingYears) - 1) / savingRate)

    // Accurate Gain Calculation using Compounding
    // CurrentValue = Initial * (1 + r)^n => Initial = CurrentValue / (1 + r)^n
    // Gain = CurrentValue - Initial
    const returnRate = (holdingYears >= 5 ? (fund.regularReturn5y || fund.regularReturn3y || fund.regularReturn1y || 12) : 
                       (holdingYears >= 3 ? (fund.regularReturn3y || fund.regularReturn1y || 12) : 
                       (fund.regularReturn1y || 10))) / 100
    
    const initialInvestment = investmentAmount / Math.pow(1 + returnRate, holdingYears)
    const gain = Math.max(0, investmentAmount - initialInvestment)

    const isEquity = fund.category.toLowerCase().includes('equity') || 
                   fund.category.toLowerCase().includes('elss') ||
                   fund.category.toLowerCase().includes('small cap') ||
                   fund.category.toLowerCase().includes('mid cap') ||
                   fund.category.toLowerCase().includes('large cap') ||
                   fund.category.toLowerCase().includes('flexi cap')

    const isLongTerm = isEquity ? holdingYears >= 1 : holdingYears >= 3
    const stcgRate = 0.20
    const ltcgRate = 0.125
    const ltcgExempt = 125000
    
    let taxOnSwitch = 0
    if (isEquity) {
      if (isLongTerm) {
        taxOnSwitch = Math.max(0, gain - ltcgExempt) * ltcgRate
      } else {
        taxOnSwitch = gain * stcgRate
      }
    } else {
      // Debt funds: always taxed at slab after April 2023
      taxOnSwitch = gain * slabRate
    }

    // Better exit load parsing
    const parseExitLoad = (exitLoadStr: string | null) => {
      if (!exitLoadStr || exitLoadStr.toLowerCase() === 'nil' || exitLoadStr.trim() === '') {
        return { pct: 0, thresholdDays: 0 }
      }
      const match = exitLoadStr.match(/([\d.]+)%\s*(?:for\s+redemption\s+|if\s+redeemed\s+)?within\s+(\d+)\s*(year|month|day)s?/i)
      if (match) {
        const pct = parseFloat(match[1]) / 100
        const num = parseInt(match[2])
        const unit = match[3].toLowerCase()
        let days = num
        if (unit === 'year') days = num * 365
        else if (unit === 'month') days = num * 30
        return { pct, thresholdDays: days }
      }
      return { pct: 0.01, thresholdDays: 365 } // Fallback
    }

    const { pct: exitLoadPct, thresholdDays } = parseExitLoad(fund.exitLoad)
    const holdingDays = holdingYears * 365
    const actualExitLoadPct = holdingDays < thresholdDays ? exitLoadPct : 0
    const exitLoadCost = investmentAmount * actualExitLoadPct

    const totalSwitchCost = taxOnSwitch + exitLoadCost
    const breakEvenMonths = totalSwitchCost > 0 && annualSaving > 0 ? Math.ceil(totalSwitchCost / annualSaving * 12) : 0
    const switchRecommended = annualSaving > totalSwitchCost / Math.min(holdingYears, 5)

    // Steps
    const hasExitLoad = actualExitLoadPct > 0
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
