export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0'
  const absAmount = Math.abs(amount)
  if (absAmount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (absAmount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatCurrencyFull(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0'
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatBps(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0 bps'
  return `${value} bps`
}

export function formatSharpe(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value.toFixed(2)
}

export function formatTrackingError(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return '—'
  return `${bps.toFixed(1)} bps`
}

export function getRiskAdjustedColor(delta: number): string {
  if (delta > 0.5) return 'text-emerald-600 dark:text-emerald-400'
  if (delta > 0) return 'text-emerald-600/80 dark:text-emerald-400/80'
  if (delta < -0.5) return 'text-red-600 dark:text-red-400'
  if (delta < 0) return 'text-red-600/80 dark:text-red-400/80'
  return 'text-muted-foreground'
}

export function expenseRatioDiff(direct: number, regular: number): number {
  return Math.round((regular - direct) * 100)
}

export function formatAUM(aumCrore: number | null | undefined): string {
  if (aumCrore === null || aumCrore === undefined || isNaN(aumCrore)) return '—'
  if (aumCrore >= 100) return `₹${(aumCrore / 100).toFixed(1)}K Cr`
  return `₹${aumCrore.toFixed(0)} Cr`
}

export function getRiskColor(risk: string): string {
  const map: Record<string, string> = {
    'Low': 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400',
    'Low to Moderate': 'bg-lime-500/10 text-lime-700 ring-lime-500/20 dark:text-lime-400',
    'Moderate': 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400',
    'Moderately High': 'bg-orange-500/10 text-orange-700 ring-orange-500/20 dark:text-orange-400',
    'High': 'bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-400',
    'Very High': 'bg-red-500/15 text-red-600 ring-red-500/30 dark:text-red-400',
  }
  return map[risk] || 'bg-muted text-muted-foreground ring-border'
}

export function getPriorityConfig(priority: string): { color: string; dot: string } {
  const map: Record<string, { color: string; dot: string }> = {
    'high': { color: 'bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-400', dot: 'bg-red-500' },
    'medium': { color: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400', dot: 'bg-amber-500' },
    'low': { color: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400', dot: 'bg-emerald-500' },
  }
  return map[priority] || { color: 'bg-muted text-muted-foreground ring-border', dot: 'bg-muted-foreground' }
}

export function getPriorityColor(priority: string): string {
  return getPriorityConfig(priority).color
}

export function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    'Equity': 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400',
    'Debt': 'bg-teal-500/10 text-teal-700 ring-teal-500/20 dark:text-teal-400',
    'Hybrid': 'bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-400',
    'Index': 'bg-teal-500/10 text-teal-700 ring-teal-500/20 dark:text-teal-400',
    'ELSS': 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400',
  }
  return map[category] || 'bg-muted text-muted-foreground ring-border'
}
