import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AmfiScheme {
  schemeCode: number
  schemeName: string
  nav: string
  date: string
  isin: string
}

interface AmfiSchemeDetail {
  date: string // "dd-mm-yyyy"
  nav: string // "123.45"
}

interface AmfiSchemeResponse {
  status: string
  meta?: {
    scheme_code?: number
    scheme_name?: string
    isin?: string
  }
  data: AmfiSchemeDetail[]
}

interface CacheEntry {
  data: AmfiScheme[]
  fetchedAt: number
}

// ---------------------------------------------------------------------------
// In-memory cache for MFAPI scheme list – 24-hour TTL
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

let schemeListCache: CacheEntry | null = null

function isCacheValid(): boolean {
  if (!schemeListCache) return false
  return Date.now() - schemeListCache.fetchedAt < CACHE_TTL_MS
}

// ---------------------------------------------------------------------------
// Fetch all schemes from MFAPI
// ---------------------------------------------------------------------------

async function fetchAllSchemes(): Promise<AmfiScheme[]> {
  if (isCacheValid() && schemeListCache) {
    return schemeListCache.data
  }

  try {
    const res = await fetch('https://api.mfapi.in/mf', {
      cache: 'no-store', // We manage our own in-memory cache with TTL
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FundVista/1.0',
      },
    })

    if (!res.ok) {
      throw new Error(`MFAPI returned ${res.status}`)
    }

    const data: AmfiScheme[] = await res.json()
    schemeListCache = { data, fetchedAt: Date.now() }
    return data
  } catch (error) {
    console.error('[NAV-HISTORY] Failed to fetch MFAPI scheme list:', error)
    if (schemeListCache) {
      console.warn('[NAV-HISTORY] Returning stale cache as fallback')
      return schemeListCache.data
    }
    throw error
  }
}

// ---------------------------------------------------------------------------
// Fetch NAV history for a single scheme code from MFAPI
// ---------------------------------------------------------------------------

async function fetchSchemeNavHistory(schemeCode: number): Promise<AmfiSchemeDetail[]> {
  try {
    const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
      cache: 'no-store', // We manage our own cache
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FundVista/1.0',
      },
    })

    if (!res.ok) return []

    const json: AmfiSchemeResponse = await res.json()

    if (json.status !== 'SUCCESS' || !json.data || json.data.length === 0) {
      return []
    }

    return json.data
  } catch (error) {
    console.error(`[NAV-HISTORY] Failed to fetch scheme ${schemeCode}:`, error)
    return []
  }
}

// ---------------------------------------------------------------------------
// Parse MFAPI date format "dd-mm-yyyy" to ISO "yyyy-mm-dd"
// ---------------------------------------------------------------------------

function parseMfApiDate(dateStr: string): string {
  const parts = dateStr.trim().split('-')
  if (parts.length !== 3) return ''
  const [dd, mm, yyyy] = parts
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// SIMULATED FALLBACK (kept from original code)
// ---------------------------------------------------------------------------

function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

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

  return { annualVol: 0.15, annualReturn: 0.12 }
}

function generateSimulatedNavHistory(
  fund: {
    id: string
    schemeName: string
    category: string
    subCategory: string
    directNav: number
    regularNav: number
    directExpenseRatio: number
    regularExpenseRatio: number
  },
  months: number
): { fundId: string; schemeName: string; source: 'simulated'; navHistory: { date: string; directNav: number; regularNav: number }[] } {
  const { annualVol, annualReturn } = getCategoryParams(fund.category, fund.subCategory)
  const monthlyVol = annualVol / Math.sqrt(12)
  const monthlyReturn = annualReturn / 12

  const rng = seededRandom(hashString(fund.id))

  const navHistory: { date: string; directNav: number; regularNav: number }[] = []
  
  const now = new Date()
  const dates: Date[] = []
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    dates.unshift(d)
  }

  // Monthly expense difference in decimal
  const monthlyExpenseDiff = (fund.regularExpenseRatio - fund.directExpenseRatio) / 100 / 12

  let currentDirect = fund.directNav
  let currentRegular = fund.regularNav

  const backwardsNavs: { direct: number; regular: number }[] = [{ direct: currentDirect, regular: currentRegular }]

  for (let i = 1; i < months; i++) {
    const randomShock = (rng() - 0.5) * 2
    const r = monthlyReturn + monthlyVol * randomShock
    
    // Backwards growth factors
    // Forward: NAV_new = NAV_old * (1 + r)
    // Backward: NAV_old = NAV_new / (1 + r)
    const gDirect = 1 + r
    const gRegular = 1 + r - monthlyExpenseDiff
    
    currentDirect = currentDirect / Math.max(0.5, gDirect)
    currentRegular = currentRegular / Math.max(0.5, gRegular)
    
    backwardsNavs.unshift({ direct: currentDirect, regular: currentRegular })
  }

  for (let i = 0; i < months; i++) {
    navHistory.push({
      date: dates[i].toISOString().slice(0, 10),
      directNav: Math.round(backwardsNavs[i].direct * 100) / 100,
      regularNav: Math.round(backwardsNavs[i].regular * 100) / 100,
    })
  }

  return {
    fundId: fund.id,
    schemeName: fund.schemeName,
    source: 'simulated',
    navHistory,
  }
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

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
        directIsin: true,
        regularIsin: true,
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

    // ---- Try to fetch REAL data from MFAPI ----
    try {
      const allSchemes = await fetchAllSchemes()

      // Find scheme codes matching the fund's ISINs
      const directScheme = allSchemes.find(s => s.isin === fund.directIsin)
      const regularScheme = allSchemes.find(s => s.isin === fund.regularIsin)

      if (directScheme || regularScheme) {
        // Fetch NAV history for both plan types
        const [directHistoryRaw, regularHistoryRaw] = await Promise.all([
          directScheme ? fetchSchemeNavHistory(directScheme.schemeCode) : Promise.resolve([]),
          regularScheme ? fetchSchemeNavHistory(regularScheme.schemeCode) : Promise.resolve([]),
        ])

        // Parse and index direct NAV history by date
        const directNavMap = new Map<string, number>()
        for (const entry of directHistoryRaw) {
          const isoDate = parseMfApiDate(entry.date)
          const nav = parseFloat(entry.nav)
          if (isoDate && !isNaN(nav)) {
            if (!directNavMap.has(isoDate)) {
              directNavMap.set(isoDate, nav)
            }
          }
        }

        // Parse and index regular NAV history by date
        const regularNavMap = new Map<string, number>()
        for (const entry of regularHistoryRaw) {
          const isoDate = parseMfApiDate(entry.date)
          const nav = parseFloat(entry.nav)
          if (isoDate && !isNaN(nav)) {
            if (!regularNavMap.has(isoDate)) {
              regularNavMap.set(isoDate, nav)
            }
          }
        }

        // Build combined NAV history
        const allDates = new Set<string>([
          ...directNavMap.keys(),
          ...regularNavMap.keys(),
        ])

        const cutoffDate = new Date()
        cutoffDate.setMonth(cutoffDate.getMonth() - months)
        const cutoffStr = cutoffDate.toISOString().slice(0, 10)

        const navHistory: { date: string; directNav: number; regularNav: number }[] = []

        const sortedDates = Array.from(allDates)
          .filter(d => d >= cutoffStr)
          .sort()

        // Expense ratio diff to estimate missing data
        const annualDiff = (fund.regularExpenseRatio - fund.directExpenseRatio) / 100

        for (const date of sortedDates) {
          let directNav = directNavMap.get(date)
          let regularNav = regularNavMap.get(date)

          // If one is missing, estimate it from the other
          if (directNav !== undefined && regularNav === undefined) {
            // Estimate regularNav from directNav
            regularNav = directNav * (fund.regularNav / fund.directNav)
          } else if (directNav === undefined && regularNav !== undefined) {
            // Estimate directNav from regularNav
            directNav = regularNav * (fund.directNav / fund.regularNav)
          }

          if (directNav !== undefined && regularNav !== undefined) {
            navHistory.push({
              date,
              directNav: Math.round(directNav * 100) / 100,
              regularNav: Math.round(regularNav * 100) / 100,
            })
          }
        }

        // Only return if we have meaningful data
        if (navHistory.length >= 2) {
          return NextResponse.json({
            fundId: fund.id,
            schemeName: fund.schemeName,
            source: 'amfi',
            navHistory,
          })
        }
      }
    } catch (error) {
      console.error('[NAV-HISTORY] MFAPI fetch failed, falling back to simulation:', error)
    }

    // ---- Fallback to simulated data ----
    const simulated = generateSimulatedNavHistory(fund, months)
    return NextResponse.json(simulated)
  } catch (error) {
    console.error('Error generating NAV history:', error)
    return NextResponse.json(
      { error: 'Failed to generate NAV history' },
      { status: 500 }
    )
  }
}
