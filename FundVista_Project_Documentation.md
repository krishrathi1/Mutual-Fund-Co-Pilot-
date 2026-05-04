# FundVista Project Documentation

## 1. Project Overview

**FundVista** is a Mutual Fund Co-Pilot built for Indian mutual fund investors. The main goal of the project is to make mutual fund investing easier to understand, especially the difference between **Direct** and **Regular** plans.

Many retail investors see expense ratio differences like `0.75%` or `1.20%` and feel the number is too small to matter. In reality, this difference compounds for many years and can reduce long-term wealth by lakhs of rupees. FundVista turns those small percentages into clear rupee values, charts, warnings, and recommendations.

In simple words, FundVista helps the user answer:

- Which mutual funds should I explore?
- How much money do I lose in Regular plans?
- Should I switch to Direct plans?
- Is my portfolio properly diversified?
- Am I paying high fees for poor performance?
- How much SIP do I need for my goal?
- What tax, exit load, or risk should I consider before changing funds?

## 2. Why This Project Was Built

The project was built because mutual fund investing has several hidden problems for normal users:

1. **Regular plan commission is not obvious**

   Regular plans usually have a higher expense ratio because distributor commission is included. The investor does not pay this commission separately, so many people do not notice it.

2. **Percentages are hard to understand**

   A fee difference of `1%` may look small, but on Rs. 10 lakh over 20 years, it can become a very large loss due to compounding.

3. **Investors think more funds means more diversification**

   A person may buy 5 equity funds and think they are diversified, but all those funds may hold the same top stocks and sectors.

4. **Performance without benchmark is incomplete**

   A fund may show positive returns, but it may still be underperforming its benchmark index. FundVista checks whether the fund manager is actually creating extra value.

5. **Switching funds has tradeoffs**

   Switching from Regular to Direct can save money, but it may also create tax, exit load, or ELSS lock-in issues. The project explains these tradeoffs before pushing the user to act.

6. **Planning needs simple calculators**

   Users need tools for SIP, SWP, STP, goals, tax, XIRR, stress test, and rebalancing in one place instead of using many separate websites.

## 3. Technology Stack

FundVista is built as a modern web application.

| Area | Technology Used | Reason |
|---|---|---|
| Frontend | Next.js, React, TypeScript | To build a fast, component-based web app with strong typing |
| Styling | Tailwind CSS, shadcn/ui, Radix UI | To create reusable, responsive, clean UI components |
| Charts | Recharts | To explain financial numbers visually |
| State Management | Zustand | To store selected funds, holdings, goals, watchlist, and active tab |
| Database | SQLite with Prisma ORM | To store fund data, holdings, goals, and watchlist items |
| AI Assistant | z-ai-web-dev-sdk with fallback responses | To provide mutual fund guidance through chat |
| Icons | lucide-react | To make navigation and actions easier to scan |
| Animation | Framer Motion | To make tab switching and UI transitions smoother |

## 4. Application Structure

The main page is controlled by [src/app/page.tsx](src/app/page.tsx). It shows a single dashboard-style interface with multiple tabs grouped into five sections:

- **Discover**: Explore market and fund information
- **Analyze**: Understand portfolio health and fund quality
- **Plan**: Forecast future investments and goals
- **Optimize**: Improve the portfolio by reducing cost and risk
- **Tools**: Utility features like XIRR, watchlist, and export

The active tab is stored in [src/lib/store.ts](src/lib/store.ts), so the whole app behaves like one connected co-pilot instead of unrelated pages.

## 5. Core Data Models

The database schema is defined in [prisma/schema.prisma](prisma/schema.prisma).

### 5.1 Fund

The `Fund` model stores the master data for each mutual fund.

It includes:

- Scheme name
- Fund house
- Category and sub-category
- Riskometer
- Benchmark
- Fund manager
- Direct plan NAV, ISIN, expense ratio, and returns
- Regular plan NAV, ISIN, expense ratio, and returns
- AUM
- Exit load
- Minimum investment
- Portfolio ratios like P/E and P/B
- Equity and debt percentage
- Top holdings
- Sharpe ratios
- Benchmark returns

**Why it was built this way:**  
Direct and Regular plans are stored together for the same fund because the app's main purpose is to compare them side by side. This makes it easy to show how the same fund behaves differently only because of cost.

### 5.2 Holding

The `Holding` model stores the user's portfolio holdings.

It includes:

- Session ID
- Fund ID
- Plan type: Direct or Regular
- Units
- Invested amount
- Current amount
- Purchase date
- SIP amount

**Why it was built this way:**  
The project does not require login. Instead, it uses a session-based portfolio so users can quickly try the app without creating an account.

### 5.3 WatchlistItem

The `WatchlistItem` model stores funds the user wants to track.

It includes:

- Session ID
- Fund ID
- Notes
- Target NAV

**Why it was built this way:**  
Users may not want to immediately add every interesting fund to their portfolio. The watchlist gives them a lighter way to track funds.

### 5.4 Goal

The `Goal` model stores financial goals.

It includes:

- Goal name
- Target amount
- Current savings
- Years to goal
- Risk profile
- Suggested allocation
- Monthly SIP needed

**Why it was built this way:**  
Investing is easier when it is connected to real goals like retirement, education, house purchase, emergency fund, or wedding planning.

## 6. Main User Journey

A typical user journey looks like this:

1. User opens the app on the **Explore** tab.
2. User searches and filters mutual funds.
3. User compares Direct and Regular plan costs.
4. User opens fund details for deeper understanding.
5. User adds funds to compare or portfolio.
6. User analyzes portfolio cost, risk, overlap, sectors, and diversification.
7. User plans goals and future SIP requirements.
8. User checks tax, exit load, stress, and rebalancing before making changes.
9. User can ask the AI Co-Pilot questions during the process.

This flow was designed so the user can move from discovery to decision without leaving the app.

## 7. Discover Module

The Discover module helps users search the mutual fund market, understand funds, and find better options.

### 7.1 Explore Funds

Component: [src/components/ExploreFunds.tsx](src/components/ExploreFunds.tsx)

**What it does:**

- Shows a searchable list of mutual funds
- Supports real-time search by fund name
- Supports category filters like Equity, Debt, Hybrid, Index, and ELSS
- Supports sub-category filters like Large Cap, Mid Cap, Flexi Cap, Liquid, and others
- Supports sorting by AUM, returns, and expense savings
- Shows Direct vs Regular plan details on every fund card
- Shows quick actions: Details, Compare, and Add

**Why it was built:**

The Indian mutual fund universe is very large. Users need a fast way to reduce noise and find funds that match their needs. The Explore section acts like an interactive funnel where the user can research, compare, and start building a portfolio from one place.

### 7.2 Direct vs Regular Head-to-Head

Every fund card shows both plan types together.

It compares:

- Direct expense ratio
- Regular expense ratio
- Direct returns
- Regular returns
- Difference in fees
- Estimated rupee savings

**Why it was built:**

This is the core value of the app. Regular plans and Direct plans usually hold the same portfolio, but Regular plans cost more because of distributor commission. By placing both versions side by side, the user can immediately see the cost drag.

### 7.3 Savings Callout

The Explore card includes a savings message that translates basis points into rupees.

Example:

```text
You save 120 bps/year in Direct = around Rs. 6,000/year on Rs. 5,00,000
```

**Why it was built:**

Financial percentages feel abstract. Rupee amounts feel real. The callout helps users understand the hidden cost in simple language.

### 7.4 Fund Detail Drawer

Component: [src/components/FundDetail.tsx](src/components/FundDetail.tsx)

The fund detail drawer opens without taking the user away from the Explore page.

It has five main tabs:

#### Overview Tab

Shows:

- Direct vs Regular expense ratios
- 1Y, 3Y, and 5Y returns
- AUM
- Fund manager
- Exit load
- Launch date
- Sharpe ratio
- Tracking error

**Reason:**  
This gives the user a quick dashboard of the fund before they invest or compare.

#### Portfolio Tab

Shows:

- Asset allocation
- Equity and debt percentage
- Top holdings
- P/E ratio
- P/B ratio
- Number of stocks
- Largest holding

**Reason:**  
The user should know what the fund actually owns. A mutual fund is not just a return number; it is a basket of stocks, bonds, and sectors.

#### Benchmark Tab

Shows:

- Fund return compared with benchmark return
- 1Y, 3Y, and 5Y alpha
- Whether the fund beat or missed the benchmark

**Reason:**  
If an active fund charges a fee, it should justify that fee by beating its benchmark. This tab checks that clearly.

#### Savings Tab

Shows:

- Direct vs Regular future value
- Lifetime savings for different investment amounts
- Savings across different time periods

**Reason:**  
This shows the compounding impact of lower fees. It helps users understand that small annual savings can become large long-term wealth.

#### Switch Tab

Shows:

- Whether switching from Regular to Direct is worth considering
- Priority level based on expense difference
- Possible annual and long-term savings
- Tradeoffs like tax, exit load, ELSS lock-in, and loss of distributor support

**Reason:**  
Switching should not be blind. The app explains both benefit and risk before recommending action.

### 7.5 Fund Screener

Component: [src/components/FundScreener.tsx](src/components/FundScreener.tsx)

**What it does:**

- Filters funds by category and sub-category
- Filters by risk level
- Filters by AUM range
- Filters by minimum 1-year return
- Filters by maximum expense ratio
- Sorts by AUM, returns, Sharpe ratio, or lowest expense ratio

**Why it was built:**

A screener is an advanced search engine for mutual funds. Instead of manually opening many fund pages, users can set rules and instantly get a short list of funds that match their investment style.

### 7.6 AMC Analysis

Component: [src/components/AMCAnalysis.tsx](src/components/AMCAnalysis.tsx)

**What it does:**

- Groups funds by Asset Management Company
- Shows total AUM by AMC
- Shows number of funds managed by each AMC
- Calculates average expense ratio
- Calculates average 1-year return
- Shows market share with charts
- Allows deep dive into a single AMC

**Why it was built:**

Investors should not only evaluate funds; they should also understand the fund houses managing them. AMC Analysis helps users see which companies are large, cost-efficient, broad, or concentrated in certain categories.

### 7.7 Market Dashboard

Component: [src/components/MarketDashboard.tsx](src/components/MarketDashboard.tsx)

**What it does:**

- Shows high-level market and fund universe information
- Gives users a dashboard view before they go deeper into individual funds

**Why it was built:**

Some users want the market overview first. This view helps them understand the broader fund environment before selecting a specific fund.

### 7.8 Fund Heatmap

Component: [src/components/FundHeatmap.tsx](src/components/FundHeatmap.tsx)

**What it does:**

- Shows funds visually in a heatmap format
- Helps identify strong and weak areas quickly

**Why it was built:**

Heatmaps make large data easier to scan. Instead of reading long tables, users can identify patterns visually.

### 7.9 NAV History

Component: [src/components/NAVHistory.tsx](src/components/NAVHistory.tsx)

**What it does:**

- Shows historical NAV trend for a fund
- Helps users understand how fund value moved over time

**Why it was built:**

NAV history helps users understand volatility, growth pattern, and past behavior of the fund.

### 7.10 Fund Rankings

Component: [src/components/FundRankings.tsx](src/components/FundRankings.tsx)

**What it does:**

- Ranks funds based on useful metrics
- Helps users discover top funds by return, risk-adjusted performance, or cost

**Why it was built:**

Many users start with the question "Which funds are best?" Rankings provide a simple starting point while still showing data behind the ranking.

## 8. Analyze Module

The Analyze module is the portfolio health engine of FundVista. It helps users understand whether their actual portfolio is efficient, diversified, and worth the cost.

### 8.1 Portfolio Builder

Component: [src/components/PortfolioBuilder.tsx](src/components/PortfolioBuilder.tsx)

API routes:

- [src/app/api/holdings/route.ts](src/app/api/holdings/route.ts)
- [src/app/api/holdings/[id]/route.ts](src/app/api/holdings/[id]/route.ts)
- [src/app/api/portfolio/analyze/route.ts](src/app/api/portfolio/analyze/route.ts)

**What it does:**

- Lets users add mutual fund holdings
- Tracks invested amount
- Tracks current value
- Tracks plan type: Direct or Regular
- Calculates total invested, current value, gain, and gain percentage
- Calculates weighted expense ratio
- Finds Regular plan holdings
- Estimates Direct plan savings

**Why it was built:**

This is the foundation of the app. Without the user's holdings, the platform can only give general information. With holdings, it can give personalized insights.

The most important feature is the Regular plan warning. If the user holds Regular plans, the app estimates annual saving and long-term saving if they move to Direct plans.

### 8.2 Portfolio Analysis Logic

The portfolio analysis API calculates:

- Total invested amount
- Current portfolio value
- Total gain
- Gain percentage
- Weighted expense ratio
- Annual cost
- Direct plan savings over 5, 10, 20, and 30 years
- Category breakdown
- Risk profile
- Concentration risk
- Diversification score
- Recommendations

**Important formula idea:**

```text
Direct net return = expected category return - direct expense ratio
Regular net return = expected category return - regular expense ratio
Savings = Direct future value - Regular future value
```

**Why this matters:**  
This shows the user the future cost of staying in high-expense Regular funds.

### 8.3 Compare View

Component: [src/components/CompareView.tsx](src/components/CompareView.tsx)

API route: [src/app/api/funds/compare/route.ts](src/app/api/funds/compare/route.ts)

**What it does:**

- Compares selected funds
- Shows Direct vs Regular plan metrics
- Shows expense ratio difference
- Shows return difference
- Shows tracking error
- Shows lifetime savings
- Uses visual comparison charts

**Why it was built:**

Users often compare different funds, but this app also forces an important comparison inside the same fund: Direct vs Regular. This proves that the user may be paying extra without getting a different portfolio.

### 8.4 Fund Overlap Analyzer

Component: [src/components/FundOverlap.tsx](src/components/FundOverlap.tsx)

API route: [src/app/api/portfolio/overlap/route.ts](src/app/api/portfolio/overlap/route.ts)

**What it does:**

- Compares holdings across funds
- Finds common stocks, categories, and sub-categories
- Creates overlap scores between fund pairs
- Shows high, medium, or low overlap

**Why it was built:**

Many investors buy many funds but still own the same stocks repeatedly. This is called false diversification. The overlap tool warns when multiple funds are giving the same exposure.

General interpretation:

- `60% or above`: High overlap, consolidation may be needed
- `30% to 59%`: Medium overlap
- `Below 30%`: Low overlap

### 8.5 Sector Exposure

Component: [src/components/SectorExposure.tsx](src/components/SectorExposure.tsx)

API route: [src/app/api/portfolio/sector-exposure/route.ts](src/app/api/portfolio/sector-exposure/route.ts)

**What it does:**

- Breaks portfolio into sectors like Financial Services, IT, Healthcare, Auto, and others
- Uses top holdings and their sector weights
- Shows equity vs debt exposure
- Helps identify sector concentration

**Why it was built:**

Two portfolios can both be "equity portfolios" but have very different risk. One may be heavily dependent on banking, while another may be spread across sectors. Sector exposure helps the user see hidden concentration.

### 8.6 Diversification Score

Component: [src/components/DiversificationScore.tsx](src/components/DiversificationScore.tsx)

API route: [src/app/api/portfolio/diversification/route.ts](src/app/api/portfolio/diversification/route.ts)

**What it does:**

- Gives a portfolio health score
- Checks category mix
- Checks fund house diversity
- Checks sector diversity
- Checks market-cap diversity
- Gives suggestions for improvement

**Why it was built:**

Users need a simple score that explains whether their portfolio is balanced. A number and grade are easier to understand than a long list of raw data.

### 8.7 Benchmark Comparison

Component: [src/components/BenchmarkCompare.tsx](src/components/BenchmarkCompare.tsx)

**What it does:**

- Compares fund returns against benchmark returns
- Calculates alpha
- Shows whether the fund beat or missed the benchmark

**Why it was built:**

An active fund manager should beat the benchmark after fees. If not, the user may be better served by a lower-cost index fund.

Formula:

```text
Alpha = Fund return - Benchmark return
```

### 8.8 Volatility Analysis

Component: [src/components/VolatilityAnalysis.tsx](src/components/VolatilityAnalysis.tsx)

API route: [src/app/api/funds/volatility/route.ts](src/app/api/funds/volatility/route.ts)

**What it does:**

- Measures volatility
- Calculates max drawdown
- Shows Sharpe ratio
- Shows Sortino ratio
- Shows Calmar ratio
- Classifies risk level

**Why it was built:**

Returns are only half the story. A fund with high return but very high drawdown may not suit every investor. This tool explains the pain the user may experience during market falls.

## 9. Plan Module

The Plan module helps users think about the future. It converts goals and investment habits into numbers.

### 9.1 Savings Calculator

Component: [src/components/SavingsCalculator.tsx](src/components/SavingsCalculator.tsx)

API route: [src/app/api/savings/calculate/route.ts](src/app/api/savings/calculate/route.ts)

**What it does:**

- Compares Direct and Regular plan future value
- Supports lump sum mode
- Supports SIP mode
- Shows year-by-year savings
- Uses fund-specific expense ratios when a fund is selected
- Uses default category returns when needed

**Why it was built:**

This is the main calculator for proving the value of Direct plans. It shows how lower fees create higher long-term wealth.

### 9.2 SIP Planner

Component: [src/components/SIPPlanner.tsx](src/components/SIPPlanner.tsx)

API route: [src/app/api/sip/planner/route.ts](src/app/api/sip/planner/route.ts)

**What it does:**

- Helps calculate SIP growth
- Shows future value of monthly investing
- Helps users understand compounding

**Why it was built:**

Most retail investors invest through SIPs. A SIP planner gives them a practical way to estimate future wealth.

### 9.3 SWP Calculator

Component: [src/components/SWPCalculator.tsx](src/components/SWPCalculator.tsx)

API route: [src/app/api/swp/calculator/route.ts](src/app/api/swp/calculator/route.ts)

**What it does:**

- Helps plan systematic withdrawals
- Estimates how long money can last
- Useful for retirement or regular income planning

**Why it was built:**

Investing is not only about accumulation. Users also need to plan how they will withdraw money safely.

### 9.4 STP Calculator

Component: [src/components/STPCalculator.tsx](src/components/STPCalculator.tsx)

API route: [src/app/api/stp/calculator/route.ts](src/app/api/stp/calculator/route.ts)

**What it does:**

- Helps plan systematic transfer from one fund type to another
- Useful when moving money from debt/liquid funds to equity funds over time

**Why it was built:**

Users may not want to invest a large amount into equity at once. STP reduces timing risk by spreading entry over time.

### 9.5 Goal Planner

Component: [src/components/GoalPlanner.tsx](src/components/GoalPlanner.tsx)

API routes:

- [src/app/api/goals/route.ts](src/app/api/goals/route.ts)
- [src/app/api/goals/[id]/route.ts](src/app/api/goals/[id]/route.ts)

**What it does:**

- Lets users create financial goals
- Takes target amount, current savings, years, and risk profile
- Suggests allocation based on risk profile
- Calculates monthly SIP needed

**Why it was built:**

Goal-based investing is easier than random investing. The user can see exactly how much monthly SIP is needed to reach a target.

### 9.6 Risk Profiler

Component: [src/components/RiskProfiler.tsx](src/components/RiskProfiler.tsx)

API route: [src/app/api/risk/profile/route.ts](src/app/api/risk/profile/route.ts)

**What it does:**

- Helps determine the user's risk profile
- Connects risk appetite with suggested allocation

**Why it was built:**

A good fund for one person may be unsuitable for another. Risk profiling helps connect investment choice to user comfort and time horizon.

## 10. Optimize Module

The Optimize module helps users improve an existing portfolio.

### 10.1 Tax Calculator

Component: [src/components/TaxCalculator.tsx](src/components/TaxCalculator.tsx)

API route: [src/app/api/tax/calculate/route.ts](src/app/api/tax/calculate/route.ts)

**What it does:**

- Estimates tax on mutual fund gains
- Classifies gains as STCG or LTCG
- Applies Indian mutual fund tax logic
- Gives summary and tips

**Why it was built:**

Switching from Regular to Direct may involve selling the Regular plan and buying the Direct plan. That can trigger tax. The tax calculator helps the user avoid surprise costs.

### 10.2 Exit Load Calculator

Component: [src/components/ExitLoadCalc.tsx](src/components/ExitLoadCalc.tsx)

**What it does:**

- Estimates exit load for early withdrawal
- Helps users understand redemption penalties

**Why it was built:**

Even if Direct plan saves money, switching immediately may not be best if exit load is high. This calculator helps check that cost.

### 10.3 Rebalancing View

Component: [src/components/RebalancingView.tsx](src/components/RebalancingView.tsx)

API route: [src/app/api/portfolio/rebalancing/route.ts](src/app/api/portfolio/rebalancing/route.ts)

**What it does:**

- Compares current allocation with target allocation
- Suggests where the portfolio may need adjustment

**Why it was built:**

Over time, market movement changes portfolio allocation. Rebalancing brings the portfolio back to the intended risk level.

### 10.4 Stress Test

Component: [src/components/StressTest.tsx](src/components/StressTest.tsx)

API route: [src/app/api/portfolio/stress-test/route.ts](src/app/api/portfolio/stress-test/route.ts)

**What it does:**

- Simulates negative market scenarios
- Estimates possible portfolio fall
- Helps the user understand downside risk

**Why it was built:**

Investors often focus only on expected return. Stress testing helps them prepare emotionally and financially for market corrections.

### 10.5 Portfolio Alerts

Component: [src/components/PortfolioAlerts.tsx](src/components/PortfolioAlerts.tsx)

API route: [src/app/api/portfolio/alerts/route.ts](src/app/api/portfolio/alerts/route.ts)

**What it does:**

- Shows warnings about portfolio issues
- Can highlight high costs, concentration, overlap, or risk

**Why it was built:**

Users should not need to manually inspect everything. Alerts act like a checklist of important problems.

## 11. Tools Module

The Tools module contains smaller utilities that support investing decisions.

### 11.1 XIRR Calculator

Component: [src/components/XIRRCalculator.tsx](src/components/XIRRCalculator.tsx)

API route: [src/app/api/portfolio/xirr/route.ts](src/app/api/portfolio/xirr/route.ts)

**What it does:**

- Calculates portfolio XIRR
- Handles investments made at different dates
- Compares holding-level returns

**Why it was built:**

Absolute return is not enough for SIP portfolios because money enters at different times. XIRR gives a more accurate annualized return.

### 11.2 Watchlist

Component: [src/components/Watchlist.tsx](src/components/Watchlist.tsx)

API routes:

- [src/app/api/watchlist/route.ts](src/app/api/watchlist/route.ts)
- [src/app/api/watchlist/[id]/route.ts](src/app/api/watchlist/[id]/route.ts)

**What it does:**

- Lets users save funds for later
- Supports notes
- Supports target NAV
- Fetches latest NAV where available

**Why it was built:**

Not every fund needs to be added to the portfolio immediately. Watchlist supports research and tracking.

### 11.3 Portfolio Export

Component: [src/components/PortfolioExport.tsx](src/components/PortfolioExport.tsx)

API route: [src/app/api/portfolio/export/route.ts](src/app/api/portfolio/export/route.ts)

**What it does:**

- Exports portfolio information
- Helps users keep records or share data

**Why it was built:**

Users may want to review portfolio data offline or share it with an advisor.

## 12. AI Co-Pilot

Component: [src/components/AICopilot.tsx](src/components/AICopilot.tsx)

API routes:

- [src/app/api/ai/chat/route.ts](src/app/api/ai/chat/route.ts)
- [src/app/api/ai/insights/route.ts](src/app/api/ai/insights/route.ts)

**What it does:**

- Provides a floating chat assistant
- Answers Indian mutual fund questions
- Explains Direct vs Regular plans
- Explains tax rules
- Explains SIP, risk, ELSS, and diversification
- Uses fallback answers if the AI call fails
- Maintains short session conversation memory

**Why it was built:**

Financial dashboards can still feel confusing. The AI Co-Pilot gives users a conversational way to ask questions like:

- Should I switch from Regular to Direct?
- What does expense ratio mean?
- How does SIP work?
- How are equity mutual funds taxed?
- Is my portfolio risky?

The assistant is designed to be responsible. It gives educational guidance and reminds users that mutual funds are subject to market risk.

## 13. Important Financial Concepts Used

### 13.1 Expense Ratio

Expense ratio is the yearly fee charged by a mutual fund. It is taken from the fund's assets, so users usually do not see it as a separate bill.

**Why it matters:**  
Lower expense ratio means more of the return stays with the investor.

### 13.2 Direct Plan

A Direct plan is bought directly from the AMC or direct platform. It usually has a lower expense ratio because distributor commission is not included.

**Why it matters:**  
For self-directed investors, Direct plans can create better long-term wealth.

### 13.3 Regular Plan

A Regular plan includes distributor commission. The underlying fund portfolio is usually the same as the Direct plan, but the cost is higher.

**Why it matters:**  
The investor may earn lower returns even though the fund holdings are the same.

### 13.4 Basis Points

Basis points, or bps, are used to describe small percentage differences.

```text
1 basis point = 0.01%
100 basis points = 1%
```

**Why it matters:**  
Mutual fund fee differences are often small percentages, so bps makes them easier to compare.

### 13.5 AUM

AUM means Assets Under Management. It tells how much money the fund manages.

**Why it matters:**  
A very small fund may have liquidity or survival risk. A very large fund may sometimes become harder to manage aggressively.

### 13.6 Riskometer

Riskometer is a SEBI-mandated risk label for mutual funds.

**Why it matters:**  
It gives users a quick idea of the fund's risk level.

### 13.7 Sharpe Ratio

Sharpe ratio measures return earned per unit of risk.

**Why it matters:**  
A fund with slightly lower return but much lower risk may be better than a fund with high return and high volatility.

### 13.8 Tracking Error

Tracking error shows how different two return paths are.

**Why it matters in FundVista:**  
For Direct vs Regular plans, very low tracking error helps show that both plans are almost the same portfolio. The return difference mainly comes from expense ratio.

### 13.9 Alpha

Alpha is the extra return a fund generates compared with its benchmark.

```text
Alpha = Fund return - Benchmark return
```

**Why it matters:**  
If alpha is negative for many years, the user may be paying active fund fees without getting active fund value.

### 13.10 XIRR

XIRR is the annualized return for irregular cash flows.

**Why it matters:**  
SIP investments happen on many dates, so simple return can be misleading. XIRR is better for real portfolios.

## 14. API Overview

The project uses API routes under `src/app/api`.

Important API groups:

| API Group | Purpose |
|---|---|
| `/api/funds` | Search and fetch fund data |
| `/api/funds/[id]` | Fetch single fund details |
| `/api/funds/compare` | Compare selected funds |
| `/api/funds/nav` | Fetch NAV information |
| `/api/funds/nav-history` | Get historical NAV chart data |
| `/api/funds/screener` | Filter funds using advanced rules |
| `/api/funds/rankings` | Rank funds |
| `/api/funds/amc` | Analyze AMCs |
| `/api/holdings` | Add and fetch user holdings |
| `/api/portfolio/analyze` | Analyze portfolio value, costs, and risk |
| `/api/portfolio/overlap` | Detect fund overlap |
| `/api/portfolio/sector-exposure` | Calculate sector exposure |
| `/api/portfolio/diversification` | Score diversification |
| `/api/portfolio/rebalancing` | Suggest rebalancing |
| `/api/portfolio/stress-test` | Simulate downside scenarios |
| `/api/portfolio/xirr` | Calculate XIRR |
| `/api/portfolio/export` | Export portfolio data |
| `/api/goals` | Manage financial goals |
| `/api/savings/calculate` | Calculate Direct vs Regular savings |
| `/api/sip/planner` | SIP planning |
| `/api/swp/calculator` | SWP planning |
| `/api/stp/calculator` | STP planning |
| `/api/tax/calculate` | Tax calculation |
| `/api/watchlist` | Manage watchlist |
| `/api/ai/chat` | AI chat assistant |
| `/api/ai/insights` | AI fund insights |

## 15. State Management

The global app state is managed in [src/lib/store.ts](src/lib/store.ts).

It stores:

- Active tab
- Fund list
- Search and filter values
- Session ID
- Holdings
- Selected comparison funds
- Portfolio analysis result
- Savings calculator result
- AI insights
- Watchlist
- Goals

**Why Zustand was used:**  
The app has many connected modules. A fund selected in Explore may be used in Compare. A holding added in Portfolio may affect Diversification, Tax, XIRR, and AI. Zustand keeps this shared state simple.

## 16. UI and User Experience

The UI is designed as a single dashboard with grouped navigation.

Important UX choices:

- Sticky header keeps navigation available
- Mobile tab bar supports smaller screens
- "More" tab keeps advanced tools accessible without overcrowding
- Cards show critical fund information quickly
- Drawers and tabs avoid unnecessary page changes
- Charts turn complex financial data into easier visuals
- Dark and light theme support improves comfort
- AI chat remains available throughout the app

**Why it was built this way:**  
Mutual fund analysis can be heavy. The UI tries to reduce mental load by keeping actions close to the data.

## 17. Seed Data and Local Database

The project includes Prisma seed files:

- [prisma/seed.ts](prisma/seed.ts)
- [prisma/fundSeed.ts](prisma/fundSeed.ts)
- [prisma/seed-holdings.ts](prisma/seed-holdings.ts)

The SQLite database files are included under:

- `db/custom.db`
- `prisma/db/custom.db`

**Why this matters:**  
Seed data allows the project to work as a demo without needing a live mutual fund data provider for every feature.

## 18. Example: Direct vs Regular Savings Logic

Suppose:

- Expected fund return is `12%`
- Direct expense ratio is `0.50%`
- Regular expense ratio is `1.25%`

Then:

```text
Direct net return = 12.00% - 0.50% = 11.50%
Regular net return = 12.00% - 1.25% = 10.75%
```

For every year, Direct compounds at a higher net return. Over 10, 20, or 30 years, the gap becomes large.

**Reason this is central to FundVista:**  
The project is not only saying "Direct is cheaper." It calculates how much wealth the user may keep by choosing Direct.

## 19. Example: Goal SIP Logic

The Goal Planner asks:

- How much money do you need?
- How much have you already saved?
- How many years are left?
- What is your risk profile?

Then it estimates expected return based on risk:

- Conservative: lower expected return
- Moderate: balanced expected return
- Aggressive: higher expected return

Then it calculates monthly SIP needed.

**Reason this is useful:**  
The user gets a clear monthly action number instead of a vague goal.

## 20. Project Strengths

FundVista is strong because it combines many financial tools into one flow:

- Discovery
- Fund detail analysis
- Direct vs Regular cost comparison
- Portfolio tracking
- Portfolio health check
- Overlap detection
- Sector exposure
- Goal planning
- Tax and exit load thinking
- AI explanation
- Watchlist and export

Most importantly, the project explains financial decisions in rupee terms and simple language.

## 21. Limitations and Future Improvements

Current limitations:

- The app uses session-based storage instead of full user login.
- Some calculations depend on seeded/sample data.
- Some market and NAV data may need a live data provider for production use.
- AI advice is educational and should not replace a certified financial advisor.
- Tax calculations should be verified with a tax professional for real cases.

Possible future improvements:

- Add user authentication
- Add live AMFI/NAV sync
- Add CAS statement import
- Add broker/platform integrations
- Add PDF report generation
- Add more detailed tax harvesting workflows
- Add historical rolling return analysis with real datasets
- Add alerts through email or WhatsApp

## 22. Final Summary

FundVista is a complete mutual fund research, portfolio analysis, planning, and optimization platform. It was built to make hidden costs visible, especially the long-term cost difference between Regular and Direct plans.

The project does not only show data. It explains what the data means, why it matters, and what the user can do next. This makes it useful for beginners while still offering advanced tools like XIRR, overlap analysis, benchmark comparison, volatility ratios, and rebalancing.

In one sentence:

**FundVista helps Indian mutual fund investors understand their funds, reduce unnecessary costs, improve portfolio quality, and make more informed long-term decisions.**
