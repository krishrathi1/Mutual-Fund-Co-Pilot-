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

interface RealtimeReturnRequest {
  fundId: string
  monthlySip: number
  years: number
  planType: 'direct' | 'regular'
}

interface NavEntry {
  date: string // "yyyy-mm-dd"
  nav: number
}

interface SipEntry {
  date: string
  nav: number
  units: number
  invested: number
}

interface YearlyBreakdown {
  year: number
  invested: number
  value: number
  returnPct: number
  units: number
  nav: number
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
      cache: 'no-store', // We manage our own in-memory cache
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
    console.error('[SIP-REALTIME] Failed to fetch MFAPI scheme list:', error)
    if (schemeListCache) {
      console.warn('[SIP-REALTIME] Returning stale cache as fallback')
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
      cache: 'no-store', // We manage our own in-memory cache
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
    console.error(`[SIP-REALTIME] Failed to fetch scheme ${schemeCode}:`, error)
    return []
  }
}

// ---------------------------------------------------------------------------
// Parse MFAPI date "dd-mm-yyyy" → "yyyy-mm-dd"
// ---------------------------------------------------------------------------

function parseMfApiDate(dateStr: string): string {
  const parts = dateStr.trim().split('-')
  if (parts.length !== 3) return ''
  const [dd, mm, yyyy] = parts
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Find the first available NAV date on or after a target date for each month
// ---------------------------------------------------------------------------

function findNavOnOrAfter(navEntries: NavEntry[], targetDate: string, startIdx: number): { nav: number; date: string; idx: number } | null {
  for (let i = startIdx; i < navEntries.length; i++) {
    if (navEntries[i].date >= targetDate) {
      return { nav: navEntries[i].nav, date: navEntries[i].date, idx: i }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Category-based expected returns for fallback projection
// ---------------------------------------------------------------------------

function getCategoryReturn(category: string, subCategory: string): number {
  const cat = category.toLowerCase()
  const sub = subCategory.toLowerCase()

  if (cat === 'debt') return 7
  if (cat === 'hybrid') return 9

  if (sub.includes('small')) return 14
  if (sub.includes('mid')) return 13
  if (sub.includes('sector') || sub.includes('thematic')) return 13
  if (sub.includes('elss')) return 12
  if (sub.includes('index')) return 11

  return 12 // default equity
}

// ---------------------------------------------------------------------------
// Projected fallback calculation
// ---------------------------------------------------------------------------

function calculateProjectedReturns(
  fund: {
    id: string
    schemeName: string
    category: string
    subCategory: string
    directNav: number
    regularNav: number
    directReturn1y: number | null
    directReturn3y: number | null
    directReturn5y: number | null
    regularReturn1y: number | null
    regularReturn3y: number | null
    regularReturn5y: number | null
  },
  monthlySip: number,
  years: number,
  planType: 'direct' | 'regular'
) {
  // Use actual fund returns from DB if available, otherwise category defaults
  let expectedReturn: number
  if (planType === 'direct') {
    if (years <= 1 && fund.directReturn1y !== null) {
      expectedReturn = fund.directReturn1y
    } else if (years <= 3 && fund.directReturn3y !== null) {
      expectedReturn = fund.directReturn3y
    } else if (fund.directReturn5y !== null) {
      expectedReturn = fund.directReturn5y
    } else {
      expectedReturn = getCategoryReturn(fund.category, fund.subCategory)
    }
  } else {
    if (years <= 1 && fund.regularReturn1y !== null) {
      expectedReturn = fund.regularReturn1y
    } else if (years <= 3 && fund.regularReturn3y !== null) {
      expectedReturn = fund.regularReturn3y
    } else if (fund.regularReturn5y !== null) {
      expectedReturn = fund.regularReturn5y
    } else {
      expectedReturn = getCategoryReturn(fund.category, fund.subCategory)
    }
  }

  const monthlyRate = expectedReturn / 100 / 12
  const totalMonths = years * 12
  const latestNav = planType === 'direct' ? fund.directNav : fund.regularNav

  let totalUnits = 0
  let totalInvested = 0
  const navHistory: SipEntry[] = []
  const yearlyBreakdown: YearlyBreakdown[] = []

  let yearStartIdx = 0
  let yearInvested = 0
  let yearStartUnits = 0

  // Simulate monthly SIP using expected return
  let runningNav = latestNav / Math.pow(1 + monthlyRate, totalMonths)

  for (let month = 1; month <= totalMonths; month++) {
    // Approximate NAV for this month
    runningNav = runningNav * (1 + monthlyRate)
    const unitsBought = monthlySip / runningNav
    totalUnits += unitsBought
    totalInvested += monthlySip
    yearInvested += monthlySip

    const date = new Date()
    date.setMonth(date.getMonth() - (totalMonths - month))
    const dateStr = date.toISOString().slice(0, 10)

    navHistory.push({
      date: dateStr,
      nav: Math.round(runningNav * 100) / 100,
      units: Math.round(totalUnits * 100) / 100,
      invested: totalInvested,
    })

    if (month % 12 === 0) {
      const yearNum = Math.floor(month / 12)
      const currentValue = totalUnits * runningNav
      yearlyBreakdown.push({
        year: yearNum,
        invested: Math.round(yearInvested * 100) / 100,
        value: Math.round(currentValue * 100) / 100,
        returnPct: yearInvested > 0 ? Math.round(((currentValue - yearInvested) / yearInvested) * 10000) / 100 : 0,
        units: Math.round(totalUnits * 100) / 100,
        nav: Math.round(runningNav * 100) / 100,
      })
      yearStartUnits = totalUnits
      yearInvested = 0
      yearStartIdx = navHistory.length
    }
  }

  const currentValue = totalUnits * latestNav
  const absoluteReturn = currentValue - totalInvested
  const returnPct = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0
  const annualizedReturn = totalMonths > 0
    ? (Math.pow(currentValue / totalInvested, 12 / totalMonths) - 1) * 100
    : 0

  return {
    source: 'projected' as const,
    fundId: fund.id,
    schemeName: fund.schemeName,
    category: fund.category,
    planType,
    monthlySip,
    years,
    totalInvested: Math.round(totalInvested * 100) / 100,
    currentValue: Math.round(currentValue * 100) / 100,
    absoluteReturn: Math.round(absoluteReturn * 100) / 100,
    returnPct: Math.round(returnPct * 100) / 100,
    annualizedReturn: Math.round(annualizedReturn * 100) / 100,
    navHistory,
    yearlyBreakdown,
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body: RealtimeReturnRequest = await request.json()
    const { fundId, monthlySip, years, planType } = body

    // Validate inputs
    if (!fundId || !monthlySip || !years || !planType) {
      return NextResponse.json(
        { error: 'fundId, monthlySip, years, and planType are required' },
        { status: 400 }
      )
    }

    if (monthlySip <= 0) {
      return NextResponse.json(
        { error: 'monthlySip must be positive' },
        { status: 400 }
      )
    }

    if (years <= 0 || years > 30) {
      return NextResponse.json(
        { error: 'years must be between 1 and 30' },
        { status: 400 }
      )
    }

    if (!['direct', 'regular'].includes(planType)) {
      return NextResponse.json(
        { error: 'planType must be "direct" or "regular"' },
        { status: 400 }
      )
    }

    // Fetch fund from DB
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
        directReturn1y: true,
        directReturn3y: true,
        directReturn5y: true,
        regularReturn1y: true,
        regularReturn3y: true,
        regularReturn5y: true,
      },
    })

    if (!fund) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      )
    }

    const isin = planType === 'direct' ? fund.directIsin : fund.regularIsin

    // ---- Try to fetch REAL data from MFAPI ----
    try {
      const allSchemes = await fetchAllSchemes()

      // Find the scheme code matching the fund's ISIN
      const matchedScheme = allSchemes.find(s => s.isin === isin)

      if (matchedScheme) {
        const navHistoryRaw = await fetchSchemeNavHistory(matchedScheme.schemeCode)

        if (navHistoryRaw.length > 0) {
          // Parse NAV history: MFAPI returns newest first
          const parsedNav: NavEntry[] = []
          for (const entry of navHistoryRaw) {
            const isoDate = parseMfApiDate(entry.date)
            const nav = parseFloat(entry.nav)
            if (isoDate && !isNaN(nav)) {
              parsedNav.push({ date: isoDate, nav })
            }
          }

          // Sort ascending by date (oldest first)
          parsedNav.sort((a, b) => a.date.localeCompare(b.date))

          // Calculate SIP using real NAV data
          const totalMonths = years * 12
          const latestNav = parsedNav[parsedNav.length - 1].nav

          // Find the starting date: totalMonths ago from latest date
          const latestDate = new Date(parsedNav[parsedNav.length - 1].date)
          const startDate = new Date(latestDate)
          startDate.setMonth(startDate.getMonth() - totalMonths)
          const startDateStr = startDate.toISOString().slice(0, 10)

          let totalUnits = 0
          let totalInvested = 0
          const sipEntries: SipEntry[] = []
          const yearlyBreakdown: YearlyBreakdown[] = []

          let yearInvested = 0
          let monthCount = 0
          let currentSipMonth = -1 // Track which month we're in
          let searchStartIdx = 0

          // Find the index to start searching from
          for (let i = 0; i < parsedNav.length; i++) {
            if (parsedNav[i].date >= startDateStr) {
              searchStartIdx = i
              break
            }
          }

          // For each month from startDate to now, find the first available NAV date
          for (let m = 0; m < totalMonths; m++) {
            const sipDate = new Date(startDate)
            sipDate.setMonth(sipDate.getMonth() + m)
            const sipDateStr = sipDate.toISOString().slice(0, 10)

            const result = findNavOnOrAfter(parsedNav, sipDateStr, searchStartIdx)
            if (!result) continue

            searchStartIdx = result.idx + 1

            // Buy units at this NAV
            const unitsBought = monthlySip / result.nav
            totalUnits += unitsBought
            totalInvested += monthlySip
            yearInvested += monthlySip
            monthCount++

            sipEntries.push({
              date: result.date,
              nav: Math.round(result.nav * 100) / 100,
              units: Math.round(totalUnits * 100) / 100,
              invested: totalInvested,
            })

            // Yearly breakdown
            if ((m + 1) % 12 === 0) {
              const yearNum = Math.floor((m + 1) / 12)
              const currentValue = totalUnits * result.nav
              yearlyBreakdown.push({
                year: yearNum,
                invested: Math.round(yearInvested * 100) / 100,
                value: Math.round(currentValue * 100) / 100,
                returnPct: yearInvested > 0 ? Math.round(((currentValue - yearInvested) / yearInvested) * 10000) / 100 : 0,
                units: Math.round(totalUnits * 100) / 100,
                nav: Math.round(result.nav * 100) / 100,
              })
              yearInvested = 0
            }
          }

          if (monthCount > 0) {
            const currentValue = totalUnits * latestNav
            const absoluteReturn = currentValue - totalInvested
            const returnPct = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0
            const annualizedReturn = totalMonths > 0
              ? (Math.pow(currentValue / totalInvested, 12 / totalMonths) - 1) * 100
              : 0

            return NextResponse.json({
              source: 'realtime',
              fundId: fund.id,
              schemeName: matchedScheme.schemeName || fund.schemeName,
              category: fund.category,
              planType,
              monthlySip,
              years,
              totalInvested: Math.round(totalInvested * 100) / 100,
              currentValue: Math.round(currentValue * 100) / 100,
              absoluteReturn: Math.round(absoluteReturn * 100) / 100,
              returnPct: Math.round(returnPct * 100) / 100,
              annualizedReturn: Math.round(annualizedReturn * 100) / 100,
              navHistory: sipEntries,
              yearlyBreakdown,
            })
          }
        }
      }
    } catch (error) {
      console.error('[SIP-REALTIME] MFAPI fetch failed, falling back to projected:', error)
    }

    // ---- Fallback to projected calculation using DB returns ----
    const projected = calculateProjectedReturns(fund, monthlySip, years, planType)
    return NextResponse.json(projected)
  } catch (error) {
    console.error('[SIP-REALTIME] Error calculating SIP returns:', error)
    return NextResponse.json(
      { error: 'Failed to calculate SIP returns' },
      { status: 500 }
    )
  }
}
