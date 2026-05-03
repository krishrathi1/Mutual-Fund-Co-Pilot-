# Task 2-a: API Routes Agent

## Task
Create comprehensive API routes for FundVista project.

## Completed Work

### 1. `/api/watchlist/route.ts` - Watchlist CRUD
- **GET**: Fetch watchlist items by sessionId, includes full fund data
- **POST**: Add fund to watchlist with optional notes/targetPrice; upserts on duplicate
- **DELETE**: Remove from watchlist by sessionId + fundId

### 2. `/api/tax/calculate/route.ts` - Tax Calculator
- **POST**: Calculate STCG/LTCG for holdings
- Budget 2024 rules: Equity STCG 20%, LTCG 12.5% above ₹1.25L exemption
- Debt taxed at slab rate (30% default), no indexation post Apr 2023
- Hybrid: proportional equity/debt split with ≥65% equity = equity-oriented
- Returns per-holding breakdown + totals + effective tax rate + assumptions

### 3. `/api/portfolio/xirr/route.ts` - XIRR Calculator
- **POST**: Calculate XIRR using Newton-Raphson method
- Handles both SIP and lumpsum cash flows
- Builds cash flow series from holdings, sorts by date
- Returns xirr, annualizedReturn, absoluteReturn, cashFlows, avgHoldingDays

### 4. `/api/portfolio/overlap/route.ts` - Fund Overlap Analysis
- **POST**: Pairwise overlap analysis for up to 10 funds
- Scoring based on: same category+subCategory (40pts), same benchmark (25pts), common topHoldings (30pts), sector overlap (10pts), same riskometer (5pts), allocation similarity (5pts)
- Returns overlap score, level, common exposure, recommendation per pair
- Portfolio-level diversification assessment

### 5. `/api/goals/route.ts` - Goals CRUD
- **GET**: Fetch goals by sessionId
- **POST**: Create/update goal with auto-calculated suggestedAllocation and monthlySipNeeded
- Future value formula for SIP calculation, rounds up to nearest ₹500
- **DELETE**: Delete goal by sessionId + goalId with ownership check

### 6. `/api/portfolio/export/route.ts` - Export Portfolio
- **GET**: Export as JSON (full details with holdings, goals, watchlist, analysis) or CSV
- CSV includes proper escaping, content-disposition header for download
- Analysis summary: totalInvested, currentValue, gain, categoryBreakdown

### 7. `/api/ai/chat/route.ts` - AI Co-pilot Chat
- **POST**: Multi-turn chat with z-ai-web-dev-sdk LLM
- In-memory conversation store (Map<sessionId, history>), max 20 messages per conversation
- 24-hour TTL auto-cleanup for stale conversations
- Expert Indian MF advisor system prompt covering Direct vs Regular, tax, SIP, risk, ELSS
- Fallback responses for common topics when LLM fails

### 8. `/api/funds/nav/route.ts` - Updated NAV Route
- **GET**: Now persists NAV updates to DB in background when fetched from AMFI
- **POST**: New handler for bulk NAV refresh - update all funds or specific fundIds
- ISIN-based matching for both direct and regular plan NAVs

### 9. `/prisma/seed-holdings.ts` - Top Holdings Seed
- Seeded topHoldings JSON data for 62 of 71 funds
- Templates per subCategory: Large Cap, Mid Cap, Small Cap, Flexi Cap, ELSS, Index Fund, Liquid, Aggressive Hybrid, Short Duration, Corporate Bond, Conservative Hybrid, Balanced Advantage
- 9 funds skipped (Gilt, Sectoral/Thematic - no templates)

## Lint Status
All new API route files pass ESLint with zero errors.
