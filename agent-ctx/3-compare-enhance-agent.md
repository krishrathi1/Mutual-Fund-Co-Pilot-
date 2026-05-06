# Task 3: Enhance Comparison View with Radar Chart, Diff Visualizations, and Exposure Tradeoff Cards

## Agent: compare-enhance-agent
## Date: 2025-01-27

### Work Summary

Enhanced the CompareView.tsx component with 4 major new visualizations while preserving all existing functionality.

### Changes Made

#### 1. Extended `ComparisonData` type (`src/lib/store.ts`)
- Added `equityPercentage`, `debtPercentage`, `riskometer`, `aumCrore` optional fields
- These fields are needed for the Exposure Tradeoff Cards and Radar Chart

#### 2. Updated compare API (`src/app/api/funds/compare/route.ts`)
- Added `equityPercentage`, `debtPercentage`, `riskometer`, `aumCrore` to the API response
- Fixed `benchmarkReturns` nesting (was returning flat `benchmarkReturn1y/3y/5y`, now properly nested as `benchmarkReturns: { return1y, return3y, return5y }` to match the `ComparisonData` interface)

#### 3. Complete CompareView.tsx rewrite with 4 new visualizations

**a) Radar Chart (Multi-Fund Comparison)**
- Uses recharts `RadarChart`, `Radar`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis`
- Compares across 6 dimensions: Expense Ratio, 1Y Return, 3Y Return, 5Y Return, Sharpe Ratio, AUM
- All dimensions normalized to 0-100 scale (Expense Ratio inverted so lower = better)
- Each fund gets a unique color from `FUND_COLORS` palette
- Shows only when 2+ funds are selected, positioned at the top of the compare tab

**b) Diff Visualization Grouped Bar Chart**
- Uses recharts `BarChart` with grouped bars
- Shows Direct Return (emerald), Regular Return (red), and Savings in bps (amber)
- Each fund is a category on the X-axis
- Responsive with proper tooltip formatting

**c) Exposure Tradeoff Cards**
- Grid layout (2 columns on sm+)
- Each card contains:
  - **Asset Allocation**: Stacked horizontal bar showing Equity % (emerald) vs Debt % (teal) vs Others (gray)
  - **Risk Level Indicator**: Color-coded badge + gradient bar (green→red) based on riskometer
  - **Tracking Error Gauge**: Gradient bar from emerald→amber→red with position marker, showing how closely Direct tracks Regular
  - **"Same Stocks, Different Fees" Callout**: Prominent emerald box explaining the key insight

**d) Portfolio-Level Savings Projection**
- Area chart showing combined Direct vs Regular wealth over 30 years for ALL holdings
- Uses gradient fills (emerald for Direct, red for Regular/Current Mix)
- Summary callout showing 20-year and 30-year projected savings
- Only shows when user has holdings loaded
- Uses category-specific expected returns for accurate projection

### Preserved Functionality
- All existing tabs (Direct vs Regular, Switch Recommendations) unchanged
- Per-fund comparison cards (FundComparisonCard) preserved exactly
- AI insights integration preserved
- Lifetime savings tables preserved
- Tracking error analysis preserved
- Benchmark comparison preserved
- Empty states (no funds selected, no recommendations) preserved

### Technical Details
- All charts use `ResponsiveContainer` for responsive behavior
- Proper `contentStyle` on tooltips using CSS variables for theme compatibility
- Color scheme: emerald for Direct, red for Regular, amber for savings/highlights
- No breaking changes to existing APIs or data structures
- Lint passes with zero errors
