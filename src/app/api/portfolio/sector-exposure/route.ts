import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Mock sector data generators based on fund category
const CATEGORY_SECTORS: Record<string, { name: string; weight: number }[]> = {
  'Large Cap': [
    { name: 'Financial Services', weight: 28 },
    { name: 'IT', weight: 15 },
    { name: 'Energy', weight: 12 },
    { name: 'Consumer Goods', weight: 10 },
    { name: 'Healthcare', weight: 8 },
    { name: 'Automobile', weight: 7 },
    { name: 'Metals & Mining', weight: 5 },
    { name: 'FMCG', weight: 5 },
  ],
  'Mid Cap': [
    { name: 'Financial Services', weight: 20 },
    { name: 'Chemicals', weight: 14 },
    { name: 'Healthcare', weight: 12 },
    { name: 'IT', weight: 10 },
    { name: 'Consumer Goods', weight: 10 },
    { name: 'Construction', weight: 9 },
    { name: 'Automobile', weight: 8 },
  ],
  'Small Cap': [
    { name: 'Chemicals', weight: 18 },
    { name: 'Textiles', weight: 12 },
    { name: 'Healthcare', weight: 11 },
    { name: 'Construction', weight: 10 },
    { name: 'IT', weight: 9 },
    { name: 'Financial Services', weight: 8 },
    { name: 'Consumer Goods', weight: 8 },
  ],
  'Flexi Cap': [
    { name: 'Financial Services', weight: 25 },
    { name: 'IT', weight: 13 },
    { name: 'Healthcare', weight: 11 },
    { name: 'Consumer Goods', weight: 10 },
    { name: 'Energy', weight: 9 },
    { name: 'Automobile', weight: 7 },
    { name: 'Metals & Mining', weight: 6 },
  ],
  'ELSS': [
    { name: 'Financial Services', weight: 26 },
    { name: 'IT', weight: 14 },
    { name: 'Healthcare', weight: 11 },
    { name: 'Consumer Goods', weight: 10 },
    { name: 'Energy', weight: 9 },
    { name: 'Automobile', weight: 8 },
  ],
}

const DEFAULT_SECTORS = [
  { name: 'Financial Services', weight: 22 },
  { name: 'IT', weight: 13 },
  { name: 'Healthcare', weight: 10 },
  { name: 'Consumer Goods', weight: 9 },
  { name: 'Energy', weight: 8 },
  { name: 'Automobile', weight: 7 },
  { name: 'Metals & Mining', weight: 6 },
]

function generateMockSectors(category: string, subCategory: string): { name: string; weight: number }[] {
  const key = subCategory || category
  return CATEGORY_SECTORS[key] || DEFAULT_SECTORS
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const holdings = await db.holding.findMany({
      where: { sessionId },
      include: {
        fund: {
          select: {
            schemeName: true,
            category: true,
            subCategory: true,
            topHoldings: true,
          },
        },
      },
    })

    if (holdings.length === 0) {
      return NextResponse.json(
        { error: 'No holdings found for this session' },
        { status: 404 }
      )
    }

    // Aggregate sector weights
    const sectorMap: Record<string, { weight: number; fundNames: Set<string> }> = {}
    let totalWeight = 0

    for (const holding of holdings) {
      const amount = holding.currentAmount
      let sectors: { name: string; weight: number }[] = []

      // Try parsing topHoldings JSON
      if (holding.fund.topHoldings) {
        try {
          const parsed = JSON.parse(holding.fund.topHoldings)
          if (Array.isArray(parsed) && parsed.length > 0) {
            sectors = parsed
              .filter((h: Record<string, unknown>) => h.sector && h.weight)
              .map((h: Record<string, unknown>) => ({
                name: String(h.sector),
                weight: Number(h.weight),
              }))
          }
        } catch {
          // Invalid JSON, fall through to mock
        }
      }

      // If no topHoldings data, generate mock sectors
      if (sectors.length === 0) {
        sectors = generateMockSectors(holding.fund.category, holding.fund.subCategory)
      }

      // Weight sectors by holding amount
      for (const sector of sectors) {
        const weightedAmount = (sector.weight / 100) * amount
        if (!sectorMap[sector.name]) {
          sectorMap[sector.name] = { weight: 0, fundNames: new Set() }
        }
        sectorMap[sector.name].weight += weightedAmount
        sectorMap[sector.name].fundNames.add(holding.fund.schemeName)
        totalWeight += weightedAmount
      }
    }

    // Calculate percentages and format
    const sectors = Object.entries(sectorMap)
      .map(([name, data]) => ({
        name,
        weight: totalWeight > 0
          ? Math.round((data.weight / totalWeight) * 10000) / 100
          : 0,
        fundCount: data.fundNames.size,
        topFunds: Array.from(data.fundNames).slice(0, 3),
      }))
      .sort((a, b) => b.weight - a.weight)

    // Calculate exposure by category
    let totalEquityExposure = 0
    let totalDebtExposure = 0

    for (const holding of holdings) {
      const cat = holding.fund.category.toLowerCase()
      if (cat === 'equity' || cat === 'elss' || cat === 'index') {
        totalEquityExposure += holding.currentAmount
      } else if (cat === 'debt') {
        totalDebtExposure += holding.currentAmount
      } else if (cat === 'hybrid') {
        // Split hybrid 65/35 equity/debt
        totalEquityExposure += holding.currentAmount * 0.65
        totalDebtExposure += holding.currentAmount * 0.35
      }
    }

    const totalPortfolio = holdings.reduce((s, h) => s + h.currentAmount, 0)

    // Diversification score: based on how spread out sector weights are
    // Perfect diversification = equal weights across all sectors
    const numSectors = sectors.length
    let diversificationScore = 0
    if (numSectors > 0 && totalWeight > 0) {
      // Herfindahl index: lower = more diversified
      const hhi = sectors.reduce((sum, s) => sum + (s.weight / 100) ** 2, 0)
      const maxHHI = 1 // single sector
      const minHHI = 1 / numSectors // perfectly equal
      diversificationScore = Math.round(
        ((maxHHI - hhi) / (maxHHI - minHHI)) * 100
      )
    }

    return NextResponse.json({
      sectors,
      totalEquityExposure: Math.round(totalEquityExposure * 100) / 100,
      totalDebtExposure: Math.round(totalDebtExposure * 100) / 100,
      diversificationScore: Math.min(100, Math.max(0, diversificationScore)),
      totalPortfolio: Math.round(totalPortfolio * 100) / 100,
    })
  } catch (error) {
    console.error('Error analyzing sector exposure:', error)
    return NextResponse.json(
      { error: 'Failed to analyze sector exposure' },
      { status: 500 }
    )
  }
}
