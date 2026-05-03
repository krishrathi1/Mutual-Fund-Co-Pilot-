'use client'

import { useFundStore } from '@/lib/store'
import { TrendingUp, Search, Briefcase, GitCompareArrows, Calculator, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function HeroSection() {
  const setActiveTab = useFundStore(s => s.setActiveTab)

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50/50 via-transparent to-transparent dark:from-emerald-950/20" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
          {/* Left content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800">
              <TrendingUp className="h-4 w-4" />
              Trusted by smart Indian investors
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Stop Paying{' '}
              <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                Hidden Fees
              </span>
              <br />
              on Your Mutual Funds
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              Most Indian investors hold <strong>Regular plans</strong> that silently eat 0.5–1.5% every year through distributor commissions. 
              Switching to <strong>Direct plans</strong> can save you <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹10+ lakhs</span> over a lifetime.
            </p>

            {/* Key stats */}
            <div className="flex flex-wrap gap-4">
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-2xl font-bold text-red-500">0.86%</p>
                <p className="text-xs text-muted-foreground">Avg. extra cost (Regular vs Direct)</p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-2xl font-bold text-emerald-600">₹20.9L</p>
                <p className="text-xs text-muted-foreground">Lifetime savings on ₹10L invested</p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-2xl font-bold text-amber-600">73%</p>
                <p className="text-xs text-muted-foreground">Investors still in Regular plans</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setActiveTab('explore')} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Search className="h-4 w-4" />
                Explore Funds
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setActiveTab('portfolio')} className="gap-2">
                <Briefcase className="h-4 w-4" />
                Add Your Holdings
              </Button>
            </div>
          </div>

          {/* Right - Visual comparison card */}
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-6 shadow-lg">
              <h3 className="mb-4 font-semibold text-lg">Same Fund. Different Returns.</h3>
              <div className="space-y-4">
                {/* Regular plan */}
                <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="outline" className="mb-1 border-red-300 text-red-700 dark:border-red-800 dark:text-red-400">Regular Plan</Badge>
                      <p className="text-sm text-muted-foreground">Includes distributor commission</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-600">₹35.6L</p>
                      <p className="text-xs text-muted-foreground">After 20 years on ₹10L</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="font-medium">Expense Ratio: 1.75%</span>
                    <span className="text-red-500">← ₹1.75L/yr goes to fees</span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-sm font-medium">Switch to Direct →</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Direct plan */}
                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="outline" className="mb-1 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">Direct Plan</Badge>
                      <p className="text-sm text-muted-foreground">No commission, you keep more</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-emerald-600">₹42.0L</p>
                      <p className="text-xs text-muted-foreground">After 20 years on ₹10L</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="font-medium">Expense Ratio: 0.80%</span>
                    <span className="text-emerald-600">← Saves ₹6.4L over 20 years!</span>
                  </div>
                </div>
              </div>

              {/* Bottom callout */}
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-center text-sm font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                💡 Same portfolio · Same fund manager · Same risk — only fees differ
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
