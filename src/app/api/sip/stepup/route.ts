import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { initialSip, stepUpPct, expectedReturn, years } = await request.json()
    const monthlyReturn = expectedReturn / 100 / 12
    const stepUp = stepUpPct / 100

    // Regular SIP
    let regularValue = 0
    let regularTotalInvested = 0
    const regularYearly: { year: number; monthlySip: number; annualInvested: number; cumulativeInvested: number; corpusValue: number }[] = []

    for (let y = 1; y <= years; y++) {
      const annualInvested = initialSip * 12
      regularTotalInvested += annualInvested
      for (let m = 0; m < 12; m++) {
        regularValue = (regularValue + initialSip) * (1 + monthlyReturn)
      }
      regularYearly.push({ year: y, monthlySip: initialSip, annualInvested, cumulativeInvested: regularTotalInvested, corpusValue: Math.round(regularValue) })
    }

    // Step-Up SIP
    let stepUpValue = 0
    let stepUpTotalInvested = 0
    let currentSip = initialSip
    const stepUpYearly: { year: number; monthlySip: number; annualInvested: number; cumulativeInvested: number; corpusValue: number }[] = []

    for (let y = 1; y <= years; y++) {
      if (y > 1) currentSip = Math.round(currentSip * (1 + stepUp))
      const annualInvested = currentSip * 12
      stepUpTotalInvested += annualInvested
      for (let m = 0; m < 12; m++) {
        stepUpValue = (stepUpValue + currentSip) * (1 + monthlyReturn)
      }
      stepUpYearly.push({ year: y, monthlySip: currentSip, annualInvested, cumulativeInvested: stepUpTotalInvested, corpusValue: Math.round(stepUpValue) })
    }

    const extraCorpus = Math.round(stepUpValue - regularValue)
    const extraInvested = Math.round(stepUpTotalInvested - regularTotalInvested)

    return NextResponse.json({
      regular: { totalInvested: regularTotalInvested, finalCorpus: Math.round(regularValue), gain: Math.round(regularValue - regularTotalInvested), yearly: regularYearly },
      stepUp: { totalInvested: stepUpTotalInvested, finalCorpus: Math.round(stepUpValue), gain: Math.round(stepUpValue - stepUpTotalInvested), yearly: stepUpYearly },
      comparison: { extraCorpus, extraInvested, stepUpAdvantagePct: Math.round(extraCorpus / regularValue * 10000) / 100 }
    })
  } catch (error) {
    console.error('Step-up SIP error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
