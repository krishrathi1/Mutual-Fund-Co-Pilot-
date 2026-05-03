# Task 2-a: API Routes Agent

## Task
Create 8 new API routes for the FundVista project.

## Completed Routes

1. **`/src/app/api/funds/rankings/route.ts`** — GET
   - Params: category, subCategory, sortBy, limit
   - Returns top N funds ranked by metric

2. **`/src/app/api/funds/amc/route.ts`** — GET
   - Params: fundHouse (optional)
   - Returns AMC-wise analysis with fund counts, AUM, avg ER, avg returns

3. **`/src/app/api/funds/volatility/route.ts`** — POST
   - Body: { fundId }
   - Computes volatility, max drawdown, Sortino, Calmar ratios

4. **`/src/app/api/funds/rolling-returns/route.ts`** — POST
   - Body: { fundId, periods }
   - Generates 12 monthly rolling return data points per period

5. **`/src/app/api/portfolio/alerts/route.ts`** — POST
   - Body: { sessionId }
   - Generates HIGH_EXPENSE, CONCENTRATION_RISK, OVERLAP_WARNING, POOR_PERFORMANCE, REBALANCE_NEEDED alerts

6. **`/src/app/api/swp/calculator/route.ts`** — POST
   - Body: { corpus, monthlyWithdrawal, expectedReturn, years }
   - Full SWP schedule with yearly breakdown and depletion year

7. **`/src/app/api/stp/calculator/route.ts`** — POST
   - Body: { sourceFundId, targetFundId, lumpsumAmount, monthlyTransfer, years }
   - STP from source to target with fund-specific returns

8. **`/src/app/api/funds/screener/route.ts`** — POST
   - Body: { categories, subCategories, minAum, maxAum, minReturn1y, maxExpenseRatio, riskometer, sortBy, order, limit }
   - Advanced multi-criteria fund screening

## Lint Status
0 errors, 0 warnings
