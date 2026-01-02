# German Buy-to-Let Property Analyzer - Calculation Formulas

## Document Purpose

This document provides complete mathematical specifications for all financial calculations performed by the German Buy-to-Let Property Analyzer. Each formula is presented with variable definitions, computation steps, and implementation notes to ensure consistency and accuracy during future development or maintenance activities. This documentation should be updated whenever calculation logic changes to maintain alignment between the codebase and this specification.

## Acquisition Cost Calculations

### Total Acquisition Cost

The total acquisition cost represents all funds required to purchase and prepare the property for rental operation.

**Formula:**
```
Total Acquisition Cost = Purchase Price × (1 + Notary Rate + Transfer Tax Rate + Broker Rate) + Renovation Costs
```

**Variable Definitions:**
- Purchase Price: Base purchase price agreed with seller (euros)
- Notary Rate: Notary and land registry fees as percentage (typically 1.5%)
- Transfer Tax Rate: Real estate transfer tax as percentage (3.5% to 6.5% depending on German state)
- Broker Rate: Real estate broker commission as percentage
- Renovation Costs: Fixed amount for immediate repairs or improvements (euros)

**Implementation Notes:**
All percentage rates are stored as whole numbers (e.g., 1.5 for 1.5%) and must be divided by one hundred before multiplication in the formula. The notary, transfer tax, and broker rates compound on the purchase price multiplicatively. Renovation costs are added as an absolute value after the percentage-based costs are calculated.

### Loan Amount Calculation

The loan amount equals the difference between total acquisition cost and the equity contribution.

**Formula:**
```
Loan Amount = Total Acquisition Cost - Equity
```

**Variable Definitions:**
- Total Acquisition Cost: Calculated per formula above (euros)
- Equity: Down payment or equity contribution from investor (euros)

**Implementation Notes:**
The equity amount must be less than or equal to the total acquisition cost. In the rare case where equity exceeds acquisition cost, the loan amount would be zero and all loan-related calculations should treat the property as fully equity-financed.

## Loan Financing Calculations

### Annuity Loan Outstanding Balance

The outstanding loan balance at any point during the loan term follows the standard annuity formula with monthly compounding.

**Formula for Outstanding Balance at Year N:**
```
Monthly Rate = (Interest Rate + Repayment Rate) / 100 / 12
Months Elapsed = N × 12
Total Loan Term Months = 30 × 12

Monthly Payment = Loan Amount × Monthly Rate / (1 - (1 + Monthly Rate)^(-Total Loan Term Months))

Outstanding Balance = Loan Amount × (1 + Monthly Rate)^Months Elapsed - Monthly Payment × ((1 + Monthly Rate)^Months Elapsed - 1) / Monthly Rate
```

**Variable Definitions:**
- Interest Rate: Annual interest rate as percentage (e.g., 3.75)
- Repayment Rate: Annual repayment rate as percentage (e.g., 1.4)
- Loan Amount: Initial loan principal calculated above (euros)
- N: Number of complete years elapsed since loan origination

**Implementation Notes:**
The monthly rate combines both interest and repayment components, which is characteristic of German annuity loans where the total payment remains constant but the split between interest and principal changes over time. The formula assumes a maximum thirty-year term, which is standard for German residential mortgages. If the months elapsed exceeds the total loan term months, the outstanding balance should be set to zero as the loan would be fully repaid.

The calculation uses monthly compounding even though annual figures are reported, reflecting the actual payment structure of German mortgages where monthly payments are standard. The outstanding balance formula derives from the present value of remaining payments.

### Annual Loan Payment Components

The annual loan payment consists of interest and principal repayment portions.

**Formula:**
```
Annual Interest Rate = Interest Rate / 100
Annual Repayment Rate = Repayment Rate / 100
Annual Payment Rate = Annual Interest Rate + Annual Repayment Rate

Annual Loan Payment = Outstanding Balance × Annual Payment Rate
Interest Paid = Outstanding Balance × Annual Interest Rate
Principal Repaid = Annual Loan Payment - Interest Paid
```

**Variable Definitions:**
- Outstanding Balance: Current loan balance at start of year (euros)
- Interest Rate: Annual interest rate as percentage
- Repayment Rate: Annual repayment rate as percentage

**Implementation Notes:**
The annual payment is calculated by applying the combined rate to the current outstanding balance. As the balance decreases over time, the absolute payment amount also decreases in later years. The interest portion represents the cost of borrowing and is tax-deductible, while the principal portion represents equity accumulation and is not tax-deductible but does increase the investor's ownership stake.

## Property Value and Rental Income

### Property Value Appreciation

Property value grows at a constant annual rate over the projection period.

**Formula:**
```
Property Value at Year N = Purchase Price × (1 + Property Value Growth Rate / 100)^N
```

**Variable Definitions:**
- Purchase Price: Initial purchase price (euros)
- Property Value Growth Rate: Annual appreciation rate as percentage
- N: Number of complete years elapsed

**Implementation Notes:**
The formula uses geometric compounding, which is appropriate for long-term asset appreciation. A growth rate of zero represents flat property values, while negative rates would model depreciation scenarios. The property value calculation does not account for capital improvements beyond the initial renovation costs included in acquisition cost.

### Gross and Effective Rental Income

Rental income grows at a specified rate and is adjusted for vacancy losses.

**Formula:**
```
Gross Rent at Year N = Monthly Rent × 12 × (1 + Rent Increase Rate / 100)^N
Effective Rent at Year N = Gross Rent × (1 - Vacancy Rate / 100)
```

**Variable Definitions:**
- Monthly Rent: Initial monthly rental rate (euros)
- Rent Increase Rate: Annual rent growth rate as percentage
- Vacancy Rate: Expected vacancy rate as percentage of gross rent
- N: Number of complete years elapsed

**Implementation Notes:**
The gross rent formula applies geometric compounding to reflect typical rental market dynamics where percentage increases compound over time. The vacancy rate applies as a simple reduction to gross rent, representing the expected proportion of time when the property is unrented or rent is uncollectible. A vacancy rate of zero assumes perfect occupancy, which may be unrealistic for most rental properties.

## Operating Costs

### Total Annual Operating Costs

Operating costs encompass all recurring expenses required to maintain and manage the rental property.

**Formula:**
```
Monthly Operating Costs = Property Management + Maintenance Reserve + Insurance + Other Costs
Total Operating Costs at Year N = Monthly Operating Costs × 12 × (1 + Operating Costs Growth Rate / 100)^N
```

**Variable Definitions:**
- Property Management: Monthly property management fee (euros)
- Maintenance Reserve: Monthly maintenance and repair reserve (euros)
- Insurance: Monthly insurance premium (euros)
- Other Costs: Other monthly costs such as property tax, HOA fees (euros)
- Operating Costs Growth Rate: Annual cost inflation rate as percentage
- N: Number of complete years elapsed

**Implementation Notes:**
Operating costs are assumed to inflate at a constant rate that may differ from rental income growth. This differential growth modeling captures the reality that costs often track general inflation while rental income growth may be constrained by rent control or market conditions. The maintenance reserve represents an allocation for future expenses rather than actual expenditures, smoothing the impact of lumpy capital expenditures over time.

## Depreciation (Absetzung für Abnutzung)

### Annual Depreciation Deduction

German tax law permits straight-line depreciation of the building portion of the property investment.

**Formula:**
```
Building Value = Purchase Price × 0.80
Annual Depreciation = Building Value × (Depreciation Rate / 100)
```

**Variable Definitions:**
- Purchase Price: Initial purchase price (euros)
- Depreciation Rate: Annual depreciation rate as percentage (typically 2% or 2.5%)

**Implementation Notes:**
The building value calculation assumes that eighty percent of the purchase price represents the building structure while twenty percent represents land value. Land is not depreciable under German tax law. The depreciation rate of two percent corresponds to a fifty-year depreciation period and applies to buildings completed after 1925. Older buildings may qualify for 2.5% depreciation corresponding to a forty-year period.

Depreciation is calculated on the initial building value and does not adjust for subsequent changes in property market value. The depreciation deduction continues for the full depreciation period (fifty years for 2% rate, forty years for 2.5% rate) regardless of how long the investor holds the property, though most projection periods are shorter than these maximum terms.

## German Tax Calculations

### Taxable Rental Income

Taxable rental income represents the net income subject to taxation after all allowable deductions.

**Formula:**
```
Taxable Rental Income = Effective Rent - Total Operating Costs - Interest Paid - Annual Depreciation
```

**Variable Definitions:**
- Effective Rent: Gross rent adjusted for vacancy (euros)
- Total Operating Costs: Sum of all operating expenses (euros)
- Interest Paid: Interest portion of loan payment (euros)
- Annual Depreciation: Depreciation deduction calculated above (euros)

**Implementation Notes:**
The taxable rental income can be negative, creating a loss that offsets other income. Principal repayment is not deductible, only the interest portion of loan payments. Operating costs are fully deductible in the year incurred. The depreciation deduction is a non-cash expense that reduces taxable income without requiring cash outflow.

### German Income Tax Calculation

The German income tax formula implements the 2024/2025 progressive rate structure.

**Formula for Single Taxpayers:**
```
If Taxable Income ≤ 11,604:
    Income Tax = 0

Else If Taxable Income ≤ 17,005:
    Y = (Taxable Income - 11,604) / 10,000
    Income Tax = (922.98 × Y + 1,400) × Y

Else If Taxable Income ≤ 66,760:
    Z = (Taxable Income - 17,005) / 10,000
    Income Tax = (181.19 × Z + 2,397) × Z + 1,025.38

Else If Taxable Income ≤ 277,825:
    Income Tax = 0.42 × Taxable Income - 10,602.13

Else:
    Income Tax = 0.45 × Taxable Income - 18,936.88
```

**Formula for Married Taxpayers (Ehegattensplitting):**
```
Income Per Person = Taxable Income / 2
Tax Per Person = Calculate income tax on Income Per Person using single taxpayer formula above
Total Income Tax = Tax Per Person × 2
```

**Variable Definitions:**
- Taxable Income: Total taxable income combining rental income and other income (euros)

**Implementation Notes:**
The basic allowance (Grundfreibetrag) of 11,604 euros remains tax-free. The formula uses polynomial expressions in the lower progression zones to implement Germany's smooth progressive taxation without discrete bracket jumps. The married filing jointly calculation (Ehegattensplitting) calculates tax on half the combined income and doubles the result, which benefits couples with disparate incomes.

The taxable income for this calculation should combine the taxable rental income (which may be negative) with the investor's annual income from other sources. When taxable rental income is negative, it reduces the total taxable income and thus the overall tax burden.

### Solidarity Surcharge (Solidaritätszuschlag)

The solidarity surcharge applies to income tax amounts above certain thresholds.

**Formula:**
```
Solidarity Threshold = 16,369 for single, 32,734 for married

If Income Tax > Solidarity Threshold:
    Solidarity Surcharge = (Income Tax - Solidarity Threshold) × 0.055 × 1.2
Else:
    Solidarity Surcharge = 0
```

**Variable Definitions:**
- Income Tax: Calculated income tax amount (euros)

**Implementation Notes:**
The solidarity surcharge of 5.5% applies only to the income tax amount exceeding the threshold, not to the full tax amount. The factor of 1.2 represents a simplified approximation of the phase-in mechanism where the surcharge gradually increases from zero to the full 5.5% rate. This simplified calculation provides reasonable accuracy for typical investment scenarios without implementing the complex official formula with its midpoint and upper bound calculations.

### Church Tax (Kirchensteuer)

Church tax applies only for taxpayers who are members of tax-collecting religious organizations.

**Formula:**
```
If Church Tax Liability = True:
    Church Tax = Income Tax × 0.08
Else:
    Church Tax = 0
```

**Variable Definitions:**
- Income Tax: Calculated income tax amount (euros)
- Church Tax Liability: Boolean indicating membership in tax-collecting religious organization

**Implementation Notes:**
The church tax rate is eight percent of income tax in most German states. Bavaria and Baden-Württemberg use a nine percent rate, but the tool defaults to eight percent as the more common rate. Church tax is itself deductible from taxable income in the following year, but the tool does not model this circular dependency for simplicity. Church tax applies to the full income tax amount without any threshold or exemption.

### Combined Tax Calculation

The total tax burden combines all three tax components.

**Formula:**
```
Total Tax = Income Tax + Solidarity Surcharge + Church Tax
```

**Implementation Notes:**
All three components must be calculated in sequence as each depends on the prior component. The income tax calculation forms the foundation, the solidarity surcharge depends on the income tax amount, and the church tax also depends on the income tax amount.

### Tax Savings from Rental Losses

When taxable rental income is negative, the loss generates tax savings.

**Formula:**
```
If Taxable Rental Income < 0:
    Loss Amount = |Taxable Rental Income|
    Base Tax Savings = Loss Amount × (Marginal Tax Rate / 100)
    
    If Church Tax Liability = True:
        Tax Savings = Base Tax Savings × 1.08
    Else:
        Tax Savings = Base Tax Savings
Else:
    Tax Savings = 0 (investor owes additional tax on positive rental income)
```

**Variable Definitions:**
- Taxable Rental Income: Calculated net rental income (euros, may be negative)
- Marginal Tax Rate: Investor's marginal tax rate as percentage

**Implementation Notes:**
The calculation uses the marginal tax rate rather than recalculating total tax because the change in taxable income from the rental loss is incremental. The 1.08 multiplier for church tax liability accounts for the fact that church tax increases with the tax savings from income tax. When taxable rental income is positive, the investor owes additional tax rather than receiving tax savings, and this amount would be calculated as the positive taxable rental income multiplied by the marginal rate (and church tax factor if applicable).

## Cash Flow Analysis

### Gross Cash Flow Calculation

Gross cash flow represents the pre-tax cash generation or consumption.

**Formula:**
```
Gross Cash Flow = Effective Rent - Total Operating Costs - Annual Loan Payment
```

**Variable Definitions:**
- Effective Rent: Rental income after vacancy adjustment (euros)
- Total Operating Costs: Sum of all operating expenses (euros)
- Annual Loan Payment: Total loan payment including interest and principal (euros)

**Implementation Notes:**
Gross cash flow can be negative when rental income is insufficient to cover operating costs and loan payments, which is common in the early years of leveraged real estate investments. Negative gross cash flow indicates that the investor must contribute additional funds from other sources to maintain the property.

### Net Cash Flow Calculation

Net cash flow represents the after-tax cash generation or consumption.

**Formula:**
```
Net Cash Flow = Gross Cash Flow + Tax Savings
```

**Variable Definitions:**
- Gross Cash Flow: Pre-tax cash flow calculated above (euros)
- Tax Savings: Tax benefit from rental losses or tax cost of rental profits (euros)

**Implementation Notes:**
Tax savings are added to gross cash flow because they represent either actual tax refunds (when losses offset other income) or reduced tax payments relative to a scenario without the rental property. When taxable rental income is positive and generates a tax liability, the tax savings variable would be negative, correctly reducing the net cash flow.

### Cumulative Cash Flow Calculation

Cumulative cash flow tracks the running total of all cash flows since investment inception.

**Formula:**
```
Cumulative Cash Flow at Year N = Sum of (Net Cash Flow from Year 1 through Year N)
```

**Implementation Notes:**
Cumulative cash flow begins at zero and becomes increasingly negative if the investor experiences sustained negative cash flows, or increasingly positive if the investment generates consistent positive cash flows. The cumulative figure helps investors understand the total capital required to maintain the investment and when they can expect to recover their initial equity contribution.

## Return Metrics

### Equity Calculation

Equity represents the investor's ownership stake in the property.

**Formula:**
```
Equity at Year N = Property Value at Year N - Outstanding Loan Balance at Year N
```

**Variable Definitions:**
- Property Value at Year N: Appreciated property value (euros)
- Outstanding Loan Balance at Year N: Remaining loan principal (euros)

**Implementation Notes:**
Equity grows through two mechanisms: property appreciation increases the numerator while loan repayment decreases the denominator. In the early years, equity growth primarily comes from principal repayment, while in later years property appreciation typically dominates as the loan balance approaches zero.

### Net Worth Calculation

Net worth combines property equity with cumulative cash flow to represent total investor position.

**Formula:**
```
Net Worth at Year N = Equity at Year N + Cumulative Cash Flow at Year N
```

**Variable Definitions:**
- Equity at Year N: Calculated ownership stake (euros)
- Cumulative Cash Flow at Year N: Sum of all historical cash flows (euros)

**Implementation Notes:**
Net worth provides a comprehensive measure of the investor's total position including both the asset value net of debt and the actual cash contributed or withdrawn over the holding period. An investor with positive equity but deeply negative cumulative cash flow has built paper wealth but required substantial cash injections to maintain the investment.

### Internal Rate of Return (IRR) Calculation

The IRR represents the discount rate that makes the net present value of all cash flows equal to zero.

**Formula (Newton-Raphson Method):**
```
Cash Flows = [-Initial Equity, Year 1 Net Cash Flow, Year 2 Net Cash Flow, ..., Final Year Net Cash Flow + Final Year Equity]

Initial Rate Guess = 0.10

For Iteration = 1 to 100:
    NPV = Sum over all years of (Cash Flow[year] / (1 + Rate)^year)
    NPV Derivative = Sum over all years of (-year × Cash Flow[year] / (1 + Rate)^(year+1))
    
    New Rate = Rate - NPV / NPV Derivative
    
    If |New Rate - Rate| < 0.0001:
        IRR = New Rate × 100
        Break
    
    Rate = New Rate

IRR Percentage = Rate × 100
```

**Variable Definitions:**
- Initial Equity: Investor's down payment (euros)
- Net Cash Flow: Annual after-tax cash flows (euros)
- Final Year Equity: Property equity at end of period (euros)

**Implementation Notes:**
The IRR calculation treats the initial equity as a negative cash flow (cash outflow) at time zero. Each year's net cash flow represents the annual return, and the final year includes both the regular cash flow and the equity value to represent the theoretical liquidation proceeds. The Newton-Raphson method iteratively refines the rate estimate until convergence, typically achieving accuracy to 0.01% within fewer than twenty iterations for reasonable cash flow patterns.

The IRR calculation is performed separately for ten-year, twenty-year, and forty-year horizons using the appropriate subset of cash flows and the equity value at the corresponding time point. IRR cannot be calculated when the cash flow series does not have a sign change (e.g., all negative values), though this situation is rare for real estate investments with reasonable assumptions.

### Return on Investment (ROI) Calculation

ROI measures the total return multiple on invested capital.

**Formula:**
```
ROI at Year N = ((Net Worth at Year N / Initial Equity) - 1) × 100
```

**Variable Definitions:**
- Net Worth at Year N: Total investor position at year N (euros)
- Initial Equity: Original down payment (euros)

**Implementation Notes:**
ROI represents the percentage return on the original investment without consideration of timing. A two hundred percent ROI means the investor has tripled their initial capital. ROI is simpler to calculate and understand than IRR but does not account for the time value of money. An investment with the same ROI achieved over ten years is fundamentally different from one achieved over forty years, though the ROI percentage would be identical.

## Average Annual Cash Flow

The average annual cash flow provides a simple measure of typical yearly cash generation.

**Formula:**
```
Average Annual Cash Flow = Cumulative Cash Flow at Year N / N
```

**Variable Definitions:**
- Cumulative Cash Flow at Year N: Total of all cash flows through year N (euros)
- N: Number of years in the calculation period

**Implementation Notes:**
This metric provides a rough estimate of annual cash generation but obscures the fact that cash flows typically improve dramatically over the investment holding period as rents rise and loan payments decline. Early years often show negative cash flows while later years generate substantial positive flows, making the average somewhat misleading as a representation of any particular year.

## Projection Timeline

### Start Date Calculation

All projections begin on the first day of the month following the current date.

**Formula:**
```
If Today's Date is in Month M and Year Y:
    Projection Start Date = First day of Month (M + 1) in Year Y
    
    If M = December:
        Projection Start Date = January 1 of Year (Y + 1)
```

**Implementation Notes:**
This consistent start date rule ensures that projections always begin at a month boundary, simplifying the annual calculations and making results comparable across different analysis dates. Users running the analysis on any day of the current month will see projections starting from the same future date.

### Annual Date Progression

Each year in the projection represents a complete twelve-month period from the start date.

**Formula:**
```
Date for Year N = Projection Start Date + (N years)
```

**Implementation Notes:**
The calculation engine generates internal data for all forty years regardless of the selected display horizon, allowing users to switch between ten-year, twenty-year, and forty-year views without recalculating the underlying projections. The user interface displays only the selected subset of years while maintaining the complete dataset in memory.

## Maintenance and Update Guidelines

This calculations document must be updated whenever any of the following occur:

1. Changes to financial calculation formulas or algorithms
2. Modifications to German tax law implementation
3. Updates to depreciation rules or building value assumptions
4. Changes to loan calculation methodology or assumptions
5. Alterations to growth rate compounding methods
6. Adjustments to return metric calculations

When updating this document, provide clear change notes explaining what was modified and why, reference any authoritative sources for tax or financial calculations, and update both the formula and implementation notes to maintain consistency with the actual codebase implementation.

---

## Sensitivity Analysis Calculations

### Overview

Sensitivity analysis examines how output metrics respond to changes in input variables. The system implements three types of analysis: tornado charts (one-way sensitivity), heatmaps (two-way sensitivity), and scenarios (multi-variable sensitivity).

### Sensitivity Variables Configuration

The system defines eight key input variables that can be varied for sensitivity analysis. Each variable has specified minimum and maximum values and step increments:

| Variable | Parameter Key | Min | Max | Step | Base (Typical) |
|----------|--------------|-----|-----|------|----------------|
| Interest Rate | `interestRate` | 2% | 6% | 0.25% | 3.75% |
| Rent Increase | `rentIncrease` | 1% | 5% | 0.5% | 3.0% |
| Property Value Increase | `propertyValueIncrease` | 0% | 5% | 0.5% | 2.0% |
| Operating Costs Increase | `operatingCostsIncrease` | 1% | 4% | 0.5% | 2.5% |
| Vacancy Rate | `vacancyRate` | 0% | 10% | 1.0% | 3.0% |
| Marginal Tax Rate | `marginalTaxRate` | 30% | 50% | 1.0% | 42.0% |
| Repayment Rate | `repaymentRate` | 1% | 3% | 0.2% | 1.4% |
| Depreciation Rate | `depreciationRate` | 1% | 3% | 0.5% | 2.0% |

**Implementation Notes:**
All percentage values are stored as whole numbers (e.g., 3.75 for 3.75%) and must be divided by 100 when used in calculations. The step sizes ensure that slider controls and numeric inputs snap to valid values. The base values shown are typical starting points but vary based on actual user inputs.

### Analysis Metrics

Sensitivity analysis can examine five different output metrics:

| Metric Code | Display Name | Data Type | Format | Extraction Source |
|-------------|--------------|-----------|--------|-------------------|
| `irr10` | IRR at 10 Years | Percentage | "12.5%" | ProjectionResults.irr10 |
| `irr20` | IRR at 20 Years | Percentage | "15.3%" | ProjectionResults.irr20 |
| `irr40` | IRR at 40 Years | Percentage | "18.7%" | ProjectionResults.irr40 |
| `cashflow` | Total Cash Flow | Currency | "342k" | ProjectionResults.years[N-1].cumulativeCashFlow |
| `networth` | Net Worth | Currency | "1450k" | ProjectionResults.years[N-1].netWorth |

**Implementation Notes:**
IRR metrics are stored directly at the ProjectionResults level as they represent calculated returns over the entire period. Cash flow and net worth metrics must be extracted from the specific year corresponding to the projection horizon (year index = projection years - 1, since arrays are zero-indexed). Currency values are displayed in condensed thousands notation (value / 1000) with "k" suffix for space efficiency in charts.



### Tornado Chart Calculations

**Purpose:**
Tornado charts identify which input variables have the greatest impact on a selected output metric by testing each variable independently while holding all others constant.

**Calculation Process:**

```
For each sensitivity variable V in the set of sensitivity variables:
    1. Create Modified Inputs (Minimum):
       Modified Inputs Min = Base Inputs with V set to V.min
    
    2. Calculate Projection at Minimum:
       Projection Min = Calculate Full Projection(Modified Inputs Min)
       Metric Min = Extract Metric(Projection Min, Selected Metric, Projection Years)
    
    3. Create Modified Inputs (Maximum):
       Modified Inputs Max = Base Inputs with V set to V.max
    
    4. Calculate Projection at Maximum:
       Projection Max = Calculate Full Projection(Modified Inputs Max)
       Metric Max = Extract Metric(Projection Max, Selected Metric, Projection Years)
    
    5. Calculate Base Value:
       Base Projection = Calculate Full Projection(Base Inputs)
       Base Value = Extract Metric(Base Projection, Selected Metric, Projection Years)
    
    6. Store Results:
       Tornado Data[V] = {
           variable: V.name,
           baseValue: Base Value,
           minImpact: Metric Min,
           maxImpact: Metric Max,
           minDelta: Metric Min - Base Value,
           maxDelta: Metric Max - Base Value
       }

Sort Tornado Data by (|minDelta| + |maxDelta|) descending
```

**Variable Definitions:**
- Base Inputs: All input parameters at their current user-specified values
- V.min: Minimum allowable value for variable V (e.g., 2% for interest rate)
- V.max: Maximum allowable value for variable V (e.g., 6% for interest rate)
- Selected Metric: One of {irr10, irr20, irr40, cashflow, networth}
- Projection Years: Number of years in the analysis (10, 20, or 40)

**Implementation Notes:**
Each variable requires two complete projection calculations (minimum and maximum). For eight sensitivity variables, this means sixteen full projection calculations plus one base case calculation, for a total of seventeen calculations per tornado chart. The calculations are independent and could be parallelized if performance optimization is required.

The base value is calculated once using the actual base inputs and applies to all variables. The min/max impacts are absolute metric values, not changes from base. The deltas (minDelta and maxDelta) represent the change from base and are used for bar length calculation in the visualization.

Sorting by total impact magnitude ensures the most influential variables appear at the top of the chart. The total impact is the sum of absolute deltas because a variable that causes -10 and +10 changes has the same total impact as one causing -15 and +5 changes (both sum to 20 in absolute terms).

### Bar Width Calculation for Tornado Charts

**Formula:**
```
Max Absolute Delta = Maximum value across all variables of (|minDelta|, |maxDelta|)

For each variable V:
    Min Width Percent = (|V.minDelta| / Max Absolute Delta) × 100
    Max Width Percent = (|V.maxDelta| / Max Absolute Delta) × 100
```

**Implementation Notes:**
The bar widths are normalized so the longest bar (from the variable with the greatest single-sided impact) extends to 100% of the available width. This ensures the chart fills the available space efficiently while maintaining proportional representation of impacts. Bars extend from a central vertical line representing the base case, with left bars showing minimum-value impacts and right bars showing maximum-value impacts.

### Bar Color Assignment for Tornado Charts

**Formula:**
```
If V.maxImpact < V.baseValue:
    Left Bar Color = Green (better outcome at minimum)
    Right Bar Color = Red (worse outcome at maximum)
Else:
    Left Bar Color = Red (worse outcome at minimum)
    Right Bar Color = Green (better outcome at maximum)
```

**Implementation Notes:**
The color logic ensures that green always represents better outcomes and red always represents worse outcomes, regardless of variable direction. For variables like interest rate where lower values produce better results, the minimum (left) bar will be green. For variables like rent increase where higher values produce better results, the maximum (right) bar will be green.

### Heatmap Calculations

**Purpose:**
Heatmaps reveal interaction effects between pairs of variables by calculating outcomes for all combinations of two variables across their ranges.

**Calculation Process:**

```
Let Variable X be the horizontal axis variable
Let Variable Y be the vertical axis variable

Generate Test Values for X:
    X Values = [X.min, (X.min + 0.25×(X.max - X.min)), (X.min + 0.5×(X.max - X.min)), 
                (X.min + 0.75×(X.max - X.min)), X.max]
    Label as X[0] through X[4]

Generate Test Values for Y:
    Y Values = [Y.min, (Y.min + 0.25×(Y.max - Y.min)), (Y.min + 0.5×(Y.max - Y.min)),
                (Y.min + 0.75×(Y.max - Y.min)), Y.max]
    Label as Y[0] through Y[4]

For each combination of (x index i, y index j) where i, j ∈ {0, 1, 2, 3, 4}:
    1. Create Modified Inputs:
       Modified Inputs = Base Inputs with X set to X[i] and Y set to Y[j]
    
    2. Calculate Projection:
       Projection = Calculate Full Projection(Modified Inputs)
       Metric Value = Extract Metric(Projection, Selected Metric, Projection Years)
    
    3. Store Result:
       Heatmap Data[i,j] = {
           x: i,
           y: j,
           xLabel: Format(X[i]),
           yLabel: Format(Y[j]),
           value: Metric Value
       }
```

**Variable Definitions:**
- X, Y: Two distinct sensitivity variables selected by the user
- Test Values: Five evenly-spaced values across each variable's range
- i, j: Grid indices (0-4) representing position in the 5×5 matrix

**Implementation Notes:**
The heatmap requires 25 complete projection calculations (5 × 5 combinations). The test values are distributed evenly across each variable's range to provide balanced coverage. The even spacing uses quartile points (0%, 25%, 50%, 75%, 100%) to ensure systematic coverage.

All variables except X and Y remain at their base values during heatmap calculations. This isolates the interaction effect between the two selected variables while holding other factors constant.

### Heatmap Color Interpolation

**Formula:**
```
Minimum Value = Minimum across all 25 heatmap cells
Maximum Value = Maximum across all 25 heatmap cells

For each cell with value V:
    Normalized = (V - Minimum Value) / (Maximum Value - Minimum Value)
    
    If Normalized < 0.5:
        // Interpolate from Red (255,100,100) to Yellow (255,255,100)
        t = Normalized × 2
        R = 255
        G = 100 + 155 × t
        B = 100
    Else:
        // Interpolate from Yellow (255,255,100) to Green (100,255,100)
        t = (Normalized - 0.5) × 2
        R = 255 - 155 × t
        G = 255
        B = 100 + 155 × t
    
    Cell Color = RGB(R, G, B)
```

**Variable Definitions:**
- V: Metric value for the cell
- Normalized: Value scaled to 0-1 range
- t: Interpolation parameter within each color range
- R, G, B: Red, green, blue color components (0-255)

**Implementation Notes:**
The color gradient uses a three-point scale: red for low values, yellow for middle values, green for high values. The normalization ensures the full color spectrum spans the actual range of results in the current heatmap, making relative differences immediately apparent regardless of absolute value ranges.

The interpolation uses linear blending between color components. The specific RGB values (255,100,100 for red, etc.) were chosen to provide good contrast and readability with white text overlays showing the numeric values.

### Scenario Calculations

**Purpose:**
Scenarios allow users to define complete alternative input sets and compare full projection results against the base case.

**Calculation Process:**

```
For each Scenario S in the set of active scenarios:
    1. Apply Scenario Inputs:
       Scenario Inputs = Base Inputs with all S.adjustments applied
    
    2. Calculate Full Projection:
       Projection[S] = Calculate Full Projection(Scenario Inputs)
    
    3. Extract All Metrics:
       For each year Y in projection:
           Store Projection[S].years[Y] (all yearly data)
       
       Store Projection[S].irr10
       Store Projection[S].irr20
       Store Projection[S].irr40
       Store Projection[S].roi10
       Store Projection[S].roi20
       Store Projection[S].roi40
```

**Variable Definitions:**
- S.adjustments: Dictionary of variable modifications for scenario S
- Projection[S]: Complete 40-year projection for scenario S
- Base Inputs: User's current input values

**Implementation Notes:**
Each scenario represents a complete alternative assumption set. Unlike tornado charts and heatmaps which modify only specific variables, scenarios can modify any combination of inputs simultaneously. This enables modeling complex what-if scenarios like "strong economy" (high rent growth + low interest rate + low vacancy) or "recession" (low rent growth + high interest rate + high vacancy).

Scenario calculations are independent of each other and of the base case. All scenarios use the same calculation engine with different input parameters. The results are stored completely to enable flexible comparison across any metrics or time periods.

### Preset Scenario Formulas

**Optimistic Preset:**
```
Optimistic Inputs = Base Inputs with:
    Interest Rate = max(Base Interest Rate - 0.5, 2.0)
    Rent Increase = min(Base Rent Increase + 1.0, 5.0)
    Property Value Increase = min(Base Property Value Increase + 1.0, 5.0)
    Vacancy Rate = 0.0
```

**Pessimistic Preset:**
```
Pessimistic Inputs = Base Inputs with:
    Interest Rate = min(Base Interest Rate + 0.5, 6.0)
    Rent Increase = max(Base Rent Increase - 1.0, 1.0)
    Property Value Increase = max(Base Property Value Increase - 1.0, 0.0)
    Vacancy Rate = min(Base Vacancy Rate + 3.0, 10.0)
    Operating Costs Increase = min(Base Operating Costs Increase + 0.5, 4.0)
```

**Implementation Notes:**
Preset scenarios apply consistent directional adjustments to multiple variables simultaneously. The adjustments are clamped to the valid range for each variable using max/min functions to prevent values outside the defined sensitivity ranges.

The optimistic preset assumes a favorable market environment: easier financing, strong rental demand, property appreciation, and no vacancy. The pessimistic preset assumes challenging conditions: higher borrowing costs, weaker rental growth, higher operating costs, and elevated vacancy.

Custom scenarios allow users to specify any combination of values within the valid ranges, enabling exploration of specific situations relevant to their investment context.

### Metric Extraction

**Formula:**
```
Extract Metric(Projection, Metric Type, Years):
    If Metric Type = "irr10":
        Return Projection.irr10
    Else If Metric Type = "irr20":
        Return Projection.irr20
    Else If Metric Type = "irr40":
        Return Projection.irr40
    Else If Metric Type = "cashflow":
        Year Index = Years - 1
        Return Projection.years[Year Index].cumulativeCashFlow
    Else If Metric Type = "networth":
        Year Index = Years - 1
        Return Projection.years[Year Index].netWorth
```

**Implementation Notes:**
The metric extraction function provides a consistent interface for retrieving specific output values from projection results. IRR values are stored at the projection level, while cash flow and net worth values must be extracted from the specific year within the yearly projection array.

The year index is zero-based (Years - 1) because array indexing starts at zero while year numbers start at one. For a 20-year projection, Years = 20 and Year Index = 19, referencing the twentieth element (index 19) in the years array.

This extraction abstraction allows the same tornado chart and heatmap code to work with different metrics by simply changing the metric type parameter rather than duplicating calculation logic for each metric type.


