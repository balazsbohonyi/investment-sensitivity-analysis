# Sensitivity Analysis Implementation Guide

## Purpose

This document provides a complete guide for implementing sensitivity analysis features in a financial projection application. It describes how to add tornado charts, heatmaps, and scenario comparison capabilities to an existing application that has basic input parameters and projection calculations.

## Prerequisites

Your application should already have:
- Input form for financial parameters (interest rates, growth rates, costs, etc.)
- Core calculation engine that produces financial projections based on inputs
- Basic data visualization (charts, tables) showing projection results
- React (or similar framework) with state management
- TypeScript for type safety (recommended but not required)

---

## Key Metrics for Analysis

The sensitivity analysis system analyzes five key output metrics that represent different aspects of investment performance:

### Available Metrics

| Metric | Description | Unit | Typical Range | Use Case |
|--------|-------------|------|---------------|----------|
| **IRR at 10 Years** | Internal Rate of Return over 10-year holding period | Percentage | 5% to 20% | Short-term investors, active portfolio managers |
| **IRR at 20 Years** | Internal Rate of Return over 20-year holding period | Percentage | 8% to 25% | Medium-term buy-and-hold strategy |
| **IRR at 40 Years** | Internal Rate of Return over 40-year holding period | Percentage | 10% to 30% | Long-term wealth building, retirement planning |
| **Total Cash Flow** | Cumulative net cash flow at projection end | Currency (€) | -50k to +500k | Liquidity analysis, cash-on-cash returns |
| **Net Worth** | Property equity + cumulative cash flow | Currency (€) | 100k to 2M+ | Total wealth accumulation, exit value |

### Metric Type Definition

```typescript
type MetricType = 'irr10' | 'irr20' | 'irr40' | 'cashflow' | 'networth';

interface MetricConfig {
  key: MetricType;
  label: string;
  format: 'percentage' | 'currency';
  description: string;
}

const METRICS: MetricConfig[] = [
  {
    key: 'irr10',
    label: 'IRR at 10 Years',
    format: 'percentage',
    description: 'Annualized return over 10-year period'
  },
  {
    key: 'irr20',
    label: 'IRR at 20 Years',
    format: 'percentage',
    description: 'Annualized return over 20-year period'
  },
  {
    key: 'irr40',
    label: 'IRR at 40 Years',
    format: 'percentage',
    description: 'Annualized return over 40-year period'
  },
  {
    key: 'cashflow',
    label: 'Total Cash Flow',
    format: 'currency',
    description: 'Cumulative net cash flow at projection end'
  },
  {
    key: 'networth',
    label: 'Net Worth',
    format: 'currency',
    description: 'Property equity plus cumulative cash flow'
  }
];
```

### Metric Formatting

```typescript
const formatMetric = (value: number, metric: MetricType): string => {
  const config = METRICS.find(m => m.key === metric);
  
  if (config?.format === 'percentage') {
    return `${value.toFixed(1)}%`;
  } else {
    // Currency - use condensed thousands notation
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return `${value.toFixed(0)}`;
  }
};
```

## Table of Contents

1. [User Workflow Overview](#user-workflow-overview)
2. [Architecture Overview](#architecture-overview)
3. [Data Structures](#data-structures)
4. [Sensitivity Variables Configuration](#sensitivity-variables-configuration)
5. [Tornado Chart Implementation](#tornado-chart-implementation)
6. [Heatmap Implementation](#heatmap-implementation)
7. [Scenario System Implementation](#scenario-system-implementation)
8. [Scenario Visualization Integration](#scenario-visualization-integration)
9. [UI Components and Styling](#ui-components-and-styling)
10. [Performance Optimization](#performance-optimization)
11. [Testing and Validation](#testing-and-validation)

---

## User Workflow Overview

### Complete User Journey

**1. Enable Sensitivity Analysis**
- User checks "Enable" checkbox in Sensitivity Analysis section
- Section expands to reveal three scenario buttons and analysis tools toggles

**2. Create Scenarios (Optional)**

**Path A: Optimistic Scenario**
- Click "Add Optimistic Scenario" button
- Dialog opens with "Optimistic Preset" pre-selected
- All sliders auto-populate with favorable values (lower interest, higher growth, zero vacancy)
- Blue banner explains directional consistency requirement
- User enters scenario name (e.g., "Strong Economy")
- User can fine-tune slider values (maintaining optimistic direction)
- User clicks "Create Scenario"
- New scenario card appears in Active Scenarios panel with blue color

**Path B: Pessimistic Scenario**
- Click "Add Pessimistic Scenario" button
- Dialog opens with "Pessimistic Preset" pre-selected
- Sliders auto-populate with conservative values (higher interest, lower growth, higher vacancy)
- User enters scenario name (e.g., "Recession")
- User can adjust sliders (maintaining pessimistic direction)
- User clicks "Create Scenario"
- New scenario card appears with purple color

**Path C: Custom Scenario**
- Click "Add Custom Scenario" button
- Dialog opens with "Custom" pre-selected
- All sliders at base values initially
- User enters scenario name (e.g., "Rate Hike Cycle")
- User adjusts any variables in any direction
- No directional restrictions
- User clicks "Create Scenario"
- New scenario card appears with orange color

**3. Manage Scenarios**
- Click scenario card header → Expands to show all adjusted variables with deltas
- Click "Edit" → Reopens dialog with all values populated for modification
- Click "Remove" → Immediately deletes scenario
- Create multiple scenarios for comparison

**4. Analyze with Tornado Chart**
- Click "Tornado Chart" toggle button (shows checkmark when enabled)
- Select metric from dropdown (IRR 10/20/40, Cash Flow, Net Worth)
- Base value badge appears next to dropdown
- Chart displays showing all variables ranked by impact
- Each variable shows:
  - Variable name and range/base info
  - Horizontal bar with min/max impact values
  - Green bars for favorable outcomes, red for unfavorable
- Identify most sensitive variables (longest bars at top)

**5. Analyze with Heatmap**
- Click "Heatmap (Two-Way)" toggle button
- Select horizontal axis variable (e.g., Interest Rate)
- Select vertical axis variable (e.g., Rent Increase)
- Select metric to analyze
- 5×5 color-coded grid appears
- Each cell shows metric outcome for that variable combination
- Red = worse outcomes, yellow = medium, green = better outcomes
- Optional glossy overlay creates smooth color transitions
- Identify interaction effects and optimal zones

**6. Compare Results**
- View area charts with base case + all scenario lines in different colors
- Compare metrics in summary table with columns for each scenario
- Toggle scenario visibility using checkboxes
- Understand range of possible outcomes across different assumptions

**7. Refine Analysis**
- Edit scenarios to test specific what-if questions
- Remove irrelevant scenarios to declutter charts
- Switch between different metrics in tornado/heatmap
- Export or share results with stakeholders

### Key UI Patterns

**Responsive Button Grid:**
```
[Optimistic]  [Pessimistic]  [Custom]
```
On mobile, wraps to vertical stack.

**Scenario Card States:**
```
Collapsed: [Name] [Badge] [Edit] [Remove] [+]
Expanded:  [Name] [Badge] [Edit] [Remove] [−]
           [Adjustment Grid showing all modified variables]
```

**Dialog Sections:**
```
[Header: Create/Edit Scenario]                    [X]
─────────────────────────────────────────────────────
[Scenario Name: ________________]
[Type: ▼ Custom / Optimistic / Pessimistic]
[Blue Banner if preset selected]

[Variable Cards - scrollable area]
  [Interest Rate]                         [Reset]
  ──────────────────────────── 3.75%
  2%                  [3.75%]              6%
  Base: 3.75% → Change: 0% → New: 3.75%
  
  [Rent Increase]                         [Reset]
  ──────────────────────────── 3.0%
  1%                  [3.0%]               5%
  
  [More variables...]
─────────────────────────────────────────────────────
                           [Cancel]  [Create Scenario]
```



## Architecture Overview

### Core Concept

Sensitivity analysis works by systematically varying input parameters and recalculating projections to understand how outputs respond to input changes. The system has three main components:

1. **Tornado Charts**: One-way sensitivity analysis - vary one variable at a time
2. **Heatmaps**: Two-way sensitivity analysis - vary two variables simultaneously  
3. **Scenarios**: Multi-variable analysis - vary any combination of inputs

### Calculation Flow

```
User Inputs (Base Case)
    ↓
[Define Sensitivity Variables & Ranges]
    ↓
[Generate Input Variations]
    ↓
[Run Projection Engine for Each Variation]
    ↓
[Extract Relevant Metrics from Results]
    ↓
[Visualize in Tornado/Heatmap/Scenario Charts]
```

### State Management Pattern

```typescript
// Base inputs
const [inputs, setInputs] = useState<PropertyInputs>({...});

// Sensitivity configuration
const [sensitivityEnabled, setSensitivityEnabled] = useState(false);
const [showTornadoChart, setShowTornadoChart] = useState(false);
const [showHeatmap, setShowHeatmap] = useState(false);

// Analysis selections
const [tornadoMetric, setTornadoMetric] = useState<MetricType>('irr20');
const [heatmapVarX, setHeatmapVarX] = useState<keyof Inputs>('interestRate');
const [heatmapVarY, setHeatmapVarY] = useState<keyof Inputs>('rentIncrease');
const [heatmapMetric, setHeatmapMetric] = useState<MetricType>('irr20');

// Scenarios
const [scenarios, setScenarios] = useState<Scenario[]>([]);
```

---

## Data Structures

### Input Types

```typescript
// Your existing input structure
interface PropertyInputs {
  // Financial parameters
  purchasePrice: number;
  equity: number;
  monthlyRent: number;
  
  // Rates (as percentages, e.g., 3.75 for 3.75%)
  interestRate: number;
  repaymentRate: number;
  rentIncrease: number;
  propertyValueIncrease: number;
  operatingCostsIncrease: number;
  vacancyRate: number;
  marginalTaxRate: number;
  depreciationRate: number;
  
  // Costs
  propertyManagement: number;
  maintenanceReserve: number;
  insurance: number;
  otherCosts: number;
  
  // Other parameters
  notaryRate: number;
  transferTaxRate: number;
  brokerRate: number;
  renovationCosts: number;
  married: boolean;
  churchTax: boolean;
}
```

### Sensitivity Variable Configuration

```typescript
interface SensitivityVariable {
  key: keyof PropertyInputs;
  name: string;
  min: number;
  max: number;
  step: number;
  baseValue: number;
}

const sensitivityVariables: SensitivityVariable[] = [
  {
    key: 'interestRate',
    name: 'Interest Rate',
    min: 2,
    max: 6,
    step: 0.25,
    baseValue: inputs.interestRate
  },
  {
    key: 'rentIncrease',
    name: 'Rent Increase',
    min: 1,
    max: 5,
    step: 0.5,
    baseValue: inputs.rentIncrease
  },
  {
    key: 'propertyValueIncrease',
    name: 'Property Value Increase',
    min: 0,
    max: 5,
    step: 0.5,
    baseValue: inputs.propertyValueIncrease
  },
  {
    key: 'operatingCostsIncrease',
    name: 'Operating Costs Increase',
    min: 1,
    max: 4,
    step: 0.5,
    baseValue: inputs.operatingCostsIncrease
  },
  {
    key: 'vacancyRate',
    name: 'Vacancy Rate',
    min: 0,
    max: 10,
    step: 1,
    baseValue: inputs.vacancyRate
  },
  {
    key: 'marginalTaxRate',
    name: 'Marginal Tax Rate',
    min: 30,
    max: 50,
    step: 1,
    baseValue: inputs.marginalTaxRate
  },
  {
    key: 'repaymentRate',
    name: 'Repayment Rate',
    min: 1,
    max: 3,
    step: 0.2,
    baseValue: inputs.repaymentRate
  },
  {
    key: 'depreciationRate',
    name: 'Depreciation Rate',
    min: 1,
    max: 3,
    step: 0.5,
    baseValue: inputs.depreciationRate
  }
];
```

### Sensitivity Variables Reference Table

This table defines the complete configuration for all sensitivity variables used in tornado charts, heatmaps, and scenarios:

| Variable | Parameter Key | Display Name | Min | Max | Step | Typical Base | Rationale |
|----------|--------------|--------------|-----|-----|------|--------------|-----------|
| **Interest Rate** | `interestRate` | Interest Rate | 2% | 6% | 0.25% | 3.75% | Range covers historically low (2%) to elevated (6%) mortgage rates. 0.25% steps match typical rate quote increments. |
| **Rent Increase** | `rentIncrease` | Rent Increase | 1% | 5% | 0.5% | 3% | Range from rent-controlled markets (1-2%) to strong growth markets (4-5%). 0.5% steps balance precision and usability. |
| **Property Value Increase** | `propertyValueIncrease` | Property Value Increase | 0% | 5% | 0.5% | 2% | Range from flat/declining markets (0%) to strong appreciation (5%). Matches typical long-term real estate growth patterns. |
| **Operating Costs Increase** | `operatingCostsIncrease` | Operating Costs Increase | 1% | 4% | 0.5% | 2.5% | Range from low inflation (1%) to higher cost growth (4%). Often differs from rental income growth. |
| **Vacancy Rate** | `vacancyRate` | Vacancy Rate | 0% | 10% | 1% | 3% | Range from continuous occupancy (0%) to higher turnover markets (10%). 1% steps provide adequate granularity. |
| **Marginal Tax Rate** | `marginalTaxRate` | Marginal Tax Rate | 30% | 50% | 1% | 42% | Range covers typical German tax brackets for real estate investors. Includes solidarity surcharge and church tax. |
| **Repayment Rate** | `repaymentRate` | Repayment Rate | 1% | 3% | 0.2% | 1.4% | Range from minimal paydown (1%) to aggressive debt reduction (3%). 0.2% steps allow fine-tuning. |
| **Depreciation Rate** | `depreciationRate` | Depreciation Rate | 1% | 3% | 0.5% | 2% | Range covers standard buildings (2%) and accelerated schedules (2.5-3%). 0.5% steps match legal categories. |

### Step Size Rationale

**Why Different Step Sizes:**

The step size for each variable is chosen based on:

1. **Practical Precision**: Interest rates are quoted in 0.25% increments in mortgage markets
2. **User Control**: Smaller steps (0.2% for repayment) allow fine-tuning; larger steps (1% for vacancy) prevent overwhelming choices
3. **Meaningful Differences**: Each step should represent a materially different scenario
4. **Slider Usability**: Too many steps make sliders hard to control; too few limit flexibility

**Implementation Note:**

When creating HTML range inputs, the `step` attribute should be set to these exact values:

```typescript
<input
  type="range"
  min={variable.min}
  max={variable.max}
  step={variable.step}  // Critical: matches table above
  value={currentValue}
  onChange={handleChange}
/>
```

This ensures sliders only snap to valid values and prevents floating-point precision issues.

### Variable Relationships and Constraints

**Important Considerations:**

1. **No Cross-Variable Validation**: Each variable is independent; system doesn't enforce relationships like "high interest + high growth is unrealistic"
2. **Clamping to Range**: All inputs must be clamped to [min, max] when entered manually
3. **Base Value Tracking**: The `baseValue` is updated whenever main inputs change, ensuring sensitivity analysis always tests relative to current settings
4. **Directional Consistency (Presets Only)**: Optimistic scenarios cannot have variables worse than base; pessimistic cannot have better than base



### Projection Results

```typescript
interface YearlyProjection {
  year: number;
  date: Date;
  propertyValue: number;
  grossRent: number;
  effectiveRent: number;
  operatingCosts: number;
  loanBalance: number;
  interestPaid: number;
  principalRepaid: number;
  depreciation: number;
  taxableIncome: number;
  incomeTax: number;
  taxSavings: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
  equity: number;
  netWorth: number;
}

interface ProjectionResults {
  years: YearlyProjection[];
  irr10: number;
  irr20: number;
  irr40: number;
  roi10: number;
  roi20: number;
  roi40: number;
}
```

### Tornado Chart Data

```typescript
interface TornadoDataPoint {
  variable: string;
  baseValue: number;
  minImpact: number;
  maxImpact: number;
  minDelta: number;
  maxDelta: number;
}
```

### Heatmap Data

```typescript
interface HeatmapDataPoint {
  x: number;  // Column index (0-4)
  y: number;  // Row index (0-4)
  xLabel: string;  // X-axis value label
  yLabel: string;  // Y-axis value label
  value: number;   // Metric value
}
```

### Scenario Data

```typescript
interface Scenario {
  id: string;
  name: string;
  type: 'optimistic' | 'pessimistic' | 'custom';
  inputs: PropertyInputs;
  color: string;  // For chart display
}
```

---

## Sensitivity Variables Configuration

### Step 1: Define Variables and Ranges

Create a configuration that specifies which input parameters can be varied and their allowable ranges:

```typescript
const useSensitivityVariables = (inputs: PropertyInputs): SensitivityVariable[] => {
  return useMemo(() => [
    {
      key: 'interestRate',
      name: 'Interest Rate',
      min: 2,
      max: 6,
      step: 0.25,
      baseValue: inputs.interestRate
    },
    // ... add all other variables
  ], [inputs]);
};
```

### Step 2: Generate Test Values

Create a helper function to generate evenly-spaced test values for a variable:

```typescript
const generateTestValues = (
  min: number,
  max: number,
  count: number = 5
): number[] => {
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => 
    Math.round((min + step * i) * 100) / 100
  );
};

// Example: generateTestValues(2, 6, 5) => [2, 3, 4, 5, 6]
```

### Step 3: Create Modified Input Sets

```typescript
const createModifiedInputs = (
  baseInputs: PropertyInputs,
  variableKey: keyof PropertyInputs,
  newValue: number
): PropertyInputs => {
  return {
    ...baseInputs,
    [variableKey]: newValue
  };
};
```

---

## Tornado Chart Implementation

### Calculation Logic

```typescript
const useTornadoData = (
  inputs: PropertyInputs,
  metric: MetricType,
  sensitivityVariables: SensitivityVariable[],
  projectionYears: number,
  calculateProjection: (inputs: PropertyInputs) => ProjectionResults
) => {
  return useMemo(() => {
    // Calculate base case
    const baseProjection = calculateProjection(inputs);
    const baseValue = extractMetric(baseProjection, metric, projectionYears);
    
    const tornadoData: TornadoDataPoint[] = [];
    
    // For each sensitivity variable
    for (const variable of sensitivityVariables) {
      // Test at minimum value
      const minInputs = createModifiedInputs(inputs, variable.key, variable.min);
      const minProjection = calculateProjection(minInputs);
      const minImpact = extractMetric(minProjection, metric, projectionYears);
      
      // Test at maximum value
      const maxInputs = createModifiedInputs(inputs, variable.key, variable.max);
      const maxProjection = calculateProjection(maxInputs);
      const maxImpact = extractMetric(maxProjection, metric, projectionYears);
      
      tornadoData.push({
        variable: variable.name,
        baseValue,
        minImpact,
        maxImpact,
        minDelta: minImpact - baseValue,
        maxDelta: maxImpact - baseValue
      });
    }
    
    // Sort by total impact (descending)
    tornadoData.sort((a, b) => {
      const impactA = Math.abs(a.minDelta) + Math.abs(a.maxDelta);
      const impactB = Math.abs(b.minDelta) + Math.abs(b.maxDelta);
      return impactB - impactA;
    });
    
    return tornadoData;
  }, [inputs, metric, sensitivityVariables, projectionYears, calculateProjection]);
};
```

### Metric Extraction Helper

```typescript
const extractMetric = (
  projection: ProjectionResults,
  metric: MetricType,
  projectionYears: number
): number => {
  switch (metric) {
    case 'irr10':
      return projection.irr10;
    case 'irr20':
      return projection.irr20;
    case 'irr40':
      return projection.irr40;
    case 'cashflow':
      const cfYear = projection.years[projectionYears - 1];
      return cfYear.cumulativeCashFlow;
    case 'networth':
      const nwYear = projection.years[projectionYears - 1];
      return nwYear.netWorth;
    default:
      return 0;
  }
};
```

### UI Component

```typescript
const TornadoChart: React.FC<{
  tornadoData: TornadoDataPoint[];
  metric: MetricType;
  baseValue: number;
  formatPercent: (value: number, decimals?: number) => string;
  formatCurrency: (value: number) => string;
}> = ({ tornadoData, metric, baseValue, formatPercent, formatCurrency }) => {
  const isPercentMetric = metric.startsWith('irr');
  
  // Calculate max delta for scaling
  const maxAbsDelta = Math.max(...tornadoData.map(d => 
    Math.max(Math.abs(d.minDelta), Math.abs(d.maxDelta))
  ));
  
  return (
    <div className="space-y-2">
      {tornadoData.map((item, idx) => {
        // Calculate bar widths as percentages
        const minWidthPercent = (Math.abs(item.minDelta) / maxAbsDelta) * 100;
        const maxWidthPercent = (Math.abs(item.maxDelta) / maxAbsDelta) * 100;
        
        // Determine bar colors (green=better, red=worse)
        const shouldSwapColors = item.maxImpact < item.baseValue;
        const leftBarColor = shouldSwapColors ? 'bg-green-500' : 'bg-red-500';
        const rightBarColor = shouldSwapColors ? 'bg-red-500' : 'bg-green-500';
        
        // Format display values
        const minDisplay = isPercentMetric 
          ? formatPercent(item.minImpact, 1)
          : `${(item.minImpact / 1000).toFixed(0)}k`;
        const maxDisplay = isPercentMetric 
          ? formatPercent(item.maxImpact, 1)
          : `${(item.maxImpact / 1000).toFixed(0)}k`;
        
        return (
          <div key={idx}>
            {/* Variable name and range */}
            <div className="flex items-baseline text-sm mb-1">
              <span className="font-medium text-gray-900">{item.variable}</span>
              <span className="text-xs text-gray-500 ml-2">
                Range info here
              </span>
            </div>
            
            {/* Bar chart */}
            <div className="relative">
              <div className="absolute inset-0 bg-gray-100 rounded"></div>
              <div className="relative flex items-center h-8">
                {/* Left side - minimum value */}
                <div className="flex-1 flex items-center justify-start pl-2">
                  <span className="text-xs font-medium text-white bg-black bg-opacity-50 px-2 py-0.5 rounded z-10">
                    {minDisplay}
                  </span>
                </div>
                
                {/* Bars and center line */}
                <div className="absolute inset-0 flex items-center">
                  {/* Left bar */}
                  <div className="flex-1 flex items-center justify-end">
                    <div 
                      className={`h-8 ${leftBarColor} rounded-l`}
                      style={{ width: `${minWidthPercent}%` }}
                    ></div>
                  </div>
                  
                  {/* Center line (base case) */}
                  <div className="w-1 h-10 bg-gray-800 mx-0.5 flex-shrink-0 relative z-10"></div>
                  
                  {/* Right bar */}
                  <div className="flex-1 flex items-center">
                    <div 
                      className={`h-8 ${rightBarColor} rounded-r`}
                      style={{ width: `${maxWidthPercent}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Right side - maximum value */}
                <div className="flex-1 flex items-center justify-end pr-2">
                  <span className="text-xs font-medium text-white bg-black bg-opacity-50 px-2 py-0.5 rounded z-10">
                    {maxDisplay}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

---

## Heatmap Implementation

### Calculation Logic

```typescript
const useHeatmapData = (
  inputs: PropertyInputs,
  varX: keyof PropertyInputs,
  varY: keyof PropertyInputs,
  metric: MetricType,
  sensitivityVariables: SensitivityVariable[],
  projectionYears: number,
  calculateProjection: (inputs: PropertyInputs) => ProjectionResults
) => {
  return useMemo(() => {
    const varXConfig = sensitivityVariables.find(v => v.key === varX);
    const varYConfig = sensitivityVariables.find(v => v.key === varY);
    
    if (!varXConfig || !varYConfig) return [];
    
    // Generate 5 test values for each variable
    const xValues = generateTestValues(varXConfig.min, varXConfig.max, 5);
    const yValues = generateTestValues(varYConfig.min, varYConfig.max, 5);
    
    const heatmapData: HeatmapDataPoint[] = [];
    
    // Calculate for all combinations
    yValues.forEach((yVal, yIdx) => {
      xValues.forEach((xVal, xIdx) => {
        const modifiedInputs = {
          ...inputs,
          [varX]: xVal,
          [varY]: yVal
        };
        
        const projection = calculateProjection(modifiedInputs);
        const value = extractMetric(projection, metric, projectionYears);
        
        heatmapData.push({
          x: xIdx,
          y: yIdx,
          xLabel: xVal.toFixed(1),
          yLabel: yVal.toFixed(1),
          value
        });
      });
    });
    
    return heatmapData;
  }, [inputs, varX, varY, metric, sensitivityVariables, projectionYears, calculateProjection]);
};
```

### Color Calculation Helper

```typescript
const getHeatmapColor = (
  value: number,
  minValue: number,
  maxValue: number
): string => {
  // Normalize value to 0-1 range
  const normalized = (value - minValue) / (maxValue - minValue);
  
  // Interpolate between red (low) -> yellow (mid) -> green (high)
  let r, g, b;
  
  if (normalized < 0.5) {
    // Red to Yellow
    const t = normalized * 2;
    r = 255;
    g = Math.round(100 + 155 * t);
    b = 100;
  } else {
    // Yellow to Green
    const t = (normalized - 0.5) * 2;
    r = Math.round(255 - 155 * t);
    g = 255;
    b = Math.round(100 + 155 * t);
  }
  
  return `rgb(${r}, ${g}, ${b})`;
};
```

### UI Component (Table-Based)

```typescript
const TableHeatmap: React.FC<{
  heatmapData: HeatmapDataPoint[];
  varXName: string;
  varYName: string;
  metric: MetricType;
  formatPercent: (value: number, decimals?: number) => string;
  formatCurrency: (value: number) => string;
  gapSize?: '0' | '1px';
  glossyOverlay?: boolean;
}> = ({ 
  heatmapData, 
  varXName, 
  varYName, 
  metric, 
  formatPercent, 
  formatCurrency,
  gapSize = '1px',
  glossyOverlay = false
}) => {
  const firstCellRef = useRef<HTMLTableCellElement>(null);
  const lastCellRef = useRef<HTMLTableCellElement>(null);
  const [overlayBounds, setOverlayBounds] = useState({ 
    top: 0, left: 0, width: 0, height: 0 
  });
  
  // Calculate overlay position - CRITICAL: ONLY covers data cells, NOT legend
  useEffect(() => {
    if (glossyOverlay && firstCellRef.current && lastCellRef.current) {
      // Function to calculate and update bounds
      const updateBounds = () => {
        const firstRect = firstCellRef.current!.getBoundingClientRect();
        const lastRect = lastCellRef.current!.getBoundingClientRect();
        const containerRect = firstCellRef.current!
          .closest('.heatmap-container')?.getBoundingClientRect();
        
        if (containerRect) {
          // IMPORTANT: Calculate bounds to cover ONLY the 5x5 colored cell grid
          // The refs are attached to the FIRST data cell (top-left, y=4 x=0) 
          // and LAST data cell (bottom-right, y=0 x=4)
          // This excludes header labels, row labels, and any legend below the table
          setOverlayBounds({
            top: firstRect.top - containerRect.top,
            left: firstRect.left - containerRect.left,
            width: lastRect.right - firstRect.left,
            height: lastRect.bottom - firstRect.top
          });
        }
      };
      
      // Call immediately
      updateBounds();
      
      // Recalculate after brief delay to handle any layout shifts
      // This ensures the overlay stays positioned correctly even if the table
      // takes a moment to fully render
      const timeoutId = setTimeout(updateBounds, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [glossyOverlay, heatmapData]);
  
  const minValue = Math.min(...heatmapData.map(d => d.value));
  const maxValue = Math.max(...heatmapData.map(d => d.value));
  const isPercentMetric = metric.startsWith('irr');
  
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', overflowX: 'auto' }}>
      <style>{`
        .heatmap-table { 
          border-collapse: collapse;
          border: none !important;
        }
        .heatmap-table th, .heatmap-table td { 
          border: none !important;
          padding: 0;
        }
        .heatmap-table tbody td.heatmap-data-cell { 
          border: ${gapSize} solid white !important;
          box-sizing: border-box;
        }
        .heatmap-container {
          position: relative;
          display: inline-block;
        }
        .heatmap-glossy-overlay {
          position: absolute;
          pointer-events: none;
          z-index: 1;
        }
        .heatmap-data-cell span {
          position: relative;
          z-index: 2;
        }
      `}</style>
      
      <div className="heatmap-container">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th colSpan={7} style={{ textAlign: 'center', padding: '8px' }}>
                {varXName}
              </th>
            </tr>
            <tr>
              <th style={{ width: '24px' }}></th>
              <th style={{ width: '24px' }}></th>
              {[0, 1, 2, 3, 4].map(x => {
                const cell = heatmapData.find(d => d.x === x);
                return (
                  <th key={x} style={{ textAlign: 'center', padding: '4px' }}>
                    {cell?.xLabel}%
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {[4, 3, 2, 1, 0].map((y, idx) => {
              const rowCells = [0, 1, 2, 3, 4].map(x => 
                heatmapData.find(d => d.x === x && d.y === y)
              );
              
              return (
                <tr key={y}>
                  {/* Vertical label */}
                  {idx === 0 && (
                    <th rowSpan={5} style={{ position: 'relative', width: '24px' }}>
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-90deg)',
                        whiteSpace: 'nowrap'
                      }}>
                        {varYName}
                      </div>
                    </th>
                  )}
                  
                  {/* Row label */}
                  <th style={{ position: 'relative', width: '24px' }}>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%) rotate(-90deg)',
                      whiteSpace: 'nowrap'
                    }}>
                      {rowCells[0]?.yLabel}%
                    </div>
                  </th>
                  
                  {/* Data cells */}
                  {rowCells.map((cell, x) => {
                    if (!cell) return null;
                    
                    const color = getHeatmapColor(cell.value, minValue, maxValue);
                    const displayValue = isPercentMetric 
                      ? formatPercent(cell.value, 1)
                      : `${(cell.value / 1000).toFixed(0)}k`;
                    
                    // CRITICAL: Attach refs to first and last DATA cells for overlay positioning
                    // First cell: top-left of grid (y=4, x=0)
                    // Last cell: bottom-right of grid (y=0, x=4)
                    // This ensures overlay ONLY covers the colored 5x5 grid
                    // and does NOT cover labels or legend
                    const isFirstCell = y === 4 && x === 0;
                    const isLastCell = y === 0 && x === 4;
                    
                    return (
                      <td 
                        key={x}
                        ref={isFirstCell ? firstCellRef : isLastCell ? lastCellRef : null}
                        className="heatmap-data-cell"
                        style={{ 
                          backgroundColor: color,
                          width: '100px',
                          height: '80px',
                          textAlign: 'center',
                          verticalAlign: 'middle'
                        }}
                      >
                        <span style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.25)',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 500
                        }}>
                          {displayValue}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              {/* Empty cells for label columns */}
              <td colSpan={2}></td>
              {/* Legend spans the data columns */}
              <td colSpan={5} style={{ padding: '12px 0', textAlign: 'center' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: '16px',
                  fontSize: '13px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      backgroundColor: 'rgb(255, 100, 100)',
                      borderRadius: '3px'
                    }}></div>
                    <span>Low</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      backgroundColor: 'rgb(255, 255, 100)',
                      borderRadius: '3px'
                    }}></div>
                    <span>Medium</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      backgroundColor: 'rgb(100, 255, 100)',
                      borderRadius: '3px'
                    }}></div>
                    <span>High</span>
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
        
        {/* Glossy overlay - positioned ONLY over data cells */}
        {/* Legend in tfoot is automatically excluded from overlay bounds */}
        {glossyOverlay && overlayBounds.width > 0 && overlayBounds.height > 0 && (
          <div 
            className="heatmap-glossy-overlay backdrop-blur-sm"
            style={{
              top: `${overlayBounds.top}px`,
              left: `${overlayBounds.left}px`,
              width: `${overlayBounds.width}px`,
              height: `${overlayBounds.height}px`,
              overflow: 'hidden'
            }}
          />
        )}
      </div>
    </div>
  );
};
```

---

## Scenario System Implementation

### Scenario State Management

```typescript
const [scenarios, setScenarios] = useState<Scenario[]>([]);

const addScenario = (scenario: Scenario) => {
  setScenarios(prev => [...prev, scenario]);
};

const updateScenario = (id: string, updates: Partial<Scenario>) => {
  setScenarios(prev => prev.map(s => 
    s.id === id ? { ...s, ...updates } : s
  ));
};

const removeScenario = (id: string) => {
  setScenarios(prev => prev.filter(s => s.id !== id));
};
```

### Preset Scenario Generation

```typescript
const generateOptimisticScenario = (baseInputs: PropertyInputs): PropertyInputs => {
  return {
    ...baseInputs,
    interestRate: Math.max(baseInputs.interestRate - 0.5, 2),
    rentIncrease: Math.min(baseInputs.rentIncrease + 1, 5),
    propertyValueIncrease: Math.min(baseInputs.propertyValueIncrease + 1, 5),
    vacancyRate: 0
  };
};

const generatePessimisticScenario = (baseInputs: PropertyInputs): PropertyInputs => {
  return {
    ...baseInputs,
    interestRate: Math.min(baseInputs.interestRate + 0.5, 6),
    rentIncrease: Math.max(baseInputs.rentIncrease - 1, 1),
    propertyValueIncrease: Math.max(baseInputs.propertyValueIncrease - 1, 0),
    vacancyRate: Math.min(baseInputs.vacancyRate + 3, 10),
    operatingCostsIncrease: Math.min(baseInputs.operatingCostsIncrease + 0.5, 4)
  };
};
```

### Scenario Projections Calculation

```typescript
const useScenarioProjections = (
  scenarios: Scenario[],
  projectionYears: number,
  calculateProjection: (inputs: PropertyInputs) => ProjectionResults
) => {
  return useMemo(() => {
    const projections: Record<string, ProjectionResults> = {};
    
    scenarios.forEach(scenario => {
      projections[scenario.id] = calculateProjection(scenario.inputs);
    });
    
    return projections;
  }, [scenarios, projectionYears, calculateProjection]);
};
```

### Scenario Dialog Component

The scenario dialog is a complex modal component that handles creating and editing scenarios with full variable adjustment capabilities.

```typescript
const ScenarioDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (scenario: Scenario) => void;
  baseInputs: PropertyInputs;
  sensitivityVariables: SensitivityVariable[];
  existingScenario?: Scenario;
}> = ({ isOpen, onClose, onSave, baseInputs, sensitivityVariables, existingScenario }) => {
  const [name, setName] = useState(existingScenario?.name || '');
  const [type, setType] = useState<ScenarioType>(existingScenario?.type || 'custom');
  const [adjustments, setAdjustments] = useState<Partial<PropertyInputs>>(
    existingScenario ? getAdjustments(existingScenario.inputs, baseInputs) : {}
  );
  
  // Apply preset when type changes
  useEffect(() => {
    if (type === 'optimistic') {
      const optimisticInputs = generateOptimisticScenario(baseInputs);
      setAdjustments(getAdjustments(optimisticInputs, baseInputs));
    } else if (type === 'pessimistic') {
      const pessimisticInputs = generatePessimisticScenario(baseInputs);
      setAdjustments(getAdjustments(pessimisticInputs, baseInputs));
    }
  }, [type, baseInputs]);
  
  const handleVariableChange = (key: keyof PropertyInputs, value: number) => {
    setAdjustments(prev => ({ ...prev, [key]: value }));
  };
  
  const resetVariable = (key: keyof PropertyInputs) => {
    setAdjustments(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };
  
  const handleSave = () => {
    const scenarioInputs = { ...baseInputs, ...adjustments };
    const scenario: Scenario = {
      id: existingScenario?.id || `scenario-${Date.now()}`,
      name,
      type,
      inputs: scenarioInputs,
      color: existingScenario?.color || assignColor(scenarios.length)
    };
    
    onSave(scenario);
    onClose();
  };
  
  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{existingScenario ? 'Edit Scenario' : 'Create New Scenario'}</span>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
      </DialogTitle>
      
      <DialogContent dividers>
        {/* Scenario Name Input */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
            Scenario Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Conservative Growth"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px'
            }}
          />
        </div>
        
        {/* Scenario Type Selector */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
            Scenario Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ScenarioType)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px'
            }}
          >
            <option value="custom">Custom (Manual Adjustments)</option>
            <option value="optimistic">Optimistic Preset</option>
            <option value="pessimistic">Pessimistic Preset</option>
          </select>
        </div>
        
        {/* Preset Warning Banner */}
        {type !== 'custom' && (
          <div style={{
            backgroundColor: '#dbeafe',
            border: '1px solid #93c5fd',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#1e40af'
          }}>
            <strong>Note:</strong> When using {type} preset, all adjustments must maintain 
            {type === 'optimistic' ? ' favorable' : ' conservative'} direction relative to base values.
          </div>
        )}
        
        {/* Variable Adjustments */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
            Variable Adjustments
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sensitivityVariables.map(variable => {
              const isAdjusted = adjustments.hasOwnProperty(variable.key);
              const currentValue = isAdjusted 
                ? adjustments[variable.key]! 
                : baseInputs[variable.key] as number;
              const delta = currentValue - variable.baseValue;
              
              return (
                <div
                  key={variable.key}
                  style={{
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: isAdjusted ? '#f3f4f6' : '#ffffff'
                  }}
                >
                  {/* Variable Header */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <label style={{ fontWeight: 500, fontSize: '14px' }}>
                      {variable.name}
                    </label>
                    {isAdjusted && (
                      <button
                        onClick={() => resetVariable(variable.key)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          color: '#6b7280',
                          backgroundColor: 'transparent',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  
                  {/* Range Slider */}
                  <input
                    type="range"
                    min={variable.min}
                    max={variable.max}
                    step={variable.step}
                    value={currentValue}
                    onChange={(e) => handleVariableChange(
                      variable.key, 
                      parseFloat(e.target.value)
                    )}
                    style={{ width: '100%', marginBottom: '8px' }}
                  />
                  
                  {/* Value Display */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    color: '#6b7280'
                  }}>
                    <span>{variable.min}%</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        value={currentValue}
                        onChange={(e) => handleVariableChange(
                          variable.key,
                          parseFloat(e.target.value) || variable.baseValue
                        )}
                        min={variable.min}
                        max={variable.max}
                        step={variable.step}
                        style={{
                          width: '70px',
                          padding: '4px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          textAlign: 'right'
                        }}
                      />
                      <span>%</span>
                    </div>
                    <span>{variable.max}%</span>
                  </div>
                  
                  {/* Delta Display */}
                  {isAdjusted && (
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '12px',
                      color: delta > 0 ? '#059669' : '#dc2626'
                    }}>
                      Base: {variable.baseValue}% → 
                      Change: {delta > 0 ? '+' : ''}{delta.toFixed(2)}% → 
                      New: {currentValue}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
      
      <DialogActions>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          style={{
            padding: '8px 16px',
            backgroundColor: name.trim() ? '#14b8a6' : '#d1d5db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: name.trim() ? 'pointer' : 'not-allowed'
          }}
        >
          {existingScenario ? 'Update Scenario' : 'Create Scenario'}
        </button>
      </DialogActions>
    </Dialog>
  );
};
```

**Helper Functions:**

```typescript
// Extract adjustments from scenario inputs
const getAdjustments = (
  scenarioInputs: PropertyInputs,
  baseInputs: PropertyInputs
): Partial<PropertyInputs> => {
  const adjustments: Partial<PropertyInputs> = {};
  
  Object.keys(scenarioInputs).forEach(key => {
    const k = key as keyof PropertyInputs;
    if (scenarioInputs[k] !== baseInputs[k]) {
      adjustments[k] = scenarioInputs[k];
    }
  });
  
  return adjustments;
};

// Assign colors to scenarios
const assignColor = (index: number): string => {
  const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];
  return colors[index % colors.length];
};
```

### Active Scenarios Display Component

```typescript
const ActiveScenariosPanel: React.FC<{
  scenarios: Scenario[];
  baseInputs: PropertyInputs;
  onEdit: (scenario: Scenario) => void;
  onRemove: (id: string) => void;
  sensitivityVariables: SensitivityVariable[];
}> = ({ scenarios, baseInputs, onEdit, onRemove, sensitivityVariables }) => {
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set());
  
  const toggleExpanded = (id: string) => {
    setExpandedScenarios(prev => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  };
  
  // Create base case scenario for display
  const baseScenario: Scenario = {
    id: 'base',
    name: 'Base Case (Reference)',
    type: 'custom',
    inputs: baseInputs,
    color: '#14b8a6'
  };
  
  const allScenarios = [baseScenario, ...scenarios];
  
  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
        Active Scenarios ({allScenarios.length})
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {allScenarios.map(scenario => {
          const isExpanded = expandedScenarios.has(scenario.id);
          const isBase = scenario.id === 'base';
          const adjustments = isBase ? {} : getAdjustments(scenario.inputs, baseInputs);
          const adjustedVariables = Object.keys(adjustments) as Array<keyof PropertyInputs>;
          
          return (
            <div
              key={scenario.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                borderLeft: `4px solid ${scenario.color}`,
                overflow: 'hidden'
              }}
            >
              {/* Scenario Header */}
              <div
                onClick={() => toggleExpanded(scenario.id)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#f9fafb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontWeight: 600 }}>{scenario.name}</span>
                  {!isBase && adjustedVariables.length > 0 && (
                    <span style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      backgroundColor: '#e5e7eb',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}>
                      {adjustedVariables.length} adjustments
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {!isBase && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(scenario);
                        }}
                        style={{
                          padding: '6px 12px',
                          fontSize: '13px',
                          backgroundColor: 'white',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(scenario.id);
                        }}
                        style={{
                          padding: '6px 12px',
                          fontSize: '13px',
                          color: '#dc2626',
                          backgroundColor: 'white',
                          border: '1px solid #fca5a5',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    </>
                  )}
                  
                  <span style={{ fontSize: '18px', color: '#6b7280' }}>
                    {isExpanded ? '−' : '+'}
                  </span>
                </div>
              </div>
              
              {/* Scenario Details (Expanded) */}
              {isExpanded && (
                <div style={{ padding: '16px' }}>
                  {isBase ? (
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>
                      Reference scenario using current input values. 
                      All other scenarios are compared against this baseline.
                    </p>
                  ) : adjustedVariables.length === 0 ? (
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>
                      No variables adjusted from base case.
                    </p>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px'
                    }}>
                      {adjustedVariables.map(key => {
                        const variable = sensitivityVariables.find(v => v.key === key);
                        if (!variable) return null;
                        
                        const adjustedValue = scenario.inputs[key] as number;
                        const baseValue = baseInputs[key] as number;
                        const delta = adjustedValue - baseValue;
                        const deltaColor = delta > 0 ? '#059669' : '#dc2626';
                        
                        return (
                          <div
                            key={key}
                            style={{
                              padding: '12px',
                              backgroundColor: '#f3f4f6',
                              borderRadius: '6px'
                            }}
                          >
                            <div style={{ 
                              fontSize: '13px', 
                              fontWeight: 500,
                              marginBottom: '4px'
                            }}>
                              {variable.name}
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: 600 }}>
                              {adjustedValue}%
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: deltaColor,
                              marginTop: '2px'
                            }}>
                              ({delta > 0 ? '+' : ''}{delta.toFixed(2)}%)
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

### Scenario Button Row

```typescript
const ScenarioButtonRow: React.FC<{
  onOpenDialog: (type: 'optimistic' | 'pessimistic' | 'custom') => void;
}> = ({ onOpenDialog }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px',
      marginBottom: '24px'
    }}>
      <button
        onClick={() => onOpenDialog('optimistic')}
        style={{
          padding: '12px 16px',
          backgroundColor: 'white',
          border: '2px solid #d1d5db',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 500
        }}
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        Add Optimistic Scenario
      </button>
      
      <button
        onClick={() => onOpenDialog('pessimistic')}
        style={{
          padding: '12px 16px',
          backgroundColor: 'white',
          border: '2px solid #d1d5db',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 500
        }}
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
        Add Pessimistic Scenario
      </button>
      
      <button
        onClick={() => onOpenDialog('custom')}
        style={{
          padding: '12px 16px',
          backgroundColor: 'white',
          border: '2px solid #d1d5db',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 500
        }}
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add Custom Scenario
      </button>
    </div>
  );
};
```

### Main Component Integration

```typescript
const SensitivityAnalysisSection: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'optimistic' | 'pessimistic' | 'custom'>('custom');
  const [editingScenario, setEditingScenario] = useState<Scenario | undefined>();
  
  const openDialog = (type: 'optimistic' | 'pessimistic' | 'custom') => {
    setDialogType(type);
    setEditingScenario(undefined);
    setDialogOpen(true);
  };
  
  const openEditDialog = (scenario: Scenario) => {
    setEditingScenario(scenario);
    setDialogOpen(true);
  };
  
  const handleSaveScenario = (scenario: Scenario) => {
    if (editingScenario) {
      updateScenario(scenario.id, scenario);
    } else {
      addScenario(scenario);
    }
    setDialogOpen(false);
    setEditingScenario(undefined);
  };
  
  return (
    <div>
      <h2>Sensitivity Analysis</h2>
      
      {/* Scenario Buttons */}
      <ScenarioButtonRow onOpenDialog={openDialog} />
      
      {/* Active Scenarios */}
      <ActiveScenariosPanel
        scenarios={scenarios}
        baseInputs={inputs}
        onEdit={openEditDialog}
        onRemove={removeScenario}
        sensitivityVariables={sensitivityVariables}
      />
      
      {/* Tornado & Heatmap Toggle Buttons */}
      {/* ... */}
      
      {/* Scenario Dialog */}
      <ScenarioDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingScenario(undefined);
        }}
        onSave={handleSaveScenario}
        baseInputs={inputs}
        sensitivityVariables={sensitivityVariables}
        existingScenario={editingScenario}
      />
    </div>
  );
};
```



---

## UI Components and Styling

### Responsive Grid Layout

```typescript
// For scenario buttons and form fields
const responsiveGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '0.75rem'
};
```

### Color Scheme

```typescript
const colors = {
  base: '#14b8a6',      // Teal for base case
  optimistic: '#3b82f6', // Blue for optimistic
  pessimistic: '#ef4444',// Red for pessimistic
  custom: '#8b5cf6',     // Purple for custom
  
  positive: '#10b981',   // Green for positive impact
  negative: '#ef4444',   // Red for negative impact
  neutral: '#6b7280'     // Gray for neutral
};
```

### Badge Styling

```typescript
const badgeStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0.25)',
  color: 'white',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 500,
  display: 'inline-block'
};
```

---

## Performance Optimization

### Memoization Strategy

```typescript
// Memoize expensive calculations
const baseProjection = useMemo(
  () => calculateProjection(inputs),
  [inputs]
);

const tornadoData = useMemo(
  () => calculateTornadoData(inputs, metric, sensitivityVariables),
  [inputs, metric, sensitivityVariables]
);

const heatmapData = useMemo(
  () => calculateHeatmapData(inputs, varX, varY, metric),
  [inputs, varX, varY, metric]
);
```

### Lazy Calculation

```typescript
// Only calculate when features are enabled
const tornadoData = useMemo(() => {
  if (!showTornadoChart) return [];
  return calculateTornadoData(...);
}, [showTornadoChart, ...dependencies]);
```

### Debouncing Input Changes

```typescript
const [debouncedInputs, setDebouncedInputs] = useState(inputs);

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedInputs(inputs);
  }, 300);
  
  return () => clearTimeout(timer);
}, [inputs]);

// Use debouncedInputs for calculations
const projection = calculateProjection(debouncedInputs);
```

---

## Testing and Validation

### Unit Tests for Calculations

```typescript
describe('Tornado Chart Calculations', () => {
  test('should calculate correct min/max impacts', () => {
    const tornadoData = calculateTornadoData(mockInputs, 'irr20', mockVariables);
    
    expect(tornadoData).toHaveLength(8);
    expect(tornadoData[0].variable).toBe('Interest Rate');
    expect(tornadoData[0].minImpact).toBeLessThan(tornadoData[0].maxImpact);
  });
  
  test('should sort by total impact', () => {
    const tornadoData = calculateTornadoData(mockInputs, 'irr20', mockVariables);
    
    for (let i = 0; i < tornadoData.length - 1; i++) {
      const currentImpact = Math.abs(tornadoData[i].minDelta) + 
                           Math.abs(tornadoData[i].maxDelta);
      const nextImpact = Math.abs(tornadoData[i+1].minDelta) + 
                        Math.abs(tornadoData[i+1].maxDelta);
      expect(currentImpact).toBeGreaterThanOrEqual(nextImpact);
    }
  });
});
```

### Integration Tests

```typescript
describe('Sensitivity Analysis Integration', () => {
  test('should update tornado chart when metric changes', () => {
    const { rerender } = render(<TornadoChart metric="irr20" {...props} />);
    
    expect(screen.getByText(/IRR/)).toBeInTheDocument();
    
    rerender(<TornadoChart metric="cashflow" {...props} />);
    
    expect(screen.getByText(/Cash Flow/)).toBeInTheDocument();
  });
});
```

### Validation Checks

```typescript
const validateSensitivityVariables = (variables: SensitivityVariable[]): boolean => {
  return variables.every(v => 
    v.min < v.max &&
    v.baseValue >= v.min &&
    v.baseValue <= v.max &&
    v.step > 0
  );
};

const validateScenario = (scenario: Scenario): boolean => {
  // Ensure all required fields are present
  if (!scenario.name || !scenario.inputs) return false;
  
  // Validate inputs are within reasonable ranges
  return Object.entries(scenario.inputs).every(([key, value]) => {
    if (typeof value === 'number') {
      return !isNaN(value) && isFinite(value);
    }
    return true;
  });
};
```

---

## Scenario Visualization Integration

### Displaying Scenarios in Area Charts

Scenarios should appear as colored lines overlaid on the base projection in area charts:

```typescript
const ProjectionChart: React.FC<{
  baseProjection: ProjectionResults;
  scenarios: Scenario[];
  scenarioProjections: Record<string, ProjectionResults>;
  metricKey: keyof YearlyProjection;
}> = ({ baseProjection, scenarios, scenarioProjections, metricKey }) => {
  // Prepare chart data
  const chartData = baseProjection.years.map((year, idx) => {
    const dataPoint: any = {
      year: year.year,
      date: year.date,
      base: year[metricKey]
    };
    
    // Add each scenario's data
    scenarios.forEach(scenario => {
      const projection = scenarioProjections[scenario.id];
      if (projection && projection.years[idx]) {
        dataPoint[scenario.id] = projection.years[idx][metricKey];
      }
    });
    
    return dataPoint;
  });
  
  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis />
        <Tooltip />
        <Legend />
        
        {/* Base case */}
        <Area 
          type="monotone" 
          dataKey="base" 
          stroke="#14b8a6" 
          fill="#14b8a6" 
          fillOpacity={0.2}
          name="Base Case"
        />
        
        {/* Scenario lines */}
        {scenarios.map(scenario => (
          <Line
            key={scenario.id}
            type="monotone"
            dataKey={scenario.id}
            stroke={scenario.color}
            strokeWidth={2}
            dot={false}
            name={scenario.name}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};
```

### Summary Metrics Table with Scenarios

```typescript
const MetricsTable: React.FC<{
  baseProjection: ProjectionResults;
  scenarios: Scenario[];
  scenarioProjections: Record<string, ProjectionResults>;
}> = ({ baseProjection, scenarios, scenarioProjections }) => {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
            Metric
          </th>
          <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
            Base Case
          </th>
          {scenarios.map(scenario => (
            <th 
              key={scenario.id}
              style={{ 
                padding: '12px', 
                borderBottom: '2px solid #e5e7eb',
                borderLeft: `3px solid ${scenario.color}`
              }}
            >
              {scenario.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ padding: '12px', fontWeight: 500 }}>IRR (10 Years)</td>
          <td style={{ padding: '12px', textAlign: 'center' }}>
            {formatPercent(baseProjection.irr10)}
          </td>
          {scenarios.map(scenario => {
            const projection = scenarioProjections[scenario.id];
            return (
              <td key={scenario.id} style={{ padding: '12px', textAlign: 'center' }}>
                {projection ? formatPercent(projection.irr10) : '-'}
              </td>
            );
          })}
        </tr>
        <tr>
          <td style={{ padding: '12px', fontWeight: 500 }}>IRR (20 Years)</td>
          <td style={{ padding: '12px', textAlign: 'center' }}>
            {formatPercent(baseProjection.irr20)}
          </td>
          {scenarios.map(scenario => {
            const projection = scenarioProjections[scenario.id];
            return (
              <td key={scenario.id} style={{ padding: '12px', textAlign: 'center' }}>
                {projection ? formatPercent(projection.irr20) : '-'}
              </td>
            );
          })}
        </tr>
        {/* Add more metric rows as needed */}
      </tbody>
    </table>
  );
};
```

### Scenario Toggle Checkboxes

Allow users to show/hide specific scenarios in charts:

```typescript
const ScenarioVisibilityControls: React.FC<{
  scenarios: Scenario[];
  visibleScenarios: Set<string>;
  onToggle: (id: string) => void;
}> = ({ scenarios, visibleScenarios, onToggle }) => {
  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
      {scenarios.map(scenario => (
        <label 
          key={scenario.id}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <input
            type="checkbox"
            checked={visibleScenarios.has(scenario.id)}
            onChange={() => onToggle(scenario.id)}
          />
          <div
            style={{
              width: '12px',
              height: '12px',
              backgroundColor: scenario.color,
              borderRadius: '2px'
            }}
          />
          <span>{scenario.name}</span>
        </label>
      ))}
    </div>
  );
};
```



This guide provides a complete implementation roadmap for adding sensitivity analysis to a financial projection application. Key takeaways:

1. **Architecture**: Separate data calculation from presentation
2. **State Management**: Use React hooks with memoization
3. **UI Components**: Build reusable, responsive components
4. **Performance**: Leverage memoization and lazy calculation
5. **Testing**: Validate calculations and user interactions

The tornado chart, heatmap, and scenario system work together to provide comprehensive sensitivity analysis that helps users understand how their projections respond to changing assumptions.
