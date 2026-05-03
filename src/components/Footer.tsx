'use client'

import { Heart, ExternalLink } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Built with</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500" />
            <span>for Indian retail investors</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Data sourced from AMFI, NSE & fund house factsheets</span>
            <span>·</span>
            <span>Not SEBI-registered advice</span>
          </div>
        </div>
        <div className="mt-3 text-center text-xs text-muted-foreground/60">
          FundVista is an educational tool. Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing.
        </div>
      </div>
    </footer>
  )
}
