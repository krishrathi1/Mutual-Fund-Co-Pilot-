'use client'

import { useFundStore, type FundData } from '@/lib/store'
import { formatCurrency, formatPercent, formatAUM, getRiskColor, getCategoryColor, expenseRatioDiff } from '@/lib/helpers'
import { Search, SlidersHorizontal, X, TrendingUp, ArrowUpDown, Plus, GitCompareArrows } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useState, useCallback } from 'react'

const categories = ['All', 'Equity', 'Debt', 'Hybrid']
const subCategories: Record<string, string[]> = {
  'All': ['All'],
  'Equity': ['All', 'Large Cap', 'Mid Cap', 'Small Cap', 'Flexi Cap', 'ELSS', 'Index Fund', 'Sectoral/Thematic'],
  'Debt': ['All', 'Corporate Bond', 'Gilt', 'Short Duration'],
  'Hybrid': ['All', 'Balanced Advantage'],
}
const sortOptions = [
  { value: 'aumCrore', label: 'AUM (Largest)' },
  { value: 'expenseDiff', label: 'Expense Saving' },
  { value: 'directReturn1y', label: '1Y Return (Direct)' },
  { value: 'directReturn3y', label: '3Y Return (Direct)' },
  { value: 'directReturn5y', label: '5Y Return (Direct)' },
]

export default function ExploreFunds() {
  const {
    funds, fundsLoading, fundsTotal, searchQuery, categoryFilter, subCategoryFilter, sortBy,
    setSearchQuery, setCategoryFilter, setSubCategoryFilter, setSortBy, fetchFunds,
    toggleFundSelection, selectedFundIds, setActiveTab, fetchComparisons,
    addHolding,
  } = useFundStore()

  const [showFilters, setShowFilters] = useState(false)
  const [addingFund, setAddingFund] = useState<string | null>(null)

  useEffect(() => {
    fetchFunds()
  }, [searchQuery, categoryFilter, subCategoryFilter, sortBy])

  const handleAddToPortfolio = useCallback(async (fund: FundData) => {
    setAddingFund(fund.id)
    try {
      // Default to regular plan since most investors discover this tool while holding regular plans
      await addHolding({
        fundId: fund.id,
        planType: 'regular',
        investedAmount: fund.minInvestment * 10,
        currentAmount: fund.minInvestment * 12,
        units: (fund.minInvestment * 12) / fund.regularNav,
        purchaseDate: '2023-01-15',
      })
    } finally {
      setAddingFund(null)
    }
  }, [addHolding])

  const handleCompare = useCallback(() => {
    fetchComparisons()
    setActiveTab('compare')
  }, [fetchComparisons, setActiveTab])

  return (
    <div className="space-y-4">
      {/* Search & Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by fund name, fund house, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter || 'All'} onValueChange={(v) => setCategoryFilter(v === 'All' ? '' : v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={subCategoryFilter || 'All'} onValueChange={(v) => setSubCategoryFilter(v === 'All' ? '' : v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sub-category" />
            </SelectTrigger>
            <SelectContent>
              {(subCategories[categoryFilter] || subCategories['All']).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results summary + compare action */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {fundsLoading ? 'Searching...' : `${fundsTotal} funds found`}
        </p>
        {selectedFundIds.length > 0 && (
          <Button size="sm" onClick={handleCompare} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <GitCompareArrows className="h-4 w-4" />
            Compare {selectedFundIds.length} fund{selectedFundIds.length > 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Fund cards */}
      {fundsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {funds.map((fund) => {
            const expDiff = expenseRatioDiff(fund.directExpenseRatio, fund.regularExpenseRatio)
            const isSelected = selectedFundIds.includes(fund.id)
            return (
              <Card key={fund.id} className={`transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-emerald-500 shadow-md' : ''}`}>
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm leading-tight truncate" title={fund.schemeName}>{fund.schemeName}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{fund.fundHouse}</p>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className={`text-[10px] px-1.5 ${getCategoryColor(fund.category)}`}>
                        {fund.subCategory}
                      </Badge>
                    </div>
                  </div>

                  {/* Direct vs Regular comparison mini */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/20">
                      <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">DIRECT</p>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{fund.directExpenseRatio}%</p>
                      <p className="text-[10px] text-muted-foreground">Expense Ratio</p>
                      <p className="text-xs font-medium mt-1">{formatPercent(fund.directReturn1y)} <span className="text-muted-foreground">1Y</span></p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-2 dark:bg-red-950/20">
                      <p className="text-[10px] font-medium text-red-700 dark:text-red-400">REGULAR</p>
                      <p className="text-lg font-bold text-red-700 dark:text-red-400">{fund.regularExpenseRatio}%</p>
                      <p className="text-[10px] text-muted-foreground">Expense Ratio</p>
                      <p className="text-xs font-medium mt-1">{formatPercent(fund.regularReturn1y)} <span className="text-muted-foreground">1Y</span></p>
                    </div>
                  </div>

                  {/* Savings callout */}
                  <div className="rounded-md bg-amber-50 px-3 py-1.5 text-center dark:bg-amber-950/20">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      💰 You save <strong>{expDiff} bps/year</strong> in Direct = <strong>~₹{Math.round(expDiff * 50)}/yr</strong> on ₹5L
                    </p>
                  </div>

                  {/* Additional info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>AUM: {formatAUM(fund.aumCrore)}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 ${getRiskColor(fund.riskometer)}`}>
                      {fund.riskometer}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => toggleFundSelection(fund.id)}
                      className="flex-1 gap-1 text-xs"
                    >
                      <GitCompareArrows className="h-3 w-3" />
                      {isSelected ? 'Selected' : 'Compare'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddToPortfolio(fund)}
                      className="flex-1 gap-1 text-xs"
                      disabled={addingFund === fund.id}
                    >
                      <Plus className="h-3 w-3" />
                      {addingFund === fund.id ? 'Adding...' : 'Add to Portfolio'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {funds.length === 0 && !fundsLoading && (
        <div className="py-16 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No funds found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  )
}
