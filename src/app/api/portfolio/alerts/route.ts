import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface Alert {
  type: 'HIGH_EXPENSE' | 'CONCENTRATION_RISK' | 'OVERLAP_WARNING' | 'POOR_PERFORMANCE' | 'REBALANCE_NEEDED'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  fundId?: string
  action: string
}

// Expected return defaults by category (annualized %)
const EXPECTED_RETURN_BY_CATEGORY: Record<string, number> = {
  Equity: 12,
  ELSS: 12,
  Index: 11,
  Hybrid: 9,
  Debt: 7,
}

function parseTopHoldings(raw: string | null): { name: string; weight: number; sector: string }[] {
  if (!raw) return []
  try {
    return JSON.parse(raw) as { name: string; weight: number; sector: string }[]
  } catch {
    return []
  }
}

export async function POST(request: NextRequest) {
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
      include: { fund: true },
    })

    if (holdings.length === 0) {
      return NextResponse.json({ alerts: [] })
    }

    const alerts: Alert[] = []
    const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentAmount, 0)

    // === HIGH_EXPENSE: Regular plan funds ===
    for (const holding of holdings) {
      if (holding.planType === 'regular') {
        const expenseDiffPct = holding.fund.regularExpenseRatio - holding.fund.directExpenseRatio
        const expenseDiffBps = Math.round(expenseDiffPct * 100)
        const annualSaving = (expenseDiffPct / 100) * holding.currentAmount

        let severity: 'high' | 'medium' | 'low'
        if (expenseDiffBps >= 100 || annualSaving >= 5000) {
          severity = 'high'
        } else if (expenseDiffBps >= 50 || annualSaving >= 2000) {
          severity = 'medium'
        } else {
          severity = 'low'
        }

        alerts.push({
          type: 'HIGH_EXPENSE',
          severity,
          title: `High expense ratio: ${holding.fund.schemeName}`,
          description: `You're on the regular plan with an expense ratio of ${holding.fund.regularExpenseRatio.toFixed(2)}% vs ${holding.fund.directExpenseRatio.toFixed(2)}% for direct. That's ${expenseDiffBps} bps more, costing you ₹${Math.round(annualSaving).toLocaleString('en-IN')} annually.`,
          fundId: holding.fundId,
          action: 'Switch to the direct plan to save on expenses. Consider exit load and tax implications before switching.',
        })
      }
    }

    // === CONCENTRATION_RISK: Single fund or fund house dominance ===
    // Check single fund concentration
    for (const holding of holdings) {
      const weightPct = (holding.currentAmount / totalCurrentValue) * 100
      if (weightPct > 30) {
        alerts.push({
          type: 'CONCENTRATION_RISK',
          severity: weightPct > 50 ? 'high' : weightPct > 40 ? 'medium' : 'low',
          title: `Over-concentration: ${holding.fund.schemeName}`,
          description: `${Math.round(weightPct)}% of your portfolio is in a single fund (${holding.fund.schemeName}). This increases risk significantly if this fund underperforms.`,
          fundId: holding.fundId,
          action: 'Reduce allocation to this fund and diversify across other funds in the same or different categories.',
        })
      }
    }

    // Check fund house concentration
    const fundHouseMap = new Map<string, { amount: number; count: number }>()
    for (const holding of holdings) {
      const entry = fundHouseMap.get(holding.fund.fundHouse) || { amount: 0, count: 0 }
      entry.amount += holding.currentAmount
      entry.count += 1
      fundHouseMap.set(holding.fund.fundHouse, entry)
    }

    for (const [fundHouse, data] of fundHouseMap.entries()) {
      const weightPct = (data.amount / totalCurrentValue) * 100
      if (weightPct > 50 && data.count >= 2) {
        alerts.push({
          type: 'CONCENTRATION_RISK',
          severity: weightPct > 70 ? 'high' : 'medium',
          title: `Fund house concentration: ${fundHouse}`,
          description: `${Math.round(weightPct)}% of your portfolio is concentrated in ${fundHouse} across ${data.count} funds. AMC-specific risks could impact a large portion of your investments.`,
          action: 'Diversify across different fund houses to reduce AMC-specific operational or strategic risks.',
        })
      }
    }

    // === OVERLAP_WARNING: Funds in same sub-category ===
    const subCategoryMap = new Map<string, { fundIds: string[]; fundNames: string[]; totalAmount: number }>()
    for (const holding of holdings) {
      const key = `${holding.fund.category}-${holding.fund.subCategory}`
      const entry = subCategoryMap.get(key) || { fundIds: [], fundNames: [], totalAmount: 0 }
      entry.fundIds.push(holding.fundId)
      entry.fundNames.push(holding.fund.schemeName)
      entry.totalAmount += holding.currentAmount
      subCategoryMap.set(key, entry)
    }

    for (const [subCatKey, data] of subCategoryMap.entries()) {
      if (data.fundIds.length >= 2) {
        // Check if they have actual holding overlap
        let hasOverlap = false
        const allHoldingsLists = data.fundIds.map((fid) => {
          const h = holdings.find((h) => h.fundId === fid)
          return h ? parseTopHoldings(h.fund.topHoldings) : []
        })

        if (allHoldingsLists.length >= 2) {
          for (let i = 0; i < allHoldingsLists.length - 1; i++) {
            for (let j = i + 1; j < allHoldingsLists.length; j++) {
              const names1 = new Set(allHoldingsLists[i].map((h) => h.name.toLowerCase()))
              const names2 = new Set(allHoldingsLists[j].map((h) => h.name.toLowerCase()))
              const common = [...names1].filter((n) => names2.has(n))
              if (common.length >= 3) {
                hasOverlap = true
                break
              }
            }
            if (hasOverlap) break
          }
        }

        if (hasOverlap || data.fundIds.length >= 3) {
          const weightPct = (data.totalAmount / totalCurrentValue) * 100
          alerts.push({
            type: 'OVERLAP_WARNING',
            severity: weightPct > 40 ? 'high' : weightPct > 25 ? 'medium' : 'low',
            title: `Potential overlap in ${subCatKey}`,
            description: `You have ${data.fundIds.length} funds in the same segment (${subCatKey}): ${data.fundNames.join(', ')}. These likely share common holdings, reducing diversification benefits.`,
            action: 'Consider consolidating to fewer funds in this segment and allocating to different market segments.',
          })
        }
      }
    }

    // === POOR_PERFORMANCE: Underperforming benchmark ===
    for (const holding of holdings) {
      const directReturn1y = holding.fund.directReturn1y
      const benchmarkReturn1y = holding.fund.benchmarkReturn1y

      if (directReturn1y !== null && benchmarkReturn1y !== null) {
        const underperformance = benchmarkReturn1y - directReturn1y
        if (underperformance > 2) {
          alerts.push({
            type: 'POOR_PERFORMANCE',
            severity: underperformance > 5 ? 'high' : underperformance > 3 ? 'medium' : 'low',
            title: `Underperforming benchmark: ${holding.fund.schemeName}`,
            description: `This fund has returned ${directReturn1y.toFixed(2)}% over 1 year vs its benchmark's ${benchmarkReturn1y.toFixed(2)}%, underperforming by ${underperformance.toFixed(2)}%. Consistent underperformance may indicate structural issues.`,
            fundId: holding.fundId,
            action: 'Review if this fund consistently underperforms. Consider switching to a better-performing fund in the same category.',
          })
        }
      }
    }

    // === REBALANCE_NEEDED: Allocation drift ===
    const categoryAllocation = new Map<string, number>()
    for (const holding of holdings) {
      const cat = holding.fund.category
      categoryAllocation.set(cat, (categoryAllocation.get(cat) || 0) + holding.currentAmount)
    }

    // Check if equity is too high or too low relative to typical moderate allocation
    let equityPct = 0
    let debtPct = 0
    for (const holding of holdings) {
      const weight = (holding.currentAmount / totalCurrentValue) * 100
      const cat = holding.fund.category
      if (cat === 'Equity' || cat === 'ELSS' || cat === 'Index') {
        equityPct += weight
      } else if (cat === 'Debt') {
        debtPct += weight
      } else if (cat === 'Hybrid') {
        const eqPct = holding.fund.equityPercentage ?? 65
        equityPct += weight * (eqPct / 100)
        debtPct += weight * ((100 - eqPct) / 100)
      }
    }

    // If equity > 80% or debt > 70%, flag rebalancing
    if (equityPct > 80) {
      alerts.push({
        type: 'REBALANCE_NEEDED',
        severity: equityPct > 90 ? 'high' : 'medium',
        title: 'Portfolio is overly equity-heavy',
        description: `Your portfolio has ${Math.round(equityPct)}% in equity. This exposes you to high market risk. A market downturn could significantly impact your wealth.`,
        action: 'Consider rebalancing by moving some equity allocation to debt or hybrid funds. Target an equity allocation appropriate for your risk profile.',
      })
    } else if (debtPct > 70) {
      alerts.push({
        type: 'REBALANCE_NEEDED',
        severity: debtPct > 85 ? 'high' : 'medium',
        title: 'Portfolio is overly debt-heavy',
        description: `Your portfolio has ${Math.round(debtPct)}% in debt. While safe, this may not generate sufficient returns to beat inflation over the long term.`,
        action: 'Consider adding equity or hybrid funds to improve long-term growth potential. Even a 20-30% equity allocation can significantly improve inflation-adjusted returns.',
      })
    }

    // Sort alerts by severity
    const severityOrder = { high: 0, medium: 1, low: 2 }
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('Error generating portfolio alerts:', error)
    return NextResponse.json(
      { error: 'Failed to generate portfolio alerts' },
      { status: 500 }
    )
  }
}
