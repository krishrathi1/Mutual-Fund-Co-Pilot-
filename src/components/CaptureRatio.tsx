'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { Target, TrendingUp, TrendingDown } from 'lucide-react'
import { useFundStore } from '@/lib/store'
import { formatPercent } from '@/lib/helpers'

export default function CaptureRatio() {
  const { funds } = useFundStore()
  const [selectedFundId, setSelectedFundId] = useState('')
  const [result, setResult] = useState<{
    fund: { id: string; schemeName: string; benchmark: string; category: string }
    captureRatios: { upsideCapture1y: number | null; downsideCapture1y: number | null; upsideCapture3y: number | null; downsideCapture3y: number | null }
    alpha: { alpha1y: number; alpha3y: number }
    interpretation: { upside: string; downside: string; overall: string }
  } | null>(null)
  const [allFunds, setAllFunds] = useState<{ id: string; schemeName: string; upsideCapture1y: number | null; upsideCapture3y: number | null; category: string }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/funds/capture-ratio').then(r => r.json()).then(d => setAllFunds(d.funds || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedFundId) return
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      fetch(`/api/funds/capture-ratio?fundId=${selectedFundId}`).then(r => r.json()).then(d => { if (!cancelled) { setResult(d); setLoading(false) } }).catch(() => { if (!cancelled) setLoading(false) })
    }, 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [selectedFundId])

  const chartData = allFunds.slice(0, 15).map(f => ({
    name: f.schemeName.split(' ').slice(0, 3).join(' '),
    'Upside 1Y': f.upsideCapture1y || 0,
    'Upside 3Y': f.upsideCapture3y || 0,
    category: f.category
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
          <Target className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Capture Ratio Analysis</h2>
          <p className="text-sm text-muted-foreground">Upside/Downside capture vs benchmark</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Select value={selectedFundId} onValueChange={setSelectedFundId}>
            <SelectTrigger className="w-full max-w-md"><SelectValue placeholder="Select a fund..." /></SelectTrigger>
            <SelectContent>
              {funds.map(f => <SelectItem key={f.id} value={f.id}>{f.schemeName}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {result && !loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="pt-6 text-center">
                <TrendingUp className="mx-auto h-8 w-8 text-emerald-600" />
                <p className="text-sm text-muted-foreground mt-2">Upside Capture (1Y)</p>
                <p className="text-3xl font-bold text-emerald-600">{result.captureRatios.upsideCapture1y || '—'}%</p>
                <p className="text-xs text-muted-foreground mt-1">{result.interpretation.upside}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="pt-6 text-center">
                <TrendingDown className="mx-auto h-8 w-8 text-red-600" />
                <p className="text-sm text-muted-foreground mt-2">Downside Capture (1Y)</p>
                <p className="text-3xl font-bold text-red-600">{result.captureRatios.downsideCapture1y || '—'}%</p>
                <p className="text-xs text-muted-foreground mt-1">{result.interpretation.downside}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Target className="mx-auto h-8 w-8 text-violet-600" />
                <p className="text-sm text-muted-foreground mt-2">Alpha (1Y)</p>
                <p className="text-3xl font-bold text-violet-600">{formatPercent(result.alpha.alpha1y)}</p>
                <Badge variant={result.alpha.alpha1y > 0 ? 'default' : 'destructive'} className="mt-2">
                  {result.alpha.alpha1y > 0 ? 'Outperforming' : 'Underperforming'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Overall Assessment</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="font-medium">{result.interpretation.overall}</p>
                <p className="text-sm text-muted-foreground mt-1">Benchmark: {result.fund.benchmark}</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Upside Capture Comparison (Top 15 Funds)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`]} />
              <Legend />
              <Bar dataKey="Upside 1Y" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Upside 3Y" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
