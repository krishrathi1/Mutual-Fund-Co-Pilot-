import { create } from 'zustand'

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

type TabType = 'explore' | 'portfolio' | 'compare' | 'savings'
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
}

// Generate a session ID
const sessionId = typeof window !== 'undefined' 
  ? (sessionStorage.getItem('fundvista-session') || (() => {
      const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      sessionStorage.setItem('fundvista-session', id)
      return id
    })())
  : 'server-session'

export const useFundStore = create<FundStore>((set, get) => ({
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
      const data = await res.json()
      set({ funds: data.funds, fundsTotal: data.total, fundsLoading: false })
    } catch {
      set({ fundsLoading: false })
    }
  },

  // Portfolio / Holdings
  sessionId,
  holdings: [],
  holdingsLoading: false,
  addHolding: async (holding) => {
    const { sessionId } = get()
    await fetch('/api/holdings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...holding, sessionId }),
    })
    await get().fetchHoldings()
  },
  removeHolding: async (holdingId) => {
    const { sessionId } = get()
    await fetch(`/api/holdings/${holdingId}?sessionId=${sessionId}`, { method: 'DELETE' })
    await get().fetchHoldings()
  },
  fetchHoldings: async () => {
    set({ holdingsLoading: true })
    try {
      const { sessionId } = get()
      const res = await fetch(`/api/holdings?sessionId=${sessionId}`)
      const data = await res.json()
      set({ holdings: data.holdings, holdingsLoading: false })
    } catch {
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
    try {
      const { sessionId } = get()
      const res = await fetch('/api/portfolio/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json()
      set({ analysis: data, analysisLoading: false })
    } catch {
      set({ analysisLoading: false })
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
        aiInsights: { ...current, [fundId]: data.insight || data.explanation || 'No insight available' },
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
}))
