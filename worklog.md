# Worklog: Task 3-b - Update Calculators to Use Real-Time Data

## Summary
Updated STP Calculator, SWP Calculator, Savings Calculator, and GoalPlanner components to use real-time fund data from AMFI instead of hardcoded category-based returns.

## Changes Made

### 1. STP Calculator API (`/api/stp/calculator/route.ts`)
- Added `sourceReturn` and `targetReturn` optional parameters
- When provided, these override the category-based defaults
- Enhanced response to include: `categoryReturn`, `actualReturn`, `directNav`, `regularNav`, `directReturn1y`, `directReturn3y` for both source and target funds

### 2. STPCalculator Component (`src/components/STPCalculator.tsx`)
- Added "Refresh NAV" button that calls POST `/api/funds/nav` and reloads fund data
- Shows live NAV for selected source/target funds (directNav)
- Shows actual 3Y returns alongside category estimates with "Actual" or "Estimate" badges
- Passes `sourceReturn`/`targetReturn` to the API based on actual fund 3Y returns when available
- Shows return source info badges after calculation ("Using actual 3Y return" vs "Using category estimate")
- Shows real-time NAV in result summary cards
- Added "Last Updated" timestamp after NAV refresh

### 3. SWPCalculator Component (`src/components/SWPCalculator.tsx`)
- Added optional fund selection dropdown using `useFundStore` funds
- When a fund is selected, auto-fills expected return from the fund's actual 3Y return (falls back to 1Y)
- Shows selected fund's category, NAV, and actual returns (1Y/3Y/5Y)
- Added "Refresh NAV" button
- Added "Live Data" badge in header when using actual fund returns
- Added "Live" badge next to expected return input when using fund data
- Summary notes indicate when returns are from actual fund data
- Added "Last Updated" timestamp after NAV refresh

### 4. SavingsCalculator Component (`src/components/SavingsCalculator.tsx`)
- Shows fund's actual returns (1Y/3Y/5Y) alongside the category estimate in fund info section
- Uses fund's actual 3Y return as expected return when available, passes it via `expectedReturn` parameter to API
- Added "Refresh NAV" button that calls POST `/api/funds/nav`
- Shows live NAV (directNav/regularNav) in the fund info section
- Added badge "Using actual 3Y return: X%" or "Using category estimate: X%"
- Shows updated expense ratios and NAVs after refresh
- Added "Last Updated" timestamp after NAV refresh

### 5. GoalPlanner Component (`src/components/GoalPlanner.tsx`)
- Calculates weighted expected return using actual category average returns from funds in the store, instead of hardcoded values
- Computes average 3Y returns per category (Equity/ELSS/Index → Equity bucket, Debt, Hybrid) from actual fund data
- Falls back to hardcoded defaults (12%/7%/9%) when no actual data available
- Shows a note badge: "Returns based on actual fund data: Equity X%, Debt Y%, Hybrid Z%"
- Added "Refresh NAV" button
- Recommended funds now show their actual 1Y/3Y returns with "Live" badge
- SIP calculation info section shows actual vs default returns
- Added "Last Updated" timestamp after NAV refresh

## Files Modified
1. `src/app/api/stp/calculator/route.ts` - API changes
2. `src/components/STPCalculator.tsx` - Full real-time data integration
3. `src/components/SWPCalculator.tsx` - Fund selection + real-time data
4. `src/components/SavingsCalculator.tsx` - Real-time returns + NAV display
5. `src/components/GoalPlanner.tsx` - Actual category returns + live fund returns

## Lint Status
All files pass lint with 0 errors and 0 warnings.
---
Task ID: 4
Agent: Main Agent
Task: Real-time SIP data - All SIP-related features fetch real-time data from MFAPI

Work Log:
- Audited all SIP-related components and APIs (6 components, 8 API routes)
- Rewrote /api/funds/nav-history to fetch REAL data from MFAPI (api.mfapi.in)
- Created /api/sip/realtime-returns API for calculating SIP returns using actual historical NAV data
- Created /api/sip/refresh-returns API for bulk updating fund returns from MFAPI
- Updated SIP Planner with: fund selector, real-time mode toggle, LIVE badge, NAV history chart, real vs projected comparison
- Updated STP Calculator with: live NAV display, actual 3Y returns, Refresh NAV button, return source badges
- Updated SWP Calculator with: optional fund selection, auto-fill from actual returns, Refresh NAV button, Live Data badge
- Updated Savings Calculator with: actual 3Y returns as expected return, live NAV display, Refresh NAV button
- Updated Goal Planner with: actual category average returns from fund data, recommended fund returns with Live badge
- Updated NAV History with: LIVE/Estimated badges, period high/low stats, 52-week stats, Refresh NAV button
- Updated XIRR Calculator with: live NAV sync per holding, stored vs live XIRR comparison, Refresh NAV button
- Fixed expense ratio bug (was /10000 instead of /100 - percentages not basis points)
- Fixed MFAPI cache warning (7.5MB too large for Next.js cache, using no-store with in-memory cache)
- Updated STP Calculator API to accept sourceReturn/targetReturn override parameters
- All lint checks pass (0 errors)
- Dev server running cleanly

Stage Summary:
- 13 files changed, 3122 insertions, 919 deletions
- 2 new API routes created (realtime-returns, refresh-returns)
- 1 API route completely rewritten (nav-history)
- 8 components updated with real-time data features
- Expense ratio bug fixed
- Committed as 3814e5b (GitHub push failed - token expired)
