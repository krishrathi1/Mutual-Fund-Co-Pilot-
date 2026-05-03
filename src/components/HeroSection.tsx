'use client'

import { useFundStore } from '@/lib/store'
import { TrendingUp, Search, Briefcase, ArrowRight, Shield, Calculator, BarChart3, Target, Activity, PieChart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useRef } from 'react'

function AnimatedCounter({ target, prefix = '₹', suffix = 'L' }: { target: number; prefix?: string; suffix?: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const controls = animate(count, target, {
      duration: 2,
      ease: 'easeOut',
    })
    return controls.stop
  }, [target, count])

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${v.toLocaleString('en-IN')}${suffix}`
      }
    })
    return unsubscribe
  }, [rounded, prefix, suffix])

  return <span ref={ref}>{prefix}0{suffix}</span>
}

const features = [
  { icon: Search, label: 'Explore 71+ Funds', tab: 'explore' as const },
  { icon: Activity, label: 'Market Dashboard', tab: 'market' as const },
  { icon: Shield, label: 'Risk Profiler', tab: 'risk' as const },
  { icon: Calculator, label: 'SIP/STP/SWP Planner', tab: 'sip' as const },
  { icon: BarChart3, label: 'Stress Test', tab: 'stress' as const },
  { icon: Target, label: 'Goal Planning', tab: 'goals' as const },
  { icon: PieChart, label: 'Sector Exposure', tab: 'sector' as const },
  { icon: TrendingUp, label: 'NAV History', tab: 'nav' as const },
]

export default function HeroSection() {
  const setActiveTab = useFundStore(s => s.setActiveTab)

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/50 via-transparent to-transparent dark:from-emerald-950/20" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
          {/* Left content */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800">
                <TrendingUp className="h-4 w-4" />
                20 Powerful Tools for Smart Indian Investors
              </div>
            </motion.div>

            <motion.h1
              className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Stop Paying{' '}
              <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                Hidden Fees
              </span>
              <br />
              on Your Mutual Funds
            </motion.h1>

            <motion.p
              className="max-w-lg text-lg text-muted-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Most Indian investors hold <strong>Regular plans</strong> that silently eat 0.5–1.5% every year through distributor commissions. 
              Switching to <strong>Direct plans</strong> can save you <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹10+ lakhs</span> over a lifetime.
            </motion.p>

            {/* Key stats with animated counter */}
            <motion.div
              className="flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-2xl font-bold text-red-500">0.86%</p>
                <p className="text-xs text-muted-foreground">Avg. extra cost (Regular vs Direct)</p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-2xl font-bold text-emerald-600">
                  <AnimatedCounter target={20} suffix=".9L" />
                </p>
                <p className="text-xs text-muted-foreground">Lifetime savings on ₹10L invested</p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-2xl font-bold text-amber-600">73%</p>
                <p className="text-xs text-muted-foreground">Investors still in Regular plans</p>
              </div>
            </motion.div>

            <motion.div
              className="flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Button size="lg" onClick={() => setActiveTab('explore')} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Search className="h-4 w-4" />
                Explore Funds
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setActiveTab('portfolio')} className="gap-2">
                <Briefcase className="h-4 w-4" />
                Add Your Holdings
              </Button>
              <Button size="lg" variant="outline" onClick={() => setActiveTab('risk')} className="gap-2">
                <Shield className="h-4 w-4" />
                Take Risk Quiz
              </Button>
            </motion.div>
          </div>

          {/* Right - Visual comparison card */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="rounded-2xl border bg-card p-6 shadow-lg">
              <h3 className="mb-4 font-semibold text-lg text-card-foreground">Same Fund. Different Returns.</h3>
              <div className="space-y-4">
                {/* Regular plan */}
                <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-4 dark:border-red-900/60 dark:bg-red-950/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="outline" className="mb-1 border-red-300 text-red-700 dark:border-red-800 dark:text-red-400">Regular Plan</Badge>
                      <p className="text-sm text-muted-foreground">Includes distributor commission</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">₹35.6L</p>
                      <p className="text-xs text-muted-foreground">After 20 years on ₹10L</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-foreground">
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
                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="outline" className="mb-1 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">Direct Plan</Badge>
                      <p className="text-sm text-muted-foreground">No commission, you keep more</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">₹42.0L</p>
                      <p className="text-xs text-muted-foreground">After 20 years on ₹10L</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-foreground">
                    <span className="font-medium">Expense Ratio: 0.80%</span>
                    <span className="text-emerald-600 dark:text-emerald-400">← Saves ₹6.4L over 20 years!</span>
                  </div>
                </div>
              </div>

              {/* Bottom callout */}
              <div className="mt-4 rounded-lg bg-amber-100 p-3 text-center text-sm font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                Same portfolio · Same fund manager · Same risk — only fees differ
              </div>
            </div>
          </motion.div>
        </div>

        {/* Feature Quick Access Strip */}
        <motion.div
          className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          {features.map((feature) => (
            <button
              key={feature.label}
              onClick={() => setActiveTab(feature.tab)}
              className="flex flex-col items-center gap-1.5 rounded-xl border bg-card/50 p-3 text-center transition-all hover:bg-emerald-50 hover:border-emerald-200 hover:shadow-sm dark:hover:bg-emerald-950/20 dark:hover:border-emerald-800"
            >
              <feature.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-medium text-foreground leading-tight">{feature.label}</span>
            </button>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
