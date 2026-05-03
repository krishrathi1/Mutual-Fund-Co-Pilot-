# FundVista Project Worklog

---
Task ID: 1
Agent: Main Agent
Task: Add all standout features to FundVista

Work Log:
- Analyzed existing codebase (all components, API routes, store, schema)
- Identified AI insight key mismatch bug (API returns `insights` but store reads `insight`)
- Updated Prisma schema with WatchlistItem, Goal models and topHoldings field on Fund
- Pushed schema changes with `bun run db:push`
- Fixed AI insight key mismatch in store.ts (data.insights || data.insight || data.explanation)
- Added 'export' to TabType union
- Launched parallel subagents for backend and frontend implementation

Stage Summary:
- Schema updated with 3 new models (WatchlistItem, Goal, topHoldings on Fund)
- AI insight bug fixed
- 9 new API routes created (watchlist, tax, xirr, overlap, goals, export, ai/chat, nav update)
- 7 new frontend components created (Watchlist, TaxCalculator, FundOverlap, GoalPlanner, AICopilot, PortfolioExport, XIRRCalculator)
- All 10 tabs working (Explore, Portfolio, Compare, Savings, Watchlist, Tax, Overlap, Goals, XIRR, Export)
- ESLint passes with zero errors
- Server compiles and serves all pages successfully

---
Task ID: 2-a
Agent: Backend Subagent
Task: Create all new API routes for FundVista

Work Log:
- Created /api/watchlist/route.ts (GET, POST, DELETE) with upsert pattern
- Created /api/tax/calculate/route.ts with Indian FY 2024-25 rules
- Created /api/portfolio/xirr/route.ts with Newton-Raphson solver
- Created /api/portfolio/overlap/route.ts with pairwise scoring
- Created /api/goals/route.ts (GET, POST, DELETE) with FV calculations
- Created /api/portfolio/export/route.ts (JSON/CSV export)
- Created /api/ai/chat/route.ts with multi-turn conversation
- Updated /api/funds/nav/route.ts with POST for bulk refresh
- Seeded 62 funds with topHoldings data

Stage Summary:
- All 9 API routes created and functional
- Tax calculator implements STCG 20%, LTCG 12.5% with ₹1.25L exemption
- XIRR uses Newton-Raphson with SIP support
- AI chat has in-memory conversation store with 24h TTL
- All routes pass ESLint

---
Task ID: 2-b
Agent: Frontend Subagent
Task: Create all new frontend components

## Task Summary
Created 7 new frontend components for the FundVista mutual fund analysis platform, updated the Zustand store with new state management, added API routes, and integrated all components into the main page with tab navigation.

## Files Created

### Components (7 new components)
1. **`/src/components/Watchlist.tsx`** - Fund Watchlist
   - Card-based list of bookmarked funds
   - Each card: fund name, fund house, Direct vs Regular ER, savings callout, NAV
   - Actions: Remove from watchlist, Add to Portfolio, Add to Compare, Edit notes
   - Live NAV badge from /api/funds/nav
   - Empty state with "Browse funds" CTA
   - framer-motion animations for entry/exit
   - Inline note editing with save/cancel

2. **`/src/components/TaxCalculator.tsx`** - Capital Gains Tax Calculator
   - Auto-loads portfolio holdings, supports custom holdings
   - Per-holding inputs: invested amount, current value, purchase date, category
   - Category toggle: Equity/Debt/Hybrid/All
   - Results: per-holding breakdown (STCG/LTCG, tax rate, tax amount, net gain)
   - Summary cards: Total Tax, Net Gain, Effective Tax Rate
   - Stacked bar chart (Recharts): Tax vs Net Gain per holding
   - Tax-saving tips section (harvesting, ELSS, stagger redemptions)
   - Indian FY 2024-25 rules with client-side fallback calculation
   - API: /api/tax/calculate with client-side fallback

3. **`/src/components/FundOverlap.tsx`** - Portfolio Overlap Analyzer
   - Auto-analyzes holdings from portfolio
   - Heatmap matrix showing overlap scores between fund pairs
   - Network graph (SVG visualization) with overlap-strength lines
   - Per-pair details: overlap score, common categories, warnings
   - Recommendation: "Consider consolidating" if overlap > 60%
   - Color-coded overlap levels (emerald/amber/red)
   - Client-side fallback overlap generation based on category/subcategory

4. **`/src/components/GoalPlanner.tsx`** - Goal-based Investing
   - Pre-defined goal types: Retirement, Education, House, Emergency, Wedding, Custom
   - Visual goal type selector with icons and colors
   - Per-goal: name, target amount, years, current savings, risk profile
   - Progress ring visualization (SVG)
   - Asset allocation pie chart (Recharts)
   - Monthly SIP calculation using future value formula
   - Recommended funds from database matching allocation
   - Goal cards with progress bars

5. **`/src/components/AICopilot.tsx`** - AI Chat Co-pilot
   - Floating chat bubble (bottom-right corner, like Intercom)
   - Expandable to full chat panel with header
   - Message bubbles with typing indicator (animated dots)
   - Suggested questions: "Should I switch to Direct?", tax, overlap, etc.
   - Simple markdown rendering (bold, lists, headers)
   - Session-based conversation via /api/ai/chat
   - Fallback responses for common questions when API unavailable
   - Always visible across all tabs

6. **`/src/components/PortfolioExport.tsx`** - Export/Import Portfolio
   - Export as JSON (full portfolio data download)
   - Export as CSV (spreadsheet-compatible)
   - Share via copyable base64-encoded link
   - Import from JSON file upload or paste
   - Preview dialog before import confirmation
   - Import format reference documentation
   - URL parameter handling for shared portfolios

7. **`/src/components/XIRRCalculator.tsx`** - Portfolio XIRR Display
   - Portfolio-level XIRR calculation using Newton-Raphson method
   - Per-holding XIRR breakdown table
   - XIRR vs Benchmark (Nifty 50) comparison bar chart
   - Alpha vs benchmark display
   - Methodology explanation section (XIRR vs CAGR)
   - Client-side XIRR calculation with server fallback

### API Routes (2 new routes)
- **`/src/app/api/watchlist/[id]/route.ts`** - DELETE and PATCH for individual watchlist items
- **`/src/app/api/goals/[id]/route.ts`** - DELETE for individual goals

### Updated Files
- **`/src/lib/store.ts`** - Added:
  - New interfaces: WatchlistItem, GoalData, TaxCalculation, OverlapResult, XIRRResult
  - Extended TabType to include: watchlist, tax, overlap, goals, xirr
  - Watchlist state and actions (fetch, add, remove, update notes, fetch NAVs)
  - Goals state and actions (fetch with API-to-interface mapping, add with mapping, remove)
  - Helper: mapGoalType() for inferring goal type from name
  - Helper: RISK_ALLOCATIONS for goal allocation defaults

- **`/src/app/page.tsx`** - Updated:
  - Added imports for all 7 new components
  - Extended tab navigation to 10 tabs
  - Responsive: desktop nav uses `lg:` breakpoint
  - Mobile tab bar with scrollable overflow
  - Badge counts for portfolio, compare, watchlist, and goals tabs
  - AICopilot rendered outside AnimatePresence (always visible)

## Technical Decisions
- All components use 'use client' directive
- emerald/teal for positive, red for negative, amber for warnings
- framer-motion for entry animations
- sonner toast for notifications
- Recharts for charts (pie, bar, stacked bar)
- Client-side fallback calculations for all API-dependent features
- Proper TypeScript typing throughout
- Responsive mobile-first design with Tailwind breakpoints

## Lint Status
All files pass ESLint with zero errors.

---
Task ID: 3
Agent: Risk Profiler Agent
Task: Create Risk Profiler component for FundVista

Work Log:
- Read worklog.md to understand prior agent work (10 tabs, 7 components, 9 API routes)
- Reviewed existing codebase: store.ts, helpers.ts, page.tsx, GoalPlanner.tsx for style reference
- Created `/src/components/RiskProfiler.tsx` — full interactive risk profiler component
- Created `/src/app/api/risk/profile/route.ts` — server-side risk profile API
- Updated `/src/lib/store.ts` — added 'risk' to TabType union
- Updated `/src/app/page.tsx` — added Risk tab with Shield icon, integrated RiskProfiler component
- Fixed unused eslint-disable directive in RiskProfiler.tsx
- Ran lint: 0 errors, 3 pre-existing warnings (not from new code)

## Files Created

### `/src/components/RiskProfiler.tsx` — Risk Profiler Component
- Multi-step wizard with 7 questions, each with 5 clickable card options (scored 1-5)
- Q1: Investment time horizon (Less than 1 year → More than 10 years)
- Q2: Reaction to 20% portfolio drop (Sell everything → Buy more)
- Q3: Income stability (Very unstable → Multiple stable sources)
- Q4: Investment experience (Complete beginner → Expert)
- Q5: Financial goal flexibility (Must achieve exactly → Very flexible)
- Q6: Emergency fund coverage (No fund → 12+ months)
- Q7: Age group (60+ → 18-25)
- Progress bar with step dots (clickable navigation)
- Smooth framer-motion slide-in/slide-out animations between questions
- Selected option highlighted with emerald border + check icon
- Auto-advance hint with keyboard shortcut

**Results Page:**
- Animated ScoreGauge (SVG ring chart with framer-motion animation)
- Risk Profile badge (Conservative/Moderate/Aggressive) with color coding
  - Conservative: teal color scheme, Shield icon
  - Moderate: emerald color scheme, ShieldCheck icon
  - Aggressive: orange color scheme, ShieldAlert icon
- Suggested allocation pie chart (Recharts PieChart with donut style)
- Recommended fund categories list with animated entries
- Personalized tips (5 tips per profile, amber-themed cards)
- Top matching funds from database (auto-filtered by allocation)
- "Retake Quiz" button to restart

**Client-side fallback:**
- Total score < 14: Conservative (30% equity, 50% debt, 20% hybrid)
- Total score 14-21: Moderate (55% equity, 25% debt, 20% hybrid)
- Total score 22-28: Aggressive (75% equity, 10% debt, 15% hybrid)

### `/src/app/api/risk/profile/route.ts` — Risk Profile API
- POST endpoint accepting `{ answers: number[] }`
- Server-side scoring with same thresholds as client-side fallback
- Returns profile, score, maxScore, allocation, tips, fundCategories
- Proper error handling with 400 status codes

### Updated Files
- **`/src/lib/store.ts`** — Added 'risk' to TabType union
- **`/src/app/page.tsx`** — Added Risk tab (Shield icon), RiskProfiler import and rendering

## Technical Decisions
- emerald/teal color palette matching app theme (Conservative=teal, Moderate=emerald, Aggressive=orange)
- framer-motion for question transitions (directional slide) and result animations
- Recharts PieChart for allocation visualization (same as GoalPlanner)
- Client-side fallback when API fails — identical scoring logic
- Clickable step dots for non-linear question navigation
- lucide-react icons throughout (Shield, Clock, TrendingDown, etc.)
- Uses useFundStore for funds data (recommends matching funds on results page)

## Lint Status
0 errors. 3 pre-existing warnings from other files (FundHeatmap, StressTest).

---
Task ID: 4
Agent: Stress Test & Heatmap Agent
Task: Create StressTest and FundHeatmap components for FundVista

Work Log:
- Read worklog.md to understand prior agent work (11 tabs including Risk, RiskProfiler component)
- Reviewed existing codebase: store.ts, helpers.ts, page.tsx, TaxCalculator.tsx for style reference
- Created `/src/components/StressTest.tsx` — portfolio stress testing tool
- Created `/src/components/FundHeatmap.tsx` — performance heatmap across categories and timeframes
- Created `/src/app/api/portfolio/stress-test/route.ts` — server-side stress test API
- Created `/src/app/api/funds/heatmap/route.ts` — server-side heatmap data API
- Updated `/src/lib/store.ts` — added 'stress' and 'heatmap' to TabType union
- Updated `/src/app/page.tsx` — added Stress and Heatmap tabs with icons, integrated both components
- Fixed ESLint `react-hooks/set-state-in-effect` error by removing API calls from useEffect, using client-side computation with useMemo
- Auto-fixed unused eslint-disable directives
- Ran lint: 0 errors, 0 warnings

## Files Created

### `/src/components/StressTest.tsx` — Portfolio Stress Test Component
- 5 predefined stress scenarios with visual cards:
  - 2008 Financial Crisis (Equity: -50%, Debt: +5%, Hybrid: -25%)
  - COVID-19 Crash (Equity: -35%, Debt: +2%, Hybrid: -18%)
  - Mild Correction (Equity: -15%, Debt: +1%, Hybrid: -8%)
  - Rate Hike Shock (Equity: -10%, Debt: -8%, Hybrid: -6%)
  - Bull Run (Equity: +30%, Debt: +6%, Hybrid: +18%)
- Each card has: icon (ShieldAlert, TrendingDown, AlertTriangle, Zap, TrendingUp), gradient background, category impact percentages, portfolio impact amount
- Click a scenario to see detailed impact: per-holding breakdown table, current vs stressed bar chart (Recharts BarChart with Cell coloring)
- Multi-scenario comparison: add scenarios to compare, comparison bar chart with summary cards
- Color coding: red for losses, green for gains
- Empty state with CTA to go to Portfolio tab
- API Integration: POST to `/api/portfolio/stress-test` (client-side fallback via useMemo)
- framer-motion animations for card entry and detail panel expand/collapse

### `/src/components/FundHeatmap.tsx` — Performance Heatmap Component
- Heatmap grid: Rows = sub-categories (Large Cap, Mid Cap, Small Cap, Flexi Cap, ELSS, etc.), Columns = timeframes (1Y, 3Y, 5Y)
- Color-coded cells: deep red → yellow → deep green gradient based on return values
- Each cell shows average return value with hover tooltip (avg return, min/max range, fund count)
- Additional columns: Expense Diff (savings potential in bps), Fund Count badge
- Category filter dropdown (All, Equity, Debt, Hybrid)
- Color legend bar showing scale from min% to max%
- Savings potential note explaining expense diff column
- API Integration: GET `/api/funds/heatmap?category=Equity` (client-side fallback from store data)
- Ordered sub-category display with category color dots

### `/src/app/api/portfolio/stress-test/route.ts` — Stress Test API
- POST endpoint accepting `{ sessionId }`
- Fetches holdings from database with fund data
- Computes stress results for all 5 scenarios server-side
- Returns per-scenario total impact, impact %, and per-holding breakdown

### `/src/app/api/funds/heatmap/route.ts` — Heatmap API
- GET endpoint with optional `?category=Equity` filter
- Groups funds by subCategory, computes avg/min/max returns for 1Y/3Y/5Y
- Computes avg expense diff (Regular - Direct) per sub-category
- Returns ordered rows with cell data for each timeframe

### Updated Files
- **`/src/lib/store.ts`** — Added 'stress' and 'heatmap' to TabType union (along with 'risk' from Task 3)
- **`/src/app/page.tsx`** — Added Stress tab (ShieldAlert icon), Heatmap tab (Grid3X3 icon), imports for StressTest and FundHeatmap components

## Technical Decisions
- Client-side computation via useMemo for both components (avoids ESLint react-hooks/set-state-in-effect)
- API routes exist for server-side computation but components don't auto-call them from effects
- HSL-based color interpolation for heatmap (hue 0→50→140 for red→yellow→green)
- Category mapping: Equity/ELSS/Index all map to 'equity' impact bucket
- Consistent styling with existing components (Card, Badge, Select, Button from shadcn/ui)
- Responsive design with grid breakpoints (sm:grid-cols-2, lg:grid-cols-3, etc.)
- Recharts BarChart for stress test comparison, table-based grid for heatmap

## Lint Status
0 errors, 0 warnings.

---
Task ID: 2
Agent: Backend API Agent
Task: Create all new API endpoints for FundVista

Work Log:
- Read worklog.md to understand prior agent work (schema, existing routes, components)
- Read prisma schema to understand Fund, Holding, WatchlistItem, Goal models
- Created 8 directories for new API routes
- Created /api/funds/heatmap/route.ts (GET) - groups funds by subCategory, computes avg returns and expense diff
- Created /api/portfolio/stress-test/route.ts (POST) - 5 stress scenarios with category-based impact calculation
- Created /api/portfolio/sector-exposure/route.ts (POST) - aggregates sector weights from topHoldings JSON with mock fallback
- Created /api/portfolio/rebalancing/route.ts (POST) - current vs target allocation drift with 5% tolerance band
- Created /api/portfolio/diversification/route.ts (POST) - 4-metric scoring (category 30pts, fund house 20pts, sector 25pts, market cap 25pts)
- Created /api/sip/planner/route.ts (POST) - SIP with step-up, STP, and SWP modes with yearly breakdowns
- Created /api/risk/profile/route.ts (POST) - 7-question scoring maps to Conservative/Moderate/Aggressive profiles
- Created /api/funds/nav-history/route.ts (GET) - deterministic seeded NAV history using category-based volatility
- Updated /api/funds/route.ts with 'directSharpe1y' and 'diversificationScore' sortBy options
- Fixed 2 ESLint warnings in FundHeatmap.tsx and StressTest.tsx (unused eslint-disable directives)
- Final lint passes with zero errors and zero warnings

Stage Summary:
- 8 new API routes created: funds/heatmap, portfolio/stress-test, portfolio/sector-exposure, portfolio/rebalancing, portfolio/diversification, sip/planner, risk/profile, funds/nav-history
- Updated funds/route.ts with 2 new sortBy options (directSharpe1y, diversificationScore)
- All routes use db from @/lib/db and NextResponse from next/server
- All routes have proper error handling with try/catch and appropriate HTTP status codes
- ESLint passes cleanly with 0 errors, 0 warnings

---
Task ID: 7
Agent: Dashboard & Rebalancing Agent
Task: Create MarketDashboard and RebalancingView components for FundVista

Work Log:
- Read worklog.md to understand prior agent work (13 tabs, 9+ components, API routes, store)
- Reviewed existing codebase: store.ts, helpers.ts, page.tsx, StressTest.tsx for style reference
- Reviewed existing /api/portfolio/rebalancing/route.ts API for integration
- Created `/src/components/MarketDashboard.tsx` — market dashboard component
- Created `/src/components/RebalancingView.tsx` — portfolio rebalancing analysis component
- Fixed ESLint error: missing BarChart3 import in RebalancingView.tsx
- Ran lint: 0 errors, 0 warnings

## Files Created

### `/src/components/MarketDashboard.tsx` — Market Dashboard Component
- **Market Indices Section**: 4 simulated indices (Nifty 50, Sensex, Nifty Midcap 100, 10Y Govt Bond Yield)
  - Each shows value, daily change %, and sparkline (last 30 days via Recharts tiny LineChart)
  - Green/red color coding for positive/negative changes
  - ArrowUpRight/ArrowDownRight icons for direction
- **Quick Stats**: 4 stat cards with animated counters
  - Funds Tracked (animated counter)
  - Total AUM
  - Avg Direct Savings
  - Avg Expense Diff (animated counter in bps)
  - Gradient backgrounds per stat
- **Category Performance Summary**: 7 category cards (Large Cap, Mid Cap, Small Cap, Flexi Cap, ELSS, Debt, Hybrid)
  - Each card: avg 1Y return, avg 3Y return, fund count, AUM
  - Color-coded by performance percentile (emerald = top, amber = mid, red = bottom)
  - Unique gradient background and icon per category
- **Top Movers Section**: Side-by-side cards for best/worst performers
  - Best 5 funds by 1Y return (emerald theme)
  - Worst 5 funds by 1Y return (red theme)
  - Each with fund name, return % badge, expense ratio diff
- **Visual design**: Dashboard grid layout, animated counters (ease-out cubic), sparklines, framer-motion staggered entry

### `/src/components/RebalancingView.tsx` — Portfolio Rebalancing Component
- **Current vs Target Allocation**: Two donut charts side by side
  - Current allocation computed from holdings data
  - Target allocation based on selected risk profile
  - Animated Recharts PieChart with donut style
  - Color legend below each chart
- **Risk Profile Selector**: Select dropdown (Conservative/Moderate/Aggressive)
  - Conservative: 30/50/20 equity/debt/hybrid
  - Moderate: 55/25/20
  - Aggressive: 75/10/15
  - Profile-specific icon, color, and gradient card
- **Drift Analysis Table**: Per-category drift visualization
  - DriftBar component showing current vs target bars with animated fill
  - Green (≤5% drift), amber (5-15% drift), red (>15% drift) color coding
  - Action badges: Hold, Increase by ₹X, Decrease by ₹X
  - Amount and category color dots
- **Rebalancing Suggestions**: Up to 5 priority-ordered suggestions
  - "Move ₹X from [Fund A] to [Fund B]" format
  - Priority based on drift reduction magnitude
  - Estimated diversification score improvement
- **Rebalancing Impact**: Before/After comparison
  - Weighted Return (1Y), Risk Score, Diversification Score
  - Current vs Target allocation bar chart (Recharts)
  - Projected risk-adjusted return improvement narrative
- **API Integration**: POST `/api/portfolio/rebalancing` with { sessionId, targetAllocation? }
  - Client-side fallback: all computation from holdings data via useMemo
  - Refresh button for API call
- **Empty state**: CTA to go to Portfolio tab when no holdings

## Technical Decisions
- Both components are 'use client' as required
- Client-side computation via useMemo for RebalancingView (avoids ESLint react-hooks/set-state-in-effect)
- Animated counter hook using requestAnimationFrame with ease-out cubic easing
- SparklineMini component using Recharts LineChart for market indices
- DriftBar component with animated bars via framer-motion
- Consistent color palette: emerald for positive, red for negative, amber for warning
- Category mapping function normalizes sub-categories to 7 standard categories
- Diversification score computed from total absolute drift
- Projected returns computed from category-average returns weighted by target allocation
- Responsive grid layouts with sm:/lg: breakpoints
- shadcn/ui components (Card, Badge, Button, Select, Separator)

## Lint Status
0 errors, 0 warnings.

---
Task ID: 5
Agent: NAV History, Sector Exposure & Diversification Agent
Task: Create NAVHistory, SectorExposure, and DiversificationScore components for FundVista

Work Log:
- Read worklog.md to understand prior agent work (15+ tabs, 12+ components, API routes, store)
- Reviewed existing codebase: store.ts, helpers.ts, page.tsx, TaxCalculator.tsx for style reference
- Reviewed existing API routes: /api/funds/nav-history, /api/portfolio/sector-exposure, /api/portfolio/diversification
- Created `/src/components/NAVHistory.tsx` — historical NAV chart component
- Created `/src/components/SectorExposure.tsx` — sector allocation analysis component
- Created `/src/components/DiversificationScore.tsx` — diversification analysis view component
- Did NOT update store.ts or page.tsx (as instructed)
- Ran lint: 0 errors, 0 warnings

## Files Created

### `/src/components/NAVHistory.tsx` — NAV History Component
- **Fund selector** dropdown (Select from shadcn/ui) — picks any fund from store, auto-selects first
- **Time range selector** — 1Y, 3Y, 5Y, Max buttons with emerald active state
- **Dual-line area chart** (Recharts AreaChart): Direct NAV (emerald) and Regular NAV (orange) overlaid with gradient fills
- **Custom tooltip** showing date, direct NAV, regular NAV, and gap between them
- **Key metrics row**: Start NAV, Current NAV, Absolute Change, CAGR — 4 summary cards
- **Divergence callout**: "Over X years, Direct plan has generated ₹Y more per unit than Regular plan" with estimated total savings on ₹10L investment
- **API Integration**: GET `/api/funds/nav-history?fundId=xxx&months=36`
  - Client-side fallback: deterministic seeded PRNG (mulberry32) generates mock NAV history from fund's current NAV and category volatility
- **Gradient fills** under each line (linearGradient with opacity fade)
- **Legend** below chart showing Direct vs Regular colors
- **Empty state** when no funds selected or no funds available
- **AnimatePresence** transitions on fund/time range change
- Category-based volatility parameters matching server-side route

### `/src/components/SectorExposure.tsx` — Sector Exposure Component
- **Donut chart** (Recharts PieChart with innerRadius/outerRadius) showing sector allocation with emerald color palette (12-shade palette)
- **Center text** showing total portfolio value inside donut
- **Sector list** with progress bars showing weight %, fund count badges, expandable top funds per sector
- **Diversification Score gauge** — SVG semicircular gauge (0-100) with animated path via framer-motion
- **Grade badge**: A+, A, B, C, D, F with color coding (emerald/amber/orange/red)
- **Top funds per sector** — expandable list with AnimatePresence animation
- **Equity/Debt exposure** summary cards below gauge
- **API Integration**: POST `/api/portfolio/sector-exposure` with { sessionId }
  - Client-side fallback: aggregates from fund categories/topHoldings if no API response
- **Empty state** if no holdings with Briefcase icon and CTA text
- **Loading state** with spinner

### `/src/components/DiversificationScore.tsx` — Diversification Score Component
- **Large animated score gauge** (SVG semicircle, 240px) at the top with tick marks at 0, 25, 50, 75, 100
- **Animated score reveal** — framer-motion path animation + AnimatedCounter using requestAnimationFrame with ease-out cubic easing (count up from 0)
- **Grade badge** with color (A+ emerald, A green, B amber, C orange, D/F red)
- **Quick summary** text contextual to score range
- **Four metric breakdown cards** in 2x2 grid:
  - Category Diversity (30 pts max): How many asset categories — PieChart icon, green color
  - Fund House Diversity (20 pts max): Not concentrated in one AMC — Building2 icon, teal color
  - Sector Diversity (25 pts max): Spread across sectors — BarChart3 icon, amber color
  - Market Cap Diversity (25 pts max): Large/mid/small cap mix — BarChart3 icon, purple color
  - Each card shows: icon, metric name, animated score/maxScore, progress bar with animated fill, description
- **Suggestions section**: Up to 6 actionable tips to improve diversification, numbered with amber styling
- **API Integration**: POST `/api/portfolio/diversification` with { sessionId }
  - Client-side fallback: full HHI-based computation from holdings data
- **Empty state** if no holdings
- **Error state** with AlertTriangle icon

## Technical Decisions
- All three components use 'use client' directive
- Client-side fallback computation for all three components (avoids ESLint react-hooks/set-state-in-effect)
- API calls in useCallback + useEffect pattern (not directly in useEffect)
- Deterministic seeded PRNG (mulberry32) for NAV history fallback — matches server-side route
- SVG semicircular gauge with framer-motion pathLength animation for score reveal
- AnimatedCounter using requestAnimationFrame with ease-out cubic easing
- Consistent emerald/teal color palette matching app theme
- shadcn/ui components: Card, Badge, Button, Select, Progress, Separator
- Recharts: AreaChart for NAV history, PieChart for sector donut
- lucide-react icons throughout
- Responsive design with sm:/lg: breakpoints
- Did NOT update store.ts or page.tsx as instructed

## Lint Status
0 errors, 0 warnings.

---
Task ID: 6
Agent: Exit Load, Switch Guide & SIP Planner Agent
Task: Create ExitLoadCalc, SwitchGuide, and SIPPlanner components for FundVista

Work Log:
- Read worklog.md to understand prior agent work (13+ tabs, 12+ components, API routes, store)
- Reviewed existing codebase: store.ts, helpers.ts, page.tsx, TaxCalculator.tsx, SavingsCalculator.tsx for style reference
- Reviewed existing /api/sip/planner/route.ts API for SIP/STP/SWP integration
- Created `/src/components/ExitLoadCalc.tsx` — exit load and switching cost calculator
- Created `/src/components/SwitchGuide.tsx` — step-by-step Regular→Direct switch guide dialog
- Created `/src/components/SIPPlanner.tsx` — advanced SIP/STP/SWP planner tool
- Did NOT update store.ts or page.tsx (as instructed)
- Cleaned up unused imports across all three files (Separator, formatPercent, Clock, Legend, ExternalLink, ArrowRight, Loader2, BarChart, Bar, toast, fetchHoldings)
- Ran lint: 0 errors, 0 warnings

## Files Created

### `/src/components/ExitLoadCalc.tsx` — Exit Load & Switching Cost Calculator
- **Auto-populates Regular plan holdings** from portfolio with checkbox selection
- **Per-holding exit load input**: Parses fund's exitLoad field using regex patterns
  - "1% for < 1 year" → 1% if holding < 365 days
  - "Nil" → 0%
  - "0.5% for < 6 months" → 0.5% if holding < 180 days
  - Also handles "if redeemed within" and "before" patterns
- **Adjustable holding period**: Each fund with exit load shows editable holding days input
- **Results show**:
  - Per-holding exit load cost, capital gains tax, total switching cost
  - Summary cards: Total Exit Load Cost, Total Capital Gains Tax, Annual Saving (Direct), Break-Even Period
  - Stacked bar chart (Recharts BarChart): Switching Cost vs 1yr/3yr/5yr/10yr Savings
  - Per-holding breakdown table with break-even months
  - Decision indicator: Green (<12mo), Yellow (12-24mo), Red (>24mo)
- **Summary card**: "Total switching cost: ₹X. You'll break even in Y months. After that, you save ₹Z/year."
- **Tax logic** (client-side):
  - Equity: STCG 20% (<12 months), LTCG 12.5% (>12 months, ₹1.25L exemption shared across holdings)
  - Debt: Taxed at slab rate (30% simplified)
  - Hybrid: Same as equity
- **Visual**: framer-motion for result entry animation, emerald/amber/red color coding
- **Empty state**: CTA to add Regular plan holdings in Portfolio tab

### `/src/components/SwitchGuide.tsx` — Step-by-Step Switch Guide
- **Trigger**: Button that says "Switch to Direct - Step by Step Guide"
- **Dialog component** using shadcn/ui Dialog (max-w-2xl, max-h-[90vh] scrollable)
- **Multi-step walkthrough** (5 steps):
  - Step 1: "Understand the Switch" — Side-by-side Direct vs Regular comparison cards, key insight callout, important note about exit loads
  - Step 2: "Calculate Your Savings" — Auto-computes from Regular holdings: count, total value, annual saving, 5-year compounded saving. Per-fund breakdown with ER diff and annual saving
  - Step 3: "Check Exit Load & Tax" — Explains exit load and capital gains tax concepts. Per-holding quick cost estimate with exit load status, gain, tax type, estimated tax
  - Step 4: "Choose Your Platform" — 5 platforms (MFUtility, Coin/Zerodha, Groww, Kuvera, Paytm Money) with emoji icons, pros/cons grid, best-for description, AMC website note
  - Step 5: "Execute the Switch" — 8-item checklist with checkboxes, important reminders list, final "I've Switched!" CTA
- **Progress indicator**: Progress bar + 5 step dots (clickable navigation) with check marks for completed steps
- **Animated transitions**: framer-motion directional slide between steps (custom variants with direction param)
- **Final CTA**: "I've Switched!" button appears after all checklist items completed, shows toast confirmation
- **Auto-calculates savings** from holdings data using useMemo

### `/src/components/SIPPlanner.tsx` — Advanced SIP/STP/SWP Planner
- **Three modes** with tab switch: SIP Planner | STP Planner | SWP Planner
- **SIP Mode**:
  - Monthly SIP amount, investment period, expected return %, step-up SIP annual increase % (default 10%)
  - Results: Total Invested, Final Value, Wealth Gained, Step-Up Impact (extra invested & extra gained)
  - Stacked area chart (Recharts AreaChart): Invested vs Returns over years
  - Line comparison chart: With Step-Up vs Without Step-Up
  - Year-by-year breakdown table
  - Step-up impact comparison narrative
- **STP Mode** (Systematic Transfer Plan):
  - Lump sum in source fund, transfer amount, frequency (weekly/monthly/quarterly), period, source return %, target return %
  - Results: Total Transferred, Target Fund Value, Source Remaining, Total Portfolio Value
  - Dual area chart: Source Fund declining, Target Fund growing
  - Year-by-year breakdown table
- **SWP Mode** (Systematic Withdrawal Plan):
  - Corpus amount, monthly withdrawal, expected return %, max period
  - Results: Initial Corpus, Total Withdrawn, Corpus Lasts (years), Corpus Remaining
  - Corpus duration indicator with color-coded status (green >25yr, amber >15yr, red <15yr)
  - Dual area chart: Corpus Remaining declining, Total Withdrawn growing
  - Year-by-year breakdown table
- **API Integration**: POST `/api/sip/planner` with mode and parameters, client-side fallback for all three modes
- **Visual design**: Emerald/teal palette, large bold metric numbers, area/line charts, responsive grid layouts
- **Client-side calculation functions**: calculateSIP (with step-up comparison), calculateSTP (source→target growth), calculateSWP (corpus depletion with extended duration calculation)

## Technical Decisions
- All three components use 'use client' directive
- Exit load parsing uses multiple regex patterns for common Indian MF exit load formats
- Tax calculation shares ₹1.25L LTCG exemption across holdings (tracks `equityLtcgExemptionUsed`)
- SwitchGuide uses Dialog from shadcn/ui for modal behavior
- SIPPlanner always uses client-side computation (API call attempted first, but client-side provides richer data like step-up comparison)
- SWP extended duration calculation runs up to 600 months (50 years) to find actual corpus depletion point
- No updates to store.ts or page.tsx as instructed
- Consistent styling: emerald for positive, amber for caution, red for cost/loss, teal for invested amounts

## Lint Status
0 errors, 0 warnings.

---
Task ID: 2-a
Agent: API Routes Agent (Current Session)
Task: Create 8 new API routes for FundVista

Work Log:
- Read worklog.md to understand prior agent work (schema, existing routes, patterns)
- Read prisma schema to understand Fund, Holding, WatchlistItem, Goal models and field types
- Read existing API routes (funds/route.ts, funds/compare/route.ts, portfolio/analyze/route.ts, portfolio/overlap/route.ts, sip/planner/route.ts, funds/heatmap/route.ts) for code patterns
- Created 8 directories for new API routes under src/app/api/
- Created all 8 route files following existing project patterns (import db from '@/lib/db', NextRequest/NextResponse, try/catch error handling)
- Ran ESLint: 0 errors, 0 warnings

## Files Created

### 1. `/src/app/api/funds/rankings/route.ts` — GET endpoint
- Query params: category, subCategory, sortBy (return1y|return3y|return5y|sharpe|expenseRatio|aum), limit (default 10, max 100)
- Builds Prisma where clause from category/subCategory filters
- Maps sortBy to appropriate Prisma orderBy field (desc for returns/sharpe/aum, asc for expenseRatio)
- Returns: { rankings: [{ rank, fundId, schemeName, fundHouse, directReturn, regularReturn, directSharpe, regularSharpe, directER, regularER, aum }] }

### 2. `/src/app/api/funds/amc/route.ts` — GET endpoint
- Query params: fundHouse (optional filter)
- Groups all funds by fundHouse using Map
- Computes per-AMC: fundCount, totalAum, avgDirectER, avgRegularER, avgDirectReturn1y, avgRegularReturn1y, categories breakdown
- Handles null return values by filtering before averaging
- Sorts AMCs by totalAum descending
- Returns: { amcs: [{ fundHouse, fundCount, totalAum, avgDirectER, avgRegularER, avgDirectReturn1y, avgRegularReturn1y, categories }] }

### 3. `/src/app/api/funds/volatility/route.ts` — POST endpoint
- Body: { fundId }
- Validates fundId, fetches fund from DB
- Calculates annualized volatility from Sharpe ratio: vol ≈ (return - riskFreeRate) / sharpe
  - Falls back to tracking-error-based estimate for index funds
  - Final fallback: category-based default (Equity: 20%, Debt: 6%, Hybrid: 12%)
- Estimates max drawdown by category (Equity: 25-35%, Debt: 5-10%, Hybrid: 15-20%) adjusted by Sharpe ratio
- Downside deviation = 0.7 * total volatility
- Sortino ratio = (return - 6%) / downsideDeviation
- Calmar ratio = return / (maxDrawdown * 100)
- Returns: { fundId, schemeName, category, annualizedVolatility, maxDrawdown, sortinoRatio, calmarRatio, downsideDeviation, sharpeRatio }

### 4. `/src/app/api/funds/rolling-returns/route.ts` — POST endpoint
- Body: { fundId, periods: number[] (default [1,3,5]) }
- Validates periods (only 1, 3, 5 allowed)
- Generates 12 monthly data points per period using deterministic seeded PRNG
- Uses category-based variance (Equity: 8%, Debt: 2%) for realistic oscillation
- Returns: { fundId, schemeName, rollingReturns: [{ period, data: [{ month, directReturn, regularReturn, benchmarkReturn }] }] }

### 5. `/src/app/api/portfolio/alerts/route.ts` — POST endpoint
- Body: { sessionId }
- Fetches holdings with fund data, generates 5 alert types:
  - HIGH_EXPENSE: Regular plan funds (severity based on bps diff and annual saving)
  - CONCENTRATION_RISK: Single fund >30% or single fund house >50%
  - OVERLAP_WARNING: 2+ funds in same sub-category with common holdings
  - POOR_PERFORMANCE: Fund underperforming benchmark by >2%
  - REBALANCE_NEEDED: Equity >80% or Debt >70%
- Each alert has: type, severity, title, description, fundId?, action
- Sorts by severity (high → medium → low)
- Returns: { alerts: [...] }

### 6. `/src/app/api/swp/calculator/route.ts` — POST endpoint
- Body: { corpus, monthlyWithdrawal, expectedReturn, years }
- Validates all inputs as positive numbers
- Monthly simulation: return first, then withdrawal
- Tracks: totalWithdrawn, remainingCorpus, returnsEarned, depletionYear
- Returns yearly breakdown: openingBalance, totalWithdrawn, returnsEarned, closingBalance
- Handles corpus depletion mid-year (sets depletionYear)
- Returns: { totalWithdrawn, remainingCorpus, returnsEarned, yearlyBreakdown, depletionYear }

### 7. `/src/app/api/stp/calculator/route.ts` — POST endpoint
- Body: { sourceFundId, targetFundId, lumpsumAmount, monthlyTransfer, years }
- Fetches both funds from DB to get category-based expected returns
- Source fund earns returns then transfers monthly amount to target fund
- Target fund earns returns on accumulated balance including transfers
- Handles edge case where source fund value < monthly transfer
- Returns: { totalInvested, sourceFundFinalValue, targetFundFinalValue, totalReturns, totalTransferred, yearlyBreakdown, sourceFund, targetFund }

### 8. `/src/app/api/funds/screener/route.ts` — POST endpoint
- Body: { categories[], subCategories[], minAum, maxAum, minReturn1y, maxExpenseRatio, riskometer[], sortBy, order, limit }
- Builds Prisma where clause from all filter parameters
- Supports: category IN, subCategory IN, AUM range, min return, max expense ratio, riskometer IN
- Sort by: return1y, return3y, return5y, sharpe, expenseRatio (inverts direction since lower is better), aum
- Returns: { funds, total, appliedFilters }

## Technical Decisions
- All routes follow existing project patterns: import { db } from '@/lib/db', NextRequest/NextResponse, try/catch with console.error and 500 status
- POST routes use `await request.json()` for body parsing with validation
- GET routes use `new URL(request.url).searchParams` for query params
- Sharpe-based volatility estimation uses 6% risk-free rate (Indian context)
- Rolling returns use deterministic seeded PRNG for consistent results across requests
- SWP calculator applies returns before withdrawal (standard convention)
- STP calculator fetches actual fund categories for realistic return estimates
- Screener uses Prisma FloatFilter for range queries on AUM
- All monetary values rounded to 2 decimal places using Math.round(x * 100) / 100

## Lint Status
0 errors, 0 warnings.
