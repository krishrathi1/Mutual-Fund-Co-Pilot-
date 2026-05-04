import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface FundData {
  id: string
  schemeName: string
  fundHouse: string
  category: string
  subCategory: string
  riskometer: string
  benchmark: string
  fundManager: string
  directIsin: string
  directNav: number
  directExpenseRatio: number
  directReturn1y: number | null
  directReturn3y: number | null
  directReturn5y: number | null
  directSharpe1y: number | null
  directSharpe3y: number | null
  regularIsin: string
  regularNav: number
  regularExpenseRatio: number
  regularReturn1y: number | null
  regularReturn3y: number | null
  regularReturn5y: number | null
  regularSharpe1y: number | null
  regularSharpe3y: number | null
  trackingErrorBps: number | null
  benchmarkReturn1y: number | null
  benchmarkReturn3y: number | null
  benchmarkReturn5y: number | null
  aumCrore: number
  exitLoad: string
  minInvestment: number
  launchDate: string
  portfolioPeRatio: number | null
  portfolioPbRatio: number | null
  topHolding: string | null
  topHoldingWeight: number | null
  numStocks: number | null
  debtPercentage: number | null
  equityPercentage: number | null
}

export interface HoldingData {
  id: string
  sessionId: string
  fundId: string
  planType: 'direct' | 'regular'
  units: number
  investedAmount: number
  currentAmount: number
  purchaseDate: string | null
  fund: FundData
}

export interface ComparisonData {
  fundId: string
  schemeName: string
  fundHouse: string
  category: string
  subCategory: string
  direct: {
    nav: number
    expenseRatio: number
    return1y: number
    return3y: number
    return5y: number
    isin: string
    sharpe1y?: number | null
    sharpe3y?: number | null
  }
  regular: {
    nav: number
    expenseRatio: number
    return1y: number
    return3y: number
    return5y: number
    isin: string
    sharpe1y?: number | null
    sharpe3y?: number | null
  }
  expenseDiff: number
  returnDiff1y: number
  returnDiff3y: number
  returnDiff5y: number
  trackingErrorBps?: number | null
  riskAdjustedReturnDelta?: number | null
  benchmarkReturns?: {
    return1y: number | null
    return3y: number | null
    return5y: number | null
  }
  lifetimeSavings: Record<string, Record<string, number>>
  // Extra fields for advanced visualizations
  equityPercentage?: number | null
  debtPercentage?: number | null
  riskometer?: string
  aumCrore?: number
}

export interface Recommendation {
  fundId: string
  schemeName: string
  currentPlan: 'regular' | 'direct'
  recommendedPlan: 'direct' | 'regular'
  expenseSavingBps: number
  annualSaving: number
  tenYearSaving: number
  reason: string
  tradeoffs: string[]
  priority: 'high' | 'medium' | 'low'
}

export interface PortfolioAnalysis {
  totalInvested: number
  currentValue: number
  totalGain: number
  totalGainPct: number
  weightedExpenseRatio: number
  annualCost: number
  directSavings: {
    annualSaving: number
    fiveYearSaving: number
    tenYearSaving: number
    twentyYearSaving: number
    lifetimeSavingAtRetirement: number
  }
  categoryBreakdown: { category: string; amount: number; pct: number }[]
  recommendations: Recommendation[]
  riskProfile: {
    overallRisk: string
    equityPct: number
    debtPct: number
    concentrationRisk: string
    diversificationScore: number
  }
}

export interface SavingsCalculation {
  directValue: number
  regularValue: number
  savings: number
  savingsPct: number
  yearlyBreakdown: {
    year: number
    directValue: number
    regularValue: number
    savings: number
    cumulativeSavings: number
  }[]
}

export interface WatchlistItem {
  id: string
  fundId: string
  notes: string | null
  targetPrice: number | null
  createdAt: string
  fund: FundData
  liveNav?: { nav: string; date: string } | null
}

export interface GoalData {
  id: string
  name: string
  type: 'retirement' | 'education' | 'house' | 'emergency' | 'wedding' | 'custom'
  targetAmount: number
  years: number
  currentSavings: number
  riskProfile: 'conservative' | 'moderate' | 'aggressive'
  allocation: { equity: number; debt: number; hybrid: number }
  monthlySip: number
  recommendedFunds: FundData[]
  createdAt: string
}

export interface TaxCalculation {
  holdings: {
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
  }[]
  summary: {
    totalTax: number
    totalNetGain: number
    effectiveTaxRate: number
    totalGain: number
  }
  tips: string[]
}

export interface OverlapResult {
  pairs: {
    fund1: { id: string; name: string }
    fund2: { id: string; name: string }
    overlapScore: number
    commonCategories: string[]
    warning: string | null
  }[]
  matrix: number[][]
  fundNames: string[]
}

export interface XIRRResult {
  portfolioXirr: number
  holdings: {
    fundId: string
    fundName: string
    xirr: number
    invested: number
    current: number
  }[]
  benchmarkXirr: number
  methodology: string
}

type TabType = 'explore' | 'portfolio' | 'compare' | 'savings' | 'watchlist' | 'tax' | 'overlap' | 'goals' | 'xirr' | 'export' | 'risk' | 'stress' | 'heatmap' | 'nav' | 'sector' | 'diversification' | 'exitload' | 'sip' | 'rebalance' | 'market' | 'screener' | 'swp' | 'stp' | 'benchmark' | 'volatility' | 'rankings' | 'amc' | 'alerts'
type SavingsMode = 'lumpsum' | 'sip'

interface FundStore {
  // Navigation
  activeTab: TabType
  setActiveTab: (tab: TabType) => void

  // Funds
  funds: FundData[]
  fundsTotal: number
  fundsLoading: boolean
  searchQuery: string
  categoryFilter: string
  subCategoryFilter: string
  sortBy: string
  setSearchQuery: (q: string) => void
  setCategoryFilter: (c: string) => void
  setSubCategoryFilter: (c: string) => void
  setSortBy: (s: string) => void
  fetchFunds: (reset?: boolean) => Promise<void>
  
  // Portfolio / Holdings
  sessionId: string
  holdings: HoldingData[]
  holdingsLoading: boolean
  addHolding: (holding: { fundId: string; planType: 'direct' | 'regular'; investedAmount: number; currentAmount: number; units: number; purchaseDate?: string }) => Promise<void>
  removeHolding: (holdingId: string) => Promise<void>
  fetchHoldings: () => Promise<void>
  
  // Comparison
  selectedFundIds: string[]
  comparisons: ComparisonData[]
  comparisonsLoading: boolean
  toggleFundSelection: (fundId: string) => void
  fetchComparisons: () => Promise<void>
  
  // Portfolio Analysis
  analysis: PortfolioAnalysis | null
  analysisLoading: boolean
  fetchAnalysis: () => Promise<void>
  
  // Savings Calculator
  savingsResult: SavingsCalculation | null
  savingsLoading: boolean
  savingsMode: SavingsMode
  monthlySip: number
  setSavingsMode: (mode: SavingsMode) => void
  setMonthlySip: (amount: number) => void
  calculateSavings: (params: { fundId?: string; investedAmount: number; years: number; directExpenseRatio?: number; regularExpenseRatio?: number; expectedReturn?: number; mode?: SavingsMode; monthlySip?: number }) => Promise<void>

  // AI Insights
  aiInsights: Record<string, string>
  aiInsightsLoading: Record<string, boolean>
  fetchAiInsight: (fundId: string, fundData: object) => Promise<void>

  // Watchlist
  watchlist: WatchlistItem[]
  watchlistLoading: boolean
  fetchWatchlist: () => Promise<void>
  addToWatchlist: (fundId: string, notes?: string) => Promise<void>
  removeFromWatchlist: (id: string) => Promise<void>
  updateWatchlistNotes: (id: string, notes: string) => Promise<void>
  watchlistNavs: Record<string, { nav: string; date: string }>
  fetchWatchlistNavs: () => Promise<void>

  // Goals
  goals: GoalData[]
  goalsLoading: boolean
  fetchGoals: () => Promise<void>
  addGoal: (goal: Omit<GoalData, 'id' | 'allocation' | 'monthlySip' | 'recommendedFunds' | 'createdAt'>) => Promise<void>
  removeGoal: (id: string) => Promise<void>
}

// Generate or retrieve a persistent session ID
const getSessionId = () => {
  if (typeof window === 'undefined') return 'server-session'
  
  const storedId = localStorage.getItem('fundvista-session')
  if (storedId) return storedId
  
  const newId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  localStorage.setItem('fundvista-session', newId)
  return newId
}

const sessionId = getSessionId()

const RISK_ALLOCATIONS: Record<string, { equity: number; debt: number; hybrid: number }> = {
  conservative: { equity: 30, debt: 50, hybrid: 20 },
  moderate: { equity: 55, debt: 25, hybrid: 20 },
  aggressive: { equity: 75, debt: 10, hybrid: 15 },
}

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

function mapGoalType(name: string): GoalData['type'] {
  const lower = name.toLowerCase()
  if (lower.includes('retire')) return 'retirement'
  if (lower.includes('educ') || lower.includes('college') || lower.includes('school')) return 'education'
  if (lower.includes('house') || lower.includes('home') || lower.includes('property')) return 'house'
  if (lower.includes('emergen')) return 'emergency'
  if (lower.includes('wedd') || lower.includes('marriag')) return 'wedding'
  return 'custom'
}

function createLocalHolding(
  holding: { fundId: string; planType: 'direct' | 'regular'; investedAmount: number; currentAmount: number; units: number; purchaseDate?: string },
  sessionId: string,
  fund: FundData
): HoldingData {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    sessionId,
    fundId: holding.fundId,
    planType: holding.planType,
    units: holding.units,
    investedAmount: holding.investedAmount,
    currentAmount: holding.currentAmount,
    purchaseDate: holding.purchaseDate || null,
    fund,
  }
}

function computePortfolioAnalysis(holdings: HoldingData[]): PortfolioAnalysis {
  if (holdings.length === 0) {
    return {
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
    }
  }

  const totalInvested = holdings.reduce((sum, holding) => sum + holding.investedAmount, 0)
  const currentValue = holdings.reduce((sum, holding) => sum + holding.currentAmount, 0)
  const totalGain = currentValue - totalInvested
  const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0

  let weightedExpenseRatio = 0
  let annualSaving = 0
  let fiveYearSaving = 0
  let tenYearSaving = 0
  let twentyYearSaving = 0
  let lifetimeSavingAtRetirement = 0
  let equityPct = 0
  let debtPct = 0
  const categoryMap = new Map<string, number>()
  const fundHouseMap = new Map<string, number>()

  for (const holding of holdings) {
    const weight = currentValue > 0 ? holding.currentAmount / currentValue : 0
    const fund = holding.fund
    const expenseRatio = holding.planType === 'direct' ? fund.directExpenseRatio : fund.regularExpenseRatio
    weightedExpenseRatio += weight * expenseRatio
    categoryMap.set(fund.category, (categoryMap.get(fund.category) || 0) + holding.currentAmount)
    fundHouseMap.set(fund.fundHouse, (fundHouseMap.get(fund.fundHouse) || 0) + holding.currentAmount)

    if (fund.category === 'Equity' || fund.category === 'ELSS' || fund.category === 'Index') {
      equityPct += weight * 100
    } else if (fund.category === 'Debt') {
      debtPct += weight * 100
    } else if (fund.category === 'Hybrid') {
      equityPct += weight * (fund.equityPercentage ?? 65)
      debtPct += weight * (fund.debtPercentage ?? 35)
    }

    if (holding.planType !== 'regular') continue

    const expenseDiffPct = fund.regularExpenseRatio - fund.directExpenseRatio
    const expectedReturn = getExpectedReturn(fund.category)
    const directRate = (expectedReturn - fund.directExpenseRatio) / 100
    const regularRate = (expectedReturn - fund.regularExpenseRatio) / 100

    annualSaving += (expenseDiffPct / 100) * holding.currentAmount
    fiveYearSaving += holding.currentAmount * (Math.pow(1 + directRate, 5) - Math.pow(1 + regularRate, 5))
    tenYearSaving += holding.currentAmount * (Math.pow(1 + directRate, 10) - Math.pow(1 + regularRate, 10))
    twentyYearSaving += holding.currentAmount * (Math.pow(1 + directRate, 20) - Math.pow(1 + regularRate, 20))
    lifetimeSavingAtRetirement += holding.currentAmount * (Math.pow(1 + directRate, 30) - Math.pow(1 + regularRate, 30))
  }

  const recommendations = holdings
    .filter((holding) => holding.planType === 'regular')
    .map((holding) => {
      const expenseDiffPct = holding.fund.regularExpenseRatio - holding.fund.directExpenseRatio
      const expenseSavingBps = Math.round(expenseDiffPct * 100)
      const annual = (expenseDiffPct / 100) * holding.currentAmount
      const expectedReturn = getExpectedReturn(holding.fund.category)
      const directRate = (expectedReturn - holding.fund.directExpenseRatio) / 100
      const regularRate = (expectedReturn - holding.fund.regularExpenseRatio) / 100
      const tenYear = holding.currentAmount * (Math.pow(1 + directRate, 10) - Math.pow(1 + regularRate, 10))
      const priority: Recommendation['priority'] =
        expenseSavingBps >= 100 || annual >= 5000 ? 'high' : expenseSavingBps >= 50 || annual >= 2000 ? 'medium' : 'low'

      return {
        fundId: holding.fundId,
        schemeName: holding.fund.schemeName,
        currentPlan: 'regular' as const,
        recommendedPlan: 'direct' as const,
        expenseSavingBps,
        annualSaving: Math.round(annual),
        tenYearSaving: Math.round(tenYear),
        reason: `Switching to Direct can reduce expenses by ${expenseDiffPct.toFixed(2)}% per year for this holding.`,
        tradeoffs: [
          'You will need to manage the investment directly.',
          'Switching may trigger tax or exit-load implications depending on holding period.',
        ],
        priority,
      }
    })

  const maxConcentration = currentValue > 0 && fundHouseMap.size > 0 ? Math.max(...fundHouseMap.values()) / currentValue * 100 : 0

  return {
    totalInvested,
    currentValue,
    totalGain,
    totalGainPct,
    weightedExpenseRatio,
    annualCost: (weightedExpenseRatio / 100) * currentValue,
    directSavings: {
      annualSaving: Math.round(annualSaving),
      fiveYearSaving: Math.round(fiveYearSaving),
      tenYearSaving: Math.round(tenYearSaving),
      twentyYearSaving: Math.round(twentyYearSaving),
      lifetimeSavingAtRetirement: Math.round(lifetimeSavingAtRetirement),
    },
    categoryBreakdown: Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount: Math.round(amount),
      pct: currentValue > 0 ? Math.round((amount / currentValue) * 10000) / 100 : 0,
    })),
    recommendations,
    riskProfile: {
      overallRisk: equityPct > 80 ? 'Aggressive' : equityPct > 60 ? 'Moderately Aggressive' : equityPct > 40 ? 'Moderate' : equityPct > 20 ? 'Conservative' : 'Very Conservative',
      equityPct: Math.round(equityPct),
      debtPct: Math.round(debtPct),
      concentrationRisk: maxConcentration > 60 ? 'High concentration risk' : maxConcentration > 40 ? 'Moderate concentration risk' : 'Well diversified across fund houses',
      diversificationScore: Math.max(0, Math.min(100, Math.round(100 - maxConcentration))),
    },
  }
}

export const useFundStore = create<FundStore>()(
  persist(
    (set, get) => ({
      // Navigation
      activeTab: 'explore',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Funds
      funds: [],
      fundsTotal: 0,
      fundsLoading: false,
      searchQuery: '',
      categoryFilter: '',
      subCategoryFilter: '',
      sortBy: 'aumCrore',
      setSearchQuery: (q) => set({ searchQuery: q }),
      setCategoryFilter: (c) => set({ categoryFilter: c, subCategoryFilter: '' }),
      setSubCategoryFilter: (c) => set({ subCategoryFilter: c }),
      setSortBy: (s) => set({ sortBy: s }),
      fetchFunds: async (_reset = true) => {
        set({ fundsLoading: true })
        try {
          const { searchQuery, categoryFilter, subCategoryFilter, sortBy } = get()
          const params = new URLSearchParams()
          if (searchQuery) params.set('q', searchQuery)
          if (categoryFilter) params.set('category', categoryFilter)
          if (subCategoryFilter) params.set('subCategory', subCategoryFilter)
          if (sortBy) params.set('sortBy', sortBy)
          params.set('order', 'desc')
          params.set('limit', '50')
          
          const res = await fetch(`/api/funds?${params}`)
          if (res.ok) {
            const data = await res.json()
            set({ funds: data.funds || [], fundsTotal: data.total || 0, fundsLoading: false })
          } else {
            console.error('API Error:', res.status)
            set({ funds: [], fundsTotal: 0, fundsLoading: false })
          }
        } catch (err) {
          console.error('Fetch Error:', err)
          set({ funds: [], fundsTotal: 0, fundsLoading: false })
        }
      },

      // Portfolio / Holdings
      sessionId,
      holdings: [],
      holdingsLoading: false,
      addHolding: async (holding) => {
        const { sessionId, funds, holdings } = get()
        const fund = funds.find((f) => f.id === holding.fundId)

        try {
          const res = await fetch('/api/holdings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...holding, sessionId }),
          })

          if (res.ok) {
            const savedHolding = await res.json()
            set({ holdings: [savedHolding, ...holdings] })
            return
          }

          const errorText = await res.text()
          console.error('Add holding failed:', res.status, errorText)
        } catch (err) {
          console.error('Add holding error:', err)
        }

        if (!fund) {
          throw new Error('Fund not found locally. Please refresh funds and try again.')
        }

        set({ holdings: [createLocalHolding(holding, sessionId, fund), ...holdings] })
      },
      removeHolding: async (holdingId) => {
        const { sessionId } = get()
        const previousHoldings = get().holdings
        set({ holdings: previousHoldings.filter((holding) => holding.id !== holdingId) })

        if (holdingId.startsWith('local-')) return

        try {
          const res = await fetch(`/api/holdings/${holdingId}?sessionId=${sessionId}`, { method: 'DELETE' })
          if (!res.ok) {
            const errorText = await res.text()
            console.error('Remove holding failed:', res.status, errorText)
          }
        } catch (err) {
          console.error('Remove holding error:', err)
        }
      },
      fetchHoldings: async () => {
        const { holdingsLoading } = get()
        if (holdingsLoading) return
        
        set({ holdingsLoading: true })
        try {
          const { sessionId } = get()
          if (!sessionId || sessionId === 'server-session') {
            set({ holdingsLoading: false })
            return
          }
          const res = await fetch(`/api/holdings?sessionId=${sessionId}`)
          const data = await res.json()
          if (res.ok) {
            const localHoldings = get().holdings.filter((holding) => holding.id.startsWith('local-'))
            const remoteHoldings = data.holdings || []
            set({ holdings: [...localHoldings, ...remoteHoldings], holdingsLoading: false })
          } else {
            console.error('Fetch holdings failed:', data.error)
            set({ holdingsLoading: false })
          }
        } catch (err) {
          console.error('Fetch holdings error:', err)
          set({ holdingsLoading: false })
        }
      },

      // Comparison
      selectedFundIds: [],
      comparisons: [],
      comparisonsLoading: false,
      toggleFundSelection: (fundId) => {
        const { selectedFundIds } = get()
        if (selectedFundIds.includes(fundId)) {
          set({ selectedFundIds: selectedFundIds.filter(id => id !== fundId) })
        } else if (selectedFundIds.length < 5) {
          set({ selectedFundIds: [...selectedFundIds, fundId] })
        }
      },
      fetchComparisons: async () => {
        const { selectedFundIds } = get()
        if (selectedFundIds.length === 0) return
        set({ comparisonsLoading: true })
        try {
          const ids = selectedFundIds.join(',')
          const res = await fetch(`/api/funds/compare?ids=${ids}`)
          const data = await res.json()
          set({ comparisons: data, comparisonsLoading: false })
        } catch {
          set({ comparisonsLoading: false })
        }
      },

      // Portfolio Analysis
      analysis: null,
      analysisLoading: false,
      fetchAnalysis: async () => {
        set({ analysisLoading: true })
        const useLocalAnalysis = () => {
          set({ analysis: computePortfolioAnalysis(get().holdings), analysisLoading: false })
        }

        try {
          const { sessionId, holdings } = get()
          const res = await fetch('/api/portfolio/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          })
          const data = await res.json()
          if (!res.ok || (holdings.length > 0 && data.currentValue === 0)) {
            useLocalAnalysis()
            return
          }

          set({ analysis: data, analysisLoading: false })
        } catch (err) {
          console.error('Fetch analysis error:', err)
          useLocalAnalysis()
        }
      },

      // Savings Calculator
      savingsResult: null,
      savingsLoading: false,
      savingsMode: 'lumpsum',
      monthlySip: 10000,
      setSavingsMode: (mode) => set({ savingsMode: mode }),
      setMonthlySip: (amount) => set({ monthlySip: amount }),
      calculateSavings: async (params) => {
        set({ savingsLoading: true })
        try {
          const res = await fetch('/api/savings/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
          })
          const data = await res.json()
          set({ savingsResult: data, savingsLoading: false })
        } catch {
          set({ savingsLoading: false })
        }
      },

      // AI Insights
      aiInsights: {},
      aiInsightsLoading: {},
      fetchAiInsight: async (fundId, fundData) => {
        const { aiInsights, aiInsightsLoading } = get()
        if (aiInsights[fundId] || aiInsightsLoading[fundId]) return

        set({ aiInsightsLoading: { ...aiInsightsLoading, [fundId]: true } })
        try {
          const res = await fetch('/api/ai/insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fundId, ...fundData }),
          })
          const data = await res.json()
          const current = get().aiInsights
          set({ 
            aiInsights: { ...current, [fundId]: data.insights || data.insight || data.explanation || 'No insight available' },
            aiInsightsLoading: { ...get().aiInsightsLoading, [fundId]: false },
          })
        } catch {
          const current = get().aiInsights
          set({ 
            aiInsights: { ...current, [fundId]: 'Failed to load AI insight. The backend may not be ready yet.' },
            aiInsightsLoading: { ...get().aiInsightsLoading, [fundId]: false },
          })
        }
      },

      // Watchlist
      watchlist: [],
      watchlistLoading: false,
      watchlistNavs: {},
      fetchWatchlist: async () => {
        const { watchlistLoading } = get()
        if (watchlistLoading) return
        
        set({ watchlistLoading: true })
        try {
          const { sessionId } = get()
          if (!sessionId || sessionId === 'server-session') {
            set({ watchlistLoading: false })
            return
          }
          const res = await fetch(`/api/watchlist?sessionId=${sessionId}`)
          const data = await res.json()
          set({ watchlist: data.watchlist || data.items || [], watchlistLoading: false })
        } catch {
          set({ watchlistLoading: false })
        }
      },
      addToWatchlist: async (fundId, notes = '') => {
        const { sessionId } = get()
        await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, fundId, notes }),
        })
        await get().fetchWatchlist()
      },
      removeFromWatchlist: async (id) => {
        const { sessionId } = get()
        await fetch(`/api/watchlist/${id}?sessionId=${sessionId}`, { method: 'DELETE' })
        await get().fetchWatchlist()
      },
      updateWatchlistNotes: async (id, notes) => {
        const { sessionId } = get()
        await fetch(`/api/watchlist/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, notes }),
        })
        await get().fetchWatchlist()
      },
      fetchWatchlistNavs: async () => {
        const { watchlist } = get()
        const navs: Record<string, { nav: string; date: string }> = {}
        await Promise.allSettled(
          watchlist.map(async (item) => {
            try {
              const isin = item.fund.directIsin
              if (!isin) return
              const res = await fetch(`/api/funds/nav?isin=${isin}`)
              const data = await res.json()
              if (data.result) {
                navs[item.fundId] = { nav: data.result.nav, date: data.result.date }
              }
            } catch { /* ignore */ }
          })
        )
        set({ watchlistNavs: navs })
      },

      // Goals
      goals: [],
      goalsLoading: false,
      fetchGoals: async () => {
        const { goalsLoading } = get()
        if (goalsLoading) return
        
        set({ goalsLoading: true })
        try {
          const { sessionId } = get()
          if (!sessionId || sessionId === 'server-session') {
            set({ goalsLoading: false })
            return
          }
          const res = await fetch(`/api/goals?sessionId=${sessionId}`)
          const data = await res.json()
          
          if (!res.ok) {
            set({ goalsLoading: false })
            return
          }
          
          // Map API response to GoalData format
          const mappedGoals: GoalData[] = (data.goals || []).map((g: Record<string, unknown>) => {
            const name = (g.name as string) || ''
            const riskStr = ((g.riskProfile as string) || 'Moderate').toLowerCase() as GoalData['riskProfile']
            const allocation = g.suggestedAllocation ? JSON.parse(g.suggestedAllocation as string) : RISK_ALLOCATIONS[riskStr] || RISK_ALLOCATIONS.moderate
            return {
              id: g.id as string,
              name,
              type: mapGoalType(name),
              targetAmount: g.targetAmount as number,
              years: g.yearsToGoal as number,
              currentSavings: g.currentAmount as number,
              riskProfile: riskStr,
              allocation,
              monthlySip: (g.monthlySipNeeded as number) || 0,
              recommendedFunds: [],
              createdAt: g.createdAt as string,
            }
          })
          set({ goals: mappedGoals, goalsLoading: false })
        } catch {
          set({ goalsLoading: false })
        }
      },
      addGoal: async (goal) => {
        const { sessionId } = get()
        await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            name: goal.name,
            targetAmount: goal.targetAmount,
            currentAmount: goal.currentSavings,
            yearsToGoal: goal.years,
            riskProfile: goal.riskProfile.charAt(0).toUpperCase() + goal.riskProfile.slice(1),
          }),
        })
        await get().fetchGoals()
      },
      removeGoal: async (id) => {
        const { sessionId } = get()
        await fetch(`/api/goals/${id}?sessionId=${sessionId}`, { method: 'DELETE' })
        await get().fetchGoals()
      },
    }),
    {
      name: 'fundvista-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist non-loading state and non-volatile data
      partialize: (state) => ({
        activeTab: state.activeTab,
        sessionId: state.sessionId,
        selectedFundIds: state.selectedFundIds,
        holdings: state.holdings,
        watchlist: state.watchlist,
        goals: state.goals,
        savingsMode: state.savingsMode,
        monthlySip: state.monthlySip,
      }),
    }
  )
)
