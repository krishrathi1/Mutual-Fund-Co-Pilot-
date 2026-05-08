import {
  Compass, Landmark, Scale, Coins, TrendingUp,
  Eye, FileText, Waypoints, Crosshair, FileDown, Percent, Gauge, Activity, LayoutDashboard,
  LineChart, PieChart, Network, LogOut, RefreshCcw, Repeat,
  LayoutGrid, Filter, Wallet, ArrowRightLeft, BarChart3,
  Building2, Trophy, Bell, Zap, Target, Fingerprint, Dice5,
  LayoutGrid as GridIcon, Calculator,
  GitCompare, TrendingDown, IndianRupee, AlertTriangle, ArrowRightLeft as SwitchIcon,
  ShieldCheck, ShieldAlert
} from 'lucide-react'

export interface TabConfig {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  group: string
}

export const TABS: TabConfig[] = [
  // Discover
  { id: 'explore', label: 'Explore', icon: Compass, group: 'Discover' },
  { id: 'market', label: 'Market', icon: LineChart, group: 'Discover' },
  { id: 'heatmap', label: 'Heatmap', icon: LayoutDashboard, group: 'Discover' },
  { id: 'nav', label: 'NAV Chart', icon: TrendingUp, group: 'Discover' },
  { id: 'screener', label: 'Screener', icon: Filter, group: 'Discover' },
  { id: 'rankings', label: 'Rankings', icon: Trophy, group: 'Discover' },
  { id: 'amc', label: 'AMC Hub', icon: Building2, group: 'Discover' },
  { id: 'rollingreturns', label: 'Rolling Returns', icon: TrendingUp, group: 'Discover' },
  { id: 'captureratio', label: 'Capture Ratio', icon: Target, group: 'Discover' },
  { id: 'categoryperf', label: 'Category Perf', icon: PieChart, group: 'Discover' },
  { id: 'similarity', label: 'Similar Funds', icon: Fingerprint, group: 'Discover' },
  // Analyze
  { id: 'portfolio', label: 'Portfolio', icon: Landmark, group: 'Analyze' },
  { id: 'compare', label: 'Compare', icon: Scale, group: 'Analyze' },
  { id: 'overlap', label: 'Overlap', icon: Waypoints, group: 'Analyze' },
  { id: 'sector', label: 'Sectors', icon: PieChart, group: 'Analyze' },
  { id: 'diversification', label: 'Diversity', icon: Network, group: 'Analyze' },
  { id: 'montecarlo', label: 'Monte Carlo', icon: Dice5, group: 'Analyze' },
  // Plan
  { id: 'savings', label: 'Savings', icon: Coins, group: 'Plan' },
  { id: 'sip', label: 'SIP Planner', icon: Repeat, group: 'Plan' },
  { id: 'goals', label: 'Goals', icon: Crosshair, group: 'Plan' },
  { id: 'risk', label: 'Risk', icon: Gauge, group: 'Plan' },
  { id: 'fdvsmf', label: 'FD vs MF', icon: GitCompare, group: 'Plan' },
  { id: 'inflation', label: 'Inflation', icon: TrendingDown, group: 'Plan' },
  // Optimize
  { id: 'tax', label: 'Tax', icon: FileText, group: 'Optimize' },
  { id: 'exitload', label: 'Exit Load', icon: LogOut, group: 'Optimize' },
  { id: 'rebalance', label: 'Rebalance', icon: RefreshCcw, group: 'Optimize' },
  { id: 'stress', label: 'Stress', icon: Zap, group: 'Optimize' },
  { id: 'alerts', label: 'Alerts', icon: Bell, group: 'Optimize' },
  { id: 'commission', label: 'Commission', icon: AlertTriangle, group: 'Optimize' },
  { id: 'switchguide', label: 'Switch Guide', icon: SwitchIcon, group: 'Optimize' },
  { id: 'elsstax', label: 'ELSS Tax Saver', icon: ShieldCheck, group: 'Optimize' },
  { id: 'emergency', label: 'Emergency Fund', icon: ShieldAlert, group: 'Optimize' },
  // Tools
  { id: 'xirr', label: 'XIRR', icon: Percent, group: 'Tools' },
  { id: 'watchlist', label: 'Watchlist', icon: Eye, group: 'Tools' },
  { id: 'export', label: 'Export', icon: FileDown, group: 'Tools' },
]

export const GROUPS = ['Discover', 'Analyze', 'Plan', 'Optimize', 'Tools']
