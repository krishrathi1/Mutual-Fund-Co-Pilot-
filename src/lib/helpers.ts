export function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(2)} L`
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatCurrencyFull(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatBps(value: number): string {
  return `${value} bps`
}

export function expenseRatioDiff(direct: number, regular: number): number {
  return Math.round((regular - direct) * 100)
}

export function formatAUM(aumCrore: number): string {
  if (aumCrore >= 100) return `₹${(aumCrore / 100).toFixed(1)}K Cr`
  return `₹${aumCrore.toFixed(0)} Cr`
}

export function getRiskColor(risk: string): string {
  const map: Record<string, string> = {
    'Low': 'bg-green-500/10 text-green-400 ring-green-500/20',
    'Low to Moderate': 'bg-lime-500/10 text-lime-400 ring-lime-500/20',
    'Moderate': 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
    'Moderately High': 'bg-orange-500/10 text-orange-400 ring-orange-500/20',
    'High': 'bg-red-500/10 text-red-400 ring-red-500/20',
    'Very High': 'bg-red-500/15 text-red-300 ring-red-500/30',
  }
  return map[risk] || 'bg-white/5 text-white/50 ring-white/10'
}

export function getPriorityConfig(priority: string): { color: string; dot: string } {
  const map: Record<string, { color: string; dot: string }> = {
    'high': { color: 'bg-red-500/10 text-red-400 ring-red-500/20', dot: 'bg-red-500' },
    'medium': { color: 'bg-amber-500/10 text-amber-400 ring-amber-500/20', dot: 'bg-amber-500' },
    'low': { color: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20', dot: 'bg-emerald-500' },
  }
  return map[priority] || { color: 'bg-white/5 text-white/50 ring-white/10', dot: 'bg-white/30' }
}

export function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    'Equity': 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    'Debt': 'bg-sky-500/10 text-sky-400 ring-sky-500/20',
    'Hybrid': 'bg-violet-500/10 text-violet-400 ring-violet-500/20',
    'Index': 'bg-teal-500/10 text-teal-400 ring-teal-500/20',
    'ELSS': 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  }
  return map[category] || 'bg-white/5 text-white/50 ring-white/10'
}

export function getSubCategoryGradient(sub: string): string {
  const map: Record<string, string> = {
    'Large Cap': 'from-emerald-500/20 to-emerald-500/5',
    'Mid Cap': 'from-teal-500/20 to-teal-500/5',
    'Small Cap': 'from-cyan-500/20 to-cyan-500/5',
    'Flexi Cap': 'from-violet-500/20 to-violet-500/5',
    'ELSS': 'from-amber-500/20 to-amber-500/5',
    'Index Fund': 'from-sky-500/20 to-sky-500/5',
    'Sectoral/Thematic': 'from-rose-500/20 to-rose-500/5',
    'Balanced Advantage': 'from-violet-500/20 to-violet-500/5',
    'Corporate Bond': 'from-sky-500/20 to-sky-500/5',
    'Gilt': 'from-blue-500/20 to-blue-500/5',
    'Short Duration': 'from-cyan-500/20 to-cyan-500/5',
  }
  return map[sub] || 'from-white/5 to-transparent'
}
