import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { investmentAmount, years, fdRate = 7, equityReturn = 12, debtReturn = 8, taxSlab = 30 } = await request.json()

    // FD returns (fully taxable at slab)
    const fdFinalValue = investmentAmount * Math.pow(1 + fdRate / 100, years)
    const fdGain = fdFinalValue - investmentAmount
    const fdTax = fdGain * (taxSlab / 100)
    const fdAfterTax = fdFinalValue - fdTax

    // Equity MF returns (LTCG tax: 12.5% above ₹1.25L)
    const eqFinalValue = investmentAmount * Math.pow(1 + equityReturn / 100, years)
    const eqGain = eqFinalValue - investmentAmount
    const eqLtcgExempt = 125000
    const eqTaxableGain = Math.max(0, eqGain - eqLtcgExempt)
    const eqTax = eqTaxableGain * 0.125
    const eqAfterTax = eqFinalValue - eqTax

    // Debt MF returns (taxed at slab - new rules post Apr 2023)
    const debtFinalValue = investmentAmount * Math.pow(1 + debtReturn / 100, years)
    const debtGain = debtFinalValue - investmentAmount
    const debtTax = debtGain * (taxSlab / 100)
    const debtAfterTax = debtFinalValue - debtTax

    // Inflation adjusted (6%)
    const inflationRate = 6
    const realFdReturn = ((1 + fdRate / 100) / (1 + inflationRate / 100) - 1) * 100
    const realEqReturn = ((1 + equityReturn / 100) / (1 + inflationRate / 100) - 1) * 100
    const realDebtReturn = ((1 + debtReturn / 100) / (1 + inflationRate / 100) - 1) * 100

    const purchasingPower = investmentAmount / Math.pow(1 + inflationRate / 100, years)

    const yearlyComparison: { year: number; fd: number; equity: number; debt: number; fdAfterTax: number; eqAfterTax: number; debtAfterTax: number }[] = []
    for (let y = 1; y <= years; y++) {
      const fv = investmentAmount * Math.pow(1 + fdRate / 100, y)
      const ev = investmentAmount * Math.pow(1 + equityReturn / 100, y)
      const dv = investmentAmount * Math.pow(1 + debtReturn / 100, y)
      const fGain = fv - investmentAmount
      const eGain = ev - investmentAmount
      const dGain = dv - investmentAmount
      yearlyComparison.push({
        year: y,
        fd: Math.round(fv),
        equity: Math.round(ev),
        debt: Math.round(dv),
        fdAfterTax: Math.round(fv - fGain * (taxSlab / 100)),
        eqAfterTax: Math.round(ev - Math.max(0, eGain - eqLtcgExempt) * 0.125),
        debtAfterTax: Math.round(dv - dGain * (taxSlab / 100)),
      })
    }

    return NextResponse.json({
      investmentAmount, years,
      fd: { rate: fdRate, finalValue: Math.round(fdFinalValue), gain: Math.round(fdGain), tax: Math.round(fdTax), afterTax: Math.round(fdAfterTax), afterTaxReturn: Math.round((fdAfterTax / investmentAmount - 1) / years * 10000) / 100 },
      equityMF: { rate: equityReturn, finalValue: Math.round(eqFinalValue), gain: Math.round(eqGain), tax: Math.round(eqTax), afterTax: Math.round(eqAfterTax), afterTaxReturn: Math.round((eqAfterTax / investmentAmount - 1) / years * 10000) / 100 },
      debtMF: { rate: debtReturn, finalValue: Math.round(debtFinalValue), gain: Math.round(debtGain), tax: Math.round(debtTax), afterTax: Math.round(debtAfterTax), afterTaxReturn: Math.round((debtAfterTax / investmentAmount - 1) / years * 10000) / 100 },
      realReturns: { fd: Math.round(realFdReturn * 100) / 100, equity: Math.round(realEqReturn * 100) / 100, debt: Math.round(realDebtReturn * 100) / 100 },
      inflationImpact: { purchasingPower: Math.round(purchasingPower), valueErosion: Math.round((1 - purchasingPower / investmentAmount) * 100) },
      yearlyComparison,
      verdict: eqAfterTax > fdAfterTax ? `Equity MF beats FD by ₹${Math.round(eqAfterTax - fdAfterTax).toLocaleString('en-IN')} after tax over ${years} years` : `FD beats Equity MF in this scenario`
    })
  } catch (error) {
    console.error('FD vs MF error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
