# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **German Buy-to-Let Property Analyzer** - a comprehensive React/TypeScript financial modeling tool for analyzing rental property investments in Germany. The application provides 10/20/40-year projections with sophisticated sensitivity analysis including tornado charts, heatmaps, and multi-scenario comparisons.

**Key Technologies:**
- React 18.3 with TypeScript 5.6
- Vite 6.0 for build tooling
- Recharts 2.13 for data visualization
- Tailwind CSS 3.4 for styling

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:5173 by default)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Note:** The application runs entirely client-side with no backend. All calculations execute in the browser.

## Architecture Overview

### Single-Component Design

The entire application is implemented in a **single monolithic component** (`src/App.tsx` - ~2,400 lines). This architectural choice was made for simplicity and deployment to artifact environments but creates some challenges:

- All state management, calculation logic, and UI rendering live in one file
- ~30+ React hooks (`useState`, `useMemo`) manage complex interdependent state
- No separation between business logic and presentation layers
- All TypeScript interfaces defined at file top

### State Management Pattern

The application uses **React hooks exclusively** - no external state management:

- `useState` for all user inputs and UI toggles
- `useMemo` for expensive calculations (projections, sensitivity analysis)
- Memoization dependencies carefully tuned to prevent unnecessary recalculation
- State flows: User Input → Base Projection → Sensitivity Analysis → Visualizations

**Critical Pattern:** The base projection calculates all 40 years internally, but the UI displays only the selected time horizon (10/20/40 years). This allows instant horizon switching without recalculation.

### Key Data Flow

```
PropertyInputs (all form fields)
    ↓
Base Projection Calculation (useMemo)
    ↓
├─→ Yearly Projections (40 years of detailed data)
├─→ IRR/ROI Metrics (10/20/40 year horizons)
│
├─→ Tornado Chart Data (if enabled)
│   └─→ 8 variables × 2 endpoints = 16 projections
│
├─→ Heatmap Data (if enabled)
│   └─→ 5×5 grid = 25 projections
│
└─→ Scenario Projections (for each active scenario)
    └─→ Full 40-year projection per scenario
```

## Financial Calculation Engine

### Core Calculations (in order of execution)

1. **Acquisition Costs**: Purchase price + notary + transfer tax + broker + renovation
2. **Loan Financing**: Annuity loan with monthly compounding (30-year term)
3. **Property Value**: Geometric growth at annual rate
4. **Rental Income**: Monthly rent × 12, compounded annually, adjusted for vacancy
5. **Operating Costs**: Sum of management/maintenance/insurance/other, compounded annually
6. **Depreciation (AfA)**: 80% of purchase price × depreciation rate (straight-line)
7. **German Tax**: Progressive rates (14-45%) + solidarity surcharge + church tax (optional)
8. **Cash Flow**: Rent - Operating Costs - Loan Payment ± Tax Savings
9. **IRR**: Newton-Raphson method (100 iterations, 0.01% convergence)

**Important:** All percentage inputs are stored as whole numbers (e.g., 3.75 for 3.75%) and must be divided by 100 in calculations. This is a common source of bugs.

### German Tax Implementation

The tax calculation implements the **2024/2025 German progressive tax formula** with:
- Basic allowance (Grundfreibetrag): €11,604 for single filers
- Progressive zones using polynomial formulas (not discrete brackets)
- Married filing jointly (Ehegattensplitting): Calculate tax on half income, double result
- Solidarity surcharge: 5.5% above threshold (€16,369 single, €32,734 married)
- Church tax: 8% of income tax (optional, based on membership)

**Tax Savings from Losses:** When taxable rental income is negative, multiply loss by marginal rate × 1.08 (if church tax applies) to get tax benefit. This is a key driver of returns in early years.

## Sensitivity Analysis System

### Three Analysis Types

1. **Tornado Charts** (One-Way Sensitivity)
   - Test each of 8 variables independently at min/max values
   - Sort by total impact magnitude (longest bars at top)
   - Color coding: Green = better outcome, Red = worse outcome
   - 17 total calculations (base + 8 variables × 2 endpoints)

2. **Heatmaps** (Two-Way Sensitivity)
   - Test all combinations of 2 variables across 5 evenly-spaced values
   - 25 calculations (5×5 grid) per heatmap
   - Color gradient: Red (low) → Yellow (mid) → Green (high)
   - Uses RGB interpolation, normalized to actual value range

3. **Scenarios** (Multi-Variable)
   - User defines complete alternative input sets
   - Three types: Optimistic Preset, Pessimistic Preset, Custom
   - Each scenario gets distinct color from palette
   - Full 40-year projection per scenario for complete comparison

### Sensitivity Variables (8 total)

| Variable | Min | Max | Step | Typical Base |
|----------|-----|-----|------|--------------|
| Interest Rate | 2% | 6% | 0.25% | 3.75% |
| Rent Increase | 1% | 5% | 0.5% | 3.0% |
| Property Value Increase | 0% | 5% | 0.5% | 2.0% |
| Operating Costs Increase | 1% | 4% | 0.5% | 2.5% |
| Vacancy Rate | 0% | 10% | 1.0% | 3.0% |
| Marginal Tax Rate | 30% | 50% | 1.0% | 42.0% |
| Repayment Rate | 1% | 3% | 0.2% | 1.4% |
| Depreciation Rate | 1% | 3% | 0.5% | 2.0% |

**Step sizes are critical:** They determine slider precision and prevent floating-point errors. Changing step sizes affects both range inputs and numeric inputs in the scenario dialog.

### Analysis Metrics (5 available)

- **IRR at 10/20/40 Years**: Internal Rate of Return (percentage)
- **Total Cash Flow**: Cumulative net cash at projection end (€ thousands)
- **Net Worth**: Property equity + cumulative cash (€ thousands)

Metrics are selected via dropdown in tornado/heatmap controls.

## Component Structure (within App.tsx)

Despite being a single file, the code has logical sections:

1. **Type Definitions** (lines 1-150): All TypeScript interfaces
2. **Main Component Start** (line ~200): `GermanPropertyAnalyzer` function
3. **State Declarations** (lines ~200-300): All useState hooks
4. **Calculation Memos** (lines ~300-600): Base projection, scenarios, sensitivity
5. **Input Forms** (lines ~600-1200): Property/Financing/Tax/Growth sections
6. **Sensitivity Analysis UI** (lines ~1200-1600): Scenario dialog, tornado, heatmap
7. **Visualization Components** (lines ~1600-2000): Charts and tables
8. **Helper Functions** (scattered): Format functions, color calculations

**When modifying:** Search for the specific section name (e.g., "Sensitivity Analysis") as the file has clear comment headers.

## Heatmap Implementation Details

The heatmap uses an **HTML `<table>` structure** (not canvas/SVG) for perfect alignment:

- Main header row: Horizontal variable name (colspan=7)
- Column headers: 5 value labels for horizontal variable
- Data rows: Vertical variable label (rowspan=5, rotated 90°) + row value labels + 5×5 colored cells
- Cell styling: Background color = gradient, foreground = semi-transparent badge with value
- Glossy overlay (optional): `backdrop-blur-sm` positioned over ONLY the 5×5 data cells using refs

**Critical:** The glossy overlay refs attach to first data cell (y=4, x=0) and last data cell (y=0, x=4) to calculate bounds that exclude labels and legend. This prevents blur on text while creating smooth color transitions.

### Responsive Breakpoints

- **Default (>1024px)**: 100×80px cells, 14px font
- **Tablet (≤1024px)**: 80×70px cells, 13px font
- **Mobile (≤768px)**: 60×60px cells, 11px font
- **Small (≤480px)**: 50×50px cells, 10px font

## Scenario System Details

### Preset Scenarios

**Optimistic:**
- Interest Rate: -0.5% (min 2%)
- Rent Increase: +1.0% (max 5%)
- Property Value Increase: +1.0% (max 5%)
- Vacancy Rate: 0%

**Pessimistic:**
- Interest Rate: +0.5% (max 6%)
- Rent Increase: -1.0% (min 1%)
- Property Value Increase: -1.0% (min 0%)
- Vacancy Rate: +3% (max 10%)
- Operating Costs Increase: +0.5% (max 4%)

**Directional Consistency:** When using presets, users cannot adjust variables in the opposite direction (e.g., cannot increase interest rate in optimistic scenario). Validation should prevent this.

### Scenario Dialog Structure

1. **Scenario Name** (text input, required)
2. **Scenario Type** (dropdown: Custom/Optimistic/Pessimistic)
3. **Variable Cards** (8 cards, one per sensitivity variable)
   - Each card: Name, slider, min/max labels, numeric input, delta display
   - Cards turn gray background when adjusted
   - "Reset" button appears when adjusted
4. **Footer Actions**: Cancel (transparent) / Save (teal, disabled if no name)

**Color Assignment:** Scenarios receive colors from palette `['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981']` in order of creation (cycles if >5 scenarios).

## Performance Considerations

### Expensive Operations

1. **Full Projection Calculation**: ~40 years of detailed calculations (taxes, cash flow, IRR)
2. **Tornado Chart**: 17 full projections (base + 8 variables × 2)
3. **Heatmap**: 25 full projections (5×5 grid)
4. **IRR Calculation**: Newton-Raphson iteration (up to 100 iterations per horizon)

### Optimization Strategies

- **Memoization is critical**: All `useMemo` hooks have precise dependency arrays
- **Lazy calculation**: Tornado/heatmap only calculate when enabled (`if (!showTornado) return []`)
- **Conditional rendering**: Large tables/charts don't render when sections collapsed
- **Debouncing**: Not currently implemented but recommended for input changes

**Watch out for:** Accidentally triggering recalculation by including unstable references in dependency arrays (e.g., inline objects/functions).

## Common Development Tasks

### Adding a New Sensitivity Variable

1. Update `sensitivityVariables` array with new variable config
2. Ensure variable exists in `PropertyInputs` interface
3. Add to scenario dialog (automatic if using map over `sensitivityVariables`)
4. Update preset scenario formulas if relevant
5. Test tornado chart, heatmap, and scenarios with new variable

### Adding a New Analysis Metric

1. Add to `MetricType` type definition
2. Update `extractMetric` function to handle new type
3. Add to metric dropdown options in tornado/heatmap controls
4. Update formatting functions (`formatPercent` or condensed thousands notation)
5. Test visualization with new metric across all analysis types

### Modifying Tax Calculations

1. Update tax formulas in calculation engine (search "German Tax")
2. Update `docs/CALCULATIONS.md` with new formulas
3. Test edge cases: negative income, married vs single, church tax on/off
4. Verify IRR still converges (tax changes can affect cash flows)

### Refactoring into Multiple Files

If splitting the monolith:

1. **Extract interfaces** → `types/index.ts`
2. **Extract calculation engine** → `utils/calculations.ts` (pure functions)
3. **Extract components** → `components/PropertyInputs.tsx`, `components/TornadoChart.tsx`, etc.
4. **Extract hooks** → `hooks/useProjection.ts`, `hooks/useSensitivityAnalysis.ts`
5. Keep main `App.tsx` as orchestrator

**Warning:** Current memoization depends on all state being in one component. Refactoring requires careful prop/context design to maintain performance.

## Testing Strategy

No tests currently exist. When adding tests:

### Unit Tests (Priority 1)
- Tax calculation formulas (match German tax law)
- IRR calculation convergence
- Depreciation calculations (80/20 split, rate application)
- Annuity loan balance formulas

### Integration Tests (Priority 2)
- Tornado chart data matches manual calculations
- Heatmap color interpolation correctness
- Scenario projections independence (changing one doesn't affect others)

### Visual Regression (Priority 3)
- Responsive breakpoints (desktop/tablet/mobile)
- Chart rendering consistency
- Heatmap alignment (labels match cells exactly)

## Important Files

- **`docs/README.md`**: 560 lines of detailed architectural documentation
- **`docs/CALCULATIONS.md`**: Complete mathematical formulas for all calculations
- **`docs/SENSITIVITY_ANALYSIS_IMPLEMENTATION_GUIDE.md`**: Step-by-step implementation guide
- **`docs/HEATMAP_ARCHITECTURE.md`**: Table-based heatmap design specification
- **`src/App.tsx`**: Entire application (2,378 lines)
- **`package.json`**: Dependencies and scripts

## German Real Estate Context

The application models German-specific features:

- **Rent Control (Mietpreisbremse)**: Limits rent increases in many cities (2-3% typical)
- **Transfer Tax (Grunderwerbsteuer)**: 3.5-6.5% depending on state
- **Depreciation (AfA)**: 2% for post-1925 buildings, 2.5% for older
- **Ehegattensplitting**: Married filing jointly with income splitting
- **Speculation Period (Spekulationsfrist)**: 10-year capital gains exemption (not modeled)

**Default values** reflect German market conditions circa 2024-2025.

## Known Limitations

1. **No data persistence**: All state lost on page refresh (could add localStorage)
2. **No PDF export**: Documented as future enhancement
3. **No property comparison**: Can only analyze one property at a time
4. **Fixed 30-year loan term**: German mortgages vary but this is hardcoded
5. **Simplified solidarity surcharge**: Uses approximation vs. complex official formula
6. **No Monte Carlo simulation**: Only deterministic scenarios

## Development Notes

- **Node version**: Requires Node ≥20.0.0 (specified in `package.json`)
- **Browser support**: Modern browsers only (uses ES2020+ features)
- **Build output**: Static files in `dist/` directory
- **Hot reload**: Works well in Vite dev server, no special config needed
- **TypeScript**: Strict mode not enabled; some `any` types exist

## Troubleshooting

**Tornado chart bars misaligned:** Check that `maxAbsDelta` calculation includes all variables.

**Heatmap labels don't match cells:** Verify table structure has correct rowspan/colspan values.

**IRR returns NaN:** Ensure cash flow series has sign change (initial negative, later positive).

**Percentages displaying wrong:** Verify division by 100 applied where needed.

**Memoization not working:** Check dependency arrays don't include unstable references.
