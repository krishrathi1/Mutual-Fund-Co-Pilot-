import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

function normalizeCategory(category: string): 'equity' | 'debt' | 'hybrid' {
  const cat = category.toLowerCase()
  if (cat === 'equity' || cat === 'elss' || cat === 'index') return 'equity'
  if (cat === 'debt') return 'debt'
  return 'hybrid'
}

// Calculate Herfindahl-Hirschman Index (lower = more diversified)
function calculateHHI(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0)
  if (total === 0) return 1
  return weights.reduce((sum, w) => sum + (w / total) ** 2, 0)
}

function getGrade(score: number): string {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 65) return 'B'
  if (score >= 50) return 'C'
  if (score >= 35) return 'D'
  return 'F'
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
            fundHouse: true,
            topHoldings: true,
            equityPercentage: true,
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

    const totalPortfolio = holdings.reduce((sum, h) => sum + h.currentAmount, 0)
    const suggestions: string[] = []

    // 1. Category Diversity (30 pts)
    const categoryMap: Record<string, number> = {}
    for (const holding of holdings) {
      const cat = normalizeCategory(holding.fund.category)
      categoryMap[cat] = (categoryMap[cat] || 0) + holding.currentAmount
    }
    const categoryCount = Object.keys(categoryMap).length
    const categoryWeights = Object.values(categoryMap)
    const categoryHHI = calculateHHI(categoryWeights)

    // Score: 3 categories = 30, 2 = 20, 1 = 10, minus HHI penalty
    let categoryScore = Math.min(30, categoryCount * 10)
    // Penalize for concentration within categories
    const categoryEvenness = categoryHHI < 1 ? (1 - categoryHHI) * 10 : 0
    categoryScore = Math.round(categoryScore * (0.7 + 0.3 * Math.min(1, categoryEvenness / 5)))
    categoryScore = Math.min(30, Math.max(0, categoryScore))

    if (categoryCount < 3) {
      suggestions.push(`Consider adding ${categoryCount === 1 ? 'debt and hybrid' : 'hybrid'} funds to diversify across asset classes`)
    }
    if (categoryHHI > 0.6) {
      suggestions.push('Your portfolio is concentrated in one category. Spread investments across equity, debt, and hybrid')
    }

    // 2. Fund House Diversity (20 pts)
    const fundHouseMap: Record<string, number> = {}
    for (const holding of holdings) {
      const house = holding.fund.fundHouse
      fundHouseMap[house] = (fundHouseMap[house] || 0) + holding.currentAmount
    }
    const fundHouseCount = Object.keys(fundHouseMap).length
    const fundHouseWeights = Object.values(fundHouseMap)
    const fundHouseHHI = calculateHHI(fundHouseWeights)

    // Score: more AMCs = better, max 20 pts
    let fundHouseScore: number
    if (fundHouseCount >= 5) {
      fundHouseScore = 20
    } else if (fundHouseCount >= 3) {
      fundHouseScore = 15
    } else if (fundHouseCount >= 2) {
      fundHouseScore = 10
    } else {
      fundHouseScore = 5
    }
    // Adjust for concentration
    fundHouseScore = Math.round(fundHouseScore * (0.6 + 0.4 * Math.min(1, (1 - fundHouseHHI) * 2)))
    fundHouseScore = Math.min(20, Math.max(0, fundHouseScore))

    if (fundHouseCount === 1) {
      suggestions.push('All your funds are from a single AMC. Diversify across multiple fund houses to reduce manager risk')
    } else if (fundHouseHHI > 0.5) {
      const topHouse = Object.entries(fundHouseMap).sort(([, a], [, b]) => b - a)[0]
      suggestions.push(`${topHouse[0]} dominates your portfolio. Consider spreading to other AMCs`)
    }

    // 3. Sector Diversity (25 pts)
    const sectorMap: Record<string, number> = {}
    for (const holding of holdings) {
      if (holding.fund.topHoldings) {
        try {
          const parsed = JSON.parse(holding.fund.topHoldings)
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item.sector && item.weight) {
                const sectorWeight = (Number(item.weight) / 100) * holding.currentAmount
                sectorMap[String(item.sector)] = (sectorMap[String(item.sector)] || 0) + sectorWeight
              }
            }
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    const sectorCount = Object.keys(sectorMap).length
    const sectorWeights = Object.values(sectorMap)
    const sectorHHI = sectorWeights.length > 0 ? calculateHHI(sectorWeights) : 1

    // Score based on number of sectors and evenness
    let sectorScore: number
    if (sectorCount >= 8) {
      sectorScore = 25
    } else if (sectorCount >= 5) {
      sectorScore = 18
    } else if (sectorCount >= 3) {
      sectorScore = 12
    } else if (sectorCount >= 1) {
      sectorScore = 6
    } else {
      sectorScore = 10 // Default if no sector data
    }
    // Adjust for concentration
    if (sectorCount > 1) {
      sectorScore = Math.round(sectorScore * (0.6 + 0.4 * Math.min(1, (1 - sectorHHI) * 2.5)))
    }
    sectorScore = Math.min(25, Math.max(0, sectorScore))

    if (sectorCount < 5 && sectorCount > 0) {
      suggestions.push('Your portfolio has limited sector exposure. Consider funds that cover more sectors like Healthcare, IT, and FMCG')
    }
    if (sectorHHI > 0.3 && sectorCount > 0) {
      const topSector = Object.entries(sectorMap).sort(([, a], [, b]) => b - a)[0]
      suggestions.push(`${topSector[0]} sector dominates your portfolio. Add exposure to other sectors for balance`)
    }

    // 4. Market Cap Diversity (25 pts)
    const marketCapMap: Record<string, number> = { 'Large Cap': 0, 'Mid Cap': 0, 'Small Cap': 0, 'Other': 0 }
    for (const holding of holdings) {
      const sub = (holding.fund.subCategory || '').toLowerCase()
      const amount = holding.currentAmount
      if (sub.includes('large')) {
        marketCapMap['Large Cap'] += amount
      } else if (sub.includes('mid')) {
        marketCapMap['Mid Cap'] += amount
      } else if (sub.includes('small')) {
        marketCapMap['Small Cap'] += amount
      } else {
        marketCapMap['Other'] += amount
      }
    }

    const marketCapCategories = Object.entries(marketCapMap).filter(([, v]) => v > 0)
    const marketCapCount = marketCapCategories.length
    const marketCapWeights = marketCapCategories.map(([, v]) => v)
    const marketCapHHI = marketCapWeights.length > 0 ? calculateHHI(marketCapWeights) : 1

    let marketCapScore: number
    if (marketCapCount >= 3) {
      marketCapScore = 25
    } else if (marketCapCount >= 2) {
      marketCapScore = 16
    } else {
      marketCapScore = 8
    }
    // Adjust for concentration
    if (marketCapCount > 1) {
      marketCapScore = Math.round(marketCapScore * (0.6 + 0.4 * Math.min(1, (1 - marketCapHHI) * 2.5)))
    }
    marketCapScore = Math.min(25, Math.max(0, marketCapScore))

    if (marketCapCount < 3) {
      suggestions.push('Add exposure to different market cap segments (large, mid, small cap) for better diversification')
    }
    if (marketCapMap['Large Cap'] > totalPortfolio * 0.7) {
      suggestions.push('Portfolio is heavily tilted toward large caps. Consider adding mid and small cap funds')
    }
    if (marketCapMap['Small Cap'] === 0 && marketCapMap['Mid Cap'] > 0) {
      suggestions.push('Consider adding small cap exposure for higher growth potential')
    }

    // Overall score
    const overallScore = categoryScore + fundHouseScore + sectorScore + marketCapScore
    const grade = getGrade(overallScore)

    // Add general suggestions based on overall score
    if (overallScore < 50) {
      suggestions.push('Your portfolio needs significant diversification improvement. Focus on adding different asset classes and fund houses')
    }
    if (holdings.length < 3) {
      suggestions.push('Consider adding more funds to your portfolio for better diversification')
    }
    if (holdings.length > 15) {
      suggestions.push('Too many funds may lead to over-diversification and diminished returns. Consider consolidating')
    }

    const breakdown = [
      {
        metric: 'Category Diversity',
        score: categoryScore,
        maxScore: 30,
        description: `Spread across ${categoryCount} asset categor${categoryCount === 1 ? 'y' : 'ies'} (Equity, Debt, Hybrid)`,
      },
      {
        metric: 'Fund House Diversity',
        score: fundHouseScore,
        maxScore: 20,
        description: `Invested across ${fundHouseCount} fund house${fundHouseCount === 1 ? '' : 's'}`,
      },
      {
        metric: 'Sector Diversity',
        score: sectorScore,
        maxScore: 25,
        description: sectorCount > 0
          ? `Exposure to ${sectorCount} sector${sectorCount === 1 ? '' : 's'}`
          : 'Sector data not available, estimated score',
      },
      {
        metric: 'Market Cap Diversity',
        score: marketCapScore,
        maxScore: 25,
        description: `Invested across ${marketCapCount} market cap segment${marketCapCount === 1 ? '' : 's'}`,
      },
    ]

    return NextResponse.json({
      overallScore,
      grade,
      breakdown,
      suggestions: suggestions.slice(0, 6),
    })
  } catch (error) {
    console.error('Error calculating diversification score:', error)
    return NextResponse.json(
      { error: 'Failed to calculate diversification score' },
      { status: 500 }
    )
  }
}
