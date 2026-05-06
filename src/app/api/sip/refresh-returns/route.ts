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
    console.error('[REFRESH-RETURNS] Failed to fetch MFAPI scheme list:', error)
    if (schemeListCache) {
      console.warn('[REFRESH-RETURNS] Returning stale cache as fallback')
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
    console.error(`[REFRESH-RETURNS] Failed to fetch scheme ${schemeCode}:`, error)
    return []
  }
}

// ---------------------------------------------------------------------------
// Parse MFAPI date "dd-mm-yyyy" → Date object
// ---------------------------------------------------------------------------

function parseMfApiDate(dateStr: string): Date | null {
  const parts = dateStr.trim().split('-')
  if (parts.length !== 3) return null
  const [dd, mm, yyyy] = parts
  const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00Z`)
  return isNaN(d.getTime()) ? null : d
}

// ---------------------------------------------------------------------------
// Calculate annualized return from NAV history
// ---------------------------------------------------------------------------

interface NavPoint {
  date: Date
  nav: number
}

function calculateReturns(navHistory: NavPoint[]): {
  return1y: number | null
  return3y: number | null
  return5y: number | null
} {
  if (navHistory.length < 2) {
    return { return1y: null, return3y: null, return5y: null }
  }

  // navHistory should be sorted ascending by date
  const latestNav = navHistory[navHistory.length - 1].nav
  const latestDate = navHistory[navHistory.length - 1].date

  function findNavOnDate(targetDate: Date): number | null {
    // Find the NAV closest to (but not after) the target date
    let closest: NavPoint | null = null
    for (const point of navHistory) {
      if (point.date <= targetDate) {
        closest = point
      } else {
        break
      }
    }
    return closest ? closest.nav : null
  }

  // 1-year return: simple percentage change
  const date1y = new Date(latestDate)
  date1y.setUTCFullYear(date1y.getUTCFullYear() - 1)
  const nav1y = findNavOnDate(date1y)
  const return1y = nav1y ? ((latestNav / nav1y) - 1) * 100 : null

  // 3-year return: annualized (CAGR)
  const date3y = new Date(latestDate)
  date3y.setUTCFullYear(date3y.getUTCFullYear() - 3)
  const nav3y = findNavOnDate(date3y)
  const return3y = nav3y ? (Math.pow(latestNav / nav3y, 1 / 3) - 1) * 100 : null

  // 5-year return: annualized (CAGR)
  const date5y = new Date(latestDate)
  date5y.setUTCFullYear(date5y.getUTCFullYear() - 5)
  const nav5y = findNavOnDate(date5y)
  const return5y = nav5y ? (Math.pow(latestNav / nav5y, 1 / 5) - 1) * 100 : null

  return {
    return1y: return1y !== null ? Math.round(return1y * 100) / 100 : null,
    return3y: return3y !== null ? Math.round(return3y * 100) / 100 : null,
    return5y: return5y !== null ? Math.round(return5y * 100) / 100 : null,
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { fundIds } = body as { fundIds?: string[] }

    // Fetch all schemes from MFAPI
    let allSchemes: AmfiScheme[]
    try {
      allSchemes = await fetchAllSchemes()
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch NAV data from MFAPI' },
        { status: 502 }
      )
    }

    // Build ISIN → schemeCode map
    const isinToSchemeCode = new Map<string, number>()
    for (const scheme of allSchemes) {
      if (scheme.isin) {
        isinToSchemeCode.set(scheme.isin, scheme.schemeCode)
      }
    }

    // Determine which funds to update
    const funds = fundIds && Array.isArray(fundIds) && fundIds.length > 0
      ? await db.fund.findMany({
          where: { id: { in: fundIds } },
          select: {
            id: true,
            schemeName: true,
            directIsin: true,
            regularIsin: true,
            directNav: true,
            regularNav: true,
          },
        })
      : await db.fund.findMany({
          select: {
            id: true,
            schemeName: true,
            directIsin: true,
            regularIsin: true,
            directNav: true,
            regularNav: true,
          },
        })

    let updated = 0
    let skipped = 0
    const results: Array<{
      fundId: string
      schemeName: string
      updated: boolean
      directNav: number | null
      regularNav: number | null
      directReturn1y: number | null
      directReturn3y: number | null
      directReturn5y: number | null
      regularReturn1y: number | null
      regularReturn3y: number | null
      regularReturn5y: number | null
    }> = []

    for (const fund of funds) {
      try {
        const directSchemeCode = isinToSchemeCode.get(fund.directIsin)
        const regularSchemeCode = isinToSchemeCode.get(fund.regularIsin)

        if (!directSchemeCode && !regularSchemeCode) {
          skipped++
          results.push({
            fundId: fund.id,
            schemeName: fund.schemeName,
            updated: false,
            directNav: null,
            regularNav: null,
            directReturn1y: null,
            directReturn3y: null,
            directReturn5y: null,
            regularReturn1y: null,
            regularReturn3y: null,
            regularReturn5y: null,
          })
          continue
        }

        // Fetch NAV histories for both plan types
        const [directHistoryRaw, regularHistoryRaw] = await Promise.all([
          directSchemeCode ? fetchSchemeNavHistory(directSchemeCode) : Promise.resolve([]),
          regularSchemeCode ? fetchSchemeNavHistory(regularSchemeCode) : Promise.resolve([]),
        ])

        const updateData: {
          directNav?: number
          regularNav?: number
          directReturn1y?: number | null
          directReturn3y?: number | null
          directReturn5y?: number | null
          regularReturn1y?: number | null
          regularReturn3y?: number | null
          regularReturn5y?: number | null
        } = {}

        // Process direct plan NAV history
        if (directHistoryRaw.length > 0) {
          const directNavPoints: NavPoint[] = []
          for (const entry of directHistoryRaw) {
            const d = parseMfApiDate(entry.date)
            const nav = parseFloat(entry.nav)
            if (d && !isNaN(nav)) {
              directNavPoints.push({ date: d, nav })
            }
          }
          // Sort ascending
          directNavPoints.sort((a, b) => a.date.getTime() - b.date.getTime())

          if (directNavPoints.length > 0) {
            const latestDirectNav = directNavPoints[directNavPoints.length - 1].nav
            updateData.directNav = Math.round(latestDirectNav * 100) / 100

            const directReturns = calculateReturns(directNavPoints)
            updateData.directReturn1y = directReturns.return1y
            updateData.directReturn3y = directReturns.return3y
            updateData.directReturn5y = directReturns.return5y
          }
        }

        // Process regular plan NAV history
        if (regularHistoryRaw.length > 0) {
          const regularNavPoints: NavPoint[] = []
          for (const entry of regularHistoryRaw) {
            const d = parseMfApiDate(entry.date)
            const nav = parseFloat(entry.nav)
            if (d && !isNaN(nav)) {
              regularNavPoints.push({ date: d, nav })
            }
          }
          regularNavPoints.sort((a, b) => a.date.getTime() - b.date.getTime())

          if (regularNavPoints.length > 0) {
            const latestRegularNav = regularNavPoints[regularNavPoints.length - 1].nav
            updateData.regularNav = Math.round(latestRegularNav * 100) / 100

            const regularReturns = calculateReturns(regularNavPoints)
            updateData.regularReturn1y = regularReturns.return1y
            updateData.regularReturn3y = regularReturns.return3y
            updateData.regularReturn5y = regularReturns.return5y
          }
        }

        if (Object.keys(updateData).length > 0) {
          await db.fund.update({
            where: { id: fund.id },
            data: updateData,
          })
          updated++

          results.push({
            fundId: fund.id,
            schemeName: fund.schemeName,
            updated: true,
            directNav: updateData.directNav ?? null,
            regularNav: updateData.regularNav ?? null,
            directReturn1y: updateData.directReturn1y ?? null,
            directReturn3y: updateData.directReturn3y ?? null,
            directReturn5y: updateData.directReturn5y ?? null,
            regularReturn1y: updateData.regularReturn1y ?? null,
            regularReturn3y: updateData.regularReturn3y ?? null,
            regularReturn5y: updateData.regularReturn5y ?? null,
          })
        } else {
          skipped++
          results.push({
            fundId: fund.id,
            schemeName: fund.schemeName,
            updated: false,
            directNav: null,
            regularNav: null,
            directReturn1y: null,
            directReturn3y: null,
            directReturn5y: null,
            regularReturn1y: null,
            regularReturn3y: null,
            regularReturn5y: null,
          })
        }
      } catch (error) {
        console.error(`[REFRESH-RETURNS] Error processing fund ${fund.id}:`, error)
        skipped++
        results.push({
          fundId: fund.id,
          schemeName: fund.schemeName,
          updated: false,
          directNav: null,
          regularNav: null,
          directReturn1y: null,
          directReturn3y: null,
          directReturn5y: null,
          regularReturn1y: null,
          regularReturn3y: null,
          regularReturn5y: null,
        })
      }
    }

    return NextResponse.json({
      message: `Returns refresh complete: ${updated} funds updated, ${skipped} skipped`,
      updated,
      skipped,
      totalFunds: updated + skipped,
      source: 'AMFI',
      fetchedAt: new Date().toISOString(),
      results,
    })
  } catch (error) {
    console.error('[REFRESH-RETURNS] Error refreshing returns:', error)
    return NextResponse.json(
      { error: 'Failed to refresh returns' },
      { status: 500 }
    )
  }
}
