'use client'

import { useFundStore } from '@/lib/store'
import HeroSection from '@/components/HeroSection'
import ExploreFunds from '@/components/ExploreFunds'
import PortfolioBuilder from '@/components/PortfolioBuilder'
import CompareView from '@/components/CompareView'
import SavingsCalculator from '@/components/SavingsCalculator'
import Footer from '@/components/Footer'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Briefcase, GitCompareArrows, Calculator, TrendingUp, ChevronRight } from 'lucide-react'
import { useEffect } from 'react'

const tabs = [
  { id: 'explore' as const, label: 'Explore', icon: Search, description: 'Search & browse 56 funds' },
  { id: 'portfolio' as const, label: 'Portfolio', icon: Briefcase, description: 'Your holdings' },
  { id: 'compare' as const, label: 'Compare', icon: GitCompareArrows, description: 'Side-by-side analysis' },
  { id: 'savings' as const, label: 'Savings', icon: Calculator, description: 'Lifetime cost calculator' },
]

export default function Home() {
  const { activeTab, setActiveTab, holdings, selectedFundIds } = useFundStore()

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] text-white">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/20">
                <TrendingUp className="h-4 w-4 text-white" />
                <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#0A0A0A]" />
              </div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">FundVista</h1>
                <span className="hidden text-[10px] font-medium uppercase tracking-widest text-emerald-400/70 sm:block">Direct vs Regular Co-Pilot</span>
              </div>
            </div>

            {/* Tab pills - desktop */}
            <nav className="hidden md:flex items-center gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-white/[0.06]">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                const badge = tab.id === 'portfolio' && holdings.length > 0 ? holdings.length
                  : tab.id === 'compare' && selectedFundIds.length > 0 ? selectedFundIds.length : 0
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 shadow-sm'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabBg"
                        className="absolute inset-0 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20"
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    <tab.icon className="relative h-3.5 w-3.5" />
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

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-white/40 ring-1 ring-white/[0.06]">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                IN Market
              </span>
            </div>
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto px-4 pb-2 scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                  isActive ? 'bg-emerald-500/15 text-emerald-400' : 'text-white/35'
                }`}
              >
                <Icon className="h-3 w-3" />
                {tab.label}
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
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
