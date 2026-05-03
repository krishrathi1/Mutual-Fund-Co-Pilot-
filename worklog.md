# FundVista - MF Direct vs Regular Co-Pilot Worklog

## Project Overview
Building a Mutual Fund Direct vs Regular Co-Pilot for Indian retail investors.
Category: Mutual Funds (Direct vs Regular variants)
Key insight: Direct plans save 0.5-1.5% annually in expense ratio, compounding to lakhs over time.

---
Task ID: 1
Agent: Main
Task: Plan architecture and design

Work Log:
- Analyzed project structure and available tech stack
- Chose Mutual Funds (Direct vs Regular) as the focus category
- Designed database schema with Fund model containing both Direct/Regular variant data
- Planned single-page app with tabs: Explore, Portfolio, Compare, Savings Calculator
- Identified key metrics: expense ratio delta, tracking error, lifetime cost savings, risk-adjusted returns

Stage Summary:
- Category selected: Mutual Funds Direct vs Regular
- Architecture: Single-page Next.js app with Prisma/SQLite backend
- Key differentiator: Transparent cost/tracking-error/exposure tradeoffs in plain language

---
Task ID: 3-b
Agent: seed-agent
Task: Seed database with 55+ realistic Indian MF funds

Work Log:
- Created prisma/fundSeed.ts with 56 funds across 11 sub-categories with realistic Indian MF data
- Created prisma/seed.ts as entry script (uses PrismaClient directly, clears existing data, inserts with stats)
- Ran seed script successfully - all 56 funds inserted
- Verified database population via aggregate stats

Stage Summary:
- 56 funds seeded across categories: Large Cap (9), Mid Cap (7), Small Cap (6), Flexi Cap (6), ELSS (6), Index Fund (6), Sectoral/Thematic (6), Balanced Advantage (5), Corporate Bond (3), Gilt (1), Short Duration (1)
- Key data ranges: Direct ER 0.10%-0.92%, Regular ER 0.75%-2.10%, Avg savings 0.86%, AUM ₹1,234-₹62,345 Cr
- Direct NAVs consistently higher than Regular (compounding of lower expense ratio)
- ISINs unique per fund (Direct ends odd, Regular ends even)
- Returns realistic for Indian market (small/mid cap 20-42% 1Y, large cap 13-21% 1Y, debt 6-9% 1Y)

---
Task ID: 3-a
Agent: api-agent
Task: Build backend API routes for fund co-pilot

Work Log:
- Read existing worklog and seed data format (expense ratios as percentages, not bps)
- Created 7 API routes across the required endpoints
- All routes tested successfully via curl against live dev server
- Lint passes with no errors

Stage Summary:
- API routes created at:
  - `/src/app/api/funds/route.ts` (GET - search, filter, sort, paginate)
  - `/src/app/api/funds/[id]/route.ts` (GET - single fund details)
  - `/src/app/api/funds/compare/route.ts` (GET - direct vs regular comparison with lifetime savings)
  - `/src/app/api/holdings/route.ts` (POST - add holding, GET - list by session)
  - `/src/app/api/holdings/[id]/route.ts` (DELETE - remove with session auth)
  - `/src/app/api/portfolio/analyze/route.ts` (POST - full analysis with recommendations)
  - `/src/app/api/savings/calculate/route.ts` (POST - compound interest savings calculator)
- Key features: fund search with multi-field filtering, direct vs regular comparison, portfolio analysis with plain-language recommendations, savings calculator with yearly breakdown, session-based portfolio management
- Expense ratio handling: DB stores percentages (0.72=0.72%), output fields convert to bps where specified
- Recommendations only suggest Regular→Direct switches, with tax and lock-in tradeoff warnings
