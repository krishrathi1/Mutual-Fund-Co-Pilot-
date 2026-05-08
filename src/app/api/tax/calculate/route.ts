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
  category: 'equity' | 'debt' | 'hybrid'
  investedAmount: number
  currentValue: number
  gain: number
  holdingPeriodDays: number
  gainType: 'STCG' | 'LTCG'
  taxRate: number
  taxAmount: number
  netGain: number
}

// Default slab rate for debt funds (assuming 30% bracket as common for investors)
const DEFAULT_SLAB_RATE = 0.30

// LTCG exemption limit per year (Budget 2024: ₹1.25L)
const LTCG_EXEMPTION_LIMIT = 125000

function getEquityDebtSplit(category: string): { equityPct: number; debtPct: number } {
  const cat = category.toLowerCase()
  if (cat.includes('equity') || cat.includes('elss') || cat.includes('index') || cat.includes('small cap') || cat.includes('mid cap') || cat.includes('large cap') || cat.includes('flexi cap')) {
    return { equityPct: 100, debtPct: 0 }
  }
  if (cat.includes('debt') || cat.includes('liquid') || cat.includes('overnight') || cat.includes('money market')) {
    return { equityPct: 0, debtPct: 100 }
  }
  if (cat.includes('hybrid') || cat.includes('balanced') || cat.includes('dynamic asset')) {
    return { equityPct: 65, debtPct: 35 }
  }
  return { equityPct: 50, debtPct: 50 }
}

function isEquityOriented(category: string): boolean {
  const { equityPct } = getEquityDebtSplit(category)
  // Funds with >=65% equity are treated as equity for tax purposes
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
    const { holdings, slabRate = DEFAULT_SLAB_RATE, realizedLTCG = 0 }: { 
      holdings: TaxHoldingInput[], 
      slabRate?: number, 
      realizedLTCG?: number 
    } = body

    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      return NextResponse.json(
        { error: 'holdings array is required and must not be empty' },
        { status: 400 }
      )
    }

    const intermediateResults: Array<{
      id: string
      name: string
      invested: number
      current: number
      gain: number
      holdingDays: number
      gainType: 'STCG' | 'LTCG'
      taxRate: number
      category: 'equity' | 'debt' | 'hybrid'
      equityPct: number
      debtPct: number
      isLongTerm: boolean
      equityGain: number
      debtGain: number
    }> = []

    for (const holding of holdings) {
      const invested = parseFloat(String(holding.investedAmount))
      const current = parseFloat(String(holding.currentAmount || holding.currentValue))
      const gain = current - invested
      const inputCat = holding.category || 'Equity'
      const { equityPct, debtPct } = getEquityDebtSplit(inputCat)
      const holdingDays = getHoldingPeriodDays(holding.purchaseDate)

      const isLongTerm = isEquityOriented(inputCat)
        ? holdingDays > 365  // Equity: > 1 year = LTCG
        : holdingDays > 1095 // Debt: > 3 years = LTCG

      const gainType = isLongTerm ? 'LTCG' : 'STCG'
      
      const mappedCat: 'equity' | 'debt' | 'hybrid' = 
        inputCat.toLowerCase().includes('debt') ? 'debt' : 
        (inputCat.toLowerCase().includes('hybrid') || inputCat.toLowerCase().includes('balanced') ? 'hybrid' : 'equity')

      // Split gains proportionally
      const equityGain = gain * (equityPct / 100)
      const debtGain = gain * (debtPct / 100)

      let taxRate = 0
      if (isEquityOriented(inputCat)) {
        taxRate = isLongTerm ? 0.125 : 0.20
      } else {
        taxRate = slabRate
      }

      intermediateResults.push({
        id: (holding as any).id || Math.random().toString(),
        name: holding.name || 'Unknown Fund',
        invested,
        current,
        gain,
        holdingDays,
        gainType,
        taxRate,
        category: mappedCat,
        equityPct,
        debtPct,
        isLongTerm,
        equityGain,
        debtGain,
      })
    }

    // Calculate exemption allocation across holdings (greedy)
    let remainingExemption = Math.max(0, LTCG_EXEMPTION_LIMIT - realizedLTCG)

    const results: TaxHoldingResult[] = []
    let totalTax = 0
    let totalNetGain = 0

    // Sort to apply exemption to largest gains first (most efficient)
    const sortedResults = [...intermediateResults].sort((a, b) => b.equityGain - a.equityGain)

    for (const r of sortedResults) {
      let taxAmount = 0

      if (r.category === 'equity' || (r.category === 'hybrid' && isEquityOriented(r.name))) {
        if (r.isLongTerm && r.equityGain > 0) {
          const usedExemption = Math.min(r.equityGain, remainingExemption)
          remainingExemption -= usedExemption
          taxAmount = Math.max(0, r.equityGain - usedExemption) * r.taxRate
        } else {
          taxAmount = Math.max(0, r.equityGain) * r.taxRate
        }
      } else {
        // Debt or non-equity hybrid
        if (r.debtPct > 0 && r.equityPct > 0) {
          let equityTax = 0
          if (r.isLongTerm && r.equityGain > 0) {
            const usedExemption = Math.min(r.equityGain, remainingExemption)
            remainingExemption -= usedExemption
            equityTax = Math.max(0, r.equityGain - usedExemption) * 0.125
          } else {
            equityTax = Math.max(0, r.equityGain) * 0.20
          }
          const debtTax = Math.max(0, r.debtGain) * slabRate
          taxAmount = equityTax + debtTax
        } else {
          taxAmount = Math.max(0, r.gain) * r.taxRate
        }
      }

      if (r.gain <= 0) taxAmount = 0

      const netGain = r.gain - taxAmount
      totalTax += taxAmount
      totalNetGain += netGain

      results.push({
        name: r.name,
        category: r.category,
        investedAmount: Math.round(r.invested),
        currentValue: Math.round(r.current),
        gain: Math.round(r.gain),
        holdingPeriodDays: r.holdingDays,
        gainType: r.gainType,
        taxRate: r.taxRate,
        taxAmount: Math.round(taxAmount),
        netGain: Math.round(netGain),
      })
    }

    const totalGain = results.reduce((sum, r) => sum + r.gain, 0)
    const totalTaxVal = results.reduce((sum, r) => sum + r.taxAmount, 0)
    const totalNetGainVal = results.reduce((sum, r) => sum + r.netGain, 0)
    const effectiveTaxRate = totalGain > 0 ? (totalTaxVal / totalGain) * 100 : 0
    const ltcgExemptionUsed = LTCG_EXEMPTION_LIMIT - remainingExemption

    return NextResponse.json({
      holdings: results,
      totalTax: Math.round(totalTaxVal),
      totalNetGain: Math.round(totalNetGainVal),
      effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
      ltcgExemptionUsed,
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
