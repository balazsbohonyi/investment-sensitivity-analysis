# Vacancy Rate Analysis

## Overview

This document explains how the vacancy rate is factored into the German Buy-to-Let Property Analyzer projections and its cascading effects on financial metrics.

## Vacancy Rate Calculation Logic

The vacancy rate is applied as a **simple percentage reduction** to gross rental income. Here's the calculation flow:

### 1. Gross Rent (Theoretical Maximum)

```typescript
const grossRent = inputs.monthlyRent * 12 * Math.pow(1 + inputs.rentIncreaseRate / 100, year);
```

This represents 100% occupancy with annual rent increases compounded.

### 2. Effective Rent (After Vacancy) - src/App.tsx:213

```typescript
const effectiveRent = grossRent * (1 - inputs.vacancyRate / 100);
```

**Example:**
- Gross rent = €30,000/year
- Vacancy rate = 3%
- Effective rent = €30,000 × 0.97 = **€29,100**

### 3. Cascading Effects

The reduced `effectiveRent` then impacts multiple downstream calculations:

#### A. Taxable Income (line 257)

```typescript
taxableRentalIncome = effectiveRent - totalOperatingCosts - interestPaid - depreciation
```

- Lower effective rent → more negative taxable income
- **Partial offset:** More negative income = higher tax savings
- Tax savings = `|taxableRentalIncome| × marginalTaxRate × 1.08` (if church tax applies)

#### B. Cash Flow (lines 276-277)

```typescript
grossCashFlow = effectiveRent - totalOperatingCosts - annualLoanPayment
netCashFlow = grossCashFlow + taxSavings
```

- Direct reduction in gross cash flow
- Partially offset by increased tax savings

#### C. Cumulative Metrics

- **Cumulative Cash Flow:** Reduced every year, compounds over time
- **Net Worth:** `equity + cumulativeCashFlow` is lower
- **IRR:** Uses the entire cash flow series, so lower cash flows reduce the internal rate of return

## Impact Example: 0% vs 5% Vacancy

Let's say you have €30,000 gross rent and €20,000 in deductible expenses:

| Vacancy Rate | Effective Rent | Taxable Income | Tax Savings (42% rate) | Net Impact |
|--------------|----------------|----------------|------------------------|------------|
| **0%** | €30,000 | €10,000 | -€4,200 (tax liability) | -€4,200 |
| **5%** | €28,500 | €8,500 | -€3,570 (tax liability) | -€3,570 |
| **Difference** | **-€1,500** | **-€1,500** | **+€630** | **-€870/year** |

**Key insight:** A 5% vacancy reduces gross rent by €1,500, but the tax reduction of €630 partially offsets this, resulting in a **net annual impact of -€870**.

## Sensitivity Analysis Integration

Vacancy rate is one of the 8 sensitivity variables (src/App.tsx:788):

- **Range:** 0% to 10% (1% step)
- **Default:** 0%
- **Direction:** Higher is worse (pessimistic scenarios use 5%, optimistic use 0%)
- **Tornado charts** show how vacancy affects IRR/cash flow/net worth
- **Heatmaps** can combine vacancy with other variables (e.g., vacancy × rent increase)

## Implementation Details

### Data Structure

The vacancy rate is stored in the `PropertyInputs` interface:

```typescript
interface PropertyInputs {
  // ... other fields
  vacancyRate: number; // % annual rent loss
}
```

### Sensitivity Variable Configuration

```typescript
{
  name: 'Vacancy Rate',
  key: 'vacancyRate',
  min: 0,
  max: 10,
  step: 1,
  unit: '%',
  currentValue: inputs.vacancyRate
}
```

### Preset Scenarios

**Optimistic Scenario:**
```typescript
vacancyRate: 0  // Assumes full occupancy
```

**Pessimistic Scenario:**
```typescript
vacancyRate: 5  // Assumes 5% annual vacancy
```

### Validation Logic

The application enforces directional consistency in scenarios:

- **Optimistic scenarios:** Vacancy rate can only be decreased or kept at base value
- **Pessimistic scenarios:** Vacancy rate can only be increased or kept at base value

```typescript
// For optimistic scenarios: lower is better
if (key === 'vacancyRate') {
  return value <= baseValue;
}

// For pessimistic scenarios: higher is worse
if (key === 'vacancyRate') {
  return value >= baseValue;
}
```

## Key Takeaways

1. **Simple but Realistic:** Vacancy is applied as a uniform percentage reduction across all years, representing average annual occupancy loss

2. **Tax Offset Effect:** Higher vacancy rates increase tax savings, partially offsetting the rental income loss (typically offsetting 40-50% of the loss depending on marginal tax rate)

3. **Cumulative Impact:** The effect compounds over time through cumulative cash flow and affects long-term metrics like IRR and net worth

4. **Conservative Default:** The application defaults to 0% vacancy, but typical German rental markets experience 2-5% vacancy rates

5. **Sensitivity Testing:** The 0-10% range allows testing extreme scenarios, from perfect occupancy to significant structural vacancy issues

## German Market Context

In German rental markets:
- **A-Cities (Berlin, Munich, Hamburg):** 1-3% typical vacancy
- **B-Cities:** 3-5% typical vacancy
- **C-Cities/Rural:** 5-10% or higher
- **Rent Control Areas:** Lower vacancy due to high demand
- **New Developments:** Higher initial vacancy during lease-up period

The 3% default represents a moderate assumption suitable for established properties in good locations.
