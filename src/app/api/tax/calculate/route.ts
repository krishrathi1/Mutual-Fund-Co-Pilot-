import { NextRequest, NextResponse } from 'next/server'

// Tax Calculator - STCG/LTCG for Indian Mutual Funds
// Budget 2024 rules applied

interface TaxHoldingInput {
  name: string
  investedAmount: number
  currentAmount: number
  purchaseDate: string
  category: string
  planType?: string
}

interface TaxHoldingResult {
  name: string
  invested: number
  current: number
  gain: number
  holdingPeriod: string
  taxType: string
  taxRate: number
  taxAmount: number
  netGain: number
  category: string
}

// Default slab rate for debt funds (assuming 30% bracket as common for investors)
const DEFAULT_SLAB_RATE = 0.30

// LTCG exemption limit per year (Budget 2024: ₹1.25L)
const LTCG_EXEMPTION_LIMIT = 125000

function getEquityDebtSplit(category: string): { equityPct: number; debtPct: number } {
  switch (category) {
    case 'Equity':
    case 'ELSS':
      return { equityPct: 100, debtPct: 0 }
    case 'Index':
    case 'Index Fund':
      return { equityPct: 100, debtPct: 0 }
    case 'Debt':
    case 'Liquid':
      return { equityPct: 0, debtPct: 100 }
    case 'Hybrid':
    case 'Aggressive Hybrid':
    case 'Balanced Advantage':
      return { equityPct: 65, debtPct: 35 }
    case 'Conservative Hybrid':
      return { equityPct: 25, debtPct: 75 }
    default:
      return { equityPct: 50, debtPct: 50 }
  }
}

function isEquityOriented(category: string): boolean {
  const { equityPct } = getEquityDebtSplit(category)
  // Funds with >65% equity are treated as equity for tax purposes
  return equityPct >= 65
}

function getHoldingPeriodDays(purchaseDate: string): number {
  const purchase = new Date(purchaseDate)
  const now = new Date()
  const diffMs = now.getTime() - purchase.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { holdings }: { holdings: TaxHoldingInput[] } = body

    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      return NextResponse.json(
        { error: 'holdings array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Track total LTCG across all equity holdings for exemption calculation
    let totalEquityLTCG = 0
    const intermediateResults: Array<{
      name: string
      invested: number
      current: number
      gain: number
      holdingPeriod: string
      taxType: string
      taxRate: number
      category: string
      equityPct: number
      debtPct: number
      isLongTerm: boolean
      equityGain: number
      debtGain: number
    }> = []

    for (const holding of holdings) {
      const invested = parseFloat(String(holding.investedAmount))
      const current = parseFloat(String(holding.currentAmount))
      const gain = current - invested
      const category = holding.category || 'Equity'
      const { equityPct, debtPct } = getEquityDebtSplit(category)
      const holdingDays = getHoldingPeriodDays(holding.purchaseDate)

      const isLongTerm = isEquityOriented(category)
        ? holdingDays > 365  // Equity: > 1 year = LTCG
        : holdingDays > 1095 // Debt: > 3 years = LTCG (but post Apr 2023, no indexation)

      const holdingPeriod = isLongTerm ? 'Long Term' : 'Short Term'
      const taxType = isEquityOriented(category) ? 'Equity' : 'Debt'

      // Split gains proportionally
      const equityGain = gain * (equityPct / 100)
      const debtGain = gain * (debtPct / 100)

      if (isLongTerm && isEquityOriented(category) && equityGain > 0) {
        totalEquityLTCG += equityGain
      }

      let taxRate = 0
      if (isEquityOriented(category)) {
        if (isLongTerm) {
          taxRate = 0.125 // 12.5% LTCG (Budget 2024)
        } else {
          taxRate = 0.20 // 20% STCG (Budget 2024)
        }
      } else {
        // Debt funds: taxed at slab rate regardless of holding period (post Apr 2023)
        taxRate = DEFAULT_SLAB_RATE
      }

      intermediateResults.push({
        name: holding.name || 'Unknown Fund',
        invested,
        current,
        gain,
        holdingPeriod,
        taxType,
        taxRate,
        category,
        equityPct,
        debtPct,
        isLongTerm,
        equityGain,
        debtGain,
      })
    }

    // Calculate exemption allocation across holdings (proportional)
    const exemptionPerHolding = totalEquityLTCG > 0
      ? LTCG_EXEMPTION_LIMIT / intermediateResults.filter(r => r.isLongTerm && isEquityOriented(r.category) && r.equityGain > 0).length
      : 0

    const results: TaxHoldingResult[] = []
    let totalTax = 0
    let totalNetGain = 0

    for (const r of intermediateResults) {
      let taxAmount = 0

      if (isEquityOriented(r.category)) {
        if (r.isLongTerm) {
          // LTCG: 12.5% on gains above ₹1.25L exemption
          const taxableGain = Math.max(0, r.equityGain - exemptionPerHolding)
          taxAmount = taxableGain * r.taxRate
        } else {
          // STCG: 20% on equity gains
          taxAmount = Math.max(0, r.equityGain) * r.taxRate
        }
      } else {
        // Debt: slab rate on all gains (no indexation benefit post Apr 2023)
        taxAmount = r.gain * r.taxRate
        if (r.debtPct > 0 && r.equityPct > 0) {
          // Hybrid: equity portion taxed as equity, debt portion at slab
          const equityTax = r.isLongTerm
            ? Math.max(0, r.equityGain - (r.isLongTerm ? exemptionPerHolding : 0)) * 0.125
            : Math.max(0, r.equityGain) * 0.20
          const debtTax = r.debtGain * DEFAULT_SLAB_RATE
          taxAmount = equityTax + debtTax
        }
      }

      // If there's a loss, no tax
      if (r.gain <= 0) {
        taxAmount = 0
      }

      const netGain = r.gain - taxAmount
      totalTax += taxAmount
      totalNetGain += netGain

      results.push({
        name: r.name,
        invested: Math.round(r.invested),
        current: Math.round(r.current),
        gain: Math.round(r.gain),
        holdingPeriod: r.holdingPeriod,
        taxType: r.taxType,
        taxRate: Math.round(r.taxRate * 10000) / 100, // Convert to percentage
        taxAmount: Math.round(taxAmount),
        netGain: Math.round(netGain),
        category: r.category,
      })
    }

    const totalGain = results.reduce((sum, r) => sum + r.gain, 0)
    const effectiveTaxRate = totalGain > 0 ? (totalTax / totalGain) * 100 : 0

    return NextResponse.json({
      holdings: results,
      totalTax: Math.round(totalTax),
      totalNetGain: Math.round(totalNetGain),
      effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
      ltcgExemptionUsed: Math.min(totalEquityLTCG, LTCG_EXEMPTION_LIMIT),
      ltcgExemptionLimit: LTCG_EXEMPTION_LIMIT,
      assumptions: [
        'Equity/ELSS/Index funds: STCG (< 1yr) @ 20%, LTCG (> 1yr) @ 12.5% above ₹1.25L exemption (Budget 2024 rules)',
        'Debt funds: Gains taxed at slab rate (no indexation benefit post April 2023)',
        'Hybrid funds with ≥65% equity: treated as equity-oriented for tax purposes',
        `Default slab rate assumed at ${DEFAULT_SLAB_RATE * 100}% (adjust based on your tax bracket)`,
        'LTCG exemption of ₹1.25L is distributed proportionally across long-term equity holdings',
      ],
    })
  } catch (error) {
    console.error('Error calculating tax:', error)
    return NextResponse.json(
      { error: 'Failed to calculate tax' },
      { status: 500 }
    )
  }
}
