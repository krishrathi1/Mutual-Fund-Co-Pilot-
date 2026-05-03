'use client'

import { useFundStore } from '@/lib/store'
import { formatCurrency, formatPercent } from '@/lib/helpers'
import { Calculator, TrendingDown, TrendingUp, Play, Info, Clock, Wallet, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface SWPYearlyBreakdown {
  year: number
  openingBalance: number
  totalWithdrawn: number
  returnsEarned: number
  closingBalance: number
}

interface SWPResult {
  totalWithdrawn: number
  remainingCorpus: number
  returnsEarned: number
  yearlyBreakdown: SWPYearlyBreakdown[]
  depletionYear: number | null
}

export default function SWPCalculator() {
  const { funds, fetchFunds } = useFundStore()

  const [corpus, setCorpus] = useState('5000000')
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState('25000')
  const [expectedReturn, setExpectedReturn] = useState('8')
  const [years, setYears] = useState('20')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SWPResult | null>(null)
  const [error, setError] = useState('')

  useState(() => {
    if (funds.length === 0) fetchFunds()
  })

  const handleCalculate = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/swp/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corpus: parseFloat(corpus) || 5000000,
          monthlyWithdrawal: parseFloat(monthlyWithdrawal) || 25000,
          expectedReturn: parseFloat(expectedReturn) || 8,
          years: parseInt(years) || 20,
        }),
      })

      if (!res.ok) throw new Error('Calculation failed')
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Failed to calculate SWP. Please check your inputs and try again.')
    } finally {
      setLoading(false)
    }
  }

  const chartData = useMemo(() => {
    if (!result) return []
    return result.yearlyBreakdown.map(b => ({
      year: `Yr ${b.year}`,
      'Opening Corpus': Math.round(b.openingBalance),
      'Closing Corpus': Math.round(b.closingBalance),
      'Withdrawn': Math.round(b.totalWithdrawn),
      'Returns Earned': Math.round(b.returnsEarned),
    }))
  }, [result])

  const depletionChartData = useMemo(() => {
    if (!result) return []
    return result.yearlyBreakdown.map(b => ({
      year: b.year,
      Corpus: Math.round(b.closingBalance),
    }))
  }, [result])

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <TrendingDown className="h-5 w-5 text-emerald-600" />
            SWP Calculator
            <Badge variant="outline" className="ml-2 text-[10px]">Systematic Withdrawal Plan</Badge>
          </CardTitle>
          <CardDescription>
            Plan regular withdrawals from your investment corpus while the remainder continues to grow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Corpus Amount (₹)</Label>
              <Input
                type="number"
                value={corpus}
                onChange={(e) => setCorpus(e.target.value)}
                placeholder="5000000"
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Withdrawal (₹)</Label>
              <Input
                type="number"
                value={monthlyWithdrawal}
                onChange={(e) => setMonthlyWithdrawal(e.target.value)}
                placeholder="25000"
              />
            </div>
            <div className="space-y-2">
              <Label>Expected Return (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(e.target.value)}
                placeholder="8"
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (years)</Label>
              <Select value={years} onValueChange={setYears}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 25, 30, 40].map(y => (
                    <SelectItem key={y} value={String(y)}>{y} years</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleCalculate}
                disabled={loading}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Calculate
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              SWP provides regular income from your investment. The remaining corpus continues to earn returns, potentially extending the life of your investment.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-teal-200 dark:border-teal-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> Total Withdrawn</p>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{formatCurrency(result.totalWithdrawn)}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatCurrency(parseFloat(monthlyWithdrawal))}/month over {years} years</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Remaining Corpus</p>
                <p className={`text-2xl font-bold ${result.remainingCorpus > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(result.remainingCorpus)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">After {years} years</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Depletion Year</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {result.depletionYear ? `Year ${result.depletionYear}` : 'Not depleted'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.depletionYear ? 'Corpus runs out in this year' : 'Corpus survives the period'}
                </p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Returns Earned</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(result.returnsEarned)}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">While withdrawing</p>
              </CardContent>
            </Card>
          </div>

          {/* Depletion Warning */}
          {result.depletionYear && result.depletionYear <= parseInt(years) && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Corpus Depletion Warning</p>
                  <p className="mt-1">At the current withdrawal rate of {formatCurrency(parseFloat(monthlyWithdrawal))}/month with {expectedReturn}% expected returns, your corpus will be depleted by year {result.depletionYear}. Consider reducing your monthly withdrawal or increasing your expected return.</p>
                </div>
              </div>
            </div>
          )}

          {/* Corpus Depletion Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-emerald-600" />
                Corpus Depletion Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={depletionChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="corpusGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} label={{ value: 'Year', position: 'insideBottomRight', offset: -5, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`} />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Corpus']}
                      labelFormatter={(label: number) => `Year ${label}`}
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--card-foreground)',
                      }}
                    />
                    <Area type="monotone" dataKey="Corpus" stroke="#10b981" fill="url(#corpusGrad)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Area Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Year-by-Year Withdrawal vs Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="withdrawnGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="earnedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`} />
                    <Tooltip
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--card-foreground)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                    <Area type="monotone" dataKey="Withdrawn" stroke="#ef4444" fill="url(#withdrawnGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Returns Earned" stroke="#10b981" fill="url(#earnedGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Yearly Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Year-by-Year Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="py-2 px-3 text-left font-medium text-muted-foreground">Year</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Opening</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Withdrawn</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Returns</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.yearlyBreakdown.map((row) => (
                      <tr key={row.year} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-3 font-medium text-foreground">{row.year}</td>
                        <td className="py-2 px-3 text-right text-foreground">{formatCurrency(row.openingBalance)}</td>
                        <td className="py-2 px-3 text-right text-red-700 dark:text-red-400">{formatCurrency(row.totalWithdrawn)}</td>
                        <td className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-400">{formatCurrency(row.returnsEarned)}</td>
                        <td className={`py-2 px-3 text-right font-medium ${row.closingBalance > 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(row.closingBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="rounded-xl bg-emerald-50 p-5 dark:bg-emerald-950/20">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-sm text-emerald-800 dark:text-emerald-300 space-y-2">
                <p><strong>Summary:</strong></p>
                <p>
                  Starting with a corpus of <strong>{formatCurrency(parseFloat(corpus))}</strong>, withdrawing <strong>{formatCurrency(parseFloat(monthlyWithdrawal))}/month</strong> at an expected return of <strong>{expectedReturn}%</strong>,
                  you will have withdrawn a total of <strong>{formatCurrency(result.totalWithdrawn)}</strong> over {years} years.
                </p>
                <p>
                  Your remaining corpus will be <strong>{formatCurrency(result.remainingCorpus)}</strong>
                  {result.depletionYear && result.depletionYear <= parseInt(years)
                    ? ` — the corpus gets depleted in year ${result.depletionYear}.`
                    : ' — the corpus survives the entire period.'}
                </p>
                <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                  💡 You earned {formatCurrency(result.returnsEarned)} in returns while withdrawing, effectively reducing the real cost of withdrawals.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
