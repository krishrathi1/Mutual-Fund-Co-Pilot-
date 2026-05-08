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
import FundRankings from '@/components/FundRankings'
import AMCAnalysis from '@/components/AMCAnalysis'
import PortfolioAlerts from '@/components/PortfolioAlerts'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { TABS as tabs } from '@/lib/constants'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'

// Feature Components
import RollingReturns from '@/components/RollingReturns'
import CaptureRatio from '@/components/CaptureRatio'
import CategoryPerformance from '@/components/CategoryPerformance'
import FundSimilarity from '@/components/FundSimilarity'
import MonteCarloSim from '@/components/MonteCarloSim'
import FDvsMF from '@/components/FDvsMF'
import InflationCalculator from '@/components/InflationCalculator'
import CommissionDisclosure from '@/components/CommissionDisclosure'
import ELSSTaxSaver from '@/components/ELSSTaxSaver'
import EmergencyFund from '@/components/EmergencyFund'

export default function Home() {
  const { activeTab, setActiveTab, holdings, selectedFundIds, watchlist, goals } = useFundStore()
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-emerald-500/30 selection:text-emerald-900">
      {/* Sticky Header */}
      <Navbar />

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
            {activeTab === 'rollingreturns' && <RollingReturns />}
            {activeTab === 'captureratio' && <CaptureRatio />}
            {activeTab === 'categoryperf' && <CategoryPerformance />}
            {activeTab === 'similarity' && <FundSimilarity />}
            {/* Analyze */}
            {activeTab === 'portfolio' && <PortfolioBuilder />}
            {activeTab === 'compare' && <CompareView />}
            {activeTab === 'overlap' && <FundOverlap />}
            {activeTab === 'sector' && <SectorExposure />}
            {activeTab === 'diversification' && <DiversificationScore />}
            {activeTab === 'montecarlo' && <MonteCarloSim />}
            {/* Plan */}
            {activeTab === 'savings' && <SavingsCalculator />}
            {activeTab === 'sip' && <SIPPlanner />}
            {activeTab === 'goals' && <GoalPlanner />}
            {activeTab === 'risk' && <RiskProfiler />}
            {activeTab === 'fdvsmf' && <FDvsMF />}
            {activeTab === 'inflation' && <InflationCalculator />}
            {/* Optimize */}
            {activeTab === 'tax' && <TaxCalculator />}
            {activeTab === 'exitload' && <ExitLoadCalc />}
            {activeTab === 'rebalance' && <RebalancingView />}
            {activeTab === 'stress' && <StressTest />}
            {activeTab === 'alerts' && <PortfolioAlerts />}
            {activeTab === 'commission' && <CommissionDisclosure />}
            {activeTab === 'elsstax' && <ELSSTaxSaver />}
            {activeTab === 'emergency' && <EmergencyFund />}
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
