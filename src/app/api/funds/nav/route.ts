import { NextRequest, NextResponse } from 'next/server'
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

interface NavResult {
  schemeCode: number
  schemeName: string
  nav: string
  date: string
  isin: string
}

interface CacheEntry {
  data: AmfiScheme[]
  fetchedAt: number // epoch ms
}

// ---------------------------------------------------------------------------
// In-memory cache – 24-hour TTL
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

let navCache: CacheEntry | null = null

function isCacheValid(): boolean {
  if (!navCache) return false
  return Date.now() - navCache.fetchedAt < CACHE_TTL_MS
}

// ---------------------------------------------------------------------------
// Fetch all scheme NAVs from AMFI public API
// ---------------------------------------------------------------------------

async function fetchAllNavs(): Promise<AmfiScheme[]> {
  if (isCacheValid() && navCache) {
    return navCache.data
  }

  try {
    const res = await fetch('https://api.mfapi.in/mf', {
      next: { revalidate: 86400 }, // let Next.js cache for 24 h as well
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FundVista/1.0',
      },
    })

    if (!res.ok) {
      throw new Error(`AMFI API returned ${res.status}`)
    }

    const data: AmfiScheme[] = await res.json()

    // Store in in-memory cache
    navCache = { data, fetchedAt: Date.now() }

    return data
  } catch (error) {
    console.error('[NAV] Failed to fetch from AMFI API:', error)

    // If we have a stale cache, return it rather than failing completely
    if (navCache) {
      console.warn('[NAV] Returning stale cache as fallback')
      return navCache.data
    }

    // No cache at all – re-throw so caller can fall back to DB
    throw error
  }
}

// ---------------------------------------------------------------------------
// Fetch a single scheme by code from AMFI
// ---------------------------------------------------------------------------

async function fetchSchemeNav(schemeCode: number): Promise<AmfiScheme | null> {
  try {
    const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
      next: { revalidate: 86400 },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FundVista/1.0',
      },
    })

    if (!res.ok) return null

    const json = await res.json()

    if (json.status !== 'SUCCESS' || !json.data || json.data.length === 0) {
      return null
    }

    // The first entry in `data` is the latest NAV
    const latest = json.data[0]

    return {
      schemeCode: json.meta?.scheme_code ?? schemeCode,
      schemeName: json.meta?.scheme_name ?? '',
      nav: latest.nav,
      date: latest.date,
      isin: json.meta?.isin ?? '',
    }
  } catch (error) {
    console.error(`[NAV] Failed to fetch scheme ${schemeCode}:`, error)
    return null
  }
}

// ---------------------------------------------------------------------------
// Database fallback helpers
// ---------------------------------------------------------------------------

interface DbNavResult {
  schemeCode: number
  schemeName: string
  nav: string
  date: string
  isin: string
  planType: 'direct' | 'regular'
}

function fundToNavResults(fund: {
  id: string
  schemeName: string
  directIsin: string
  directNav: number
  regularIsin: string
  regularNav: number
  updatedAt: Date
}): DbNavResult[] {
  const dateStr = fund.updatedAt.toISOString().split('T')[0] // YYYY-MM-DD
  return [
    {
      schemeCode: 0, // DB doesn't store AMFI scheme codes
      schemeName: `${fund.schemeName} - Direct`,
      nav: fund.directNav.toString(),
      date: dateStr,
      isin: fund.directIsin,
      planType: 'direct',
    },
    {
      schemeCode: 0,
      schemeName: `${fund.schemeName} - Regular`,
      nav: fund.regularNav.toString(),
      date: dateStr,
      isin: fund.regularIsin,
      planType: 'regular',
    },
  ]
}

async function fallbackFromDb(params: {
  q?: string
  schemeCode?: number
  isin?: string
}): Promise<DbNavResult[]> {
  try {
    // If searching by ISIN, look in both directIsin and regularIsin
    if (params.isin) {
      const fund = await db.fund.findFirst({
        where: {
          OR: [
            { directIsin: params.isin },
            { regularIsin: params.isin },
          ],
        },
      })
      if (!fund) return []
      return fundToNavResults(fund).filter(
        (r) => r.isin === params.isin
      )
    }

    // If searching by name
    if (params.q) {
      const funds = await db.fund.findMany({
        where: {
          OR: [
            { schemeName: { contains: params.q } },
            { fundHouse: { contains: params.q } },
          ],
        },
        take: 20,
      })
      return funds.flatMap(fundToNavResults)
    }

    // schemeCode isn't stored in DB, so can't look up by it
    return []
  } catch (error) {
    console.error('[NAV] DB fallback error:', error)
    return []
  }
}

// ---------------------------------------------------------------------------
// Update fund NAVs in DB from AMFI data
// ---------------------------------------------------------------------------

async function updateFundNavInDb(isin: string, nav: number): Promise<boolean> {
  try {
    // Try to match direct ISIN first
    const directFund = await db.fund.findFirst({
      where: { directIsin: isin },
    })
    if (directFund) {
      await db.fund.update({
        where: { id: directFund.id },
        data: { directNav: nav },
      })
      return true
    }

    // Try regular ISIN
    const regularFund = await db.fund.findFirst({
      where: { regularIsin: isin },
    })
    if (regularFund) {
      await db.fund.update({
        where: { id: regularFund.id },
        data: { regularNav: nav },
      })
      return true
    }

    return false
  } catch (error) {
    console.error('[NAV] Error updating fund NAV in DB:', error)
    return false
  }
}

async function updateAllFundNavsFromAmfi(allNavs: AmfiScheme[]): Promise<{ updated: number; skipped: number }> {
  let updated = 0
  let skipped = 0

  // Get all funds from DB
  const funds = await db.fund.findMany({
    select: { id: true, directIsin: true, regularIsin: true },
  })

  // Build ISIN -> NAV map from AMFI data
  const isinNavMap = new Map<string, number>()
  for (const scheme of allNavs) {
    if (scheme.isin) {
      const nav = parseFloat(scheme.nav)
      if (!isNaN(nav)) {
        isinNavMap.set(scheme.isin, nav)
      }
    }
  }

  // Update each fund's NAVs
  for (const fund of funds) {
    let needsUpdate = false
    const updateData: { directNav?: number; regularNav?: number } = {}

    const directNav = isinNavMap.get(fund.directIsin)
    if (directNav !== undefined) {
      updateData.directNav = directNav
      needsUpdate = true
    }

    const regularNav = isinNavMap.get(fund.regularIsin)
    if (regularNav !== undefined) {
      updateData.regularNav = regularNav
      needsUpdate = true
    }

    if (needsUpdate) {
      try {
        await db.fund.update({
          where: { id: fund.id },
          data: updateData,
        })
        updated++
      } catch (error) {
        console.error(`[NAV] Error updating fund ${fund.id}:`, error)
        skipped++
      }
    } else {
      skipped++
    }
  }

  return { updated, skipped }
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''
  const schemeCodeParam = searchParams.get('schemeCode')?.trim() || ''
  const isin = searchParams.get('isin')?.trim() || ''

  // Validate that at least one search parameter is provided
  if (!q && !schemeCodeParam && !isin) {
    return NextResponse.json(
      { error: 'Provide at least one query parameter: q, schemeCode, or isin' },
      { status: 400 }
    )
  }

  const schemeCode = schemeCodeParam ? parseInt(schemeCodeParam, 10) : null
  if (schemeCodeParam && (isNaN(schemeCode!) || schemeCode! <= 0)) {
    return NextResponse.json(
      { error: 'schemeCode must be a positive integer' },
      { status: 400 }
    )
  }

  // ---- Strategy 1: Direct scheme code lookup (single API call) ----
  if (schemeCode) {
    const scheme = await fetchSchemeNav(schemeCode)
    if (scheme) {
      const result: NavResult = {
        schemeCode: scheme.schemeCode,
        schemeName: scheme.schemeName,
        nav: scheme.nav,
        date: scheme.date,
        isin: scheme.isin,
      }

      // Update DB in background if we have an ISIN
      if (scheme.isin) {
        const nav = parseFloat(scheme.nav)
        if (!isNaN(nav)) {
          updateFundNavInDb(scheme.isin, nav).catch(() => {})
        }
      }

      return NextResponse.json({ result })
    }

    // AMFI didn't return data – fall back to DB
    const dbResults = await fallbackFromDb({ schemeCode })
    if (dbResults.length > 0) {
      return NextResponse.json({
        result: dbResults[0],
        source: 'database',
        warning: 'Live NAV unavailable; showing database data',
      })
    }

    return NextResponse.json(
      { error: `No fund found for schemeCode ${schemeCode}` },
      { status: 404 }
    )
  }

  // ---- Strategy 2: Search by ISIN (from full NAV list) ----
  if (isin) {
    try {
      const allNavs = await fetchAllNavs()
      const match = allNavs.find((s) => s.isin === isin)
      if (match) {
        // Update DB in background
        const nav = parseFloat(match.nav)
        if (!isNaN(nav)) {
          updateFundNavInDb(isin, nav).catch(() => {})
        }

        return NextResponse.json({
          result: {
            schemeCode: match.schemeCode,
            schemeName: match.schemeName,
            nav: match.nav,
            date: match.date,
            isin: match.isin,
          },
        })
      }
    } catch {
      // AMFI fetch failed – fall through to DB
    }

    // DB fallback
    const dbResults = await fallbackFromDb({ isin })
    if (dbResults.length > 0) {
      return NextResponse.json({
        result: dbResults[0],
        source: 'database',
        warning: 'Live NAV unavailable; showing database data',
      })
    }

    return NextResponse.json(
      { error: `No fund found for ISIN ${isin}` },
      { status: 404 }
    )
  }

  // ---- Strategy 3: Search by name (from full NAV list) ----
  if (q) {
    try {
      const allNavs = await fetchAllNavs()
      const query = q.toLowerCase()
      const matches = allNavs.filter((s) =>
        s.schemeName.toLowerCase().includes(query)
      )

      if (matches.length > 0) {
        // Cap at 50 results to avoid oversized responses
        const results: NavResult[] = matches.slice(0, 50).map((s) => ({
          schemeCode: s.schemeCode,
          schemeName: s.schemeName,
          nav: s.nav,
          date: s.date,
          isin: s.isin,
        }))
        return NextResponse.json({
          results,
          total: matches.length,
          returned: results.length,
        })
      }
    } catch {
      // AMFI fetch failed – fall through to DB
    }

    // DB fallback
    const dbResults = await fallbackFromDb({ q })
    if (dbResults.length > 0) {
      return NextResponse.json({
        results: dbResults,
        total: dbResults.length,
        returned: dbResults.length,
        source: 'database',
        warning: 'Live NAV unavailable; showing database data',
      })
    }

    return NextResponse.json(
      { error: `No funds found matching "${q}"` },
      { status: 404 }
    )
  }

  // Should not reach here due to the initial validation
  return NextResponse.json(
    { error: 'Invalid query' },
    { status: 400 }
  )
}

// ---------------------------------------------------------------------------
// POST handler - Bulk update all fund NAVs in DB from AMFI
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { fundIds } = body as { fundIds?: string[] }

    let allNavs: AmfiScheme[]

    try {
      allNavs = await fetchAllNavs()
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch NAV data from AMFI API' },
        { status: 502 }
      )
    }

    if (fundIds && Array.isArray(fundIds) && fundIds.length > 0) {
      // Update only specific funds
      const funds = await db.fund.findMany({
        where: { id: { in: fundIds } },
        select: { id: true, directIsin: true, regularIsin: true, schemeName: true },
      })

      const isinNavMap = new Map<string, number>()
      for (const scheme of allNavs) {
        if (scheme.isin) {
          const nav = parseFloat(scheme.nav)
          if (!isNaN(nav)) {
            isinNavMap.set(scheme.isin, nav)
          }
        }
      }

      const results: Array<{ fundId: string; schemeName: string; directNav: number | null; regularNav: number | null; updated: boolean }> = []

      for (const fund of funds) {
        const directNav = isinNavMap.get(fund.directIsin) ?? null
        const regularNav = isinNavMap.get(fund.regularIsin) ?? null

        const updateData: { directNav?: number; regularNav?: number } = {}
        if (directNav !== null) updateData.directNav = directNav
        if (regularNav !== null) updateData.regularNav = regularNav

        let updated = false
        if (Object.keys(updateData).length > 0) {
          try {
            await db.fund.update({
              where: { id: fund.id },
              data: updateData,
            })
            updated = true
          } catch {
            // Skip this fund on error
          }
        }

        results.push({
          fundId: fund.id,
          schemeName: fund.schemeName,
          directNav,
          regularNav,
          updated,
        })
      }

      return NextResponse.json({
        message: `Updated ${results.filter(r => r.updated).length} of ${results.length} funds`,
        results,
      })
    }

    // Update all funds
    const { updated, skipped } = await updateAllFundNavsFromAmfi(allNavs)

    return NextResponse.json({
      message: `NAV refresh complete: ${updated} funds updated, ${skipped} skipped`,
      updated,
      skipped,
      totalFunds: updated + skipped,
      source: 'AMFI',
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error updating NAVs:', error)
    return NextResponse.json(
      { error: 'Failed to update NAVs' },
      { status: 500 }
    )
  }
}
