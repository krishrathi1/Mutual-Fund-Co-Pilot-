'use client'

import { useFundStore } from '@/lib/store'
import { formatCurrency, formatPercent } from '@/lib/helpers'
import { ArrowDownToLine, ArrowRightLeft, Play, Info, Loader2, TrendingUp, TrendingDown, Wallet, Target, Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface STPYearlyBreakdown {
  year: number
  sourceFundValue: number
  targetFundValue: number
  transferred: number
  sourceReturn: number
  targetReturn: number
}

interface STPResult {
  totalInvested: number
  sourceFundFinalValue: number
  targetFundFinalValue: number
  totalReturns: number
  totalTransferred: number
  yearlyBreakdown: STPYearlyBreakdown[]
  sourceFund: { id: string; schemeName: string; category: string; expectedReturn: number }
  targetFund: { id: string; schemeName: string; category: string; expectedReturn: number }
}

export default function STPCalculator() {
  const { funds, fetchFunds } = useFundStore()

  const [sourceFundId, setSourceFundId] = useState('')
  const [targetFundId, setTargetFundId] = useState('')
  const [lumpsumAmount, setLumpsumAmount] = useState('1000000')
  const [monthlyTransfer, setMonthlyTransfer] = useState('50000')
  const [years, setYears] = useState('5')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<STPResult | null>(null)
  const [error, setError] = useState('')
  const [sourceOpen, setSourceOpen] = useState(false)
  const [targetOpen, setTargetOpen] = useState(false)

  useEffect(() => {
    if (funds.length === 0) fetchFunds()
  }, [])

  const debtFunds = useMemo(() => funds.filter(f => f.category === 'Debt' || f.category === 'Hybrid'), [funds])
  const equityFunds = useMemo(() => funds.filter(f => f.category === 'Equity' || f.category === 'ELSS' || f.category === 'Index'), [funds])

  const handleCalculate = async () => {
    if (!sourceFundId || !targetFundId) {
      setError('Please select both source and target funds.')
      return
    }
    if (sourceFundId === targetFundId) {
      setError('Source and target funds must be different.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stp/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceFundId,
          targetFundId,
          lumpsumAmount: parseFloat(lumpsumAmount) || 1000000,
          monthlyTransfer: parseFloat(monthlyTransfer) || 50000,
          years: parseInt(years) || 5,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Calculation failed')
      }
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate STP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const chartData = useMemo(() => {
    if (!result) return []
    return result.yearlyBreakdown.map(b => ({
      year: `Yr ${b.year}`,
      'Source Fund': Math.round(b.sourceFundValue),
      'Target Fund': Math.round(b.targetFundValue),
    }))
  }, [result])

  const totalValueData = useMemo(() => {
    if (!result) return []
    return result.yearlyBreakdown.map(b => ({
      year: `Yr ${b.year}`,
      'Total Value': Math.round(b.sourceFundValue + b.targetFundValue),
      'Amount Invested': Math.round(result.totalInvested),
    }))
  }, [result])

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <ArrowRightLeft className="h-5 w-5 text-emerald-600" />
            STP Calculator
            <Badge variant="outline" className="ml-2 text-[10px]">Systematic Transfer Plan</Badge>
          </CardTitle>
          <CardDescription>
            Transfer from a low-risk source fund to a higher-return target fund in installments to reduce timing risk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Source Fund */}
            <div className="space-y-2 flex flex-col justify-end">
              <Label className="flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
                Source Fund (Debt/Liquid)
              </Label>
              <Popover open={sourceOpen} onOpenChange={setSourceOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={sourceOpen}
                    className="justify-between text-xs font-normal"
                  >
                    {sourceFundId
                      ? (() => {
                          const name = funds.find((f) => f.id === sourceFundId)?.schemeName || ''
                          return name.length > 40 ? name.substring(0, 40) + '...' : name
                        })()
                      : "Search source fund..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search funds..." className="h-9 text-xs" />
                    <CommandList>
                      <CommandEmpty>No fund found.</CommandEmpty>
                      <CommandGroup>
                        {(debtFunds.length > 0 ? debtFunds : funds).map((f) => (
                          <CommandItem
                            key={f.id}
                            value={f.schemeName}
                            onSelect={() => {
                              setSourceFundId(f.id)
                              setSourceOpen(false)
                            }}
                            className="text-xs cursor-pointer"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 text-emerald-600 ${sourceFundId === f.id ? "opacity-100" : "opacity-0"}`}
                            />
                            {f.schemeName}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Target Fund */}
            <div className="space-y-2 flex flex-col justify-end">
              <Label className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                Target Fund (Equity)
              </Label>
              <Popover open={targetOpen} onOpenChange={setTargetOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={targetOpen}
                    className="justify-between text-xs font-normal"
                  >
                    {targetFundId
                      ? (() => {
                          const name = funds.find((f) => f.id === targetFundId)?.schemeName || ''
                          return name.length > 40 ? name.substring(0, 40) + '...' : name
                        })()
                      : "Search target fund..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search funds..." className="h-9 text-xs" />
                    <CommandList>
                      <CommandEmpty>No fund found.</CommandEmpty>
                      <CommandGroup>
                        {(equityFunds.length > 0 ? equityFunds : funds).map((f) => (
                          <CommandItem
                            key={f.id}
                            value={f.schemeName}
                            onSelect={() => {
                              setTargetFundId(f.id)
                              setTargetOpen(false)
                            }}
                            className="text-xs cursor-pointer"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 text-emerald-600 ${targetFundId === f.id ? "opacity-100" : "opacity-0"}`}
                            />
                            {f.schemeName}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Lumpsum Amount (₹)</Label>
              <Input
                type="number"
                value={lumpsumAmount}
                onChange={(e) => setLumpsumAmount(e.target.value)}
                placeholder="1000000"
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Transfer (₹)</Label>
              <Input
                type="number"
                value={monthlyTransfer}
                onChange={(e) => setMonthlyTransfer(e.target.value)}
                placeholder="50000"
              />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={years} onValueChange={setYears}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 7, 10].map(y => (
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
                Calculate STP
              </Button>
            </div>
          </div>

          {/* Fund info */}
          {sourceFundId && targetFundId && sourceFundId !== targetFundId && (
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Transferring <strong>{formatCurrency(parseFloat(monthlyTransfer))}/month</strong> from source to target fund over <strong>{years} years</strong>.
                STP helps average out market risk through rupee cost averaging.
              </span>
            </div>
          )}
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
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-teal-200 dark:border-teal-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> Total Invested</p>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{formatCurrency(result.totalInvested)}</p>
                <p className="text-xs text-muted-foreground mt-1">Initial lumpsum amount</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Source Fund Final</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(result.sourceFundFinalValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">{result.sourceFund.schemeName.slice(0, 30)}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" /> Target Fund Final</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(result.targetFundFinalValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">{result.targetFund.schemeName.slice(0, 30)}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Returns</p>
                <p className={`text-2xl font-bold ${result.totalReturns >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {result.totalReturns >= 0 ? '+' : ''}{formatCurrency(result.totalReturns)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((result.totalReturns / result.totalInvested) * 100).toFixed(1)}% gain on invested
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Dual-Line Chart: Source declining + Target growing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
                Source vs Target Fund Values
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="sourceStpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="targetStpGrad" x1="0" y1="0" x2="0" y2="1">
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
                    <Area type="monotone" dataKey="Source Fund" stroke="#f59e0b" fill="url(#sourceStpGrad)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="Target Fund" stroke="#10b981" fill="url(#targetStpGrad)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Total Value Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Total Portfolio Value vs Invested</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={totalValueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="totalValGrad" x1="0" y1="0" x2="0" y2="1">
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
                    <Area type="monotone" dataKey="Total Value" stroke="#10b981" fill="url(#totalValGrad)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="Amount Invested" stroke="#94a3b8" fill="none" strokeWidth={1.5} strokeDasharray="5 5" />
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
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Transferred</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Source Return</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Target Return</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Source Value</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Target Value</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.yearlyBreakdown.map((row) => (
                      <tr key={row.year} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-3 font-medium text-foreground">{row.year}</td>
                        <td className="py-2 px-3 text-right text-teal-700 dark:text-teal-400">{formatCurrency(row.transferred)}</td>
                        <td className="py-2 px-3 text-right text-amber-700 dark:text-amber-400">{formatCurrency(row.sourceReturn)}</td>
                        <td className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-400">{formatCurrency(row.targetReturn)}</td>
                        <td className="py-2 px-3 text-right text-amber-600 dark:text-amber-400">{formatCurrency(row.sourceFundValue)}</td>
                        <td className="py-2 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(row.targetFundValue)}</td>
                        <td className="py-2 px-3 text-right font-bold text-foreground">{formatCurrency(row.sourceFundValue + row.targetFundValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Info Box */}
          <div className="rounded-xl bg-emerald-50 p-5 dark:bg-emerald-950/20">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-sm text-emerald-800 dark:text-emerald-300 space-y-2">
                <p><strong>How STP works:</strong></p>
                <p>
                  You invest <strong>{formatCurrency(result.totalInvested)}</strong> as a lumpsum in the source fund ({result.sourceFund.category}, ~{result.sourceFund.expectedReturn}% expected return),
                  then systematically transfer <strong>{formatCurrency(parseFloat(monthlyTransfer))}/month</strong> to the target fund ({result.targetFund.category}, ~{result.targetFund.expectedReturn}% expected return) over <strong>{years} years</strong>.
                </p>
                <p>
                  Your total transferred amount is <strong>{formatCurrency(result.totalTransferred)}</strong>, generating total returns of <strong>{formatCurrency(result.totalReturns)}</strong>.
                  STP reduces the risk of investing a lumpsum at a market peak.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
