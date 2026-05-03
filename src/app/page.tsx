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
import Footer from '@/components/Footer'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Briefcase, GitCompareArrows, Calculator, TrendingUp, Sun, Moon,
  Bookmark, Receipt, Layers, Target, Download, BarChart3, Shield, ShieldAlert, Grid3X3,
  LineChart, PieChart, Award, ArrowRightLeft, RefreshCw, Activity,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface TabConfig {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  group: string
}

const tabs: TabConfig[] = [
  { id: 'explore', label: 'Explore', icon: Search, group: 'Discover' },
  { id: 'market', label: 'Market', icon: Activity, group: 'Discover' },
  { id: 'heatmap', label: 'Heatmap', icon: Grid3X3, group: 'Discover' },
  { id: 'nav', label: 'NAV Chart', icon: LineChart, group: 'Discover' },
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase, group: 'Analyze' },
  { id: 'compare', label: 'Compare', icon: GitCompareArrows, group: 'Analyze' },
  { id: 'overlap', label: 'Overlap', icon: Layers, group: 'Analyze' },
  { id: 'sector', label: 'Sectors', icon: PieChart, group: 'Analyze' },
  { id: 'diversification', label: 'Diversity', icon: Award, group: 'Analyze' },
  { id: 'savings', label: 'Savings', icon: Calculator, group: 'Plan' },
  { id: 'sip', label: 'SIP/STP/SWP', icon: TrendingUp, group: 'Plan' },
  { id: 'goals', label: 'Goals', icon: Target, group: 'Plan' },
  { id: 'risk', label: 'Risk', icon: Shield, group: 'Plan' },
  { id: 'tax', label: 'Tax', icon: Receipt, group: 'Optimize' },
  { id: 'exitload', label: 'Exit Load', icon: ArrowRightLeft, group: 'Optimize' },
  { id: 'rebalance', label: 'Rebalance', icon: RefreshCw, group: 'Optimize' },
  { id: 'stress', label: 'Stress', icon: ShieldAlert, group: 'Optimize' },
  { id: 'xirr', label: 'XIRR', icon: BarChart3, group: 'Tools' },
  { id: 'watchlist', label: 'Watchlist', icon: Bookmark, group: 'Tools' },
  { id: 'export', label: 'Export', icon: Download, group: 'Tools' },
]

const desktopGroups = ['Discover', 'Analyze', 'Plan', 'Optimize', 'Tools']
const primaryTabIds = ['explore', 'market', 'heatmap', 'nav', 'portfolio', 'compare', 'savings', 'goals']
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
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                <TrendingUp className="h-4 w-4 text-white" />
                <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-background" />
              </div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-base font-bold tracking-tight text-foreground">FundVista</h1>
                <span className="hidden text-[10px] font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-400 lg:block">Direct vs Regular Co-Pilot</span>
              </div>
            </div>

            {/* Desktop Tab Navigation - Grouped */}
            <nav className="hidden xl:flex items-center gap-1">
              {desktopGroups.map((group, gi) => {
                const groupTabs = tabs.filter(t => t.group === group)
                return (
                  <div key={group} className="flex items-center gap-0.5">
                    {gi > 0 && <div className="w-px h-5 bg-border mx-1" />}
                    {groupTabs.map((tab) => {
                      const isActive = activeTab === tab.id
                      const badge = getBadge(tab.id)
                      const Icon = tab.icon
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as typeof activeTab)}
                          className={`relative flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all duration-200 ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-600 shadow-sm ring-1 ring-emerald-500/20 dark:text-emerald-400'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                          }`}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{tab.label}</span>
                          {badge > 0 && (
                            <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-500 px-0.5 text-[8px] font-bold text-white">
                              {badge}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle theme"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                IN Market
              </span>
            </div>
          </div>
        </div>

        {/* Mobile / Tablet tab bar */}
        <div className="flex xl:hidden items-center px-4 pb-2">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1">
            {tabs.filter(t => primaryTabIds.includes(t.id)).map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tab.icon
              const badge = getBadge(tab.id)
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                    isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
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
          <button
            onClick={() => setShowMoreTabs(!showMoreTabs)}
            className="flex items-center gap-1 rounded-full border px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground ml-1 shrink-0"
          >
            More
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
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {activeTab === 'explore' && <ExploreFunds />}
            {activeTab === 'market' && <MarketDashboard />}
            {activeTab === 'heatmap' && <FundHeatmap />}
            {activeTab === 'nav' && <NAVHistory />}
            {activeTab === 'portfolio' && <PortfolioBuilder />}
            {activeTab === 'compare' && <CompareView />}
            {activeTab === 'overlap' && <FundOverlap />}
            {activeTab === 'sector' && <SectorExposure />}
            {activeTab === 'diversification' && <DiversificationScore />}
            {activeTab === 'savings' && <SavingsCalculator />}
            {activeTab === 'sip' && <SIPPlanner />}
            {activeTab === 'goals' && <GoalPlanner />}
            {activeTab === 'risk' && <RiskProfiler />}
            {activeTab === 'tax' && <TaxCalculator />}
            {activeTab === 'exitload' && <ExitLoadCalc />}
            {activeTab === 'rebalance' && <RebalancingView />}
            {activeTab === 'stress' && <StressTest />}
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
