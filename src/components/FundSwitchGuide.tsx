'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowRightLeft, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { useFundStore } from '@/lib/store'
import { formatCurrency } from '@/lib/helpers'

export default function FundSwitchGuide() {
  const { funds } = useFundStore()
  const [selectedFundId, setSelectedFundId] = useState('')
  const [investmentAmount, setInvestmentAmount] = useState(500000)
  const [holdingYears, setHoldingYears] = useState(3)
  const [result, setResult] = useState<{
    fund: { schemeName: string; directIsin: string; regularIsin: string }
    regularPlan: { expenseRatio: number; nav: number; return1y: number | null }
    directPlan: { expenseRatio: number; nav: number; return1y: number | null }
    savings: { expenseDiffBps: number; annualSaving: number; cumulativeSaving10y: number }
    switchCost: { taxOnSwitch: number; exitLoadCost: number; totalSwitchCost: number; isLongTerm: boolean; taxType: string }
    recommendation: { switchRecommended: boolean; breakEvenMonths: number; verdict: string }
    steps: { step: number; title: string; detail: string; status: string }[]
  } | null>(null)

  useEffect(() => {
    if (!selectedFundId) return
    fetch(`/api/funds/switch-guide?fundId=${selectedFundId}&amount=${investmentAmount}&holdingYears=${holdingYears}`).then(r => r.json()).then(d => setResult(d)).catch(() => {})
  }, [selectedFundId, investmentAmount, holdingYears])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
          <ArrowRightLeft className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Fund Switch Guide</h2>
          <p className="text-sm text-muted-foreground">Regular → Direct switch with cost-benefit analysis</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="text-sm font-medium">Select Fund</label>
              <Select value={selectedFundId} onValueChange={setSelectedFundId}>
                <SelectTrigger><SelectValue placeholder="Select fund..." /></SelectTrigger>
                <SelectContent>{funds.map(f => <SelectItem key={f.id} value={f.id}>{f.schemeName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">Investment Amount (₹)</label><Input type="number" value={investmentAmount} onChange={e => setInvestmentAmount(Number(e.target.value))} /></div>
            <div><label className="text-sm font-medium">Holding Period (Years)</label><Input type="number" value={holdingYears} onChange={e => setHoldingYears(Number(e.target.value))} min={1} /></div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-red-600 mb-2">🔴 REGULAR PLAN</p>
                <p className="text-lg font-bold">Expense Ratio: {result.regularPlan.expenseRatio}%</p>
                <p className="text-sm text-muted-foreground">NAV: ₹{result.regularPlan.nav} · 1Y: {result.regularPlan.return1y?.toFixed(2) || '—'}%</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-emerald-600 mb-2">🟢 DIRECT PLAN</p>
                <p className="text-lg font-bold">Expense Ratio: {result.directPlan.expenseRatio}%</p>
                <p className="text-sm text-muted-foreground">NAV: ₹{result.directPlan.nav} · 1Y: {result.directPlan.return1y?.toFixed(2) || '—'}%</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20"><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Annual Savings</p><p className="text-xl font-bold text-emerald-600">{formatCurrency(result.savings.annualSaving)}</p><p className="text-xs text-muted-foreground">{result.savings.expenseDiffBps} bps cheaper</p></CardContent></Card>
            <Card className="bg-red-50/50 dark:bg-red-950/20"><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Switch Cost</p><p className="text-xl font-bold text-red-600">{formatCurrency(result.switchCost.totalSwitchCost)}</p><p className="text-xs text-muted-foreground">Tax: {formatCurrency(result.switchCost.taxOnSwitch)} + Exit Load: {formatCurrency(result.switchCost.exitLoadCost)}</p></CardContent></Card>
            <Card className={result.recommendation.switchRecommended ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'bg-amber-50/50 dark:bg-amber-950/20'}>
              <CardContent className="pt-6 text-center">
                {result.recommendation.switchRecommended ? <CheckCircle className="mx-auto h-6 w-6 text-emerald-600" /> : <AlertTriangle className="mx-auto h-6 w-6 text-amber-600" />}
                <p className="text-xs text-muted-foreground mt-1">Break-even: {result.recommendation.breakEvenMonths} months</p>
                <Badge variant={result.recommendation.switchRecommended ? 'default' : 'destructive'} className="mt-1">{result.recommendation.switchRecommended ? '✓ Switch Recommended' : '✕ Stay for Now'}</Badge>
              </CardContent>
            </Card>
          </div>

          <Card className={result.recommendation.switchRecommended ? 'border-emerald-200 dark:border-emerald-800' : 'border-amber-200 dark:border-amber-800'}>
            <CardContent className="pt-6"><p className="font-bold">{result.recommendation.verdict}</p></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Step-by-Step Switch Process</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.steps.map((s) => (
                  <div key={s.step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${s.status === 'ok' ? 'bg-emerald-500/20 text-emerald-600' : s.status === 'warning' ? 'bg-amber-500/20 text-amber-600' : 'bg-teal-500/20 text-teal-600'}`}>{s.step}</div>
                    <div><p className="font-medium text-sm">{s.title}</p><p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
