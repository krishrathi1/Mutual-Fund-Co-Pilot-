import { NextRequest, NextResponse } from 'next/server'

function normalRandom(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

export async function POST(request: NextRequest) {
  try {
    const { investmentAmount, years, equityPct, debtPct, simulations = 1000 } = await request.json()
    const equityMean = 0.12, equityStd = 0.20
    const debtMean = 0.07, debtStd = 0.05
    const goldPct = 100 - equityPct - debtPct
    const goldMean = 0.08, goldStd = 0.15

    const allPaths: number[][] = []
    const finalValues: number[] = []

    for (let s = 0; s < simulations; s++) {
      const path: number[] = [investmentAmount]
      let value = investmentAmount
      for (let y = 1; y <= years; y++) {
        const eqReturn = equityMean + equityStd * normalRandom()
        const debtReturn = debtMean + debtStd * normalRandom()
        const goldReturn = goldMean + goldStd * normalRandom()
        const portfolioReturn = (equityPct / 100) * eqReturn + (debtPct / 100) * debtReturn + (goldPct / 100) * goldReturn
        value = value * (1 + portfolioReturn)
        path.push(Math.round(value))
      }
      allPaths.push(path)
      finalValues.push(Math.round(value))
    }

    finalValues.sort((a, b) => a - b)
    const percentiles = [5, 10, 25, 50, 75, 90, 95]
    const percentileValues: Record<number, number> = {}
    for (const p of percentiles) {
      percentileValues[p] = finalValues[Math.floor(p / 100 * simulations)]
    }

    // Build year-by-year percentile bands
    const yearlyBands: { year: number; p10: number; p25: number; p50: number; p75: number; p90: number }[] = []
    for (let y = 0; y <= years; y++) {
      const vals = allPaths.map(p => p[y]).sort((a, b) => a - b)
      yearlyBands.push({
        year: y,
        p10: vals[Math.floor(0.1 * simulations)],
        p25: vals[Math.floor(0.25 * simulations)],
        p50: vals[Math.floor(0.5 * simulations)],
        p75: vals[Math.floor(0.75 * simulations)],
        p90: vals[Math.floor(0.9 * simulations)],
      })
    }

    const gain = percentileValues[50] - investmentAmount
    const loss = investmentAmount - percentileValues[10]

    return NextResponse.json({
      investmentAmount,
      years,
      allocation: { equity: equityPct, debt: debtPct, gold: goldPct },
      results: {
        worst5pct: percentileValues[5],
        worst10pct: percentileValues[10],
        best25pct: percentileValues[75],
        best10pct: percentileValues[90],
        best5pct: percentileValues[95],
        median: percentileValues[50],
        medianGain: gain,
        medianGainPct: Math.round(gain / investmentAmount * 10000) / 100,
        potentialLoss10pct: loss,
      },
      yearlyBands,
      probabilityOfGain: Math.round(finalValues.filter(v => v > investmentAmount).length / simulations * 100),
      probabilityOfDoubling: Math.round(finalValues.filter(v => v > investmentAmount * 2).length / simulations * 100),
    })
  } catch (error) {
    console.error('Monte Carlo error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
