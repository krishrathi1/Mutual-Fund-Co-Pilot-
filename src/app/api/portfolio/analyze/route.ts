import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Expected return defaults by category (annualized %)
const EXPECTED_RETURN_BY_CATEGORY: Record<string, number> = {
  Equity: 12,
  ELSS: 12,
  Index: 11,
  Hybrid: 9,
  Debt: 7,
}

function getExpectedReturn(category: string): number {
  return EXPECTED_RETURN_BY_CATEGORY[category] || 10
}

// Expense ratios in the DB are stored as percentages (e.g., 0.72 = 0.72%)

function getExpenseRatioForPlan(fund: { directExpenseRatio: number; regularExpenseRatio: number }, planType: string): number {
  return planType === 'direct' ? fund.directExpenseRatio : fund.regularExpenseRatio
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

    // Fetch all holdings with fund details
    const holdings = await db.holding.findMany({
      where: { sessionId },
      include: { fund: true },
    })

    if (holdings.length === 0) {
      return NextResponse.json({
        totalInvested: 0,
        currentValue: 0,
        totalGain: 0,
        totalGainPct: 0,
        weightedExpenseRatio: 0,
        annualCost: 0,
        directSavings: {
          annualSaving: 0,
          fiveYearSaving: 0,
          tenYearSaving: 0,
          twentyYearSaving: 0,
          lifetimeSavingAtRetirement: 0,
        },
        categoryBreakdown: [],
        recommendations: [],
        riskProfile: {
          overallRisk: 'N/A',
          equityPct: 0,
          debtPct: 0,
          concentrationRisk: 'No holdings to analyze',
          diversificationScore: 0,
        },
      })
    }

    // === Core metrics ===
    const totalInvested = holdings.reduce((sum, h) => sum + h.investedAmount, 0)
    const currentValue = holdings.reduce((sum, h) => sum + h.currentAmount, 0)
    const totalGain = currentValue - totalInvested
    const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0

    // === Weighted expense ratio (in %, same as DB format) ===
    let weightedExpenseRatio = 0
    for (const holding of holdings) {
      const weight = holding.currentAmount / currentValue
      const expenseRatio = getExpenseRatioForPlan(holding.fund, holding.planType)
      weightedExpenseRatio += weight * expenseRatio
    }

    // Annual cost = (weightedExpenseRatio / 100) * currentValue
    // e.g., weightedExpenseRatio = 1.23% → annual cost = 0.0123 * currentValue
    const annualCost = (weightedExpenseRatio / 100) * currentValue

    // === Direct savings calculation ===
    // For each holding on regular plan, calculate savings if switched to direct
    let annualSavingIfSwitched = 0
    for (const holding of holdings) {
      if (holding.planType === 'regular') {
        const expenseDiffPct = holding.fund.regularExpenseRatio - holding.fund.directExpenseRatio
        // Saving = (expenseDiffPct / 100) * currentAmount
        annualSavingIfSwitched += (expenseDiffPct / 100) * holding.currentAmount
      }
    }

    // Compound the savings over different periods
    let fiveYearSaving = 0
    let tenYearSaving = 0
    let twentyYearSaving = 0
    let lifetimeSavingAtRetirement = 0

    for (const holding of holdings) {
      if (holding.planType === 'regular') {
        const expectedReturn = getExpectedReturn(holding.fund.category)
        // Rates: expectedReturn and expenseRatio are both in %
        const directRate = (expectedReturn - holding.fund.directExpenseRatio) / 100
        const regularRate = (expectedReturn - holding.fund.regularExpenseRatio) / 100

        const directFV5 = holding.currentAmount * Math.pow(1 + directRate, 5)
        const regularFV5 = holding.currentAmount * Math.pow(1 + regularRate, 5)
        fiveYearSaving += directFV5 - regularFV5

        const directFV10 = holding.currentAmount * Math.pow(1 + directRate, 10)
        const regularFV10 = holding.currentAmount * Math.pow(1 + regularRate, 10)
        tenYearSaving += directFV10 - regularFV10

        const directFV20 = holding.currentAmount * Math.pow(1 + directRate, 20)
        const regularFV20 = holding.currentAmount * Math.pow(1 + regularRate, 20)
        twentyYearSaving += directFV20 - regularFV20

        const directFV30 = holding.currentAmount * Math.pow(1 + directRate, 30)
        const regularFV30 = holding.currentAmount * Math.pow(1 + regularRate, 30)
        lifetimeSavingAtRetirement += directFV30 - regularFV30
      }
    }

    const directSavings = {
      annualSaving: Math.round(annualSavingIfSwitched),
      fiveYearSaving: Math.round(fiveYearSaving),
      tenYearSaving: Math.round(tenYearSaving),
      twentyYearSaving: Math.round(twentyYearSaving),
      lifetimeSavingAtRetirement: Math.round(lifetimeSavingAtRetirement),
    }

    // === Category breakdown ===
    const categoryMap = new Map<string, number>()
    for (const holding of holdings) {
      const cat = holding.fund.category
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + holding.currentAmount)
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount: Math.round(amount),
      pct: Math.round((amount / currentValue) * 10000) / 100,
    }))

    // Group regular holdings by fundId to avoid duplicate recommendations
    const regularHoldingsByFund = new Map<string, typeof holdings[0][]>()
    for (const h of holdings) {
      if (h.planType === 'regular') {
        const list = regularHoldingsByFund.get(h.fundId) || []
        list.push(h)
        regularHoldingsByFund.set(h.fundId, list)
      }
    }

    const recommendations = Array.from(regularHoldingsByFund.entries())
      .map(([fundId, fundHoldings]) => {
        const holding = fundHoldings[0] // Fund details are same for all
        const totalAmount = fundHoldings.reduce((sum, h) => sum + h.currentAmount, 0)
        
        const expenseDiffPct = holding.fund.regularExpenseRatio - holding.fund.directExpenseRatio
        const expenseDiffBps = Math.round(expenseDiffPct * 100)
        const annualSaving = (expenseDiffPct / 100) * totalAmount
        const expectedReturn = getExpectedReturn(holding.fund.category)
        const directRate = (expectedReturn - holding.fund.directExpenseRatio) / 100
        const regularRate = (expectedReturn - holding.fund.regularExpenseRatio) / 100
        const tenYearSaving = totalAmount * (Math.pow(1 + directRate, 10) - Math.pow(1 + regularRate, 10))

        // Determine priority
        let priority: 'high' | 'medium' | 'low'
        if (expenseDiffBps >= 100 || annualSaving >= 5000) {
          priority = 'high'
        } else if (expenseDiffBps >= 50 || annualSaving >= 2000) {
          priority = 'medium'
        } else {
          priority = 'low'
        }

        // Generate plain language reason
        let reason = ''
        if (expenseDiffBps >= 100) {
          reason = `Your regular plan charges ${expenseDiffPct.toFixed(2)}% more in expenses than the direct plan. On your total investment of ₹${Math.round(totalAmount).toLocaleString('en-IN')}, that's ₹${Math.round(annualSaving).toLocaleString('en-IN')} every year that goes to your distributor instead of your wealth. Over 10 years, switching to direct could save you approximately ₹${Math.round(tenYearSaving).toLocaleString('en-IN')} through the power of compounding.`
        } else if (expenseDiffBps >= 50) {
          reason = `Switching from regular to direct plan would save you ${expenseDiffPct.toFixed(2)}% annually in expenses. While this seems small, it compounds to ₹${Math.round(tenYearSaving).toLocaleString('en-IN')} over 10 years on your ₹${Math.round(totalAmount).toLocaleString('en-IN')} investment. Every rupee saved in expenses adds to your returns.`
        } else {
          reason = `The direct plan of this fund has a ${expenseDiffPct.toFixed(2)}% lower expense ratio. On your total investment of ₹${Math.round(totalAmount).toLocaleString('en-IN')}, this saves ₹${Math.round(annualSaving).toLocaleString('en-IN')} annually. While the saving is modest, it's still free money over time.`
        }

        // Tradeoffs
        const tradeoffs: string[] = [
          'You will need to manage your investments yourself — no distributor to remind you about SIP dates or rebalancing.',
          'You must initiate the switch yourself through your platform (Coin, Kuvera, MFUtility, etc.).',
        ]

        if (holding.fund.category === 'Equity' || holding.fund.category === 'ELSS') {
          tradeoffs.push('Switching involves selling and re-buying, which may trigger capital gains tax. Consider this cost before switching.')
        }

        if (holding.fund.category === 'ELSS') {
          tradeoffs.push('If within the 3-year lock-in, you cannot switch until the lock-in period expires for each installment.')
        }

        tradeoffs.push('Direct and Regular plans hold the exact same stocks/bonds — the only difference is the commission paid to your distributor.')

        return {
          fundId: holding.fundId,
          schemeName: holding.fund.schemeName,
          currentPlan: 'regular' as const,
          recommendedPlan: 'direct' as const,
          expenseSavingBps: expenseDiffBps,
          annualSaving: Math.round(annualSaving),
          tenYearSaving: Math.round(tenYearSaving),
          reason,
          tradeoffs,
          priority,
        }
      })
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })

    // === Risk Profile ===
    let equityPct = 0
    let debtPct = 0

    for (const holding of holdings) {
      const weight = (holding.currentAmount / currentValue) * 100
      if (holding.fund.category === 'Equity' || holding.fund.category === 'ELSS') {
        equityPct += weight
      } else if (holding.fund.category === 'Debt') {
        debtPct += weight
      } else if (holding.fund.category === 'Hybrid') {
        // Split hybrid based on equity/debt allocation
        const eqPct = holding.fund.equityPercentage ?? 65
        const dbPct = holding.fund.debtPercentage ?? 35
        equityPct += weight * (eqPct / 100)
        debtPct += weight * (dbPct / 100)
      } else if (holding.fund.category === 'Index') {
        // Index funds are typically equity
        equityPct += weight
      }
    }

    // Determine overall risk
    let overallRisk: string
    if (equityPct > 80) overallRisk = 'Aggressive'
    else if (equityPct > 60) overallRisk = 'Moderately Aggressive'
    else if (equityPct > 40) overallRisk = 'Moderate'
    else if (equityPct > 20) overallRisk = 'Conservative'
    else overallRisk = 'Very Conservative'

    // Concentration risk
    const fundHouseMap = new Map<string, number>()
    for (const holding of holdings) {
      fundHouseMap.set(
        holding.fund.fundHouse,
        (fundHouseMap.get(holding.fund.fundHouse) || 0) + holding.currentAmount
      )
    }
    const maxConcentration = Math.max(...fundHouseMap.values()) / currentValue * 100

    let concentrationRisk: string
    if (maxConcentration > 60) {
      concentrationRisk = `High concentration risk: ${Math.round(maxConcentration)}% of your portfolio is in a single fund house. Consider diversifying across different fund houses to reduce risk.`
    } else if (maxConcentration > 40) {
      concentrationRisk = `Moderate concentration: ${Math.round(maxConcentration)}% of your portfolio is in one fund house. While not alarming, spreading across more fund houses would be safer.`
    } else {
      concentrationRisk = `Good diversification across fund houses. No single fund house dominates your portfolio.`
    }

    // Diversification score (1-10)
    const uniqueCategories = new Set(holdings.map((h) => h.fund.category)).size
    const uniqueFundHouses = fundHouseMap.size
    const uniqueFunds = new Set(holdings.map((h) => h.fundId)).size

    let diversificationScore = 0
    // Points for number of funds
    diversificationScore += Math.min(uniqueFunds * 1, 3)
    // Points for category diversity
    diversificationScore += Math.min(uniqueCategories * 1.5, 4)
    // Points for fund house diversity
    diversificationScore += Math.min(uniqueFundHouses * 1, 3)
    // Cap at 10
    diversificationScore = Math.min(Math.round(diversificationScore), 10)

    // Penalize if too concentrated
    if (maxConcentration > 60) diversificationScore = Math.max(diversificationScore - 3, 1)
    else if (maxConcentration > 40) diversificationScore = Math.max(diversificationScore - 1, 1)

    const riskProfile = {
      overallRisk,
      equityPct: Math.round(equityPct * 100) / 100,
      debtPct: Math.round(debtPct * 100) / 100,
      concentrationRisk,
      diversificationScore,
    }

    return NextResponse.json({
      totalInvested: Math.round(totalInvested),
      currentValue: Math.round(currentValue),
      totalGain: Math.round(totalGain),
      totalGainPct: Math.round(totalGainPct * 100) / 100,
      weightedExpenseRatio: Math.round(weightedExpenseRatio * 100) / 100,
      annualCost: Math.round(annualCost),
      directSavings,
      categoryBreakdown,
      recommendations,
      riskProfile,
    })
  } catch (error) {
    console.error('Error analyzing portfolio:', error)
    return NextResponse.json(
      { error: 'Failed to analyze portfolio' },
      { status: 500 }
    )
  }
}
