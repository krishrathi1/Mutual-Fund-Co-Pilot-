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

function generateFallbackResponse(query: string): string {
  const q = query.toLowerCase()
  if (q.includes('direct') || q.includes('switch')) {
    return '**Direct vs Regular Plans**\n\nSwitching to Direct plans can save you 0.5–1.5% annually in expense ratio. Over 20 years on a ₹5L investment, that compounds to ₹2–5L in savings.\n\n- Direct plans have lower expense ratios since no distributor commission is paid\n- Both plans are managed identically by the same fund manager\n- Switching triggers a redemption + fresh purchase (tax implications apply)'
  }
  if (q.includes('save') || q.includes('saving')) {
    return '**Savings with Direct Plans**\n\nThe savings from switching to Direct plans depend on the expense ratio difference:\n\n- Small-cap funds: typically 1–1.5% difference → significant savings\n- Large-cap funds: typically 0.5–0.8% difference → moderate savings\n- On ₹10L invested over 10 years, even 0.5% savings compounds to ~₹80,000'
  }
  if (q.includes('overlap') || q.includes('duplicate')) {
    return '**Portfolio Overlap**\n\nMany Indian MF portfolios have hidden overlap:\n\n- Multiple large-cap funds often hold the same top 10 stocks\n- Overlap reduces diversification benefits\n- Use the Overlap Analysis tool to check your portfolio\n- Consider consolidating similar funds to reduce redundancy'
  }
  if (q.includes('tax')) {
    return '**Tax-Saving with Mutual Funds**\n\nKey tax rules for Indian mutual funds:\n\n- **ELSS**: ₹1.5L deduction under Section 80C, 3-year lock-in\n- **Equity LTCG**: 10% above ₹1L exemption (held > 1 year)\n- **Equity STCG**: 15% (held < 1 year)\n- **Debt LTCG**: As per slab (held > 3 years, with indexation)\n- Switching Regular→Direct is a taxable event'
  }
  if (q.includes('xirr')) {
    return '**XIRR Explained**\n\nXIRR (Extended Internal Rate of Return) is the most accurate way to measure MF portfolio returns:\n\n- Accounts for irregular cash flows (SIPs, lump sums, redemptions)\n- Gives annualized return percentage\n- Use XIRR to compare your portfolio vs benchmark\n- CAGR only works for single lump-sum investments'
  }
  if (q.includes('diversi') || q.includes('portfolio')) {
    return '**Building a Diversified Portfolio**\n\nA well-diversified Indian MF portfolio should include:\n\n- **Core**: Large-cap or Flexi-cap fund (40–50%)\n- **Growth**: Mid-cap and Small-cap funds (20–30%)\n- **Stability**: Debt or Hybrid funds (20–30%)\n- **Tax Saving**: ELSS (if applicable)\n\nRebalance annually to maintain target allocation.'
  }
  return '**FundVista AI Assistant**\n\nI can help you with:\n\n- Direct vs Regular plan comparisons and savings calculations\n- Portfolio overlap analysis and diversification tips\n- Tax implications of switching plans\n- Understanding XIRR and risk metrics\n- Building a diversified mutual fund portfolio\n\nPlease try asking a specific question about any of these topics!'
}

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* Premium Agent Orb */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-8 right-8 z-50 h-16 w-16 rounded-[2rem] bg-emerald-600 shadow-2xl shadow-emerald-500/40 flex items-center justify-center group overflow-hidden border border-white/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-emerald-400/20 blur-xl" 
            />
            <MessageCircle className="h-7 w-7 text-white relative z-10" />
            <div className="absolute -right-1 -top-1 h-4 w-4 bg-red-500 rounded-full border-2 border-white animate-bounce" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Advanced AI Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40, x: 20 }}
            className="fixed bottom-8 right-8 z-50 w-[420px] max-w-[calc(100vw-4rem)] h-[650px] max-h-[calc(100vh-8rem)] flex flex-col rounded-[2.5rem] glass-card shadow-3xl overflow-hidden border-white/20"
          >
            {/* Header - Cinematic */}
            <div className="relative h-40 bg-gradient-to-br from-emerald-600 to-teal-700 p-6 shrink-0 flex flex-col justify-end">
               <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Sparkles className="h-32 w-32 text-white" />
               </div>
               <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => setIsOpen(false)} 
                className="absolute top-4 right-4 h-10 w-10 rounded-2xl text-white hover:bg-white/20"
               >
                <X className="h-5 w-5" />
               </Button>
               
               <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
                    <Bot className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight leading-none">FundVista AI</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 mt-1 flex items-center gap-1.5">
                       <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                       Intelligence Engine Active
                    </p>
                  </div>
               </div>
            </div>

            {/* Messages - Premium Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-background/40">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <div className="h-20 w-20 rounded-[2rem] bg-emerald-500/5 flex items-center justify-center mb-6">
                    <Sparkles className="h-10 w-10 text-emerald-500/40" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground mb-2">Institutional-Grade MF Advice</h4>
                  <p className="text-xs text-muted-foreground/60 max-w-[240px] leading-relaxed">
                    Ask anything about portfolio construction, Direct vs Regular savings, or tax optimization.
                  </p>

                  <div className="mt-8 w-full space-y-3">
                    {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
                      <motion.button
                        key={q}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => sendMessage(q)}
                        className="w-full text-left flex items-center gap-3 rounded-2xl border border-border/40 bg-card/40 p-4 text-xs font-bold text-foreground/80 hover:bg-emerald-500/5 hover:border-emerald-500/20 hover:text-emerald-600 transition-all group"
                      >
                        <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                           <ChevronRight className="h-3 w-3 text-emerald-600 group-hover:text-white transition-colors" />
                        </div>
                        {q}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="rounded-xl bg-emerald-500 h-10 w-10 shrink-0 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-white/20">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-3xl p-5 text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-tr-md font-medium'
                        : 'bg-card border border-border/40 text-foreground rounded-tl-md'
                    }`}
                  >
                    {msg.content.split('\n').map((line, li) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <p key={li} className="font-black mt-2 first:mt-0 text-[13px] uppercase tracking-wide">{line.replace(/\*\*/g, '')}</p>
                      }
                      if (line.startsWith('- ')) {
                        return <div key={li} className="flex gap-2 mt-1.5 ml-1">
                           <span className="text-emerald-500 mt-1">•</span>
                           <p className="text-foreground/80">{line.slice(2).replace(/\*\*/g, '')}</p>
                        </div>
                      }
                      if (line === '') return <div key={li} className="h-2" />
                      
                      const parts = line.split(/(\*\*[^*]+\*\*)/)
                      return (
                        <p key={li} className="mt-1 first:mt-0 text-foreground/90">
                          {parts.map((part, pi) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={pi} className="font-bold text-foreground">{part.replace(/\*\*/g, '')}</strong>
                            }
                            return <span key={pi}>{part}</span>
                          })}
                        </p>
                      )
                    })}
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <div className="flex gap-4">
                  <div className="rounded-xl bg-emerald-500 h-10 w-10 shrink-0 flex items-center justify-center animate-pulse">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="bg-card border border-border/40 rounded-3xl rounded-tl-md px-6 py-4 flex gap-1.5 items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - Premium Floating Bar */}
            <div className="p-6 bg-background/80 backdrop-blur-md border-t border-border/40 shrink-0">
               <div className="relative flex items-center">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Inquire about MF strategies..."
                    className="h-14 rounded-2xl pl-6 pr-16 bg-muted/20 border-border/40 focus:bg-background focus:ring-emerald-500/20 text-sm font-medium"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="absolute right-2 h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
               </div>
               <p className="text-[9px] text-center text-muted-foreground/50 mt-4 font-bold uppercase tracking-widest">
                  Enhanced by FundVista Intelligence™
               </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
