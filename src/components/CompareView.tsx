'use client'

import { useFundStore, type ComparisonData, type Recommendation } from '@/lib/store'
import { formatCurrency, formatPercent, formatBps, getRiskColor, getPriorityColor, getCategoryColor, expenseRatioDiff } from '@/lib/helpers'
import { GitCompareArrows, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight, Info, Shield, Zap, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useEffect } from 'react'

export default function CompareView() {
  const {
    comparisons, comparisonsLoading, fetchComparisons, selectedFundIds,
    analysis, holdings, setActiveTab,
  } = useFundStore()

  useEffect(() => {
    if (selectedFundIds.length > 0 && comparisons.length === 0) {
      fetchComparisons()
    }
  }, [])

  const recommendations = analysis?.recommendations || []

  return (
    <div className="space-y-6">
      <Tabs defaultValue="compare" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="compare" className="gap-2">
            <GitCompareArrows className="h-4 w-4" />
            Direct vs Regular
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Switch Recommendations
            {recommendations.length > 0 && (
              <Badge className="ml-1 h-5 min-w-5 text-[10px]">{recommendations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Direct vs Regular Comparison Tab */}
        <TabsContent value="compare" className="space-y-4 mt-4">
          {selectedFundIds.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <GitCompareArrows className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No funds selected for comparison</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Go to Explore Funds and select up to 5 funds to compare their Direct vs Regular variants side-by-side.
                </p>
                <Button onClick={() => setActiveTab('explore')} className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700">
                  Explore Funds
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ) : comparisonsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}><CardContent className="p-6"><div className="h-40 bg-muted animate-pulse rounded" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Comparing {comparisons.length} fund{comparisons.length !== 1 ? 's' : ''}
                </p>
                <Button size="sm" variant="outline" onClick={() => fetchComparisons()} className="gap-2">
                  Refresh
                </Button>
              </div>

              {comparisons.map((comp) => (
                <FundComparisonCard key={comp.fundId} comparison={comp} />
              ))}
            </>
          )}
        </TabsContent>

        {/* Switch Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4 mt-4">
          {recommendations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Lightbulb className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No recommendations yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Add your holdings to the portfolio first. We&apos;ll analyze them and suggest switches from Regular to Direct plans.
                </p>
                <Button onClick={() => setActiveTab('portfolio')} className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700">
                  Go to Portfolio
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 dark:border-emerald-900 dark:from-emerald-950/20 dark:to-teal-950/20">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900">
                    <Zap className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Switch Summary</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      We found <strong>{recommendations.length} opportunity{recommendations.length !== 1 ? 'ies' : 'y'}</strong> to save on expenses by switching from Regular to Direct plans.
                    </p>
                    <div className="mt-2 flex gap-4 text-sm">
                      <span>Annual Savings: <strong className="text-emerald-700 dark:text-emerald-300">{formatCurrency(recommendations.reduce((s, r) => s + r.annualSaving, 0))}</strong></span>
                      <span>10yr Savings: <strong className="text-emerald-700 dark:text-emerald-300">{formatCurrency(recommendations.reduce((s, r) => s + r.tenYearSaving, 0))}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sorted by priority */}
              {['high', 'medium', 'low'].map(priority => {
                const recs = recommendations.filter(r => r.priority === priority)
                if (recs.length === 0) return null
                return (
                  <div key={priority}>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={getPriorityColor(priority)}>
                        {priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢'} {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                      </Badge>
                      <span className="text-sm text-muted-foreground">{recs.length} recommendation{recs.length !== 1 ? 's' : ''}</span>
                    </div>
                    {recs.map((rec) => (
                      <RecommendationCard key={rec.fundId} recommendation={rec} />
                    ))}
                  </div>
                )
              })}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function FundComparisonCard({ comparison }: { comparison: ComparisonData }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{comparison.schemeName}</CardTitle>
            <CardDescription>{comparison.fundHouse} · {comparison.category} · {comparison.subCategory}</CardDescription>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Save {comparison.expenseDiff} bps/yr
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Side by side comparison */}
        <div className="grid grid-cols-3 gap-0 overflow-hidden rounded-xl border">
          {/* Header row */}
          <div className="bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">Metric</p>
          </div>
          <div className="bg-emerald-50 p-3 dark:bg-emerald-950/20">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">✓ DIRECT</p>
          </div>
          <div className="bg-red-50 p-3 dark:bg-red-950/20">
            <p className="text-xs font-bold text-red-700 dark:text-red-400">⚠ REGULAR</p>
          </div>

          {/* Rows */}
          <ComparisonRow label="Expense Ratio" direct={`${comparison.direct.expenseRatio}%`} regular={`${comparison.regular.expenseRatio}%`} highlight="lower" />
          <ComparisonRow label="1Y Return" direct={formatPercent(comparison.direct.return1y)} regular={formatPercent(comparison.regular.return1y)} highlight="higher" />
          <ComparisonRow label="3Y Return (CAGR)" direct={formatPercent(comparison.direct.return3y)} regular={formatPercent(comparison.regular.return3y)} highlight="higher" />
          <ComparisonRow label="5Y Return (CAGR)" direct={formatPercent(comparison.direct.return5y)} regular={formatPercent(comparison.regular.return5y)} highlight="higher" />
          <ComparisonRow label="NAV" direct={`₹${comparison.direct.nav.toFixed(2)}`} regular={`₹${comparison.regular.nav.toFixed(2)}`} highlight="higher" />
        </div>

        {/* Lifetime savings table */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Lifetime Savings if You Switch to Direct
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3 text-left font-medium text-muted-foreground">Investment</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">3yr</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">5yr</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">10yr</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">20yr</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">30yr</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(comparison.lifetimeSavings).map(([amount, years]) => (
                  <tr key={amount} className="border-b last:border-0">
                    <td className="py-2 px-3 font-medium">{formatCurrency(parseInt(amount))}</td>
                    {['3', '5', '10', '20', '30'].map(yr => (
                      <td key={yr} className="py-2 px-3 text-right font-medium text-emerald-700 dark:text-emerald-400">
                        {years[yr] ? formatCurrency(years[yr]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Plain language explanation */}
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <strong>What this means:</strong> The Direct plan of {comparison.schemeName} has an expense ratio that is <strong>{comparison.expenseDiff} basis points lower</strong> than the Regular plan. 
              Both plans hold the <em>exact same stocks</em> with the <em>same fund manager</em>. The only difference is that the Regular plan pays a commission to your distributor. 
              On a ₹5L investment held for 20 years, switching to Direct saves you approximately <strong>{formatCurrency(comparison.lifetimeSavings['500000']?.['20'] || 0)}</strong>.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ComparisonRow({ label, direct, regular, highlight }: { label: string; direct: string; regular: string; highlight: 'lower' | 'higher' }) {
  return (
    <>
      <div className="border-t p-3">
        <p className="text-xs font-medium">{label}</p>
      </div>
      <div className="border-t bg-emerald-50/50 p-3 dark:bg-emerald-950/10">
        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{direct}</p>
      </div>
      <div className="border-t bg-red-50/50 p-3 dark:bg-red-950/10">
        <p className="text-sm font-bold text-red-700 dark:text-red-400">{regular}</p>
      </div>
    </>
  )
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{recommendation.schemeName}</h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
                Switch to Direct
              </Badge>
            </div>
            
            <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Expense Saving</p>
                <p className="font-bold text-emerald-600">{recommendation.expenseSavingBps} bps/yr</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Annual Saving</p>
                <p className="font-bold text-emerald-600">{formatCurrency(recommendation.annualSaving)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">10yr Saving</p>
                <p className="font-bold text-emerald-600">{formatCurrency(recommendation.tenYearSaving)}</p>
              </div>
            </div>

            {/* Plain language reason */}
            <div className="mt-3 rounded-lg bg-muted/50 p-3">
              <p className="text-sm">{recommendation.reason}</p>
            </div>

            {/* Tradeoffs */}
            {recommendation.tradeoffs.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
                  <Shield className="h-3 w-3" />
                  Trade-offs to consider:
                </p>
                <ul className="space-y-1">
                  {recommendation.tradeoffs.map((tradeoff, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                      {tradeoff}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
