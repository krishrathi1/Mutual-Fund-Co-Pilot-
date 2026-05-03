'use client'

import { formatCurrency } from '@/lib/helpers'
import {
  Calculator, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Loader2, Play, Info,
  ChevronUp, Target, Wallet, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from 'recharts'

type PlannerMode = 'sip' | 'stp' | 'swp'

// ===== SIP Client-Side Calculation =====
function calculateSIP(
  monthlyAmount: number,
  years: number,
  expectedReturn: number,
  stepUpPercent: number
) {
  const annualReturn = expectedReturn / 100
  const monthlyRate = annualReturn / 12
  const totalMonths = years * 12

  let totalInvested = 0
  let currentValue = 0
  let currentSIP = monthlyAmount
  const yearlyBreakdown: { year: number; invested: number; value: number; gain: number; stepUpInvested: number; stepUpValue: number }[] = []
  let yearInvested = 0

  // Also calculate without step-up for comparison
  let totalInvestedNoStepUp = 0
  let currentValueNoStepUp = 0

  for (let month = 1; month <= totalMonths; month++) {
    currentValue = (currentValue + currentSIP) * (1 + monthlyRate)
    totalInvested += currentSIP
    yearInvested += currentSIP

    currentValueNoStepUp = (currentValueNoStepUp + monthlyAmount) * (1 + monthlyRate)
    totalInvestedNoStepUp += monthlyAmount

    if (month % 12 === 0) {
      const yearNum = Math.floor(month / 12)
      yearlyBreakdown.push({
        year: yearNum,
        invested: Math.round(totalInvested),
        value: Math.round(currentValue),
        gain: Math.round(currentValue - totalInvested),
        stepUpInvested: Math.round(totalInvestedNoStepUp),
        stepUpValue: Math.round(currentValueNoStepUp),
      })
      yearInvested = 0
      currentSIP = currentSIP * (1 + stepUpPercent / 100)
    }
  }

  return {
    totalInvested: Math.round(totalInvested),
    finalValue: Math.round(currentValue),
    wealthGain: Math.round(currentValue - totalInvested),
    yearlyBreakdown,
    noStepUpInvested: Math.round(totalInvestedNoStepUp),
    noStepUpValue: Math.round(currentValueNoStepUp),
    stepUpExtraInvested: Math.round(totalInvested - totalInvestedNoStepUp),
    stepUpExtraGain: Math.round((currentValue - totalInvested) - (currentValueNoStepUp - totalInvestedNoStepUp)),
  }
}

// ===== STP Client-Side Calculation =====
function calculateSTP(
  totalLumpSum: number,
  transferAmount: number,
  years: number,
  sourceReturn: number,
  targetReturn: number,
  frequency: string
) {
  const sourceRate = sourceReturn / 100
  const targetRate = targetReturn / 100
  const periodsPerYear = frequency === 'weekly' ? 52 : frequency === 'quarterly' ? 4 : 12
  const sourcePeriodRate = sourceRate / periodsPerYear
  const targetPeriodRate = targetRate / periodsPerYear
  const totalPeriods = years * periodsPerYear

  let sourceValue = totalLumpSum
  let targetValue = 0
  let totalTransferred = 0
  const yearlyBreakdown: { year: number; totalTransferred: number; sourceValue: number; targetValue: number; totalValue: number }[] = []

  for (let period = 1; period <= totalPeriods; period++) {
    sourceValue = sourceValue * (1 + sourcePeriodRate) - transferAmount
    sourceValue = Math.max(0, sourceValue)
    targetValue = (targetValue + transferAmount) * (1 + targetPeriodRate)
    totalTransferred += transferAmount

    if (period % periodsPerYear === 0) {
      yearlyBreakdown.push({
        year: Math.floor(period / periodsPerYear),
        totalTransferred: Math.round(totalTransferred),
        sourceValue: Math.round(sourceValue),
        targetValue: Math.round(targetValue),
        totalValue: Math.round(sourceValue + targetValue),
      })
    }
  }

  return {
    totalTransferred: Math.round(totalTransferred),
    sourceValueRemaining: Math.round(sourceValue),
    targetValueAccumulated: Math.round(targetValue),
    totalValue: Math.round(sourceValue + targetValue),
    yearlyBreakdown,
  }
}

// ===== SWP Client-Side Calculation =====
function calculateSWP(
  corpus: number,
  monthlyWithdrawal: number,
  years: number,
  expectedReturn: number
) {
  const annualReturn = expectedReturn / 100
  const monthlyRate = annualReturn / 12
  const maxMonths = years * 12

  let currentCorpus = corpus
  let totalWithdrawn = 0
  let yearsSustained = 0
  const yearlyBreakdown: { year: number; startCorpus: number; withdrawal: number; endCorpus: number; growth: number }[] = []

  for (let month = 1; month <= maxMonths; month++) {
    const beforeGrowth = currentCorpus
    currentCorpus = currentCorpus * (1 + monthlyRate) - monthlyWithdrawal
    totalWithdrawn += monthlyWithdrawal
    const yearGrowth = currentCorpus - beforeGrowth + monthlyWithdrawal

    if (currentCorpus <= 0) {
      currentCorpus = 0
      yearsSustained = month / 12
      break
    }

    if (month % 12 === 0) {
      const yearNum = Math.floor(month / 12)
      yearlyBreakdown.push({
        year: yearNum,
        startCorpus: Math.round(beforeGrowth),
        withdrawal: Math.round(monthlyWithdrawal * 12),
        endCorpus: Math.round(currentCorpus),
        growth: Math.round(yearGrowth * 12),
      })
    }
  }

  if (yearsSustained === 0 && currentCorpus > 0) {
    yearsSustained = years
  }

  // Calculate how long corpus actually lasts (may exceed provided years)
  let extendedCorpus = corpus
  let extendedMonths = 0
  while (extendedCorpus > 0 && extendedMonths < 600) {
    extendedCorpus = extendedCorpus * (1 + monthlyRate) - monthlyWithdrawal
    extendedMonths++
  }
  const corpusLastsYears = extendedMonths / 12

  return {
    totalWithdrawn: Math.round(totalWithdrawn),
    corpusRemaining: Math.round(currentCorpus),
    yearsSustained: Math.round(yearsSustained * 10) / 10,
    corpusLastsYears: Math.round(corpusLastsYears * 10) / 10,
    yearlyBreakdown,
  }
}

export default function SIPPlanner() {
  const [mode, setMode] = useState<PlannerMode>('sip')
  const [loading, setLoading] = useState(false)

  // SIP state
  const [sipAmount, setSipAmount] = useState('10000')
  const [sipYears, setSipYears] = useState('15')
  const [sipReturn, setSipReturn] = useState('12')
  const [stepUpPercent, setStepUpPercent] = useState('10')
  const [sipResult, setSipResult] = useState<ReturnType<typeof calculateSIP> | null>(null)

  // STP state
  const [stpLumpSum, setStpLumpSum] = useState('1000000')
  const [stpTransferAmount, setStpTransferAmount] = useState('50000')
  const [stpYears, setStpYears] = useState('5')
  const [stpSourceReturn, setStpSourceReturn] = useState('5')
  const [stpTargetReturn, setStpTargetReturn] = useState('12')
  const [stpFrequency, setStpFrequency] = useState('monthly')
  const [stpResult, setStpResult] = useState<ReturnType<typeof calculateSTP> | null>(null)

  // SWP state
  const [swpCorpus, setSwpCorpus] = useState('5000000')
  const [swpWithdrawal, setSwpWithdrawal] = useState('25000')
  const [swpYears, setSwpYears] = useState('20')
  const [swpReturn, setSwpReturn] = useState('8')
  const [swpResult, setSwpResult] = useState<ReturnType<typeof calculateSWP> | null>(null)

  const handleCalculate = useCallback(async () => {
    setLoading(true)
    try {
      // Try API first
      const params: Record<string, unknown> = { mode }
      if (mode === 'sip') {
        params.amount = parseFloat(sipAmount)
        params.years = parseInt(sipYears)
        params.expectedReturn = parseFloat(sipReturn)
        params.stepUpPercent = parseFloat(stepUpPercent)
      } else if (mode === 'stp') {
        params.amount = parseFloat(stpTransferAmount)
        params.years = parseInt(stpYears)
        params.expectedReturn = parseFloat(stpTargetReturn)
        params.transferFrequency = stpFrequency
      } else {
        params.amount = parseFloat(swpCorpus)
        params.years = parseInt(swpYears)
        params.expectedReturn = parseFloat(swpReturn)
        params.withdrawalAmount = parseFloat(swpWithdrawal)
      }

      const res = await fetch('/api/sip/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (res.ok) {
        const data = await res.json()
        if (mode === 'sip') {
          // API doesn't return step-up comparison, use client-side
          const clientResult = calculateSIP(
            parseFloat(sipAmount), parseInt(sipYears),
            parseFloat(sipReturn), parseFloat(stepUpPercent)
          )
          setSipResult(clientResult)
        } else if (mode === 'stp') {
          const clientResult = calculateSTP(
            parseFloat(stpLumpSum), parseFloat(stpTransferAmount),
            parseInt(stpYears), parseFloat(stpSourceReturn),
            parseFloat(stpTargetReturn), stpFrequency
          )
          setStpResult(clientResult)
        } else {
          const clientResult = calculateSWP(
            parseFloat(swpCorpus), parseFloat(swpWithdrawal),
            parseInt(swpYears), parseFloat(swpReturn)
          )
          setSwpResult(clientResult)
        }
      } else {
        throw new Error('API failed')
      }
    } catch {
      // Fallback to client-side calculation
      if (mode === 'sip') {
        setSipResult(calculateSIP(
          parseFloat(sipAmount), parseInt(sipYears),
          parseFloat(sipReturn), parseFloat(stepUpPercent)
        ))
      } else if (mode === 'stp') {
        setStpResult(calculateSTP(
          parseFloat(stpLumpSum), parseFloat(stpTransferAmount),
          parseInt(stpYears), parseFloat(stpSourceReturn),
          parseFloat(stpTargetReturn), stpFrequency
        ))
      } else {
        setSwpResult(calculateSWP(
          parseFloat(swpCorpus), parseFloat(swpWithdrawal),
          parseInt(swpYears), parseFloat(swpReturn)
        ))
      }
    } finally {
      setLoading(false)
    }
  }, [mode, sipAmount, sipYears, sipReturn, stepUpPercent, stpLumpSum, stpTransferAmount, stpYears, stpSourceReturn, stpTargetReturn, stpFrequency, swpCorpus, swpWithdrawal, swpYears, swpReturn])

  // SIP chart data
  const sipChartData = useMemo(() => {
    if (!sipResult) return []
    return sipResult.yearlyBreakdown.map(b => ({
      year: `Yr ${b.year}`,
      Invested: b.invested,
      Returns: b.gain,
      'Total Value': b.value,
    }))
  }, [sipResult])

  const sipComparisonData = useMemo(() => {
    if (!sipResult) return []
    return sipResult.yearlyBreakdown.map(b => ({
      year: `Yr ${b.year}`,
      'With Step-Up': b.value,
      'Without Step-Up': b.stepUpValue,
    }))
  }, [sipResult])

  // STP chart data
  const stpChartData = useMemo(() => {
    if (!stpResult) return []
    return stpResult.yearlyBreakdown.map(b => ({
      year: `Yr ${b.year}`,
      'Source Fund': b.sourceValue,
      'Target Fund': b.targetValue,
    }))
  }, [stpResult])

  // SWP chart data
  const swpChartData = useMemo(() => {
    if (!swpResult) return []
    return swpResult.yearlyBreakdown.map(b => ({
      year: `Yr ${b.year}`,
      'Corpus Remaining': b.endCorpus,
      'Total Withdrawn': b.withdrawal,
    }))
  }, [swpResult])

  return (
    <div className="space-y-6">
      {/* Mode Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <Calculator className="h-5 w-5 text-emerald-600" />
            SIP / STP / SWP Planner
            <Badge variant="outline" className="ml-2 text-[10px]">Advanced</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={(v) => { setMode(v as PlannerMode); setSipResult(null); setStpResult(null); setSwpResult(null) }}>
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="sip" className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                SIP
              </TabsTrigger>
              <TabsTrigger value="stp" className="gap-1.5">
                <ArrowDownToLine className="h-3.5 w-3.5" />
                STP
              </TabsTrigger>
              <TabsTrigger value="swp" className="gap-1.5">
                <ArrowUpFromLine className="h-3.5 w-3.5" />
                SWP
              </TabsTrigger>
            </TabsList>

            {/* ===== SIP Mode ===== */}
            <TabsContent value="sip" className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2">
                  <Label className="text-xs">Monthly SIP (₹)</Label>
                  <Input type="number" value={sipAmount} onChange={(e) => setSipAmount(e.target.value)} placeholder="10000" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Investment Period</Label>
                  <Select value={sipYears} onValueChange={setSipYears}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[5, 10, 15, 20, 25, 30].map(y => (
                        <SelectItem key={y} value={String(y)}>{y} years</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Expected Return (%)</Label>
                  <Input type="number" step="0.5" value={sipReturn} onChange={(e) => setSipReturn(e.target.value)} placeholder="12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    Step-Up SIP (%)
                    <Badge variant="outline" className="text-[9px] px-1 h-4">Annual</Badge>
                  </Label>
                  <Input type="number" step="1" value={stepUpPercent} onChange={(e) => setStepUpPercent(e.target.value)} placeholder="10" />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCalculate} disabled={loading} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Calculate
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> Step-up SIP increases your monthly investment by {stepUpPercent}% every year. Default 10% — adjust based on expected salary growth.</p>
              </div>
            </TabsContent>

            {/* ===== STP Mode ===== */}
            <TabsContent value="stp" className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                <div className="space-y-2">
                  <Label className="text-xs">Lump Sum in Source (₹)</Label>
                  <Input type="number" value={stpLumpSum} onChange={(e) => setStpLumpSum(e.target.value)} placeholder="1000000" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Transfer Amount (₹)</Label>
                  <Input type="number" value={stpTransferAmount} onChange={(e) => setStpTransferAmount(e.target.value)} placeholder="50000" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Frequency</Label>
                  <Select value={stpFrequency} onValueChange={setStpFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Period</Label>
                  <Select value={stpYears} onValueChange={setStpYears}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 5, 7, 10].map(y => (
                        <SelectItem key={y} value={String(y)}>{y} years</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Source Return (%)</Label>
                  <Input type="number" step="0.5" value={stpSourceReturn} onChange={(e) => setStpSourceReturn(e.target.value)} placeholder="5" />
                </div>
                <div className="flex items-end gap-2">
                  <div className="space-y-2 flex-1">
                    <Label className="text-xs">Target Return (%)</Label>
                    <Input type="number" step="0.5" value={stpTargetReturn} onChange={(e) => setStpTargetReturn(e.target.value)} placeholder="12" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCalculate} disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Calculate STP
                </Button>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> STP (Systematic Transfer Plan) moves money from a low-risk source fund (debt/liquid) to a higher-return target fund (equity) in installments, reducing timing risk.</p>
              </div>
            </TabsContent>

            {/* ===== SWP Mode ===== */}
            <TabsContent value="swp" className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2">
                  <Label className="text-xs">Corpus Amount (₹)</Label>
                  <Input type="number" value={swpCorpus} onChange={(e) => setSwpCorpus(e.target.value)} placeholder="5000000" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Monthly Withdrawal (₹)</Label>
                  <Input type="number" value={swpWithdrawal} onChange={(e) => setSwpWithdrawal(e.target.value)} placeholder="25000" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Expected Return (%)</Label>
                  <Input type="number" step="0.5" value={swpReturn} onChange={(e) => setSwpReturn(e.target.value)} placeholder="8" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Max Period</Label>
                  <Select value={swpYears} onValueChange={setSwpYears}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 15, 20, 25, 30, 40].map(y => (
                        <SelectItem key={y} value={String(y)}>{y} years</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCalculate} disabled={loading} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Calculate SWP
                  </Button>
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> SWP (Systematic Withdrawal Plan) provides regular income from your investment corpus while the remaining amount continues to grow.</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ===== SIP Results ===== */}
      {mode === 'sip' && sipResult && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Key metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-teal-200 dark:border-teal-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> Total Invested</p>
                <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{formatCurrency(sipResult.totalInvested)}</p>
                <p className="text-xs text-muted-foreground mt-1">Over {sipYears} years with {stepUpPercent}% step-up</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" /> Final Value</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(sipResult.finalValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">At {sipReturn}% annual return</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><ChevronUp className="h-3 w-3" /> Wealth Gained</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(sipResult.wealthGain)}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  {((sipResult.wealthGain / sipResult.totalInvested) * 100).toFixed(0)}% returns
                </p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Step-Up Impact</p>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                  +{formatCurrency(sipResult.stepUpExtraGain)}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                  Extra gain from {stepUpPercent}% step-up (invested {formatCurrency(sipResult.stepUpExtraInvested)} more)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Step-up comparison */}
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-foreground">Step-Up Impact</span>
              </div>
              <p className="text-sm text-muted-foreground">
                With {stepUpPercent}% annual step-up, you invest <strong className="text-amber-700 dark:text-amber-400">{formatCurrency(sipResult.stepUpExtraInvested)}</strong> more
                but gain <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(sipResult.stepUpExtraGain)}</strong> more
                over {sipYears} years compared to a regular SIP.
              </p>
            </CardContent>
          </Card>

          {/* Stacked area chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Year-by-Year Growth (Invested vs Returns)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sipChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="returnsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
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
                    <Area type="monotone" dataKey="Invested" stroke="#14b8a6" fill="url(#investedGrad)" strokeWidth={2} stackId="1" />
                    <Area type="monotone" dataKey="Returns" stroke="#10b981" fill="url(#returnsGrad)" strokeWidth={2} stackId="1" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Step-up comparison chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">With vs Without Step-Up SIP</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sipComparisonData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                    <Line type="monotone" dataKey="With Step-Up" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3 }} />
                    <Line type="monotone" dataKey="Without Step-Up" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#94a3b8', r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Yearly breakdown table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Year-by-Year Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="py-2 px-2 text-left font-medium text-muted-foreground">Year</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Invested</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Value</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Gain</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Without Step-Up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sipResult.yearlyBreakdown.map((row) => (
                      <tr key={row.year} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-2 font-medium text-foreground">{row.year}</td>
                        <td className="py-2 px-2 text-right text-teal-700 dark:text-teal-400">{formatCurrency(row.invested)}</td>
                        <td className="py-2 px-2 text-right font-medium text-emerald-700 dark:text-emerald-400">{formatCurrency(row.value)}</td>
                        <td className="py-2 px-2 text-right text-emerald-600">{formatCurrency(row.gain)}</td>
                        <td className="py-2 px-2 text-right text-muted-foreground">{formatCurrency(row.stepUpValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ===== STP Results ===== */}
      {mode === 'stp' && stpResult && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Key metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-teal-200 dark:border-teal-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> Total Transferred</p>
                <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{formatCurrency(stpResult.totalTransferred)}</p>
                <p className="text-xs text-muted-foreground mt-1">{stpFrequency} transfers over {stpYears} years</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" /> Target Fund Value</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stpResult.targetValueAccumulated)}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Grown at {stpTargetReturn}%</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Source Remaining</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(stpResult.sourceValueRemaining)}</p>
                <p className="text-xs text-muted-foreground mt-1">In debt/liquid fund</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Portfolio Value</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stpResult.totalValue)}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  +{formatCurrency(stpResult.totalValue - parseFloat(stpLumpSum))} growth
                </p>
              </CardContent>
            </Card>
          </div>

          {/* STP chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
                Source vs Target Fund Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stpChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="sourceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="targetGradStp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
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
                    <Area type="monotone" dataKey="Source Fund" stroke="#f59e0b" fill="url(#sourceGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Target Fund" stroke="#10b981" fill="url(#targetGradStp)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Yearly breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">STP Year-by-Year Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="py-2 px-2 text-left font-medium text-muted-foreground">Year</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Transferred</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Source Remaining</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Target Value</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stpResult.yearlyBreakdown.map((row) => (
                      <tr key={row.year} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-2 font-medium text-foreground">{row.year}</td>
                        <td className="py-2 px-2 text-right text-teal-700 dark:text-teal-400">{formatCurrency(row.totalTransferred)}</td>
                        <td className="py-2 px-2 text-right text-amber-700 dark:text-amber-400">{formatCurrency(row.sourceValue)}</td>
                        <td className="py-2 px-2 text-right font-medium text-emerald-700 dark:text-emerald-400">{formatCurrency(row.targetValue)}</td>
                        <td className="py-2 px-2 text-right font-bold text-foreground">{formatCurrency(row.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ===== SWP Results ===== */}
      {mode === 'swp' && swpResult && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Key metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-teal-200 dark:border-teal-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> Initial Corpus</p>
                <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{formatCurrency(parseFloat(swpCorpus))}</p>
                <p className="text-xs text-muted-foreground mt-1">Starting investment</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpFromLine className="h-3 w-3" /> Total Withdrawn</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(swpResult.totalWithdrawn)}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(parseFloat(swpWithdrawal))}/month
                </p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Corpus Lasts</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{swpResult.corpusLastsYears} years</p>
                <p className="text-xs text-muted-foreground mt-1">Until fully depleted</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Corpus Remaining</p>
                <p className={`text-3xl font-bold ${swpResult.corpusRemaining > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(swpResult.corpusRemaining)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">After {swpYears} years</p>
              </CardContent>
            </Card>
          </div>

          {/* Corpus duration indicator */}
          <Card className={`border-2 ${
            swpResult.corpusLastsYears >= 25 ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20' :
            swpResult.corpusLastsYears >= 15 ? 'border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20' :
            'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className={`h-6 w-6 ${
                  swpResult.corpusLastsYears >= 25 ? 'text-emerald-600' :
                  swpResult.corpusLastsYears >= 15 ? 'text-amber-600' : 'text-red-600'
                }`} />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Your corpus of {formatCurrency(parseFloat(swpCorpus))} will last approximately <strong>{swpResult.corpusLastsYears} years</strong> with {formatCurrency(parseFloat(swpWithdrawal))}/month withdrawal at {swpReturn}% return.
                  </p>
                  {swpResult.corpusLastsYears < 15 && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Consider reducing monthly withdrawal or increasing corpus for longer sustainability.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SWP chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <ArrowUpFromLine className="h-4 w-4 text-emerald-600" />
                Corpus Depletion & Withdrawals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={swpChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="corpusGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="withdrawnGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
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
                    <Area type="monotone" dataKey="Corpus Remaining" stroke="#10b981" fill="url(#corpusGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Total Withdrawn" stroke="#f59e0b" fill="url(#withdrawnGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Yearly breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">SWP Year-by-Year Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="py-2 px-2 text-left font-medium text-muted-foreground">Year</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Start Corpus</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Withdrawal</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">End Corpus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {swpResult.yearlyBreakdown.map((row) => (
                      <tr key={row.year} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-2 font-medium text-foreground">{row.year}</td>
                        <td className="py-2 px-2 text-right text-teal-700 dark:text-teal-400">{formatCurrency(row.startCorpus)}</td>
                        <td className="py-2 px-2 text-right text-amber-700 dark:text-amber-400">{formatCurrency(row.withdrawal)}</td>
                        <td className={`py-2 px-2 text-right font-medium ${row.endCorpus > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                          {formatCurrency(row.endCorpus)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
