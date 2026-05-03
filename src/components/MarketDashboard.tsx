'use client'

import { useFundStore, type FundData } from '@/lib/store'
import { formatCurrency, formatAUM, formatPercent } from '@/lib/helpers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useMemo, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, BarChart3, DollarSign, Activity, PieChart,
  ArrowUpRight, ArrowDownRight, Wallet, Landmark, Percent, Users,
} from 'lucide-react'
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
} from 'recharts'

// ─── Simulated Market Data ────────────────────────────────────────────────────

interface MarketIndex {
  id: string
  name: string
  value: number
  change: number
  sparkline: { day: number; value: number }[]
}

function generateSparkline(base: number, volatility: number, days: number): { day: number; value: number }[] {
  const data: { day: number; value: number }[] = []
  let current = base * (1 - volatility * 2)
  for (let i = 0; i < days; i++) {
    current += (Math.random() - 0.45) * volatility * base * 0.15
    current = Math.max(current, base * 0.7)
    current = Math.min(current, base * 1.3)
    data.push({ day: i + 1, value: Math.round(current * 100) / 100 })
  }
  // Ensure the last value is close to the actual value
  data[days - 1].value = base
  return data
}

const SIMULATED_INDICES: MarketIndex[] = [
  {
    id: 'nifty50',
    name: 'Nifty 50',
    value: 22456.8,
    change: 0.87,
    sparkline: generateSparkline(22456.8, 0.03, 30),
  },
  {
    id: 'sensex',
    name: 'Sensex',
    value: 73852.94,
    change: 0.72,
    sparkline: generateSparkline(73852.94, 0.03, 30),
  },
  {
    id: 'niftymidcap',
    name: 'Nifty Midcap 100',
    value: 48234.55,
    change: -0.34,
    sparkline: generateSparkline(48234.55, 0.04, 30),
  },
  {
    id: 'bond10y',
    name: '10Y Govt Bond Yield',
    value: 7.12,
    change: -0.05,
    sparkline: generateSparkline(7.12, 0.01, 30),
  },
]

// ─── Category Performance ─────────────────────────────────────────────────────

interface CategoryPerf {
  category: string
  avgReturn1y: number
  avgReturn3y: number
  fundCount: number
  totalAum: number
}

const CATEGORY_ORDER = ['Large Cap', 'Mid Cap', 'Small Cap', 'Flexi Cap', 'ELSS', 'Debt', 'Hybrid']

const CATEGORY_COLORS: Record<string, string> = {
  'Large Cap': 'from-emerald-500/10 to-emerald-600/5',
  'Mid Cap': 'from-teal-500/10 to-teal-600/5',
  'Small Cap': 'from-amber-500/10 to-amber-600/5',
  'Flexi Cap': 'from-cyan-500/10 to-cyan-600/5',
  'ELSS': 'from-rose-500/10 to-rose-600/5',
  'Debt': 'from-violet-500/10 to-violet-600/5',
  'Hybrid': 'from-orange-500/10 to-orange-600/5',
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Large Cap': Landmark,
  'Mid Cap': BarChart3,
  'Small Cap': TrendingUp,
  'Flexi Cap': PieChart,
  'ELSS': Percent,
  'Debt': Wallet,
  'Hybrid': Activity,
}

function computeCategoryPerformance(funds: FundData[]): CategoryPerf[] {
  const categoryMap = new Map<string, { returns1y: number[]; returns3y: number[]; aum: number }>()

  for (const fund of funds) {
    const cat = fund.subCategory || fund.category
    // Map to our expected categories
    const mappedCat = mapSubCategory(cat)
    if (!mappedCat) continue

    const existing = categoryMap.get(mappedCat) || { returns1y: [], returns3y: [], aum: 0 }
    if (fund.directReturn1y !== null) existing.returns1y.push(fund.directReturn1y)
    if (fund.directReturn3y !== null) existing.returns3y.push(fund.directReturn3y)
    existing.aum += fund.aumCrore
    categoryMap.set(mappedCat, existing)
  }

  return CATEGORY_ORDER.map((category) => {
    const data = categoryMap.get(category) || { returns1y: [], returns3y: [], aum: 0 }
    return {
      category,
      avgReturn1y: data.returns1y.length > 0 ? data.returns1y.reduce((a, b) => a + b, 0) / data.returns1y.length : 0,
      avgReturn3y: data.returns3y.length > 0 ? data.returns3y.reduce((a, b) => a + b, 0) / data.returns3y.length : 0,
      fundCount: data.returns1y.length,
      totalAum: data.aum,
    }
  })
}

function mapSubCategory(sub: string): string | null {
  const lower = sub.toLowerCase()
  if (lower.includes('large cap')) return 'Large Cap'
  if (lower.includes('mid cap')) return 'Mid Cap'
  if (lower.includes('small cap')) return 'Small Cap'
  if (lower.includes('flexi cap') || lower.includes('flexicap')) return 'Flexi Cap'
  if (lower.includes('elss')) return 'ELSS'
  if (lower.includes('debt') || lower.includes('liquid') || lower.includes('money market') || lower.includes('overnight') || lower.includes('gilt') || lower.includes('corporate bond') || lower.includes('banking') || lower.includes('short') || lower.includes('medium') || lower.includes('long')) return 'Debt'
  if (lower.includes('hybrid') || lower.includes('balanced') || lower.includes('conservative') || lower.includes('aggressive hybrid')) return 'Hybrid'
  // Fallback by category
  if (lower === 'equity') return 'Large Cap'
  if (lower === 'debt') return 'Debt'
  if (lower === 'hybrid') return 'Hybrid'
  return null
}

// ─── Animated Counter Hook ─────────────────────────────────────────────────────

function useAnimatedCounter(target: number, duration = 1200, decimals = 0): number {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const startValue = 0

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const value = startValue + (target - startValue) * eased
      setCurrent(Number(value.toFixed(decimals)))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [target, duration, decimals])

  return current
}

// ─── Sparkline Mini Component ──────────────────────────────────────────────────

function SparklineMini({ data, positive }: { data: { day: number; value: number }[]; positive: boolean }) {
  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={positive ? '#10b981' : '#ef4444'}
            strokeWidth={1.5}
            dot={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '10px',
              color: 'var(--card-foreground)',
            }}
            formatter={(value: number) => [value.toLocaleString('en-IN', { maximumFractionDigits: 2 }), '']}
            labelFormatter={() => ''}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function MarketDashboard() {
  const { funds, fetchFunds } = useFundStore()
  const [indices] = useState(SIMULATED_INDICES)

  useEffect(() => {
    if (funds.length === 0) {
      fetchFunds()
    }
  }, [funds.length, fetchFunds])

  // ─── Computed Data ───────────────────────────────────────────────────────────
  const categoryPerf = useMemo(() => computeCategoryPerformance(funds), [funds])

  const topMovers = useMemo(() => {
    const withReturns = funds
      .filter((f) => f.directReturn1y !== null)
      .map((f) => ({
        id: f.id,
        name: f.schemeName,
        return1y: f.directReturn1y!,
        expenseDiff: Math.round((f.regularExpenseRatio - f.directExpenseRatio) * 100),
      }))
      .sort((a, b) => b.return1y - a.return1y)

    return {
      best: withReturns.slice(0, 5),
      worst: withReturns.slice(-5).reverse(),
    }
  }, [funds])

  const quickStats = useMemo(() => {
    const totalFunds = funds.length
    const totalAum = funds.reduce((sum, f) => sum + f.aumCrore, 0)
    const avgDirectSaving = funds.length > 0
      ? funds.reduce((sum, f) => sum + (f.regularExpenseRatio - f.directExpenseRatio), 0) / funds.length
      : 0
    const avgExpenseDiff = funds.length > 0
      ? funds.reduce((sum, f) => sum + (f.regularExpenseRatio - f.directExpenseRatio) * 100, 0) / funds.length
      : 0

    return { totalFunds, totalAum, avgDirectSaving, avgExpenseDiff }
  }, [funds])

  // Animated counters
  const animatedTotalFunds = useAnimatedCounter(quickStats.totalFunds, 1000, 0)
  const animatedExpenseDiff = useAnimatedCounter(quickStats.avgExpenseDiff, 1200, 1)

  // ─── Color coding for category performance ──────────────────────────────────
  const getPerfColor = useCallback((value: number, allValues: number[]) => {
    if (allValues.length === 0) return 'text-muted-foreground'
    const sorted = [...allValues].sort((a, b) => a - b)
    const idx = sorted.findIndex((v) => v >= value)
    const percentile = idx / sorted.length
    if (percentile >= 0.75) return 'text-emerald-600 dark:text-emerald-400'
    if (percentile >= 0.5) return 'text-emerald-600/70 dark:text-emerald-400/70'
    if (percentile >= 0.25) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }, [])

  const all1yReturns = categoryPerf.map((c) => c.avgReturn1y).filter((v) => v !== 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-500" />
          Market Dashboard
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Market indicators and fund category performance overview
        </p>
      </div>

      {/* ─── Quick Stats ──────────────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Funds Tracked',
            value: animatedTotalFunds,
            suffix: '',
            icon: Users,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'from-emerald-500/10 to-emerald-600/5',
          },
          {
            label: 'Total AUM',
            value: formatAUM(quickStats.totalAum),
            isText: true,
            icon: DollarSign,
            color: 'text-teal-600 dark:text-teal-400',
            bg: 'from-teal-500/10 to-teal-600/5',
          },
          {
            label: 'Avg Direct Savings',
            value: quickStats.avgDirectSaving.toFixed(2),
            suffix: '%',
            isText: true,
            icon: TrendingUp,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'from-emerald-500/10 to-emerald-600/5',
          },
          {
            label: 'Avg Expense Diff',
            value: animatedExpenseDiff,
            suffix: ' bps',
            icon: Percent,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'from-amber-500/10 to-amber-600/5',
          },
        ].map((stat, idx) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <Card className="relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} opacity-60`} />
                <CardContent className="relative p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${stat.color}`}>
                    {stat.isText ? stat.value : stat.value}{stat.suffix}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* ─── Market Indices ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            Market Indices
          </CardTitle>
          <CardDescription className="text-xs">Simulated market data for reference</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {indices.map((index, idx) => {
              const isPositive = index.change >= 0
              return (
                <motion.div
                  key={index.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="flex items-center justify-between rounded-lg border p-3 hover:shadow-sm transition-shadow"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-muted-foreground truncate">{index.name}</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {index.id === 'bond10y' ? `${index.value.toFixed(2)}%` : index.value.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {isPositive ? (
                        <ArrowUpRight className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-600 dark:text-red-400" />
                      )}
                      <span className={`text-xs font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isPositive ? '+' : ''}{index.change.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <SparklineMini data={index.sparkline} positive={isPositive} />
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Category Performance Summary ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-4 w-4 text-teal-500" />
            Category Performance Summary
          </CardTitle>
          <CardDescription className="text-xs">Average returns and AUM by fund category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categoryPerf.map((cat, idx) => {
              const Icon = CATEGORY_ICONS[cat.category] || BarChart3
              const gradientBg = CATEGORY_COLORS[cat.category] || 'from-muted/10 to-muted/5'
              const return1yColor = getPerfColor(cat.avgReturn1y, all1yReturns)
              const isPositive = cat.avgReturn1y >= 0

              return (
                <motion.div
                  key={cat.category}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradientBg} opacity-60`} />
                    <CardContent className="relative p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/80 ring-1 ring-border">
                            <Icon className="h-4 w-4 text-foreground/70" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{cat.category}</p>
                            <p className="text-[10px] text-muted-foreground">{cat.fundCount} funds</p>
                          </div>
                        </div>
                      </div>

                      <Separator className="opacity-50" />

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-muted-foreground">Avg 1Y</span>
                          <p className={`font-semibold ${return1yColor} flex items-center gap-0.5`}>
                            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {formatPercent(cat.avgReturn1y)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg 3Y</span>
                          <p className={`font-semibold ${cat.avgReturn3y >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatPercent(cat.avgReturn3y)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">AUM</span>
                        <span className="font-medium text-foreground">{formatAUM(cat.totalAum)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Top Movers ───────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Best Performers */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-600/3 opacity-60" />
          <CardHeader className="relative pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              Top Performers (1Y)
            </CardTitle>
            <CardDescription className="text-xs">Best performing funds by 1-year return</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="max-h-80 overflow-y-auto">
              {topMovers.best.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No fund data available</p>
              ) : (
                <div className="space-y-2">
                  {topMovers.best.map((fund, idx) => (
                    <motion.div
                      key={fund.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-3 py-2.5 hover:bg-emerald-500/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{fund.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Expense diff: {fund.expenseDiff} bps
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] px-1.5 border-emerald-500/20">
                          {formatPercent(fund.return1y)}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Worst Performers */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-red-600/3 opacity-60" />
          <CardHeader className="relative pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
              <TrendingDown className="h-4 w-4" />
              Bottom Performers (1Y)
            </CardTitle>
            <CardDescription className="text-xs">Worst performing funds by 1-year return</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="max-h-80 overflow-y-auto">
              {topMovers.worst.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No fund data available</p>
              ) : (
                <div className="space-y-2">
                  {topMovers.worst.map((fund, idx) => (
                    <motion.div
                      key={fund.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-2.5 hover:bg-red-500/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/10 text-[10px] font-bold text-red-600 dark:text-red-400 shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{fund.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Expense diff: {fund.expenseDiff} bps
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 text-[10px] px-1.5 border-red-500/20">
                          {formatPercent(fund.return1y)}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
