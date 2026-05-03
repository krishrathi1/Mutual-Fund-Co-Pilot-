# Task 3-a: API Agent Work Log

## Task
Build backend API routes for fund co-pilot application

## Work Done

### 1. Database Setup
- Verified Prisma schema already synced with database
- Read existing seed data from `prisma/fundSeed.ts` (56 funds, created by agent 3-b)
- Confirmed expense ratios stored as **percentages** (e.g., 0.72 = 0.72%), not basis points

### 2. API Routes Created (7 routes total)

#### `/api/funds/route.ts` - GET
- Search by scheme name, fund house, or sub-category
- Filter by category and subCategory
- Sort by aum, expenseDiff, return1y/3y/5y (direct or regular based on planType)
- Pagination with limit (1-100, default 20) and offset (default 0)
- expenseDiff sorting done in-memory since it's a computed field

#### `/api/funds/[id]/route.ts` - GET
- Returns full fund object by ID
- 404 if not found

#### `/api/funds/compare/route.ts` - GET
- Accepts comma-separated fund IDs via `ids` query param
- Returns comparison objects with direct/regular details
- Computes expenseDiff in **basis points** (converts from % in DB)
- Computes return differentials (direct - regular) for 1y/3y/5y
- Calculates lifetime savings for 5 investment amounts × 6 time periods
- Uses category-based expected returns for compound interest calculations

#### `/api/holdings/route.ts` - POST + GET
- POST: Creates holding with validation (sessionId, fundId, planType, amounts, units)
- Verifies fund exists before creating holding
- GET: Returns holdings with fund details, ordered by creation date desc

#### `/api/holdings/[id]/route.ts` - DELETE
- Session-based authorization check (sessionId query param)
- 403 if holding doesn't belong to session
- 404 if not found

#### `/api/portfolio/analyze/route.ts` - POST
- Full portfolio analysis with 8 sections:
  - Core metrics: totalInvested, currentValue, totalGain, totalGainPct
  - Weighted expense ratio (weighted by current amounts)
  - Annual cost calculation
  - Direct savings: annual, 5yr, 10yr, 20yr, 30yr (lifetime at retirement)
  - Category breakdown with amounts and percentages
  - Recommendations with plain-language reasons and tradeoffs
  - Risk profile: overall risk, equity/debt split, concentration risk, diversification score
- Only recommends Regular → Direct switches
- Priority levels based on expense saving bps and annual saving amount
- Tradeoffs include tax implications, ELSS lock-in considerations

#### `/api/savings/calculate/route.ts` - POST
- Calculates future values for direct vs regular plans
- Accepts optional fundId to auto-populate expense ratios
- Returns yearly breakdown with direct value, regular value, savings, cumulative savings
- Uses compound interest: FV = PV × (1 + r)^n where r = (expectedReturn - expenseRatio) / 100

### 3. Key Implementation Details
- **Expense ratio format**: DB stores percentages (0.72 = 0.72%), converted to bps only in output fields
- **Expected returns by category**: Equity/ELSS=12%, Index=11%, Hybrid=9%, Debt=7%
- **Savings formula**: Net return = expectedReturn - expenseRatio (both in %), then compound
- **Recommendations**: Plain language reasons tailored by expense diff magnitude, tradeoffs include tax/lock-in warnings

### 4. Testing
- All 7 endpoints tested successfully via curl
- Portfolio analysis produces realistic recommendations and savings estimates
- Compare endpoint returns correct bps conversion (e.g., 1.75-0.80=0.95% → 95 bps)
- Savings calculator produces accurate yearly breakdowns
- Lint passes with no errors

## Stage Summary
- API routes created at:
  - `/src/app/api/funds/route.ts`
  - `/src/app/api/funds/[id]/route.ts`
  - `/src/app/api/funds/compare/route.ts`
  - `/src/app/api/holdings/route.ts`
  - `/src/app/api/holdings/[id]/route.ts`
  - `/src/app/api/portfolio/analyze/route.ts`
  - `/src/app/api/savings/calculate/route.ts`
- Key features: fund search/filter/sort, direct vs regular comparison, portfolio analysis with recommendations, savings calculator with compound interest, session-based portfolio management
