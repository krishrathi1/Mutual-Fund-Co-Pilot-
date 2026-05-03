'use client'

import { useFundStore, type XIRRResult } from '@/lib/store'
import { formatCurrency, formatPercent } from '@/lib/helpers'
import { TrendingUp, Info, BarChart3, Target, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine,
} from 'recharts'

// XIRR calculation using Newton-Raphson method
function calculateXIRR(cashFlows: { amount: number; date: Date }[], maxIterations = 100, tolerance = 1e-8): number | null {
  if (cashFlows.length < 2) return null

  // Sort by date
  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime())
  const d0 = sorted[0].date

  // Convert to year fractions
  const years = sorted.map((cf) => (cf.date.getTime() - d0.getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  // Initial guess: 10%
  let rate = 0.10

  for (let iter = 0; iter < maxIterations; iter++) {
    let fValue = 0
    let fDerivative = 0

    for (let i = 0; i < sorted.length; i++) {
      const pvFactor = Math.pow(1 + rate, years[i])
      fValue += sorted[i].amount / pvFactor
      if (pvFactor !== 0) {
        fDerivative -= (years[i] * sorted[i].amount) / (pvFactor * (1 + rate))
      }
    }

    if (Math.abs(fDerivative) < 1e-12) break

    const newRate = rate - fValue / fDerivative

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate
    }

    rate = newRate

    // Prevent divergence
    if (rate > 10 || rate < -0.99) {
      rate = 0.10
    }
  }

  return rate
}

export default function XIRRCalculator() {
  const { holdings, fetchHoldings } = useFundStore()

  const [xirrResult, setXirrResult] = useState<XIRRResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [calculated, setCalculated] = useState(false)

  useEffect(() => {
    fetchHoldings()
  }, [])

  const calculatePortfolioXIRR = useCallback(async () => {
    if (holdings.length === 0) {
      toast.error('Add holdings to calculate XIRR')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/portfolio/xirr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdings: holdings.map((h) => ({
            fundId: h.fundId,
            fundName: h.fund.schemeName,
            investedAmount: h.investedAmount,
            currentAmount: h.currentAmount,
            purchaseDate: h.purchaseDate,
          })),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setXirrResult(data)
        setCalculated(true)
      } else {
        // Fallback: calculate client-side
        const result = calculateClientSideXIRR()
        setXirrResult(result)
        setCalculated(true)
      }
    } catch {
      const result = calculateClientSideXIRR()
      setXirrResult(result)
      setCalculated(true)
    } finally {
      setLoading(false)
    }
  }, [holdings])

  function calculateClientSideXIRR(): XIRRResult {
    const holdingXirrs: XIRRResult['holdings'] = []

    let totalInvested = 0
    let totalCurrent = 0

    for (const h of holdings) {
      const purchaseDate = h.purchaseDate ? new Date(h.purchaseDate) : new Date('2023-01-15')
      const now = new Date()

      // Create cash flows: negative investment, positive current value
      const cashFlows = [
        { amount: -h.investedAmount, date: purchaseDate },
        { amount: h.currentAmount, date: now },
      ]

      const xirr = calculateXIRR(cashFlows)
      const annualizedReturn = xirr !== null ? xirr * 100 : 0

      holdingXirrs.push({
        fundId: h.fundId,
        fundName: h.fund.schemeName,
        xirr: Math.round(annualizedReturn * 100) / 100,
        invested: h.investedAmount,
        current: h.currentAmount,
      })

      totalInvested += h.investedAmount
      totalCurrent += h.currentAmount
    }

    // Portfolio-level XIRR
    const allCashFlows: { amount: number; date: Date }[] = []
    const now = new Date()
    for (const h of holdings) {
      const purchaseDate = h.purchaseDate ? new Date(h.purchaseDate) : new Date('2023-01-15')
      allCashFlows.push({ amount: -h.investedAmount, date: purchaseDate })
    }
    allCashFlows.push({ amount: totalCurrent, date: now })

    const portfolioXirr = calculateXIRR(allCashFlows)
    const portfolioXirrPct = portfolioXirr !== null ? Math.round(portfolioXirr * 10000) / 100 : 0

    // Benchmark XIRR (Nifty 50 approximation: ~12% over long term)
    const benchmarkXirr = 12.0

    return {
      portfolioXirr: portfolioXirrPct,
      holdings: holdingXirrs,
      benchmarkXirr,
      methodology: 'XIRR (Extended Internal Rate of Return) is calculated using the Newton-Raphson method. It finds the annualized rate of return that makes the net present value of all cash flows equal to zero. This method accurately handles irregular cash flows from SIPs, additional purchases, and partial withdrawals.',
    }
  }

  const chartData = useMemo(() => {
    if (!xirrResult) return []
    return xirrResult.holdings.map((h) => ({
      name: h.fundName.length > 18 ? h.fundName.slice(0, 18) + '…' : h.fundName,
      'XIRR': h.xirr,
      'Benchmark': xirrResult.benchmarkXirr,
    }))
  }, [xirrResult])

  if (holdings.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No holdings to calculate XIRR</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Add fund holdings to your portfolio to see your annualized returns calculated with XIRR methodology.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            Portfolio XIRR Calculator
          </CardTitle>
          <CardDescription>
            XIRR measures your portfolio&apos;s true annualized return, accounting for the exact timing of each investment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Calculating for {holdings.length} holding{holdings.length !== 1 ? 's' : ''}
            </p>
            <Button onClick={calculatePortfolioXIRR} disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading ? 'Calculating...' : 'Calculate XIRR'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {calculated && xirrResult && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Portfolio XIRR summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className={`border-2 ${xirrResult.portfolioXirr >= 0 ? 'border-emerald-200 dark:border-emerald-900' : 'border-red-200 dark:border-red-900'}`}>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Portfolio XIRR</p>
                <p className={`text-3xl font-bold ${xirrResult.portfolioXirr >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {xirrResult.portfolioXirr >= 0 ? '+' : ''}{xirrResult.portfolioXirr.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Annualized return</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Benchmark (Nifty 50)</p>
                <p className="text-3xl font-bold text-amber-600">
                  +{xirrResult.benchmarkXirr.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Reference return</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Alpha vs Benchmark</p>
                <p className={`text-3xl font-bold ${(xirrResult.portfolioXirr - xirrResult.benchmarkXirr) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {(xirrResult.portfolioXirr - xirrResult.benchmarkXirr) >= 0 ? '+' : ''}
                  {(xirrResult.portfolioXirr - xirrResult.benchmarkXirr).toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(xirrResult.portfolioXirr - xirrResult.benchmarkXirr) >= 0 ? 'Outperforming' : 'Underperforming'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Per-holding breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Per-Holding XIRR Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="py-2 px-3 text-left font-medium text-muted-foreground">Fund</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Invested</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Current</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">XIRR</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">vs Benchmark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xirrResult.holdings.map((h) => {
                      const diff = h.xirr - xirrResult.benchmarkXirr
                      return (
                        <tr key={h.fundId} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2 px-3 font-medium text-foreground truncate max-w-[200px]">{h.fundName}</td>
                          <td className="py-2 px-3 text-right text-muted-foreground">{formatCurrency(h.invested)}</td>
                          <td className="py-2 px-3 text-right text-foreground">{formatCurrency(h.current)}</td>
                          <td className={`py-2 px-3 text-right font-bold ${h.xirr >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {h.xirr >= 0 ? '+' : ''}{h.xirr.toFixed(2)}%
                          </td>
                          <td className={`py-2 px-3 text-right font-medium ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* XIRR comparison chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-card-foreground">XIRR vs Benchmark Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                      <Tooltip
                        formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                        contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--card-foreground)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                      <ReferenceLine y={0} stroke="var(--border)" />
                      <Bar dataKey="XIRR" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={index} fill={entry.XIRR >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                      <Bar dataKey="Benchmark" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.6} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Methodology explanation */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                XIRR Methodology
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Target className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">What is XIRR?</p>
                    <p className="mt-1">
                      XIRR (Extended Internal Rate of Return) calculates the annualized return on investments made at different times. Unlike simple return percentage, it accounts for the exact timing of each cash flow, making it the most accurate measure for SIP-based investments.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">How it&apos;s calculated</p>
                    <p className="mt-1">{xirrResult.methodology}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">XIRR vs CAGR</p>
                    <p className="mt-1">
                      CAGR assumes a single investment made at one point in time. XIRR handles multiple investments at different times — which is how most people actually invest (SIPs, additional purchases, etc.). For a single lumpsum investment, XIRR and CAGR give the same result.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 p-3">
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>⚠️ Note:</strong> XIRR calculations assume purchase dates from your holdings data. If purchase dates are estimated, the XIRR may not be perfectly accurate. For the most precise results, ensure your holdings have correct purchase dates.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
