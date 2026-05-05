import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fundId = searchParams.get('fundId')
    const inflationRate = parseFloat(searchParams.get('inflation') || '6')

    if (!fundId) {
      const funds = await db.fund.findMany({
        select: { id: true, schemeName: true, category: true, directReturn1y: true, directReturn3y: true, directReturn5y: true, benchmarkReturn1y: true }
      })
      const results = funds.map(f => ({
        id: f.id, schemeName: f.schemeName, category: f.category,
        nominalReturn1y: f.directReturn1y, nominalReturn3y: f.directReturn3y, nominalReturn5y: f.directReturn5y,
        realReturn1y: f.directReturn1y !== null ? Math.round(((1 + f.directReturn1y / 100) / (1 + inflationRate / 100) - 1) * 10000) / 100 : null,
        realReturn3y: f.directReturn3y !== null ? Math.round(((1 + f.directReturn3y / 100) / (1 + inflationRate / 100) - 1) * 10000) / 100 : null,
        realReturn5y: f.directReturn5y !== null ? Math.round(((1 + f.directReturn5y / 100) / (1 + inflationRate / 100) - 1) * 10000) / 100 : null,
      }))
      return NextResponse.json({ inflationRate, funds: results })
    }

    const fund = await db.fund.findUnique({ where: { id: fundId } })
    if (!fund) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const nominalReturns = { '1Y': fund.directReturn1y, '3Y': fund.directReturn3y, '5Y': fund.directReturn5y }
    const realReturns: Record<string, number | null> = {}
    for (const [period, ret] of Object.entries(nominalReturns)) {
      realReturns[period] = ret !== null ? Math.round(((1 + ret / 100) / (1 + inflationRate / 100) - 1) * 10000) / 100 : null
    }

    // Purchasing power erosion over 20 years
    const erosion: { year: number; nominalValue: number; realValue: number; purchasingPower: number }[] = []
    const investAmount = 100000
    for (let y = 0; y <= 20; y += 2) {
      const nominalValue = y === 0 ? investAmount : investAmount * Math.pow(1 + (fund.directReturn3y || 10) / 100, y)
      const realValue = nominalValue / Math.pow(1 + inflationRate / 100, y)
      erosion.push({ year: y, nominalValue: Math.round(nominalValue), realValue: Math.round(realValue), purchasingPower: Math.round(realValue / investAmount * 100) })
    }

    // Future value calculator
    const targetAmount = 5000000
    const requiredReturn = (fund.directReturn3y || 10)
    const yearsNeeded = Math.log(targetAmount / investAmount) / Math.log(1 + requiredReturn / 100)

    return NextResponse.json({
      fund: { id: fund.id, schemeName: fund.schemeName, category: fund.category },
      inflationRate,
      nominalReturns,
      realReturns,
      purchasingPowerErosion: erosion,
      futureValueCalculator: {
        targetAmount,
        investmentNeeded: Math.round(targetAmount / Math.pow(1 + requiredReturn / 100, 10)),
        yearsNeeded: Math.round(yearsNeeded * 10) / 10,
      }
    })
  } catch (error) {
    console.error('Inflation error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
