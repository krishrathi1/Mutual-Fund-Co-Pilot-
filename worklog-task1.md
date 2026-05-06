## Task 1: Fix TypeScript Errors in FundVista (Completed)

### Summary
Fixed all 5 TypeScript errors in the `src/` directory. After fixes, `npx tsc --noEmit` shows zero errors in `src/`.

### Changes Made

1. **src/components/AICopilot.tsx** — Added `generateFallbackResponse` function as a module-level function before the component. It takes a query string and returns helpful fallback responses about Indian mutual funds based on keyword matching (direct/switch, save/saving, overlap, tax, xirr, diversification/portfolio, and a generic default).

2. **src/components/FundDetail.tsx** — Changed `ease: [0.25, 0.46, 0.45, 0.94]` to `ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]` in the `sectionVar` animation variants. This satisfies TypeScript's `Easing[]` type by explicitly typing the tuple instead of letting it infer `number[]`.

3. **src/components/FundHeatmap.tsx** — Changed `(f as Record<string, unknown>)` to `(f as unknown as Record<string, unknown>)` on line 146. This double-cast through `unknown` avoids the error about converting `FundData` to `Record<string, unknown>`.

4. **src/components/RiskProfiler.tsx** — Removed `ringColor: PIE_COLORS[i]` from the inline style object on line 305. `ringColor` is not a valid CSS property in `CSSProperties`. The ring styling is already handled by Tailwind CSS classes (`ring-2 ring-offset-1 ring-offset-background`).

5. **src/components/SectorExposure.tsx** — Three changes:
   - Imported `type HoldingData` from `@/lib/store`
   - Changed the `computeSectorExposure` parameter type from the inline type to `HoldingData[]`
   - Changed `holding.fund.topHoldings` to `holding.fund.topHolding` to match the actual `FundData` interface property name

### Verification
Ran `npx tsc --noEmit 2>&1 | grep "src/"` — no errors found in `src/`. Remaining errors are only in `examples/` and `skills/` directories (not part of this task).
