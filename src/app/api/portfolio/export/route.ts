import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Export Portfolio as JSON or CSV

interface ExportHolding {
  id: string
  fundId: string
  schemeName: string
  fundHouse: string
  category: string
  subCategory: string
  planType: string
  units: number
  investedAmount: number
  currentAmount: number
  gain: number
  gainPct: number
  directNav: number
  regularNav: number
  directExpenseRatio: number
  regularExpenseRatio: number
  purchaseDate: string | null
  sipAmount: number | null
}

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }
  const headerLine = headers.map(escape).join(',')
  const dataLines = rows.map(row => row.map(escape).join(','))
  return [headerLine, ...dataLines].join('\n')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const format = searchParams.get('format') || 'json'

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId query parameter is required' },
        { status: 400 }
      )
    }

    if (format !== 'json' && format !== 'csv') {
      return NextResponse.json(
        { error: 'format must be "json" or "csv"' },
        { status: 400 }
      )
    }

    // Fetch holdings with fund details
    const holdings = await db.holding.findMany({
      where: { sessionId },
      include: { fund: true },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch goals
    const goals = await db.goal.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch watchlist
    const watchlist = await db.watchlistItem.findMany({
      where: { sessionId },
      include: { fund: true },
      orderBy: { createdAt: 'desc' },
    })

    // Build export holdings
    const exportHoldings: ExportHolding[] = holdings.map(h => ({
      id: h.id,
      fundId: h.fundId,
      schemeName: h.fund.schemeName,
      fundHouse: h.fund.fundHouse,
      category: h.fund.category,
      subCategory: h.fund.subCategory,
      planType: h.planType,
      units: h.units,
      investedAmount: h.investedAmount,
      currentAmount: h.currentAmount,
      gain: h.currentAmount - h.investedAmount,
      gainPct: h.investedAmount > 0 ? ((h.currentAmount - h.investedAmount) / h.investedAmount) * 100 : 0,
      directNav: h.fund.directNav,
      regularNav: h.fund.regularNav,
      directExpenseRatio: h.fund.directExpenseRatio,
      regularExpenseRatio: h.fund.regularExpenseRatio,
      purchaseDate: h.purchaseDate,
      sipAmount: h.sipAmount,
    }))

    // Analysis summary
    const totalInvested = exportHoldings.reduce((sum, h) => sum + h.investedAmount, 0)
    const currentValue = exportHoldings.reduce((sum, h) => sum + h.currentAmount, 0)
    const totalGain = currentValue - totalInvested
    const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0

    // Category breakdown
    const categoryMap = new Map<string, { amount: number; count: number }>()
    for (const h of exportHoldings) {
      const existing = categoryMap.get(h.category) || { amount: 0, count: 0 }
      categoryMap.set(h.category, {
        amount: existing.amount + h.currentAmount,
        count: existing.count + 1,
      })
    }
    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      amount: Math.round(data.amount),
      count: data.count,
      pct: currentValue > 0 ? Math.round((data.amount / currentValue) * 10000) / 100 : 0,
    }))

    const analysisSummary = {
      totalHoldings: exportHoldings.length,
      totalInvested: Math.round(totalInvested),
      currentValue: Math.round(currentValue),
      totalGain: Math.round(totalGain),
      totalGainPct: Math.round(totalGainPct * 100) / 100,
      categoryBreakdown,
      goalsCount: goals.length,
      watchlistCount: watchlist.length,
      exportedAt: new Date().toISOString(),
    }

    if (format === 'csv') {
      const headers = [
        'Scheme Name', 'Fund House', 'Category', 'Sub Category', 'Plan Type',
        'Units', 'Invested Amount', 'Current Amount', 'Gain', 'Gain %',
        'Direct NAV', 'Regular NAV', 'Direct ER %', 'Regular ER %',
        'Purchase Date', 'SIP Amount',
      ]
      const rows = exportHoldings.map(h => [
        h.schemeName,
        h.fundHouse,
        h.category,
        h.subCategory,
        h.planType,
        h.units.toString(),
        h.investedAmount.toString(),
        h.currentAmount.toString(),
        h.gain.toString(),
        h.gainPct.toFixed(2),
        h.directNav.toString(),
        h.regularNav.toString(),
        h.directExpenseRatio.toString(),
        h.regularExpenseRatio.toString(),
        h.purchaseDate || '',
        h.sipAmount?.toString() || '',
      ])

      const csvContent = toCsv(headers, rows)

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="fundvista-portfolio-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // JSON format
    return NextResponse.json({
      portfolio: {
        holdings: exportHoldings,
        goals: goals.map(g => ({
          id: g.id,
          name: g.name,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          yearsToGoal: g.yearsToGoal,
          riskProfile: g.riskProfile,
          suggestedAllocation: g.suggestedAllocation ? JSON.parse(g.suggestedAllocation) : null,
          monthlySipNeeded: g.monthlySipNeeded,
        })),
        watchlist: watchlist.map(w => ({
          id: w.id,
          fundId: w.fundId,
          schemeName: w.fund.schemeName,
          notes: w.notes,
          targetPrice: w.targetPrice,
        })),
      },
      analysis: analysisSummary,
    })
  } catch (error) {
    console.error('Error exporting portfolio:', error)
    return NextResponse.json(
      { error: 'Failed to export portfolio' },
      { status: 500 }
    )
  }
}
