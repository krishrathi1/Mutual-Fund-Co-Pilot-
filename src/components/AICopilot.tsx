'use client'

import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTED_QUESTIONS = [
  'Should I switch to Direct plans?',
  'How much can I save by switching?',
  'Which funds in my portfolio overlap?',
  'Best tax-saving strategy for mutual funds?',
  'What is XIRR and why does it matter?',
  'How to build a diversified portfolio?',
]

export default function AICopilot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => `chat-${Date.now()}`)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          sessionId,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response || data.message || data.content || 'I apologize, but I couldn\'t generate a response. Please try again.',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMsg])
      } else {
        // Fallback response
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: generateFallbackResponse(text.trim()),
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMsg])
      }
    } catch {
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: generateFallbackResponse(text.trim()),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages, sessionId])

  function generateFallbackResponse(question: string): string {
    const q = question.toLowerCase()

    if (q.includes('direct') || q.includes('switch')) {
      return `Great question! Switching from Regular to Direct plans can save you 0.5–1.5% annually in expense ratios. Since both plans hold identical stocks with identical weights, the only difference is the distributor commission in Regular plans.

**Key points:**
- Direct plans have lower expense ratios (no distributor commission)
- Both plans have the same portfolio, risk, and fund manager
- Over 20 years, even a 1% difference can mean ₹10+ lakhs more wealth on ₹10 lakh invested
- You can switch by contacting your fund house directly or using platforms like MFUtility, Coin, or Groww

**Steps to switch:**
1. Redeem from Regular plan
2. Invest in Direct plan of the same fund
3. Note: This may trigger capital gains tax

Would you like to see specific savings estimates for your holdings?`
    }

    if (q.includes('save') || q.includes('saving')) {
      return `The savings from switching to Direct plans can be substantial! Here's how it works:

**Example:** If you invest ₹10 lakh in a fund with:
- Regular plan: 1.75% expense ratio
- Direct plan: 0.75% expense ratio
- Difference: 1% (100 bps)

**Savings over time (at 12% returns):**
- 5 years: ~₹85,000
- 10 years: ~₹2.6 lakh
- 20 years: ~₹10.8 lakh
- 30 years: ~₹35 lakh

The longer you stay invested, the more the compounding works in your favor. Use our Savings Calculator tab to see exact numbers for your portfolio!`
    }

    if (q.includes('overlap')) {
      return `Fund overlap is a common but often overlooked issue in portfolios. When multiple funds hold the same stocks, you're not as diversified as you think.

**Common overlap areas:**
- Large Cap funds often hold the same HDFC, Reliance, Infosys stocks
- Sectoral funds naturally overlap within their sector
- Multiple Flexi Cap funds may converge on similar large-cap heavy portfolios

**What to do:**
- Use our Overlap Analyzer to detect specific overlaps in your portfolio
- If overlap is >60%, consider consolidating into one fund
- Aim for complementary funds across categories (Large Cap + Mid Cap + Debt)

Check the Overlap tab in FundVista for a detailed analysis of your holdings!`
    }

    if (q.includes('tax')) {
      return `Here are the current capital gains tax rules for mutual funds (FY 2024-25):

**Equity Funds (equity >65%):**
- Short-Term CG (<12 months): 20%
- Long-Term CG (>12 months): 12.5% with ₹1.25 lakh exemption per year

**Debt Funds (purchased after April 2023):**
- Both STCG and LTCG taxed at your income slab rate
- No indexation benefit anymore

**Tax-saving tips:**
1. Harvest LTCG annually — book profits up to ₹1.25L tax-free, then reinvest
2. Invest in ELSS for Section 80C deduction (up to ₹1.5L)
3. Stagger redemptions across financial years
4. Offset gains with losses (tax-loss harvesting)

Use our Tax Calculator for a detailed breakdown of your specific tax liability!`
    }

    if (q.includes('xirr')) {
      return `XIRR (Extended Internal Rate of Return) is the most accurate way to measure your portfolio's actual annual returns, especially when you invest at different times via SIPs.

**Why XIRR matters:**
- Simple return % doesn't account for timing of investments
- CAGR only works for single lumpsum investments
- XIRR handles irregular cash flows (SIPs, additional purchases, partial withdrawals)

**Example:** If you invested ₹10,000/month for 3 years and your portfolio is now worth ₹4.5 lakh, your XIRR might be around 15.2% — meaning each rupee earned an annualized 15.2% return, factoring in exactly when it was invested.

**Good XIRR benchmarks:**
- Equity funds: 10-15% over 5+ years
- Debt funds: 6-8%
- Your portfolio XIRR should be compared to a suitable benchmark index

Check the XIRR tab for your portfolio's calculated XIRR!`
    }

    if (q.includes('diversif') || q.includes('portfolio')) {
      return `Building a diversified portfolio is crucial for managing risk while optimizing returns. Here's a framework:

**Core-Satellite Approach:**
- **Core (60-70%):** Broad market funds — Nifty 50 Index, Flexi Cap
- **Satellite (20-30%):** Thematic bets — Mid Cap, Small Cap, Sectoral
- **Stability (10-20%):** Debt/Liquid funds for stability and emergency needs

**Risk-based allocation:**
- **Conservative:** 30% Equity, 50% Debt, 20% Hybrid
- **Moderate:** 55% Equity, 25% Debt, 20% Hybrid
- **Aggressive:** 75% Equity, 10% Debt, 15% Hybrid

**Diversification checklist:**
✓ Across asset classes (equity, debt, gold)
✓ Across market caps (large, mid, small)
✓ Across sectors (IT, banking, pharma, FMCG)
✓ Across fund houses (avoid single AMC concentration)
✓ Direct plans to maximize returns

Use our Goal Planner to create goal-based allocation strategies!`
    }

    return `That's a thoughtful question about mutual fund investing! Here are some general principles:

**Key things to remember:**
1. **Always prefer Direct plans** — same fund, lower cost, higher returns over time
2. **Diversification matters** — don't put all your money in one category or fund house
3. **Time in market beats timing the market** — stay invested for the long term
4. **Review periodically** — check for overlap, underperformance, and changing goals
5. **Tax efficiency** — harvest gains strategically, use ELSS for deductions

For specific analysis of your holdings, explore the different tools in FundVista:
- **Savings Calculator** for Direct vs Regular projections
- **Tax Calculator** for capital gains liability
- **Overlap Analyzer** for diversification check
- **XIRR Calculator** for portfolio returns
- **Goal Planner** for SIP-based goal planning

What specific aspect would you like to dive deeper into?`
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* Floating chat bubble */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-colors"
            aria-label="Open AI Chat"
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] sm:w-[420px] h-[520px] max-h-[calc(100vh-6rem)] flex flex-col rounded-2xl border bg-background shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-emerald-600 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="rounded-full bg-white/20 p-1.5">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">FundVista AI Co-pilot</h3>
                  <p className="text-[10px] text-emerald-100">Ask me about mutual funds</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)} className="h-7 w-7 p-0 text-white hover:bg-white/20">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="rounded-full bg-emerald-100 dark:bg-emerald-950 p-3 mb-3">
                    <Sparkles className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-foreground">How can I help you?</p>
                  <p className="text-xs text-muted-foreground mt-1">Ask about Direct vs Regular, tax, overlap, or any mutual fund question</p>

                  {/* Suggested questions */}
                  <div className="mt-4 w-full space-y-2">
                    {SUGGESTED_QUESTIONS.slice(0, 4).map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="w-full text-left flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <ChevronRight className="h-3 w-3 text-emerald-600 shrink-0" />
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="rounded-full bg-emerald-100 dark:bg-emerald-950 p-1.5 h-7 w-7 shrink-0 flex items-center justify-center">
                      <Bot className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                  >
                    {msg.content.split('\n').map((line, i) => {
                      // Simple markdown-like rendering
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <p key={i} className="font-bold mt-1 first:mt-0">{line.replace(/\*\*/g, '')}</p>
                      }
                      if (line.startsWith('- ')) {
                        return <p key={i} className="ml-2 mt-0.5">• {line.slice(2).replace(/\*\*/g, '')}</p>
                      }
                      if (line.startsWith('✓') || line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.') || line.startsWith('5.')) {
                        return <p key={i} className="mt-0.5">{line.replace(/\*\*/g, '')}</p>
                      }
                      if (line === '') return <br key={i} />
                      // Handle inline bold
                      const parts = line.split(/(\*\*[^*]+\*\*)/)
                      return (
                        <p key={i} className="mt-0.5 first:mt-0">
                          {parts.map((part, pi) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={pi}>{part.replace(/\*\*/g, '')}</strong>
                            }
                            return <span key={pi}>{part}</span>
                          })}
                        </p>
                      )
                    })}
                  </div>
                  {msg.role === 'user' && (
                    <div className="rounded-full bg-emerald-600 p-1.5 h-7 w-7 shrink-0 flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-2.5">
                  <div className="rounded-full bg-emerald-100 dark:bg-emerald-950 p-1.5 h-7 w-7 shrink-0 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* More suggested questions (when conversation started) */}
            {messages.length > 0 && messages.length < 3 && (
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
                {SUGGESTED_QUESTIONS.slice(4).map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="whitespace-nowrap rounded-full border px-3 py-1 text-[10px] text-muted-foreground hover:bg-muted/50 transition-colors shrink-0"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t px-4 py-3 flex gap-2 shrink-0">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about mutual funds..."
                className="text-sm"
                disabled={isLoading}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-9 w-9 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
