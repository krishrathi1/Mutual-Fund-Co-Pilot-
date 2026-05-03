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
