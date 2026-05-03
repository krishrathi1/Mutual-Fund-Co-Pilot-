'use client'

import { useFundStore } from '@/lib/store'
import HeroSection from '@/components/HeroSection'
import ExploreFunds from '@/components/ExploreFunds'
import PortfolioBuilder from '@/components/PortfolioBuilder'
import CompareView from '@/components/CompareView'
import SavingsCalculator from '@/components/SavingsCalculator'
import Watchlist from '@/components/Watchlist'
import TaxCalculator from '@/components/TaxCalculator'
import FundOverlap from '@/components/FundOverlap'
import GoalPlanner from '@/components/GoalPlanner'
import AICopilot from '@/components/AICopilot'
import PortfolioExport from '@/components/PortfolioExport'
import XIRRCalculator from '@/components/XIRRCalculator'
import RiskProfiler from '@/components/RiskProfiler'
import StressTest from '@/components/StressTest'
import FundHeatmap from '@/components/FundHeatmap'
import NAVHistory from '@/components/NAVHistory'
import SectorExposure from '@/components/SectorExposure'
import DiversificationScore from '@/components/DiversificationScore'
import ExitLoadCalc from '@/components/ExitLoadCalc'
import SIPPlanner from '@/components/SIPPlanner'
import RebalancingView from '@/components/RebalancingView'
import MarketDashboard from '@/components/MarketDashboard'
import FundScreener from '@/components/FundScreener'
import SWPCalculator from '@/components/SWPCalculator'
import STPCalculator from '@/components/STPCalculator'
import BenchmarkCompare from '@/components/BenchmarkCompare'
import VolatilityAnalysis from '@/components/VolatilityAnalysis'
import FundRankings from '@/components/FundRankings'
import AMCAnalysis from '@/components/AMCAnalysis'
import PortfolioAlerts from '@/components/PortfolioAlerts'
import Footer from '@/components/Footer'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass, Landmark, Scale, Coins, TrendingUp, Sun, Moon,
  Eye, FileText, Waypoints, Crosshair, FileDown, Percent, Gauge, Activity, LayoutDashboard,
  LineChart, PieChart, Network, LogOut, RefreshCcw, Repeat,
  ChevronDown, ChevronUp, LayoutGrid, Filter, Wallet, ArrowRightLeft, BarChart3,
  Building2, Trophy, Bell, Zap
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface TabConfig {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  group: string
}

const tabs: TabConfig[] = [
  // Discover
  { id: 'explore', label: 'Explore', icon: Compass, group: 'Discover' },
  { id: 'market', label: 'Market', icon: LineChart, group: 'Discover' },
  { id: 'heatmap', label: 'Heatmap', icon: LayoutDashboard, group: 'Discover' },
  { id: 'nav', label: 'NAV Chart', icon: TrendingUp, group: 'Discover' },
  { id: 'screener', label: 'Screener', icon: Filter, group: 'Discover' },
  { id: 'rankings', label: 'Rankings', icon: Trophy, group: 'Discover' },
  { id: 'amc', label: 'AMC Hub', icon: Building2, group: 'Discover' },
  // Analyze
  { id: 'portfolio', label: 'Portfolio', icon: Landmark, group: 'Analyze' },
  { id: 'compare', label: 'Compare', icon: Scale, group: 'Analyze' },
  { id: 'overlap', label: 'Overlap', icon: Waypoints, group: 'Analyze' },
  { id: 'sector', label: 'Sectors', icon: PieChart, group: 'Analyze' },
  { id: 'diversification', label: 'Diversity', icon: Network, group: 'Analyze' },
  { id: 'benchmark', label: 'Benchmark', icon: BarChart3, group: 'Analyze' },
  { id: 'volatility', label: 'Volatility', icon: Activity, group: 'Analyze' },
  // Plan
  { id: 'savings', label: 'Savings', icon: Coins, group: 'Plan' },
  { id: 'sip', label: 'SIP', icon: Repeat, group: 'Plan' },
  { id: 'swp', label: 'SWP', icon: Wallet, group: 'Plan' },
  { id: 'stp', label: 'STP', icon: ArrowRightLeft, group: 'Plan' },
  { id: 'goals', label: 'Goals', icon: Crosshair, group: 'Plan' },
  { id: 'risk', label: 'Risk', icon: Gauge, group: 'Plan' },
  // Optimize
  { id: 'tax', label: 'Tax', icon: FileText, group: 'Optimize' },
  { id: 'exitload', label: 'Exit Load', icon: LogOut, group: 'Optimize' },
  { id: 'rebalance', label: 'Rebalance', icon: RefreshCcw, group: 'Optimize' },
  { id: 'stress', label: 'Stress', icon: Zap, group: 'Optimize' },
  { id: 'alerts', label: 'Alerts', icon: Bell, group: 'Optimize' },
  // Tools
  { id: 'xirr', label: 'XIRR', icon: Percent, group: 'Tools' },
  { id: 'watchlist', label: 'Watchlist', icon: Eye, group: 'Tools' },
  { id: 'export', label: 'Export', icon: FileDown, group: 'Tools' },
]

const desktopGroups = ['Discover', 'Analyze', 'Plan', 'Optimize', 'Tools']
const desktopPrimaryTabIds = ['explore', 'market', 'portfolio', 'compare', 'goals', 'savings']
const primaryTabIds = ['explore', 'market', 'heatmap', 'portfolio', 'compare', 'savings', 'goals', 'screener']
const secondaryTabIds = tabs.map(t => t.id).filter(id => !primaryTabIds.includes(id))

export default function Home() {
  const { activeTab, setActiveTab, holdings, selectedFundIds, watchlist, goals } = useFundStore()
  const { theme, setTheme } = useTheme()
  const [showMoreTabs, setShowMoreTabs] = useState(false)

  const getBadge = (tabId: string) => {
    if (tabId === 'portfolio' && holdings.length > 0) return holdings.length
    if (tabId === 'compare' && selectedFundIds.length > 0) return selectedFundIds.length
    if (tabId === 'watchlist' && watchlist.length > 0) return watchlist.length
    if (tabId === 'goals' && goals.length > 0) return goals.length
    return 0
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-emerald-500/30 selection:text-emerald-900">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between gap-8">
            <div className="flex items-center gap-12">
              {/* Logo */}
              <div className="flex items-center gap-4 shrink-0 group cursor-pointer" onClick={() => setActiveTab('explore')}>
                <div className="relative flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-emerald-500 to-teal-700 shadow-2xl shadow-emerald-500/30 group-hover:rotate-6 transition-transform duration-500">
                  <TrendingUp className="h-6 w-6 text-white" />
                  <div className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-4 ring-background animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-xl font-black tracking-tighter text-foreground leading-none">FundVista</h1>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-600/90 dark:text-emerald-400/90 leading-none">Co-Pilot</span>
                    <div className="h-1 w-1 rounded-full bg-emerald-500/50" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60 leading-none">v3.0</span>
                  </div>
                </div>
              </div>

              {/* Desktop Tab Navigation */}
              <nav className="hidden xl:flex items-center gap-1.5 bg-background/40 backdrop-blur-2xl px-2 py-1.5 rounded-[1.25rem] border border-white/10 shadow-2xl shadow-emerald-500/5 relative">
                <div className="absolute inset-0 rounded-[1.25rem] bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                
                <div className="flex items-center gap-1 relative z-10">
                  {/* Primary Tab: Explore */}
                  {(() => {
                    const exploreTab = tabs.find(t => t.id === 'explore')!
                    const isActive = activeTab === 'explore'
                    const Icon = exploreTab.icon
                    return (
                      <button
                        key="explore"
                        onClick={() => setActiveTab('explore')}
                        className={`group relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black tracking-widest uppercase transition-all duration-300 ${
                          isActive ? 'text-white' : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/30'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute inset-[2px] bg-emerald-600 rounded-[10px] shadow-lg shadow-emerald-600/30 -z-10"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <Icon className={`h-4 w-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 opacity-70 group-hover:opacity-100'}`} />
                        <span className="relative">{exploreTab.label}</span>
                      </button>
                    )
                  })()}

                  <div className="w-px h-5 bg-foreground/10 mx-2" />

                  {/* Group Dropdowns */}
                  {desktopGroups.map((group) => {
                    const groupTabs = tabs.filter(t => t.group === group && t.id !== 'explore')
                    if (groupTabs.length === 0) return null
                    
                    const isGroupActive = groupTabs.some(t => t.id === activeTab)
                    
                    const groupIcons: Record<string, React.ReactNode> = {
                      'Discover': <Compass className="h-4 w-4" />,
                      'Analyze': <Activity className="h-4 w-4" />,
                      'Plan': <Crosshair className="h-4 w-4" />,
                      'Optimize': <RefreshCcw className="h-4 w-4" />,
                      'Tools': <LayoutGrid className="h-4 w-4" />
                    }

                    return (
                      <DropdownMenu key={group}>
                        <DropdownMenuTrigger asChild>
                          <button className={`group relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black tracking-widest uppercase transition-all duration-300 ${
                            isGroupActive ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/30'
                          }`}>
                            <div className={`transition-transform duration-300 ${isGroupActive ? 'scale-110' : 'opacity-70 group-hover:opacity-100'}`}>
                              {groupIcons[group] || <LayoutGrid className="h-4 w-4" />}
                            </div>
                            <span>{group}</span>
                            <ChevronDown className="h-3 w-3 opacity-50 ml-1" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 rounded-xl border-white/10 bg-background/95 backdrop-blur-xl shadow-2xl p-2 z-[100] mt-2">
                          {groupTabs.map((tab) => {
                            const isActive = activeTab === tab.id
                            const badge = getBadge(tab.id)
                            const Icon = tab.icon
                            return (
                              <DropdownMenuItem 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                className={`flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium cursor-pointer transition-colors outline-none focus:bg-muted/50 ${
                                  isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 focus:bg-emerald-500/20' : ''
                                }`}
                              >
                                <Icon className="h-4 w-4 opacity-70" />
                                <span>{tab.label}</span>
                                {badge > 0 && (
                                  <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white">
                                    {badge}
                                  </span>
                                )}
                              </DropdownMenuItem>
                            )
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )
                  })}
                </div>
              </nav>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 shadow-sm group hover:bg-emerald-500/10 transition-colors">
                <div className="relative">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
                </div>
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-[0.2em] group-hover:tracking-[0.3em] transition-all">
                  Live Market
                </span>
              </div>
              
              <div className="h-10 w-[1px] bg-foreground/10 mx-1 hidden sm:block" />

              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-2xl bg-muted/30 hover:bg-muted/80 border border-border/40 transition-all hover:scale-105 active:scale-95 group"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <div className="relative h-5 w-5">
                  <Sun className="absolute inset-0 h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500 group-hover:rotate-12" />
                  <Moon className="absolute inset-0 h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-teal-400 group-hover:-rotate-12" />
                </div>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile / Tablet tab bar */}
        <div className="flex xl:hidden items-center px-4 py-3 bg-muted/20 border-t border-white/5">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-1">
            {tabs.filter(t => primaryTabIds.includes(t.id)).map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tab.icon
              const badge = getBadge(tab.id)
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
                    isActive 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                      : 'text-muted-foreground bg-background/40'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'scale-110' : ''}`} />
                  {tab.label}
                  {badge > 0 && (
                    <span className={`flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[8px] font-black ${
                      isActive ? 'bg-white text-emerald-600' : 'bg-emerald-600 text-white'
                    }`}>
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setShowMoreTabs(!showMoreTabs)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-background/40 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground ml-2 shrink-0 transition-all active:scale-95"
          >
            <span>More</span>
            {showMoreTabs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Expanded more tabs */}
        {showMoreTabs && (
          <div className="xl:hidden border-t bg-background/95 backdrop-blur-lg px-4 py-2">
            <div className="flex flex-wrap gap-1">
              {tabs.filter(t => secondaryTabIds.includes(t.id)).map((tab) => {
                const isActive = activeTab === tab.id
                const Icon = tab.icon
                const badge = getBadge(tab.id)
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as typeof activeTab); setShowMoreTabs(false) }}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                      isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {tab.label}
                    {badge > 0 && (
                      <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-500 px-0.5 text-[8px] font-bold text-white">
                        {badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </header>

      {/* Hero - only on Explore tab */}
      {activeTab === 'explore' && <HeroSection />}

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
          >
            {/* Discover */}
            {activeTab === 'explore' && <ExploreFunds />}
            {activeTab === 'market' && <MarketDashboard />}
            {activeTab === 'heatmap' && <FundHeatmap />}
            {activeTab === 'nav' && <NAVHistory />}
            {activeTab === 'screener' && <FundScreener />}
            {activeTab === 'rankings' && <FundRankings />}
            {activeTab === 'amc' && <AMCAnalysis />}
            {/* Analyze */}
            {activeTab === 'portfolio' && <PortfolioBuilder />}
            {activeTab === 'compare' && <CompareView />}
            {activeTab === 'overlap' && <FundOverlap />}
            {activeTab === 'sector' && <SectorExposure />}
            {activeTab === 'diversification' && <DiversificationScore />}
            {activeTab === 'benchmark' && <BenchmarkCompare />}
            {activeTab === 'volatility' && <VolatilityAnalysis />}
            {/* Plan */}
            {activeTab === 'savings' && <SavingsCalculator />}
            {activeTab === 'sip' && <SIPPlanner />}
            {activeTab === 'swp' && <SWPCalculator />}
            {activeTab === 'stp' && <STPCalculator />}
            {activeTab === 'goals' && <GoalPlanner />}
            {activeTab === 'risk' && <RiskProfiler />}
            {/* Optimize */}
            {activeTab === 'tax' && <TaxCalculator />}
            {activeTab === 'exitload' && <ExitLoadCalc />}
            {activeTab === 'rebalance' && <RebalancingView />}
            {activeTab === 'stress' && <StressTest />}
            {activeTab === 'alerts' && <PortfolioAlerts />}
            {/* Tools */}
            {activeTab === 'xirr' && <XIRRCalculator />}
            {activeTab === 'watchlist' && <Watchlist />}
            {activeTab === 'export' && <PortfolioExport />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer />

      {/* AI Copilot - Always visible floating chat */}
      <AICopilot />
    </div>
  )
}
