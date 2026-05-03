import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Simple deterministic seeded PRNG (mulberry32)
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Convert string to numeric seed
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// Category-based volatility and expected return
function getCategoryParams(category: string, subCategory: string): {
  annualVol: number
  annualReturn: number
} {
  const cat = category.toLowerCase()
  const sub = subCategory.toLowerCase()

  if (cat === 'debt') {
    return { annualVol: 0.05, annualReturn: 0.07 }
  }
  if (cat === 'hybrid') {
    return { annualVol: 0.10, annualReturn: 0.09 }
  }

  // Equity sub-categories
  if (sub.includes('small')) {
    return { annualVol: 0.20, annualReturn: 0.14 }
  }
  if (sub.includes('mid')) {
    return { annualVol: 0.18, annualReturn: 0.13 }
  }
  if (sub.includes('sector') || sub.includes('thematic')) {
    return { annualVol: 0.22, annualReturn: 0.13 }
  }
  if (sub.includes('elss')) {
    return { annualVol: 0.16, annualReturn: 0.12 }
  }
  if (sub.includes('index')) {
    return { annualVol: 0.14, annualReturn: 0.11 }
  }

  // Default equity / large cap / flexi cap
  return { annualVol: 0.15, annualReturn: 0.12 }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fundId = searchParams.get('fundId')
    const months = Math.min(Math.max(parseInt(searchParams.get('months') || '36'), 1), 120)

    if (!fundId) {
      return NextResponse.json(
        { error: 'fundId query parameter is required' },
        { status: 400 }
      )
    }

    const fund = await db.fund.findUnique({
      where: { id: fundId },
      select: {
        id: true,
        schemeName: true,
        category: true,
        subCategory: true,
        directNav: true,
        regularNav: true,
        directExpenseRatio: true,
        regularExpenseRatio: true,
      },
    })

    if (!fund) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      )
    }

    const { annualVol, annualReturn } = getCategoryParams(fund.category, fund.subCategory)
    const monthlyVol = annualVol / Math.sqrt(12)
    const monthlyReturn = annualReturn / 12

    // Seed RNG with fundId for deterministic results
    const rng = seededRandom(hashString(fund.id))

    // Generate NAV history going backwards from current NAV
    const navHistory: { date: string; directNav: number; regularNav: number }[] = []
    let currentDirectNav = fund.directNav
    let currentRegularNav = fund.regularNav

    // Start from the current date and go backwards
    const now = new Date()
    const dates: Date[] = []
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      dates.unshift(d)
    }

    // Build forward from the oldest date
    // First, compute what the NAV was months ago by working backwards
    const backwardsNavs: number[] = [currentDirectNav]
    for (let i = 1; i <= months; i++) {
      // Reverse: nav_prev = nav_next / (1 + monthlyReturn + monthlyVol * randomShock)
      const randomShock = (rng() - 0.5) * 2 // Range -1 to 1
      const monthlyChange = 1 + monthlyReturn + monthlyVol * randomShock
      const prevNav = backwardsNavs[i - 1] / Math.max(0.5, monthlyChange)
      backwardsNavs.unshift(prevNav)
    }

    // The expense ratio difference between regular and direct
    const expenseDiff = (fund.regularExpenseRatio - fund.directExpenseRatio) / 10000 // Convert bps to decimal

    // Build NAV history
    for (let i = 0; i < months; i++) {
      const directNav = Math.round(backwardsNavs[i] * 100) / 100
      // Regular NAV is slightly higher historically (before expense erosion catches up)
      // Approximate: regular NAV tracks direct but with expense drag
      const regularNav = Math.round((directNav * (1 + expenseDiff * (months - i) / 12)) * 100) / 100

      navHistory.push({
        date: dates[i].toISOString().slice(0, 10),
        directNav,
        regularNav,
      })
    }

    // Override the last entry with actual current NAV
    if (navHistory.length > 0) {
      navHistory[navHistory.length - 1].directNav = fund.directNav
      navHistory[navHistory.length - 1].regularNav = fund.regularNav
    }

    return NextResponse.json({
      fundId: fund.id,
      schemeName: fund.schemeName,
      navHistory,
    })
  } catch (error) {
    console.error('Error generating NAV history:', error)
    return NextResponse.json(
      { error: 'Failed to generate NAV history' },
      { status: 500 }
    )
  }
}
