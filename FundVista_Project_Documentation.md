# FundVista (Mutual Fund Co-Pilot)
## Complete Feature, Logic & Architecture Documentation

### 1. Executive Summary
FundVista is an institutional-grade mutual fund analytics and portfolio management platform. The primary objective of the platform is to provide retail investors with transparent, actionable insights into their investments, specifically focusing on uncovering the hidden commission costs associated with "Regular" mutual fund plans. 

### 2. Core Philosophy: The "Why"
The financial industry often obscures the long-term impact of expense ratios. A difference of 0.75% (75 basis points) between a Direct and Regular plan may seem insignificant, but compounded over 20-30 years, it can cost an investor millions of rupees. 

**The Goal:** Move away from abstract percentages and show investors the exact *monetary value* they are losing. Every feature in FundVista is engineered to highlight this cost difference and encourage optimal, cost-efficient investing.

---

### 3. The "Discover" Module
*This module is designed to help users navigate the universe of thousands of mutual funds and find the ones that match their criteria.*

#### 3.1 Explore Funds
*   **What it is:** A comprehensive search and filtering interface for the mutual fund market.
*   **How & Why (Logic):** It uses real-time search and categorization (Equity, Debt, Hybrid). Crucially, it lists the Direct and Regular variants of the same fund side-by-side, immediately highlighting the "bps" (basis points) difference in their expense ratios.
*   **Key Engine:** The `calcLifetimeSavings` function calculates the projected lifetime cost of choosing the Regular plan over the Direct plan, turning a simple search into a powerful educational tool.

#### 3.2 Fund Screener
*   **What it is:** An advanced filtering engine.
*   **How & Why (Logic):** Investors need to narrow down funds based on strict criteria. The screener aggregates user states (AUM range, min returns, max expense ratio, risk level) and queries the database to return a tightly matched list. The results highlight performance metrics and the Sharpe Ratio (risk-adjusted return) for quick evaluation.

#### 3.3 AMC Analysis
*   **What it is:** An evaluation of the Asset Management Companies (AMCs) rather than individual funds.
*   **How & Why (Logic):** It aggregates market-wide data to show Total AUM, average expense ratios, and fund counts per AMC. This helps users avoid institutional concentration risk and identify which fund houses are generally more cost-effective.

#### 3.4 Fund Detail (The Deep Dive)
*   **What it is:** A 5-tab comprehensive teardown of a single mutual fund.
*   **How & Why (Logic):** 
    *   **Overview:** Compares costs and risk metrics.
    *   **Portfolio:** Breaks down asset allocation into pie charts.
    *   **Benchmark:** Tracks if the fund is beating the market.
    *   **Savings:** Projects the exact lifetime savings of the Direct plan.
    *   **Switch?:** Evaluates if the user should switch, calculating potential exit loads and short-term capital gains tax penalties.

---

### 4. The "Analyze" Module
*This module acts as an X-ray for the user's personal portfolio, diagnosing health, risk, and inefficiencies.*

#### 4.1 Portfolio Builder
*   **What it is:** The foundational tool where users track their holdings.
*   **How & Why (Logic):** It tracks invested capital vs. current value. Its primary logic engine scans the portfolio for "Regular" plans and aggregates the "Portfolio Switch Savings" showing the exact wealth the user is bleeding to commissions across 1, 5, 10, and 30-year horizons.

#### 4.2 Compare View
*   **What it is:** A side-by-side battle between Direct and Regular variants of the user's selected funds.
*   **How & Why (Logic):** 
    *   It uses a **Radar Chart** to normalize and plot Expense Ratios, Returns, and AUM on a 0-100 scale.
    *   It calculates the **Tracking Error** to mathematically prove to the user that both funds hold the exact same stocks, meaning the lower return of the Regular plan is 100% due to commission fees.

#### 4.3 Fund Overlap
*   **What it is:** Detects if multiple mutual funds are buying the same underlying stocks.
*   **How & Why (Logic):** It cross-references the top holdings of the user's funds. It generates an overlap matrix (heatmap) and network graph. If the overlap is >60%, it flags a "High Overlap" warning, advising the user to consolidate funds because they are paying multiple managers for the exact same exposure (false diversification).

#### 4.4 Sector Exposure
*   **What it is:** Analyzes the industries the portfolio is invested in.
*   **How & Why (Logic):** It maps the underlying stocks to their respective sectors (IT, Healthcare, Financials) and calculates the weighted exposure. It uses a Herfindahl-Hirschman Index (HHI) inspired formula to ensure the user is not overly concentrated in a single sector, which could lead to catastrophic losses if that industry crashes.

#### 4.5 Diversification Score
*   **What it is:** A holistic health grade (0-100) for the portfolio.
*   **How & Why (Logic):** It runs a proprietary scoring algorithm weighing 4 dimensions: Category Mix (Equity/Debt), AMC Diversity (Institutional risk), Sector Diversity, and Market Cap (Large/Mid/Small). It deducts points for heavy concentration and generates AI-style text suggestions (e.g., "You are overly tilted towards Large Caps").

#### 4.6 Benchmark Comparison
*   **What it is:** Verifies if a fund manager is doing their job.
*   **How & Why (Logic):** It subtracts the benchmark index's return from the fund's return to calculate **Alpha**. A positive Alpha means the manager beat the market; a negative Alpha means the user is paying a fee to underperform a basic index fund.

#### 4.7 Volatility Analysis
*   **What it is:** Institutional-grade risk assessment.
*   **How & Why (Logic):** It calculates:
    *   **Max Drawdown:** The worst historical drop from peak to trough.
    *   **Sortino/Sharpe Ratios:** Measures how much return the fund generates per unit of risk taken.
    *   It categorizes the fund into risk buckets (Low to Very High) by comparing its annualized volatility against the category average.

---

### 5. Plan & Optimize Modules (Calculators & Tools)
*These tools help users plan for the future and optimize their tax liabilities.*

#### 5.1 Financial Calculators (SIP, Goal, Retirement)
*   **Logic:** Standard compounding interest formulas mapped to specific user goals (e.g., reaching ₹1 Crore). It reverse-engineers the required monthly SIP based on an expected CAGR.

#### 5.2 XIRR Calculator
*   **Logic:** Unlike absolute returns, XIRR (Extended Internal Rate of Return) accurately calculates the annualized return of multiple SIPs made at different dates, giving the true performance of an actively contributed portfolio.

#### 5.3 Tax Calculator & Optimizer
*   **Logic:** Calculates Short-Term Capital Gains (STCG) and Long-Term Capital Gains (LTCG) based on the latest Indian tax slabs (e.g., 12.5% LTCG above ₹1.25 Lakh). The optimizer advises on "Tax Harvesting" — selling and rebuying assets to reset the purchase price and legally utilize the ₹1.25 Lakh tax-free limit every year.

#### 5.4 AI Co-Pilot
*   **Logic:** A generative AI integration that can read the user's specific portfolio state, explain complex financial terms (like "Sortino Ratio"), and provide contextual advice on whether to hold, switch, or sell a specific fund based on its metrics.

---
**Tech Stack Summary:**
*   **Frontend:** Next.js 16 (React), Tailwind CSS, Framer Motion (Animations), Shadcn UI.
*   **Data Visualization:** Recharts (Radar, Area, Bar, Pie charts) and custom SVG components.
*   **State Management:** Zustand (for complex client-side portfolio aggregation).
*   **Backend/Data:** Prisma ORM, providing real-time data fetching for the API endpoints.
