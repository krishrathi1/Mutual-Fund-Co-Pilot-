import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      mode,
      amount,
      years,
      expectedReturn,
      stepUpPercent,
      withdrawalAmount,
      transferFrequency,
    } = body

    if (!mode || !amount || !years) {
      return NextResponse.json(
        { error: 'mode, amount, and years are required' },
        { status: 400 }
      )
    }

    if (!['sip', 'stp', 'swp'].includes(mode)) {
      return NextResponse.json(
        { error: 'mode must be sip, stp, or swp' },
        { status: 400 }
      )
    }

    if (amount <= 0 || years <= 0) {
      return NextResponse.json(
        { error: 'amount and years must be positive' },
        { status: 400 }
      )
    }

    if (mode === 'sip') {
      return handleSIP(amount, years, expectedReturn, stepUpPercent)
    } else if (mode === 'stp') {
      return handleSTP(amount, years, expectedReturn, transferFrequency)
    } else {
      return handleSWP(amount, years, expectedReturn, withdrawalAmount)
    }
  } catch (error) {
    console.error('Error in SIP planner:', error)
    return NextResponse.json(
      { error: 'Failed to calculate SIP plan' },
      { status: 500 }
    )
  }
}

function handleSIP(
  amount: number,
  years: number,
  expectedReturn?: number,
  stepUpPercent?: number
) {
  const annualReturn = (expectedReturn || 12) / 100
  const monthlyRate = annualReturn / 12
  const stepUp = stepUpPercent || 0
  const totalMonths = years * 12

  let totalInvested = 0
  let currentValue = 0
  let currentSIP = amount
  const yearlyBreakdown: { year: number; invested: number; value: number; gain: number }[] = []

  let yearInvested = 0

  for (let month = 1; month <= totalMonths; month++) {
    currentValue = (currentValue + currentSIP) * (1 + monthlyRate)
    totalInvested += currentSIP
    yearInvested += currentSIP

    // Step-up at the start of each year (after the first year)
    if (month % 12 === 0) {
      const yearNum = Math.floor(month / 12)
      yearlyBreakdown.push({
        year: yearNum,
        invested: Math.round(yearInvested * 100) / 100,
        value: Math.round(currentValue * 100) / 100,
        gain: Math.round((currentValue - totalInvested) * 100) / 100,
      })
      yearInvested = 0
      currentSIP = currentSIP * (1 + stepUp / 100)
    }
  }

  const finalValue = currentValue
  const wealthGain = finalValue - totalInvested

  return NextResponse.json({
    totalInvested: Math.round(totalInvested * 100) / 100,
    finalValue: Math.round(finalValue * 100) / 100,
    wealthGain: Math.round(wealthGain * 100) / 100,
    yearlyBreakdown,
  })
}

function handleSTP(
  amount: number,
  years: number,
  expectedReturn?: number,
  transferFrequency?: string,
) {
  const sourceReturn = 5 / 100 // Source: debt/liquid fund at 5%
  const targetReturn = (expectedReturn || 12) / 100 // Target: equity fund
  const freq = transferFrequency || 'monthly'
  const periodsPerYear = freq === 'weekly' ? 52 : freq === 'quarterly' ? 4 : 12
  const totalPeriods = years * periodsPerYear
  const transferPerPeriod = amount

  let sourceValue = amount * totalPeriods // Lump sum in source
  let targetValue = 0
  let totalTransferred = 0
  const sourcePeriodRate = sourceReturn / periodsPerYear
  const targetPeriodRate = targetReturn / periodsPerYear

  const yearlyBreakdown: { year: number; totalTransferred: number; sourceValueRemaining: number; targetValueAccumulated: number }[] = []

  for (let period = 1; period <= totalPeriods; period++) {
    // Source grows then transfer out
    sourceValue = sourceValue * (1 + sourcePeriodRate) - transferPerPeriod
    sourceValue = Math.max(0, sourceValue)

    // Target grows with incoming transfer
    targetValue = (targetValue + transferPerPeriod) * (1 + targetPeriodRate)

    totalTransferred += transferPerPeriod

    if (period % periodsPerYear === 0) {
      yearlyBreakdown.push({
        year: Math.floor(period / periodsPerYear),
        totalTransferred: Math.round(totalTransferred * 100) / 100,
        sourceValueRemaining: Math.round(sourceValue * 100) / 100,
        targetValueAccumulated: Math.round(targetValue * 100) / 100,
      })
    }
  }

  return NextResponse.json({
    totalTransferred: Math.round(totalTransferred * 100) / 100,
    sourceValueRemaining: Math.round(sourceValue * 100) / 100,
    targetValueAccumulated: Math.round(targetValue * 100) / 100,
    yearlyBreakdown,
  })
}

function handleSWP(
  amount: number,
  years: number,
  expectedReturn?: number,
  withdrawalAmount?: number,
) {
  const corpus = amount // Initial corpus
  const annualReturn = (expectedReturn || 8) / 100
  const monthlyRate = annualReturn / 12
  const monthlyWithdrawal = withdrawalAmount || corpus * 0.005 // Default 0.5% per month
  const maxMonths = years * 12

  let currentCorpus = corpus
  let totalWithdrawn = 0
  let yearsSustained = 0
  const yearlyBreakdown: { year: number; startCorpus: number; withdrawal: number; endCorpus: number }[] = []

  for (let month = 1; month <= maxMonths; month++) {
    // Corpus grows then withdrawal
    currentCorpus = currentCorpus * (1 + monthlyRate) - monthlyWithdrawal
    totalWithdrawn += monthlyWithdrawal

    if (currentCorpus <= 0) {
      currentCorpus = 0
      yearsSustained = month / 12
      break
    }

    if (month % 12 === 0) {
      const yearNum = Math.floor(month / 12)
      const yearStartCorpus = currentCorpus + monthlyWithdrawal * 12 * (1 - monthlyRate) // approximate
      yearlyBreakdown.push({
        year: yearNum,
        startCorpus: Math.round(yearStartCorpus * 100) / 100,
        withdrawal: Math.round(monthlyWithdrawal * 12 * 100) / 100,
        endCorpus: Math.round(currentCorpus * 100) / 100,
      })
    }
  }

  if (yearsSustained === 0 && currentCorpus > 0) {
    yearsSustained = years
  }

  // Fix yearly breakdown startCorpus properly
  let runningCorpus = corpus
  let yearlyWithdrawal = 0
  for (let month = 1; month <= Math.min(maxMonths, Math.ceil(yearsSustained * 12)); month++) {
    if ((month - 1) % 12 === 0) {
      runningCorpus = month === 1 ? corpus : runningCorpus
      yearlyWithdrawal = 0
    }
    runningCorpus = runningCorpus * (1 + monthlyRate) - monthlyWithdrawal
    yearlyWithdrawal += monthlyWithdrawal
    if (runningCorpus <= 0) {
      runningCorpus = 0
    }
    if (month % 12 === 0) {
      const yb = yearlyBreakdown.find(y => y.year === month / 12)
      if (yb) {
        yb.startCorpus = Math.round((runningCorpus + yearlyWithdrawal * (1 - monthlyRate)) * 100) / 100
        yb.withdrawal = Math.round(yearlyWithdrawal * 100) / 100
        yb.endCorpus = Math.round(runningCorpus * 100) / 100
      }
    }
  }

  return NextResponse.json({
    totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
    corpusRemaining: Math.round(currentCorpus * 100) / 100,
    yearsSustained: Math.round(yearsSustained * 100) / 100,
    yearlyBreakdown,
  })
}
