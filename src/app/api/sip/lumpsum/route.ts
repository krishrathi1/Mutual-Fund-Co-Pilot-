import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { amount, expectedReturn, years } = await request.json()
    const annualReturn = expectedReturn / 100
    const finalValue = amount * Math.pow(1 + annualReturn, years)
    const totalGain = finalValue - amount
    const cagr = (Math.pow(finalValue / amount, 1 / years) - 1) * 100

    // Compare lumpsum vs SIP
    const monthlySip = Math.round(amount / (years * 12))
    const monthlyRate = annualReturn / 12
    const sipCorpus = monthlySip * ((Math.pow(1 + monthlyRate, years * 12) - 1) / monthlyRate) * (1 + monthlyRate)

    const yearly: { year: number; value: number; gain: number; gainPct: number }[] = []
    for (let y = 1; y <= years; y++) {
      const val = amount * Math.pow(1 + annualReturn, y)
      yearly.push({ year: y, value: Math.round(val), gain: Math.round(val - amount), gainPct: Math.round((val / amount - 1) * 10000) / 100 })
    }

    // STP comparison: invest lumpsum over 6 months
    const stpMonths = 6
    const stpMonthly = amount / stpMonths
    let stpValue = 0
    for (let m = 1; m <= years * 12; m++) {
      const investThisMonth = m <= stpMonths ? stpMonthly : 0
      stpValue = (stpValue + investThisMonth) * (1 + monthlyRate)
    }

    // Rule of 72
    const yearsToDouble = 72 / expectedReturn

    return NextResponse.json({
      lumpsum: {
        investedAmount: amount,
        finalValue: Math.round(finalValue),
        totalGain: Math.round(totalGain),
        gainPct: Math.round(totalGain / amount * 10000) / 100,
        cagr: Math.round(cagr * 100) / 100,
        yearly
      },
      sipComparison: {
        monthlySip,
        totalInvested: monthlySip * years * 12,
        sipCorpus: Math.round(sipCorpus),
        sipGain: Math.round(sipCorpus - monthlySip * years * 12),
      },
      stpComparison: {
        stpAmount: Math.round(stpMonthly),
        stpCorpus: Math.round(stpValue),
        stpGain: Math.round(stpValue - amount),
      },
      ruleOf72: { yearsToDouble: Math.round(yearsToDouble * 10) / 10, doublingPeriod: `~${Math.round(yearsToDouble)} years at ${expectedReturn}%` },
      inflationImpact: { realValueAt6pctInflation: Math.round(finalValue / Math.pow(1.06, years)), purchasingPowerLoss: Math.round((1 - 1 / Math.pow(1.06, years)) * 100) }
    })
  } catch (error) {
    console.error('Lumpsum error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
