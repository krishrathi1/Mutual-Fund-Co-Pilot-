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
import Footer from '@/components/Footer'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Briefcase, GitCompareArrows, Calculator, TrendingUp, Sun, Moon,
  Bookmark, Receipt, Layers, Target, Download, BarChart3,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

const tabs = [
  { id: 'explore' as const, label: 'Explore', icon: Search, description: 'Search & browse funds' },
  { id: 'portfolio' as const, label: 'Portfolio', icon: Briefcase, description: 'Your holdings' },
  { id: 'compare' as const, label: 'Compare', icon: GitCompareArrows, description: 'Side-by-side analysis' },
  { id: 'savings' as const, label: 'Savings', icon: Calculator, description: 'Lifetime cost calculator' },
  { id: 'watchlist' as const, label: 'Watchlist', icon: Bookmark, description: 'Bookmarked funds' },
  { id: 'tax' as const, label: 'Tax', icon: Receipt, description: 'Capital gains calculator' },
  { id: 'overlap' as const, label: 'Overlap', icon: Layers, description: 'Portfolio overlap analyzer' },
  { id: 'goals' as const, label: 'Goals', icon: Target, description: 'Goal-based investing' },
  { id: 'xirr' as const, label: 'XIRR', icon: BarChart3, description: 'Annualized returns' },
  { id: 'export' as const, label: 'Export', icon: Download, description: 'Export/import portfolio' },
]

export default function Home() {
  const { activeTab, setActiveTab, holdings, selectedFundIds, watchlist, goals } = useFundStore()
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                <TrendingUp className="h-4 w-4 text-white" />
                <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-background" />
              </div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-base font-bold tracking-tight text-foreground">FundVista</h1>
                <span className="hidden text-[10px] font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-400 lg:block">Direct vs Regular Co-Pilot</span>
              </div>
            </div>

            {/* Tab pills - desktop */}
            <nav className="hidden lg:flex items-center gap-0.5 rounded-full bg-muted p-1 ring-1 ring-border">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                const badge = tab.id === 'portfolio' && holdings.length > 0 ? holdings.length
                  : tab.id === 'compare' && selectedFundIds.length > 0 ? selectedFundIds.length
                  : tab.id === 'watchlist' && watchlist.length > 0 ? watchlist.length
                  : tab.id === 'goals' && goals.length > 0 ? goals.length : 0
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-600 shadow-sm ring-1 ring-emerald-500/20 dark:text-emerald-400'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabBg"
                        className="absolute inset-0 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    <tab.icon className="relative h-3 w-3" />
                    <span className="relative">{tab.label}</span>
                    {badge > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="relative flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white"
                      >
                        {badge}
                      </motion.span>
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Right side: theme toggle & market badge */}
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

        {/* Mobile / tablet tab bar */}
        <div className="flex lg:hidden items-center gap-1 overflow-x-auto px-4 pb-2 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            const badge = tab.id === 'portfolio' && holdings.length > 0 ? holdings.length
              : tab.id === 'compare' && selectedFundIds.length > 0 ? selectedFundIds.length
              : tab.id === 'watchlist' && watchlist.length > 0 ? watchlist.length
              : tab.id === 'goals' && goals.length > 0 ? goals.length : 0
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
      </header>

      {/* Hero */}
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
            {activeTab === 'portfolio' && <PortfolioBuilder />}
            {activeTab === 'compare' && <CompareView />}
            {activeTab === 'savings' && <SavingsCalculator />}
            {activeTab === 'watchlist' && <Watchlist />}
            {activeTab === 'tax' && <TaxCalculator />}
            {activeTab === 'overlap' && <FundOverlap />}
            {activeTab === 'goals' && <GoalPlanner />}
            {activeTab === 'xirr' && <XIRRCalculator />}
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
