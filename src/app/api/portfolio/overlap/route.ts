import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Fund Overlap Analysis - Detect overlapping holdings across funds

interface HoldingEntry {
  name: string
  weight: number
  sector: string
}

function parseTopHoldings(raw: string | null): HoldingEntry[] {
  if (!raw) return []
  try {
    return JSON.parse(raw) as HoldingEntry[]
  } catch {
    return []
  }
}

function calculateOverlapScore(
  holdings1: HoldingEntry[],
  holdings2: HoldingEntry[],
  fund1: { category: string; subCategory: string; benchmark: string; riskometer: string; aumCrore: number; equityPercentage: number | null; debtPercentage: number | null },
  fund2: { category: string; subCategory: string; benchmark: string; riskometer: string; aumCrore: number; equityPercentage: number | null; debtPercentage: number | null }
): { score: number; commonExposure: string[]; overlapLevel: string; recommendation: string } {
  let score = 0
  const commonExposure: string[] = []

  // Factor 1: Same category + subCategory (biggest overlap indicator)
  if (fund1.category === fund2.category && fund1.subCategory === fund2.subCategory) {
    score += 40
    commonExposure.push(`Same category: ${fund1.category} - ${fund1.subCategory}`)
  } else if (fund1.category === fund2.category) {
    score += 15
    commonExposure.push(`Same broad category: ${fund1.category}`)
  }

  // Factor 2: Same benchmark (funds tracking same benchmark have high overlap)
  if (fund1.benchmark && fund2.benchmark && fund1.benchmark === fund2.benchmark) {
    score += 25
    commonExposure.push(`Same benchmark: ${fund1.benchmark}`)
  }

  // Factor 3: Common top holdings
  const names1 = new Set(holdings1.map(h => h.name.toLowerCase().trim()))
  const names2 = new Set(holdings2.map(h => h.name.toLowerCase().trim()))
  const commonStocks = [...names1].filter(n => names2.has(n))

  if (commonStocks.length > 0) {
    // Calculate weighted overlap
    const totalWeight1 = holdings1
      .filter(h => names2.has(h.name.toLowerCase().trim()))
      .reduce((sum, h) => sum + h.weight, 0)
    const totalWeight2 = holdings2
      .filter(h => names1.has(h.name.toLowerCase().trim()))
      .reduce((sum, h) => sum + h.weight, 0)
    const avgCommonWeight = (totalWeight1 + totalWeight2) / 2

    score += Math.min(avgCommonWeight, 30) // Cap at 30 points

    for (const stock of commonStocks.slice(0, 5)) {
      const h1 = holdings1.find(h => h.name.toLowerCase().trim() === stock)
      if (h1 && !commonExposure.includes(h1.name)) {
        commonExposure.push(h1.name)
      }
    }
  }

  // Factor 4: Sector overlap (from topHoldings data)
  const sectors1 = new Set(holdings1.map(h => h.sector?.toLowerCase().trim()).filter(Boolean))
  const sectors2 = new Set(holdings2.map(h => h.sector?.toLowerCase().trim()).filter(Boolean))
  const commonSectors = [...sectors1].filter(s => sectors2.has(s))
  if (commonSectors.length > 0 && sectors1.size > 0 && sectors2.size > 0) {
    const sectorOverlapPct = (commonSectors.length / Math.max(sectors1.size, sectors2.size)) * 100
    score += Math.min(sectorOverlapPct * 0.1, 10) // Up to 10 points
  }

  // Factor 5: Same riskometer
  if (fund1.riskometer && fund2.riskometer && fund1.riskometer === fund2.riskometer) {
    score += 5
  }

  // Factor 6: Similar equity/debt allocation
  const eq1 = fund1.equityPercentage ?? (fund1.category === 'Equity' || fund1.category === 'ELSS' ? 95 : fund1.category === 'Debt' ? 5 : 65)
  const eq2 = fund2.equityPercentage ?? (fund2.category === 'Equity' || fund2.category === 'ELSS' ? 95 : fund2.category === 'Debt' ? 5 : 65)
  const allocationDiff = Math.abs(eq1 - eq2)
  if (allocationDiff < 10) {
    score += 5
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score))

  // Determine overlap level
  let overlapLevel: string
  if (score >= 70) overlapLevel = 'Very High'
  else if (score >= 50) overlapLevel = 'High'
  else if (score >= 30) overlapLevel = 'Moderate'
  else if (score >= 15) overlapLevel = 'Low'
  else overlapLevel = 'Minimal'

  // Generate recommendation
  let recommendation: string
  if (score >= 70) {
    recommendation = 'These funds have very high overlap. Consider replacing one with a fund from a different category/sub-category to improve diversification.'
  } else if (score >= 50) {
    recommendation = 'Significant overlap detected. Review if both funds are necessary in your portfolio. You may benefit from diversifying into a different sub-category or asset class.'
  } else if (score >= 30) {
    recommendation = 'Moderate overlap. Some common holdings exist, but the funds serve different enough purposes. Monitor periodically to ensure diversification goals are met.'
  } else if (score >= 15) {
    recommendation = 'Low overlap. These funds complement each other well. Minor common exposures are expected in similar market segments.'
  } else {
    recommendation = 'Minimal overlap. These funds provide good diversification across different segments of the market.'
  }

  return { score, commonExposure, overlapLevel, recommendation }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fundIds }: { fundIds: string[] } = body

    if (!fundIds || !Array.isArray(fundIds) || fundIds.length < 2) {
      return NextResponse.json(
        { error: 'fundIds array is required with at least 2 fund IDs' },
        { status: 400 }
      )
    }

    if (fundIds.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 funds can be compared at once' },
        { status: 400 }
      )
    }

    const funds = await db.fund.findMany({
      where: { id: { in: fundIds } },
    })

    if (funds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 valid funds are required for overlap analysis' },
        { status: 404 }
      )
    }

    // Pre-parse topHoldings for each fund
    const fundHoldingsMap = new Map<string, HoldingEntry[]>()
    for (const fund of funds) {
      fundHoldingsMap.set(fund.id, parseTopHoldings(fund.topHoldings))
    }

    // Calculate pairwise overlaps
    const overlaps = []
    for (let i = 0; i < funds.length; i++) {
      for (let j = i + 1; j < funds.length; j++) {
        const fund1 = funds[i]
        const fund2 = funds[j]

        const holdings1 = fundHoldingsMap.get(fund1.id) ?? []
        const holdings2 = fundHoldingsMap.get(fund2.id) ?? []

        const overlap = calculateOverlapScore(holdings1, holdings2, fund1, fund2)

        overlaps.push({
          fund1: fund1.id,
          fund2: fund2.id,
          fund1Name: fund1.schemeName,
          fund2Name: fund2.schemeName,
          overlapScore: Math.round(overlap.score),
          overlapLevel: overlap.overlapLevel,
          commonExposure: overlap.commonExposure,
          recommendation: overlap.recommendation,
        })
      }
    }

    // Sort by overlap score descending (highest overlap first)
    overlaps.sort((a, b) => b.overlapScore - a.overlapScore)

    // Overall portfolio diversification assessment
    const avgOverlap = overlaps.length > 0
      ? overlaps.reduce((sum, o) => sum + o.overlapScore, 0) / overlaps.length
      : 0

    let diversificationRating: string
    if (avgOverlap >= 50) diversificationRating = 'Poor - High overlap across portfolio'
    else if (avgOverlap >= 35) diversificationRating = 'Fair - Some overlaps need attention'
    else if (avgOverlap >= 20) diversificationRating = 'Good - Well diversified with minor overlaps'
    else diversificationRating = 'Excellent - Minimal overlap, strong diversification'

    return NextResponse.json({
      overlaps,
      summary: {
        totalPairs: overlaps.length,
        highOverlapPairs: overlaps.filter(o => o.overlapScore >= 50).length,
        averageOverlap: Math.round(avgOverlap),
        diversificationRating,
      },
    })
  } catch (error) {
    console.error('Error analyzing fund overlap:', error)
    return NextResponse.json(
      { error: 'Failed to analyze fund overlap' },
      { status: 500 }
    )
  }
}
