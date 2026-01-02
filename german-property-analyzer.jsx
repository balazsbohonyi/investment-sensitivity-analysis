import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ============================================================================
// TYPES
// ============================================================================

interface PropertyInputs {
  // Property Details
  purchasePrice: number;
  notaryAndLandRegistryFees: number; // % of purchase price (typically 1.5%)
  realEstateTransferTax: number; // % of purchase price (varies by state: 3.5-6.5%)
  brokerCommission: number; // % of purchase price
  renovationCosts: number;
  
  // Financing
  equity: number;
  interestRate: number; // % p.a.
  repaymentRate: number; // % p.a.
  
  // Income
  monthlyRent: number;
  
  // Operating Costs
  monthlyPropertyManagement: number;
  monthlyMaintenance: number;
  monthlyInsurance: number;
  monthlyOtherCosts: number;
  
  // Growth Rates
  rentIncreaseRate: number; // % p.a.
  propertyValueIncreaseRate: number; // % p.a.
  operatingCostsIncreaseRate: number; // % p.a.
  
  // Tax Information
  annualIncome: number;
  maritalStatus: 'single' | 'married';
  marginalTaxRate: number; // %
  churchTaxLiability: boolean;
  
  // Additional Factors
  vacancyRate: number; // % annual rent loss
  depreciationRate: number; // % p.a. (typically 2% for buildings, 2.5% for buildings before 1925)
}

interface SensitivityVariable {
  name: string;
  key: keyof PropertyInputs;
  min: number;
  max: number;
  step: number;
  unit: string;
  currentValue: number;
}

interface Scenario {
  name: string;
  variables: Partial<Record<keyof PropertyInputs, number>>;
  color: string;
}

interface YearlyProjection {
  year: number;
  date: string;
  
  // Property Value
  propertyValue: number;
  
  // Loan
  outstandingLoan: number;
  annualLoanPayment: number;
  interestPaid: number;
  principalRepaid: number;
  
  // Income
  grossRent: number;
  effectiveRent: number; // after vacancy
  
  // Operating Costs
  totalOperatingCosts: number;
  
  // Depreciation
  depreciation: number;
  
  // Taxable Income
  taxableIncome: number;
  taxSavings: number; // or tax liability if positive taxable income
  
  // Cash Flow
  grossCashFlow: number;
  netCashFlow: number; // after tax
  
  // Equity
  equity: number;
  netWorth: number;
  
  // Cumulative
  cumulativeCashFlow: number;
  cumulativeTaxSavings: number;
}

interface ProjectionResults {
  yearlyData: YearlyProjection[];
  summary: {
    totalInvestment: number;
    irr10Year: number;
    irr20Year: number;
    irr40Year: number;
    totalCashFlow10Year: number;
    totalCashFlow20Year: number;
    totalCashFlow40Year: number;
    netWorth10Year: number;
    netWorth20Year: number;
    netWorth40Year: number;
    averageAnnualCashFlow: number;
    roiAtYear10: number;
    roiAtYear20: number;
    roiAtYear40: number;
  };
}

// ============================================================================
// GERMAN TAX CALCULATOR
// ============================================================================

function calculateGermanTax(
  taxableIncome: number,
  maritalStatus: 'single' | 'married',
  churchTax: boolean
): { incomeTax: number; solidarityTax: number; churchTax: number; totalTax: number } {
  // German income tax 2024/2025 formula (Einkommensteuer)
  let incomeTax = 0;
  const income = maritalStatus === 'married' ? taxableIncome / 2 : taxableIncome;
  
  if (income <= 11604) {
    // Tax-free allowance (Grundfreibetrag)
    incomeTax = 0;
  } else if (income <= 17005) {
    // First progression zone
    const y = (income - 11604) / 10000;
    incomeTax = (922.98 * y + 1400) * y;
  } else if (income <= 66760) {
    // Second progression zone
    const z = (income - 17005) / 10000;
    incomeTax = (181.19 * z + 2397) * z + 1025.38;
  } else if (income <= 277825) {
    // Third progression zone
    incomeTax = 0.42 * income - 10602.13;
  } else {
    // Top rate zone
    incomeTax = 0.45 * income - 18936.88;
  }
  
  if (maritalStatus === 'married') {
    incomeTax = incomeTax * 2; // Splitting advantage
  }
  
  // Solidarity surcharge (Solidaritätszuschlag) - 5.5% of income tax
  // Only applies if income tax exceeds certain thresholds
  let solidarityTax = 0;
  const solidarityThreshold = maritalStatus === 'married' ? 32734 : 16369;
  if (incomeTax > solidarityThreshold) {
    solidarityTax = (incomeTax - solidarityThreshold) * 0.055 * 1.2; // Simplified calculation
  }
  
  // Church tax (Kirchensteuer) - typically 8-9% of income tax (8% in most states)
  const churchTaxAmount = churchTax ? incomeTax * 0.08 : 0;
  
  return {
    incomeTax: Math.max(0, incomeTax),
    solidarityTax: Math.max(0, solidarityTax),
    churchTax: churchTaxAmount,
    totalTax: Math.max(0, incomeTax + solidarityTax + churchTaxAmount)
  };
}

// ============================================================================
// PROJECTION CALCULATOR
// ============================================================================

function calculateProjections(inputs: PropertyInputs, years: number = 40): ProjectionResults {
  // Calculate total investment
  const acquisitionCosts = inputs.purchasePrice * (
    1 + 
    inputs.notaryAndLandRegistryFees / 100 + 
    inputs.realEstateTransferTax / 100 + 
    inputs.brokerCommission / 100
  ) + inputs.renovationCosts;
  
  const loanAmount = acquisitionCosts - inputs.equity;
  const totalInvestment = inputs.equity;
  
  // Get start date (1st of next month)
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  
  const yearlyData: YearlyProjection[] = [];
  let cumulativeCashFlow = 0;
  let cumulativeTaxSavings = 0;
  
  // Building value for depreciation (typically 80% of purchase price)
  const buildingValue = inputs.purchasePrice * 0.8;
  
  for (let year = 0; year < years; year++) {
    const yearDate = new Date(startDate);
    yearDate.setFullYear(yearDate.getFullYear() + year);
    
    // Property value with appreciation
    const propertyValue = inputs.purchasePrice * Math.pow(1 + inputs.propertyValueIncreaseRate / 100, year);
    
    // Rent with increases
    const grossRent = inputs.monthlyRent * 12 * Math.pow(1 + inputs.rentIncreaseRate / 100, year);
    const effectiveRent = grossRent * (1 - inputs.vacancyRate / 100);
    
    // Operating costs with increases
    const monthlyOperatingCosts = (
      inputs.monthlyPropertyManagement +
      inputs.monthlyMaintenance +
      inputs.monthlyInsurance +
      inputs.monthlyOtherCosts
    );
    const totalOperatingCosts = monthlyOperatingCosts * 12 * Math.pow(1 + inputs.operatingCostsIncreaseRate / 100, year);
    
    // Loan calculations (annuity loan)
    const annualRate = inputs.interestRate / 100;
    const annualRepaymentRate = inputs.repaymentRate / 100;
    const annualPaymentRate = annualRate + annualRepaymentRate;
    
    // Outstanding loan at start of year
    let outstandingLoan = loanAmount;
    if (year > 0) {
      // Calculate outstanding loan using annuity formula
      const monthlyRate = annualPaymentRate / 12;
      const monthsPassed = year * 12;
      const totalMonths = 30 * 12; // Assume 30-year term
      
      if (monthsPassed < totalMonths) {
        const monthlyPayment = loanAmount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -totalMonths));
        outstandingLoan = loanAmount * Math.pow(1 + monthlyRate, monthsPassed) - 
                         monthlyPayment * (Math.pow(1 + monthlyRate, monthsPassed) - 1) / monthlyRate;
      } else {
        outstandingLoan = 0;
      }
    }
    
    outstandingLoan = Math.max(0, outstandingLoan);
    
    // Annual loan payment
    const annualLoanPayment = outstandingLoan > 0 ? outstandingLoan * annualPaymentRate : 0;
    const interestPaid = outstandingLoan * annualRate;
    const principalRepaid = annualLoanPayment - interestPaid;
    
    // Depreciation (Abschreibung)
    const depreciation = buildingValue * (inputs.depreciationRate / 100);
    
    // Taxable rental income
    const taxableRentalIncome = effectiveRent - totalOperatingCosts - interestPaid - depreciation;
    
    // Tax impact
    let taxSavings = 0;
    if (taxableRentalIncome < 0) {
      // Tax savings from rental loss
      taxSavings = Math.abs(taxableRentalIncome) * (inputs.marginalTaxRate / 100);
      if (inputs.churchTaxLiability) {
        taxSavings *= 1.08; // Account for church tax reduction
      }
    } else {
      // Additional tax liability
      taxSavings = -taxableRentalIncome * (inputs.marginalTaxRate / 100);
      if (inputs.churchTaxLiability) {
        taxSavings *= 1.08;
      }
    }
    
    // Cash flow
    const grossCashFlow = effectiveRent - totalOperatingCosts - annualLoanPayment;
    const netCashFlow = grossCashFlow + taxSavings;
    
    cumulativeCashFlow += netCashFlow;
    cumulativeTaxSavings += taxSavings;
    
    // Equity and net worth
    const equity = propertyValue - outstandingLoan;
    const netWorth = equity + cumulativeCashFlow;
    
    yearlyData.push({
      year: year + 1,
      date: yearDate.toISOString().split('T')[0],
      propertyValue,
      outstandingLoan,
      annualLoanPayment,
      interestPaid,
      principalRepaid,
      grossRent,
      effectiveRent,
      totalOperatingCosts,
      depreciation,
      taxableIncome: taxableRentalIncome,
      taxSavings,
      grossCashFlow,
      netCashFlow,
      equity,
      netWorth,
      cumulativeCashFlow,
      cumulativeTaxSavings
    });
  }
  
  // Calculate IRR (Internal Rate of Return) using Newton-Raphson method
  function calculateIRR(cashFlows: number[], initialInvestment: number): number {
    const flows = [-initialInvestment, ...cashFlows];
    let rate = 0.1; // Initial guess
    
    for (let i = 0; i < 100; i++) {
      let npv = 0;
      let dnpv = 0;
      
      for (let j = 0; j < flows.length; j++) {
        npv += flows[j] / Math.pow(1 + rate, j);
        dnpv -= j * flows[j] / Math.pow(1 + rate, j + 1);
      }
      
      const newRate = rate - npv / dnpv;
      
      if (Math.abs(newRate - rate) < 0.0001) {
        return newRate * 100;
      }
      
      rate = newRate;
    }
    
    return rate * 100;
  }
  
  // Calculate summary metrics
  const cashFlows10 = yearlyData.slice(0, 10).map(d => d.netCashFlow);
  const cashFlows20 = yearlyData.slice(0, 20).map(d => d.netCashFlow);
  const cashFlows40 = yearlyData.map(d => d.netCashFlow);
  
  // Add final property equity to last cash flow for IRR calculation
  const finalEquity10 = yearlyData[9]?.equity || 0;
  const finalEquity20 = yearlyData[19]?.equity || 0;
  const finalEquity40 = yearlyData[39]?.equity || 0;
  
  const irr10 = cashFlows10.length >= 10 ? calculateIRR([...cashFlows10.slice(0, -1), cashFlows10[9] + finalEquity10], totalInvestment) : 0;
  const irr20 = cashFlows20.length >= 20 ? calculateIRR([...cashFlows20.slice(0, -1), cashFlows20[19] + finalEquity20], totalInvestment) : 0;
  const irr40 = cashFlows40.length >= 40 ? calculateIRR([...cashFlows40.slice(0, -1), cashFlows40[39] + finalEquity40], totalInvestment) : 0;
  
  return {
    yearlyData,
    summary: {
      totalInvestment,
      irr10Year: irr10,
      irr20Year: irr20,
      irr40Year: irr40,
      totalCashFlow10Year: yearlyData[9]?.cumulativeCashFlow || 0,
      totalCashFlow20Year: yearlyData[19]?.cumulativeCashFlow || 0,
      totalCashFlow40Year: yearlyData[39]?.cumulativeCashFlow || 0,
      netWorth10Year: yearlyData[9]?.netWorth || 0,
      netWorth20Year: yearlyData[19]?.netWorth || 0,
      netWorth40Year: yearlyData[39]?.netWorth || 0,
      averageAnnualCashFlow: (yearlyData[Math.min(39, yearlyData.length - 1)]?.cumulativeCashFlow || 0) / Math.min(40, yearlyData.length),
      roiAtYear10: yearlyData[9] ? (yearlyData[9].netWorth / totalInvestment - 1) * 100 : 0,
      roiAtYear20: yearlyData[19] ? (yearlyData[19].netWorth / totalInvestment - 1) * 100 : 0,
      roiAtYear40: yearlyData[39] ? (yearlyData[39].netWorth / totalInvestment - 1) * 100 : 0
    }
  };
}

// ============================================================================
// TABLE-BASED HEATMAP COMPONENT
// ============================================================================

interface TableHeatmapProps {
  heatmapData: any[];
  heatmapVarX: string;
  heatmapVarY: string;
  heatmapMetric: string;
  sensitivityVariables: any[];
  formatPercent: (value: number, decimals?: number) => string;
  formatCurrency: (value: number) => string;
  gapSize?: '0' | '1px';
  glossyOverlay?: boolean;
}

const TableHeatmap: React.FC<TableHeatmapProps> = ({
  heatmapData,
  heatmapVarX,
  heatmapVarY,
  heatmapMetric,
  sensitivityVariables,
  formatPercent,
  formatCurrency,
  gapSize = '1px',
  glossyOverlay = false
}) => {
  const firstCellRef = useRef<HTMLTableCellElement>(null);
  const lastCellRef = useRef<HTMLTableCellElement>(null);
  const [overlayBounds, setOverlayBounds] = useState({ top: 0, left: 0, width: 0, height: 0 });
  
  useEffect(() => {
    if (glossyOverlay && firstCellRef.current && lastCellRef.current) {
      // Small delay to ensure table layout is complete
      const updateBounds = () => {
        const firstRect = firstCellRef.current!.getBoundingClientRect();
        const lastRect = lastCellRef.current!.getBoundingClientRect();
        const containerRect = firstCellRef.current!.closest('.heatmap-container')?.getBoundingClientRect();
        
        if (containerRect) {
          // Calculate bounds to cover ONLY the 5x5 colored cell grid
          // This excludes header labels, row labels, and the legend in tfoot
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
      
      // Also recalculate after a brief delay to handle any layout shifts
      const timeoutId = setTimeout(updateBounds, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [glossyOverlay, heatmapData]);
  
  const minValue = Math.min(...heatmapData.map(d => d.value));
  const maxValue = Math.max(...heatmapData.map(d => d.value));
  
  const xVarName = sensitivityVariables.find(v => v.key === heatmapVarX)?.name || '';
  const yVarName = sensitivityVariables.find(v => v.key === heatmapVarY)?.name || '';
  
  const isPercentMetric = heatmapMetric.startsWith('irr');
  
  const getColor = (value: number, min: number, max: number) => {
    const normalized = (value - min) / (max - min);
    
    if (normalized < 0.5) {
      const red = 255;
      const green = Math.round(255 * normalized * 2);
      return `rgb(${red}, ${green}, 100)`;
    } else {
      const red = Math.round(255 * (1 - (normalized - 0.5) * 2));
      const green = 255;
      return `rgb(${red}, ${green}, 100)`;
    }
  };
  
  const tableStyle: React.CSSProperties = {
    borderCollapse: gapSize === '0' ? 'collapse' : 'separate',
    borderSpacing: gapSize === '0' ? '0' : gapSize,
    margin: '0 auto',
    border: 'none'
  };
  
  // Consistent font size for all labels (matching tornado chart)
  const labelFontSize = '11px';
  
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <style>{`
        .heatmap-table { 
          border-collapse: collapse;
          border: none !important;
          background-color: white;
        }
        .heatmap-table th, 
        .heatmap-table td,
        .heatmap-table thead th,
        .heatmap-table tbody th,
        .heatmap-table tbody td,
        .heatmap-table tfoot td { 
          border: none !important;
          outline: none !important;
          padding: 0;
        }
        /* Add gap only between colored cells */
        .heatmap-table tbody td.heatmap-data-cell { 
          border: ${gapSize} solid white !important;
          box-sizing: border-box;
        }
        
        /* Container for overlay positioning */
        .heatmap-container {
          position: relative;
          display: inline-block;
        }
        
        /* Glossy blur overlay - preserved for reference */
        /*
        .heatmap-glossy-overlay {
          position: absolute;
          pointer-events: none;
          z-index: 1;
          backdrop-filter: blur(8px);
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.3) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(255, 255, 255, 0.05) 100%
          );
          mix-blend-mode: overlay;
        }
        */
        
        /* Using Tailwind's backdrop-blur instead */
        .heatmap-glossy-overlay {
          position: absolute;
          pointer-events: none;
          z-index: 1;
        }
        
        /* Ensure badges appear above overlay */
        .heatmap-data-cell span {
          position: relative;
          z-index: 2;
        }
        
        @media (max-width: 1024px) {
          .heatmap-data-cell { width: 80px !important; height: 70px !important; }
        }
        @media (max-width: 768px) {
          .heatmap-data-cell { width: 60px !important; height: 60px !important; }
        }
        @media (max-width: 480px) {
          .heatmap-data-cell { width: 50px !important; height: 50px !important; }
        }
      `}</style>
      
      <div className="heatmap-container">
        <table className="heatmap-table" id="heatmap-table-element">
        <thead>
          <tr>
            <th 
              colSpan={7} 
              style={{ 
                textAlign: 'center', 
                padding: '8px', 
                fontSize: labelFontSize,
                fontWeight: 600, 
                color: '#374151',
                letterSpacing: '0.025em',
                border: 'none'
              }}
            >
              {xVarName}
            </th>
          </tr>
          <tr>
            <th style={{ width: '24px', border: 'none' }}></th>
            <th style={{ width: '24px', border: 'none' }}></th>
            {[0, 1, 2, 3, 4].map(x => {
              const cell = heatmapData.find(d => d.x === x);
              return (
                <th 
                  key={x} 
                  style={{ 
                    fontSize: labelFontSize,
                    color: '#6b7280', 
                    padding: '4px', 
                    textAlign: 'center',
                    letterSpacing: '0.025em',
                    border: 'none'
                  }}
                >
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
            const firstCell = rowCells[0];
            
            return (
              <tr key={y}>
                {idx === 0 && (
                  <th 
                    rowSpan={5}
                    className="heatmap-vertical-label"
                    style={{ 
                      position: 'relative', 
                      width: '24px', 
                      padding: 0,
                      border: 'none'
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-90deg)',
                        whiteSpace: 'nowrap',
                        fontSize: labelFontSize,
                        fontWeight: 600,
                        color: '#374151',
                        letterSpacing: '0.025em'
                      }}
                    >
                      {yVarName}
                    </div>
                  </th>
                )}
                
                <th 
                  className="heatmap-row-label"
                  style={{ 
                    position: 'relative', 
                    width: '24px', 
                    padding: 0,
                    border: 'none'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%) rotate(-90deg)',
                      whiteSpace: 'nowrap',
                      fontSize: labelFontSize,
                      color: '#6b7280',
                      letterSpacing: '0.025em'
                    }}
                  >
                    {firstCell?.yLabel}%
                  </div>
                </th>
                
                {rowCells.map((cell, x) => {
                  if (!cell) return null;
                  const color = getColor(cell.value, minValue, maxValue);
                  const displayValue = isPercentMetric 
                    ? formatPercent(cell.value, 1)
                    : `${(cell.value / 1000).toFixed(0)}k`;
                  const fullValue = isPercentMetric 
                    ? formatPercent(cell.value) 
                    : formatCurrency(cell.value);
                  
                  // Assign refs to first and last colored cells
                  const isFirstCell = y === 4 && x === 0;
                  const isLastCell = y === 0 && x === 4;
                  
                  return (
                    <td 
                      ref={isFirstCell ? firstCellRef : isLastCell ? lastCellRef : null} 
                      key={x}
                      className="heatmap-data-cell"
                      style={{ 
                        backgroundColor: color,
                        width: '100px',
                        height: '80px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        cursor: 'pointer'
                      }}
                      title={fullValue}
                    >
                      {/* Badge style with 25% opacity */}
                      <span
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.25)',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 500,
                          fontSize: '12px',
                          display: 'inline-block'
                        }}
                      >
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
            <td style={{ border: 'none' }}></td>
            <td style={{ border: 'none' }}></td>
            {/* Legend spanning only the colored cells */}
            <td 
              colSpan={5} 
              style={{ 
                textAlign: 'center', 
                padding: '16px 8px 8px 8px',
                border: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '16px', backgroundColor: 'rgb(255, 100, 100)', marginRight: '8px' }}></div>
                  <span style={{ color: '#374151' }}>Low</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '16px', backgroundColor: 'rgb(255, 255, 100)', marginRight: '8px' }}></div>
                  <span style={{ color: '#374151' }}>Medium</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '16px', backgroundColor: 'rgb(100, 255, 100)', marginRight: '8px' }}></div>
                  <span style={{ color: '#374151' }}>High</span>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
      
      {/* Glossy overlay - positioned over colored cells only, excludes legend */}
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

// ============================================================================
// ============================================================================
// MAIN COMPONENT
// ============================================================================

// ============================================================================
// ============================================================================
// MAIN COMPONENT
// ============================================================================

const GermanPropertyAnalyzer: React.FC = () => {
  // Default values
  const [inputs, setInputs] = useState<PropertyInputs>({
    purchasePrice: 300000,
    notaryAndLandRegistryFees: 1.5,
    realEstateTransferTax: 5.0,
    brokerCommission: 3.57,
    renovationCosts: 10000,
    equity: 60000,
    interestRate: 3.75,
    repaymentRate: 1.4,
    monthlyRent: 1200,
    monthlyPropertyManagement: 60,
    monthlyMaintenance: 100,
    monthlyInsurance: 30,
    monthlyOtherCosts: 20,
    rentIncreaseRate: 3.0,
    propertyValueIncreaseRate: 3.0,
    operatingCostsIncreaseRate: 2.0,
    annualIncome: 60000,
    maritalStatus: 'single',
    marginalTaxRate: 42,
    churchTaxLiability: false,
    vacancyRate: 0,
    depreciationRate: 2.0
  });
  
  const [projectionYears, setProjectionYears] = useState<10 | 20 | 40>(40);
  const [sensitivityEnabled, setSensitivityEnabled] = useState(false);
  const [analysisType, setAnalysisType] = useState<'quick' | 'one-way' | 'two-way'>('quick');
  const [selectedPreset, setSelectedPreset] = useState<'base' | 'optimistic' | 'pessimistic' | 'custom'>('base');
  
  // Sensitivity variables
  const sensitivityVariables: SensitivityVariable[] = [
    { name: 'Interest Rate', key: 'interestRate', min: 2, max: 6, step: 0.25, unit: '%', currentValue: inputs.interestRate },
    { name: 'Rent Increase', key: 'rentIncreaseRate', min: 1, max: 5, step: 0.5, unit: '%', currentValue: inputs.rentIncreaseRate },
    { name: 'Property Value Increase', key: 'propertyValueIncreaseRate', min: 0, max: 5, step: 0.5, unit: '%', currentValue: inputs.propertyValueIncreaseRate },
    { name: 'Operating Costs Increase', key: 'operatingCostsIncreaseRate', min: 1, max: 4, step: 0.5, unit: '%', currentValue: inputs.operatingCostsIncreaseRate },
    { name: 'Vacancy Rate', key: 'vacancyRate', min: 0, max: 10, step: 1, unit: '%', currentValue: inputs.vacancyRate },
    { name: 'Marginal Tax Rate', key: 'marginalTaxRate', min: 30, max: 50, step: 1, unit: '%', currentValue: inputs.marginalTaxRate },
    { name: 'Repayment Rate', key: 'repaymentRate', min: 1, max: 3, step: 0.2, unit: '%', currentValue: inputs.repaymentRate },
    { name: 'Depreciation Rate', key: 'depreciationRate', min: 1, max: 3, step: 0.5, unit: '%', currentValue: inputs.depreciationRate },
  ];
  
  const [customAdjustments, setCustomAdjustments] = useState<Partial<Record<keyof PropertyInputs, number>>>({});
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { name: 'Base', variables: {}, color: '#1e3a8a' }
  ]);
  const [showScenarioDialog, setShowScenarioDialog] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioType, setNewScenarioType] = useState<'optimistic' | 'pessimistic' | 'custom'>('custom');
  const [editingScenarioIndex, setEditingScenarioIndex] = useState<number | null>(null);
  
  // Tornado chart settings
  const [showTornadoChart, setShowTornadoChart] = useState(false);
  const [tornadoMetric, setTornadoMetric] = useState<'irr10' | 'irr20' | 'irr40' | 'cashflow' | 'networth'>('irr20');
  
  // Heatmap settings
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapVarX, setHeatmapVarX] = useState<keyof PropertyInputs>('interestRate');
  const [heatmapVarY, setHeatmapVarY] = useState<keyof PropertyInputs>('rentIncreaseRate');
  const [heatmapMetric, setHeatmapMetric] = useState<'irr10' | 'irr20' | 'irr40' | 'cashflow' | 'networth'>('irr20');
  
  // Calculate projections
  const baseProjection = useMemo(() => calculateProjections(inputs, projectionYears), [inputs, projectionYears]);
  
  // Calculate scenario projections
  const scenarioProjections = useMemo(() => {
    if (!sensitivityEnabled) return [baseProjection];
    
    return scenarios.map(scenario => {
      const scenarioInputs = { ...inputs, ...scenario.variables };
      return calculateProjections(scenarioInputs, projectionYears);
    });
  }, [inputs, scenarios, sensitivityEnabled, projectionYears]);
  
  // Calculate tornado chart data
  const tornadoData = useMemo(() => {
    if (!showTornadoChart) return [];
    
    const getMetricValue = (projection: ProjectionResults): number => {
      switch (tornadoMetric) {
        case 'irr10': return projection.summary.irr10Year;
        case 'irr20': return projection.summary.irr20Year;
        case 'irr40': return projection.summary.irr40Year;
        case 'cashflow': 
          return projectionYears === 10 ? projection.summary.totalCashFlow10Year :
                 projectionYears === 20 ? projection.summary.totalCashFlow20Year :
                 projection.summary.totalCashFlow40Year;
        case 'networth':
          return projectionYears === 10 ? projection.summary.netWorth10Year :
                 projectionYears === 20 ? projection.summary.netWorth20Year :
                 projection.summary.netWorth40Year;
      }
    };
    
    const baseValue = getMetricValue(baseProjection);
    
    return sensitivityVariables.map(variable => {
      // Calculate with min value
      const minInputs = { ...inputs, [variable.key]: variable.min };
      const minProjection = calculateProjections(minInputs, projectionYears);
      const minValue = getMetricValue(minProjection);
      
      // Calculate with max value
      const maxInputs = { ...inputs, [variable.key]: variable.max };
      const maxProjection = calculateProjections(maxInputs, projectionYears);
      const maxValue = getMetricValue(maxProjection);
      
      return {
        variable: variable.name,
        minImpact: minValue,  // Store absolute value, not delta
        maxImpact: maxValue,  // Store absolute value, not delta
        baseValue: baseValue,
        range: Math.abs(maxValue - minValue)
      };
    }).sort((a, b) => b.range - a.range); // Sort by total range
  }, [showTornadoChart, tornadoMetric, inputs, projectionYears, baseProjection]);
  
  // Calculate heatmap data
  const heatmapData = useMemo(() => {
    if (!showHeatmap) return [];
    
    const varX = sensitivityVariables.find(v => v.key === heatmapVarX);
    const varY = sensitivityVariables.find(v => v.key === heatmapVarY);
    
    if (!varX || !varY) return [];
    
    const stepsX = 5;
    const stepsY = 5;
    const stepSizeX = (varX.max - varX.min) / (stepsX - 1);
    const stepSizeY = (varY.max - varY.min) / (stepsY - 1);
    
    const getMetricValue = (projection: ProjectionResults): number => {
      switch (heatmapMetric) {
        case 'irr10': return projection.summary.irr10Year;
        case 'irr20': return projection.summary.irr20Year;
        case 'irr40': return projection.summary.irr40Year;
        case 'cashflow': 
          return projectionYears === 10 ? projection.summary.totalCashFlow10Year :
                 projectionYears === 20 ? projection.summary.totalCashFlow20Year :
                 projection.summary.totalCashFlow40Year;
        case 'networth':
          return projectionYears === 10 ? projection.summary.netWorth10Year :
                 projectionYears === 20 ? projection.summary.netWorth20Year :
                 projection.summary.netWorth40Year;
      }
    };
    
    const data: Array<{ x: number; y: number; xLabel: string; yLabel: string; value: number }> = [];
    
    for (let i = 0; i < stepsY; i++) {
      for (let j = 0; j < stepsX; j++) {
        const xValue = varX.min + j * stepSizeX;
        const yValue = varY.min + i * stepSizeY;
        
        const testInputs = { 
          ...inputs, 
          [heatmapVarX]: xValue,
          [heatmapVarY]: yValue
        };
        
        const projection = calculateProjections(testInputs, projectionYears);
        const metricValue = getMetricValue(projection);
        
        data.push({
          x: j,
          y: i,
          xLabel: xValue.toFixed(2),
          yLabel: yValue.toFixed(2),
          value: metricValue
        });
      }
    }
    
    return data;
  }, [showHeatmap, heatmapVarX, heatmapVarY, heatmapMetric, inputs, projectionYears]);
  
  // Handlers
  const handleInputChange = (key: keyof PropertyInputs, value: number | string) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };
  
  const getPresetAdjustments = (preset: 'optimistic' | 'pessimistic'): Partial<Record<keyof PropertyInputs, number>> => {
    if (preset === 'optimistic') {
      return {
        interestRate: Math.max(2, inputs.interestRate - 0.5),
        rentIncreaseRate: Math.min(5, inputs.rentIncreaseRate + 1),
        propertyValueIncreaseRate: Math.min(5, inputs.propertyValueIncreaseRate + 1),
        vacancyRate: 0
      };
    } else {
      return {
        interestRate: Math.min(6, inputs.interestRate + 1),
        rentIncreaseRate: Math.max(1, inputs.rentIncreaseRate - 1),
        propertyValueIncreaseRate: Math.max(0, inputs.propertyValueIncreaseRate - 1),
        vacancyRate: 5
      };
    }
  };
  
  const getScenarioColor = (index: number): string => {
    const colors = ['#1e3a8a', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6'];
    return colors[index % colors.length];
  };
  
  const isValidAdjustment = (key: keyof PropertyInputs, value: number, type: 'optimistic' | 'pessimistic' | 'custom'): boolean => {
    if (type === 'custom') return true;
    
    const baseValue = inputs[key] as number;
    
    // For optimistic scenarios, certain variables should be better than base
    if (type === 'optimistic') {
      // Lower is better: interest rate, operating costs increase, vacancy rate
      if (key === 'interestRate' || key === 'operatingCostsIncreaseRate' || key === 'vacancyRate') {
        return value <= baseValue;
      }
      // Higher is better: rent increase, property value increase, repayment rate, depreciation rate
      if (key === 'rentIncreaseRate' || key === 'propertyValueIncreaseRate' || key === 'repaymentRate' || key === 'depreciationRate') {
        return value >= baseValue;
      }
      // Tax rate doesn't have a clear optimistic direction, allow any
      return true;
    }
    
    // For pessimistic scenarios, opposite logic
    if (type === 'pessimistic') {
      // Higher is worse: interest rate, operating costs increase, vacancy rate
      if (key === 'interestRate' || key === 'operatingCostsIncreaseRate' || key === 'vacancyRate') {
        return value >= baseValue;
      }
      // Lower is worse: rent increase, property value increase, repayment rate, depreciation rate
      if (key === 'rentIncreaseRate' || key === 'propertyValueIncreaseRate' || key === 'repaymentRate' || key === 'depreciationRate') {
        return value <= baseValue;
      }
      return true;
    }
    
    return true;
  };
  
  const addScenario = () => {
    if (!newScenarioName.trim()) {
      alert('Please enter a scenario name');
      return;
    }
    
    const adjustments = newScenarioType === 'custom' 
      ? customAdjustments 
      : getPresetAdjustments(newScenarioType);
    
    if (Object.keys(adjustments).length === 0 && newScenarioType === 'custom') {
      alert('Please adjust at least one variable for custom scenarios');
      return;
    }
    
    const newScenario: Scenario = {
      name: newScenarioName,
      variables: adjustments,
      color: getScenarioColor(scenarios.length)
    };
    
    if (editingScenarioIndex !== null) {
      const updated = [...scenarios];
      updated[editingScenarioIndex] = newScenario;
      setScenarios(updated);
    } else {
      setScenarios([...scenarios, newScenario]);
    }
    
    setShowScenarioDialog(false);
    setNewScenarioName('');
    setNewScenarioType('custom');
    setCustomAdjustments({});
    setEditingScenarioIndex(null);
  };
  
  const removeScenario = (index: number) => {
    if (index === 0) return; // Can't remove base scenario
    setScenarios(scenarios.filter((_, i) => i !== index));
  };
  
  const editScenario = (index: number) => {
    if (index === 0) return; // Can't edit base scenario
    const scenario = scenarios[index];
    setNewScenarioName(scenario.name);
    setCustomAdjustments(scenario.variables);
    setEditingScenarioIndex(index);
    setShowScenarioDialog(true);
  };
  
  const openScenarioDialog = (type?: 'optimistic' | 'pessimistic') => {
    if (type) {
      setNewScenarioType(type);
      setCustomAdjustments(getPresetAdjustments(type));
      setNewScenarioName(type === 'optimistic' ? 'Optimistic' : 'Pessimistic');
    } else {
      setNewScenarioType('custom');
      setCustomAdjustments({});
      setNewScenarioName('');
    }
    setEditingScenarioIndex(null);
    setShowScenarioDialog(true);
  };
  
  const handleCustomAdjustment = (key: keyof PropertyInputs, value: number) => {
    // Validate for preset types
    if (newScenarioType !== 'custom' && !isValidAdjustment(key, value, newScenarioType)) {
      // Don't update if it violates the preset direction
      return;
    }
    setCustomAdjustments({ ...customAdjustments, [key]: value });
  };
  
  const removeCustomAdjustment = (key: keyof PropertyInputs) => {
    const newAdjustments = { ...customAdjustments };
    delete newAdjustments[key];
    setCustomAdjustments(newAdjustments);
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  const formatPercent = (value: number, decimals: number = 2) => {
    return `${value.toFixed(decimals)}%`;
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            German Buy-to-Let Property Analyzer
          </h1>
          <p className="text-gray-600">
            Comprehensive investment analysis for rental properties in Germany
          </p>
        </header>
        
        {/* Property Details Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-teal-700 mb-4 pb-2 border-b-2 border-teal-500">
            Property Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Price
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={inputs.purchasePrice}
                  onChange={(e) => handleInputChange('purchasePrice', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">€</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Renovation Costs
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={inputs.renovationCosts}
                  onChange={(e) => handleInputChange('renovationCosts', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">€</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notary & Land Registry Fees
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.1"
                  value={inputs.notaryAndLandRegistryFees}
                  onChange={(e) => handleInputChange('notaryAndLandRegistryFees', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">%</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Real Estate Transfer Tax (varies by state)
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.1"
                  value={inputs.realEstateTransferTax}
                  onChange={(e) => handleInputChange('realEstateTransferTax', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">%</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Broker Commission
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.1"
                  value={inputs.brokerCommission}
                  onChange={(e) => handleInputChange('brokerCommission', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">%</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Rent
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={inputs.monthlyRent}
                  onChange={(e) => handleInputChange('monthlyRent', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">€/month</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Financing Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-teal-700 mb-4 pb-2 border-b-2 border-teal-500">
            Financing
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equity / Down Payment
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={inputs.equity}
                  onChange={(e) => handleInputChange('equity', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">€</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interest Rate
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.01"
                  value={inputs.interestRate}
                  onChange={(e) => handleInputChange('interestRate', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">% p.a.</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repayment Rate
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.1"
                  value={inputs.repaymentRate}
                  onChange={(e) => handleInputChange('repaymentRate', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">% p.a.</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Operating Costs Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-teal-700 mb-4 pb-2 border-b-2 border-teal-500">
            Operating Costs (Monthly)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Management
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={inputs.monthlyPropertyManagement}
                  onChange={(e) => handleInputChange('monthlyPropertyManagement', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">€/month</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maintenance Reserve
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={inputs.monthlyMaintenance}
                  onChange={(e) => handleInputChange('monthlyMaintenance', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">€/month</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Insurance
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={inputs.monthlyInsurance}
                  onChange={(e) => handleInputChange('monthlyInsurance', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">€/month</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Other Costs
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={inputs.monthlyOtherCosts}
                  onChange={(e) => handleInputChange('monthlyOtherCosts', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">€/month</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Growth Assumptions Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-teal-700 mb-4 pb-2 border-b-2 border-teal-500">
            Growth Assumptions (Annual)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rent Increase Rate
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.1"
                  value={inputs.rentIncreaseRate}
                  onChange={(e) => handleInputChange('rentIncreaseRate', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">% p.a.</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Value Increase Rate
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.1"
                  value={inputs.propertyValueIncreaseRate}
                  onChange={(e) => handleInputChange('propertyValueIncreaseRate', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">% p.a.</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operating Costs Increase Rate
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.1"
                  value={inputs.operatingCostsIncreaseRate}
                  onChange={(e) => handleInputChange('operatingCostsIncreaseRate', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">% p.a.</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vacancy Rate
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.1"
                  value={inputs.vacancyRate}
                  onChange={(e) => handleInputChange('vacancyRate', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">%</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Depreciation Rate (AfA)
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.1"
                  value={inputs.depreciationRate}
                  onChange={(e) => handleInputChange('depreciationRate', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">% p.a.</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tax Information Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-teal-700 mb-4 pb-2 border-b-2 border-teal-500">
            Personal Tax Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Annual Income (for tax calculations)
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={inputs.annualIncome}
                  onChange={(e) => handleInputChange('annualIncome', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">€/year</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marginal Tax Rate
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="1"
                  value={inputs.marginalTaxRate}
                  onChange={(e) => handleInputChange('marginalTaxRate', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
                <span className="ml-2 text-gray-600">%</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marital Status
              </label>
              <select
                value={inputs.maritalStatus}
                onChange={(e) => handleInputChange('maritalStatus', e.target.value as 'single' | 'married')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="single">Single</option>
                <option value="married">Married (Ehegattensplitting)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Church Tax Liability
              </label>
              <div className="flex items-center h-full">
                <input
                  type="checkbox"
                  checked={inputs.churchTaxLiability}
                  onChange={(e) => handleInputChange('churchTaxLiability', e.target.checked)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-gray-700">Kirchensteuer (8% of income tax)</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sensitivity Analysis Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-teal-500">
            <h2 className="text-xl font-semibold text-teal-700">
              Sensitivity Analysis
            </h2>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={sensitivityEnabled}
                onChange={(e) => setSensitivityEnabled(e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Enable</span>
            </label>
          </div>
          
          {sensitivityEnabled && (
            <div className="space-y-6">
              {/* Add Scenario Buttons */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem'
              }}>
                <button
                  onClick={() => openScenarioDialog('optimistic')}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 hover:border-gray-400 font-medium text-sm flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>Add Optimistic Scenario</span>
                </button>
                <button
                  onClick={() => openScenarioDialog('pessimistic')}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 hover:border-gray-400 font-medium text-sm flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                  <span>Add Pessimistic Scenario</span>
                </button>
                <button
                  onClick={() => openScenarioDialog()}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 hover:border-gray-400 font-medium text-sm flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add Custom Scenario</span>
                </button>
              </div>
              
              {/* Active Scenarios */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Active Scenarios ({scenarios.length})</h3>
                <div className="space-y-3">
                  {scenarios.map((scenario, idx) => (
                    <div key={idx} className="bg-white rounded border border-gray-200 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: scenario.color }}></div>
                          <div>
                            <span className="font-semibold text-gray-900">{scenario.name}</span>
                            {idx === 0 && (
                              <span className="ml-2 text-xs text-gray-500">(Reference)</span>
                            )}
                          </div>
                        </div>
                        {idx > 0 && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => editScenario(idx)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removeScenario(idx)}
                              className="text-xs text-red-600 hover:text-red-800 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {Object.keys(scenario.variables).length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                          {Object.entries(scenario.variables).map(([key, value]) => {
                            const variable = sensitivityVariables.find(v => v.key === key);
                            const baseValue = inputs[key as keyof PropertyInputs];
                            const diff = typeof value === 'number' && typeof baseValue === 'number' ? value - baseValue : 0;
                            const diffStr = diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
                            
                            return (
                              <div key={key} className="text-xs bg-gray-50 p-2 rounded">
                                <div className="font-medium text-gray-700">{variable?.name}</div>
                                <div className="flex items-baseline space-x-1 mt-1">
                                  <span className="font-semibold text-gray-900">
                                    {typeof value === 'number' ? value.toFixed(2) : value}{variable?.unit}
                                  </span>
                                  <span className={`text-xs ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                    ({diffStr})
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          Current input values (no adjustments)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Advanced Analysis Tools */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Advanced Analysis Tools</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowTornadoChart(!showTornadoChart)}
                    className={`px-4 py-2 rounded-md font-medium text-sm ${
                      showTornadoChart 
                        ? 'bg-teal-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {showTornadoChart ? '✓ ' : ''}Tornado Chart
                  </button>
                  <button
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`px-4 py-2 rounded-md font-medium text-sm ${
                      showHeatmap 
                        ? 'bg-teal-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {showHeatmap ? '✓ ' : ''}Heatmap (Two-Way)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Scenario Creation Dialog */}
        {showScenarioDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col" style={{ maxHeight: '85vh' }}>
              {/* Fixed Header */}
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingScenarioIndex !== null ? 'Edit Scenario' : 'Create New Scenario'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowScenarioDialog(false);
                      setCustomAdjustments({});
                      setNewScenarioName('');
                      setEditingScenarioIndex(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scenario Name
                    </label>
                    <input
                      type="text"
                      value={newScenarioName}
                      onChange={(e) => setNewScenarioName(e.target.value)}
                      placeholder="e.g., High Interest, Market Downturn"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scenario Type
                    </label>
                    <select
                      value={newScenarioType}
                      onChange={(e) => {
                        const type = e.target.value as 'optimistic' | 'pessimistic' | 'custom';
                        setNewScenarioType(type);
                        if (type !== 'custom') {
                          setCustomAdjustments(getPresetAdjustments(type));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="custom">Custom (Manual Adjustments)</option>
                      <option value="optimistic">Optimistic Preset</option>
                      <option value="pessimistic">Pessimistic Preset</option>
                    </select>
                  </div>
                  
                  {newScenarioType !== 'custom' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-xs text-blue-700">
                        <strong>Note:</strong> {newScenarioType === 'optimistic' ? 'Optimistic' : 'Pessimistic'} adjustments must remain directionally consistent with the preset. You can only make changes that are still considered {newScenarioType} compared to the Base scenario.
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Variable Adjustments
                    </h4>
                    <div className="space-y-3">
                      {sensitivityVariables.map((variable) => {
                        const isAdjusted = variable.key in customAdjustments;
                        const currentValue = isAdjusted 
                          ? customAdjustments[variable.key] 
                          : inputs[variable.key];
                        const baseValue = inputs[variable.key];
                        
                        return (
                          <div key={variable.key} className={`p-3 rounded-md border ${isAdjusted ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-gray-700">
                                {variable.name}
                              </label>
                              {isAdjusted && (
                                <button
                                  onClick={() => removeCustomAdjustment(variable.key)}
                                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <input
                                type="range"
                                min={variable.min}
                                max={variable.max}
                                step={variable.step}
                                value={currentValue as number}
                                onChange={(e) => handleCustomAdjustment(variable.key, Number(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                              />
                              <div className="flex items-center space-x-1 min-w-[100px]">
                                <input
                                  type="number"
                                  min={variable.min}
                                  max={variable.max}
                                  step={variable.step}
                                  value={currentValue as number}
                                  onChange={(e) => handleCustomAdjustment(variable.key, Number(e.target.value))}
                                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500"
                                />
                                <span className="text-xs text-gray-600">{variable.unit}</span>
                              </div>
                            </div>
                            
                            {isAdjusted && (
                              <div className="mt-1 text-xs text-purple-600 font-medium">
                                Base: {(baseValue as number).toFixed(2)}{variable.unit}
                                {' → '}
                                Δ {((currentValue as number) - (baseValue as number)) > 0 ? '+' : ''}
                                {((currentValue as number) - (baseValue as number)).toFixed(2)}{variable.unit}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Fixed Footer */}
              <div className="p-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowScenarioDialog(false);
                    setCustomAdjustments({});
                    setNewScenarioName('');
                    setEditingScenarioIndex(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={addScenario}
                  className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-medium"
                >
                  {editingScenarioIndex !== null ? 'Update Scenario' : 'Add Scenario'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Projection Period Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-teal-700 mb-4 pb-2 border-b-2 border-teal-500">
            Projection Period
          </h2>
          
          <div className="flex space-x-4">
            {([10, 20, 40] as const).map((years) => (
              <button
                key={years}
                onClick={() => setProjectionYears(years)}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  projectionYears === years
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {years} Years
              </button>
            ))}
          </div>
        </div>
        
        {/* Key Metrics Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-teal-700 mb-4 pb-2 border-b-2 border-teal-500">
            Investment Summary
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-600 mb-1">Total Investment</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(baseProjection.summary.totalInvestment)}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-600 mb-1">Average Annual Cash Flow</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(baseProjection.summary.averageAnnualCashFlow)}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-600 mb-1">First Year Net Cash Flow</div>
              <div className={`text-2xl font-bold ${
                baseProjection.yearlyData[0].netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(baseProjection.yearlyData[0].netCashFlow)}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-teal-50 border-b border-teal-200">
                  <th className="text-left p-3 font-semibold text-teal-800">Metric</th>
                  {sensitivityEnabled && scenarios.map((scenario, idx) => (
                    <th key={idx} className="text-right p-3 font-semibold text-teal-800">
                      {scenario.name}
                    </th>
                  ))}
                  {!sensitivityEnabled && (
                    <>
                      <th className="text-right p-3 font-semibold text-teal-800">10 Years</th>
                      <th className="text-right p-3 font-semibold text-teal-800">20 Years</th>
                      <th className="text-right p-3 font-semibold text-teal-800">40 Years</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {!sensitivityEnabled ? (
                  <>
                    <tr className="border-b border-gray-200">
                      <td className="p-3 font-medium">IRR (Internal Rate of Return)</td>
                      <td className="p-3 text-right">{formatPercent(baseProjection.summary.irr10Year)}</td>
                      <td className="p-3 text-right">{formatPercent(baseProjection.summary.irr20Year)}</td>
                      <td className="p-3 text-right">{formatPercent(baseProjection.summary.irr40Year)}</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="p-3 font-medium">Total Cash Flow</td>
                      <td className="p-3 text-right">{formatCurrency(baseProjection.summary.totalCashFlow10Year)}</td>
                      <td className="p-3 text-right">{formatCurrency(baseProjection.summary.totalCashFlow20Year)}</td>
                      <td className="p-3 text-right">{formatCurrency(baseProjection.summary.totalCashFlow40Year)}</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="p-3 font-medium">Net Worth (Equity + Cumulative Cash Flow)</td>
                      <td className="p-3 text-right">{formatCurrency(baseProjection.summary.netWorth10Year)}</td>
                      <td className="p-3 text-right">{formatCurrency(baseProjection.summary.netWorth20Year)}</td>
                      <td className="p-3 text-right">{formatCurrency(baseProjection.summary.netWorth40Year)}</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="p-3 font-medium">ROI (Return on Investment)</td>
                      <td className="p-3 text-right">{formatPercent(baseProjection.summary.roiAtYear10)}</td>
                      <td className="p-3 text-right">{formatPercent(baseProjection.summary.roiAtYear20)}</td>
                      <td className="p-3 text-right">{formatPercent(baseProjection.summary.roiAtYear40)}</td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr className="border-b border-gray-200">
                      <td className="p-3 font-medium">IRR at {projectionYears} Years</td>
                      {scenarioProjections.map((proj, idx) => (
                        <td key={idx} className="p-3 text-right">
                          {formatPercent(
                            projectionYears === 10 ? proj.summary.irr10Year :
                            projectionYears === 20 ? proj.summary.irr20Year :
                            proj.summary.irr40Year
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="p-3 font-medium">Total Cash Flow</td>
                      {scenarioProjections.map((proj, idx) => (
                        <td key={idx} className="p-3 text-right">
                          {formatCurrency(
                            projectionYears === 10 ? proj.summary.totalCashFlow10Year :
                            projectionYears === 20 ? proj.summary.totalCashFlow20Year :
                            proj.summary.totalCashFlow40Year
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="p-3 font-medium">Net Worth</td>
                      {scenarioProjections.map((proj, idx) => (
                        <td key={idx} className="p-3 text-right">
                          {formatCurrency(
                            projectionYears === 10 ? proj.summary.netWorth10Year :
                            projectionYears === 20 ? proj.summary.netWorth20Year :
                            proj.summary.netWorth40Year
                          )}
                        </td>
                      ))}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Charts */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-teal-700 mb-4 pb-2 border-b-2 border-teal-500">
            Projection Charts
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Net Cash Flow Chart */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Annual Net Cash Flow</h3>
              <ResponsiveContainer width="100%" height={300} key={`cashflow-${projectionYears}`}>
                <AreaChart data={baseProjection.yearlyData.slice(0, projectionYears)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="year"
                    type="number"
                    domain={[1, projectionYears]}
                    ticks={projectionYears === 10 ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : 
                           projectionYears === 20 ? [1, 5, 10, 15, 20] :
                           [1, 10, 20, 30, 40]}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Year ${label}`}
                  />
                  <Legend />
                  {scenarioProjections.map((proj, idx) => {
                    const chartData = baseProjection.yearlyData.slice(0, projectionYears).map((basePoint, pointIdx) => ({
                      ...basePoint,
                      [`scenario_${idx}_value`]: proj.yearlyData[pointIdx]?.netCashFlow
                    }));
                    
                    return (
                      <Area 
                        key={idx}
                        type="monotone" 
                        dataKey={`scenario_${idx}_value`}
                        data={chartData}
                        stroke={scenarios[idx].color}
                        fill={scenarios[idx].color}
                        fillOpacity={0.3}
                        name={scenarios[idx].name}
                        strokeWidth={2}
                        dot={false}
                        activeDot={false}
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Net Worth Chart */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Net Worth Development</h3>
              <ResponsiveContainer width="100%" height={300} key={`networth-${projectionYears}`}>
                <AreaChart data={baseProjection.yearlyData.slice(0, projectionYears)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="year"
                    type="number"
                    domain={[1, projectionYears]}
                    ticks={projectionYears === 10 ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : 
                           projectionYears === 20 ? [1, 5, 10, 15, 20] :
                           [1, 10, 20, 30, 40]}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Year ${label}`}
                  />
                  <Legend />
                  {scenarioProjections.map((proj, idx) => {
                    const chartData = baseProjection.yearlyData.slice(0, projectionYears).map((basePoint, pointIdx) => ({
                      ...basePoint,
                      [`scenario_${idx}_value`]: proj.yearlyData[pointIdx]?.netWorth
                    }));
                    
                    return (
                      <Area 
                        key={idx}
                        type="monotone" 
                        dataKey={`scenario_${idx}_value`}
                        data={chartData}
                        stroke={scenarios[idx].color}
                        fill={scenarios[idx].color}
                        fillOpacity={0.3}
                        name={scenarios[idx].name}
                        strokeWidth={2}
                        dot={false}
                        activeDot={false}
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Cumulative Cash Flow Chart */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Cumulative Cash Flow</h3>
              <ResponsiveContainer width="100%" height={300} key={`cumulative-${projectionYears}`}>
                <AreaChart data={baseProjection.yearlyData.slice(0, projectionYears)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="year"
                    type="number"
                    domain={[1, projectionYears]}
                    ticks={projectionYears === 10 ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : 
                           projectionYears === 20 ? [1, 5, 10, 15, 20] :
                           [1, 10, 20, 30, 40]}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Year ${label}`}
                  />
                  <Legend />
                  {scenarioProjections.map((proj, idx) => {
                    const chartData = baseProjection.yearlyData.slice(0, projectionYears).map((basePoint, pointIdx) => ({
                      ...basePoint,
                      [`scenario_${idx}_value`]: proj.yearlyData[pointIdx]?.cumulativeCashFlow
                    }));
                    
                    return (
                      <Area 
                        key={idx}
                        type="monotone" 
                        dataKey={`scenario_${idx}_value`}
                        data={chartData}
                        stroke={scenarios[idx].color}
                        fill={scenarios[idx].color}
                        fillOpacity={0.3}
                        name={scenarios[idx].name}
                        strokeWidth={2}
                        dot={false}
                        activeDot={false}
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Tornado Chart */}
        {showTornadoChart && sensitivityEnabled && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-teal-700 mb-4 pb-2 border-b-2 border-teal-500">
              Tornado Chart - Variable Impact Analysis
            </h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Each variable is tested by moving it from its minimum to maximum value (shown in parentheses) while keeping all other variables at their base settings. The vertical center line represents your base case result. The Min and Max values show the <strong>actual metric outcomes</strong> at those extremes, not changes from base. Green bars indicate better outcomes, red bars indicate worse outcomes. Variables with the greatest impact appear at the top—longer bars mean greater sensitivity.
              </p>
            </div>
            
            <div className="mb-4 flex items-end justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Metric to Analyze
                </label>
                <select
                  value={tornadoMetric}
                  onChange={(e) => setTornadoMetric(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="irr10">IRR at 10 Years</option>
                  <option value="irr20">IRR at 20 Years</option>
                  <option value="irr40">IRR at 40 Years</option>
                  <option value="cashflow">Total Cash Flow at {projectionYears} Years</option>
                  <option value="networth">Net Worth at {projectionYears} Years</option>
                </select>
              </div>
              
              {/* Base case value badge */}
              {tornadoData.length > 0 && (
                <div className="pb-0.5">
                  <span className="text-xs font-medium text-gray-600 bg-white px-3 py-2 rounded border border-gray-300">
                    Base: {(() => {
                      const firstItem = tornadoData[0];
                      const isPercentMetric = tornadoMetric.startsWith('irr');
                      return isPercentMetric 
                        ? formatPercent(firstItem.baseValue, 1)
                        : `${(firstItem.baseValue / 1000).toFixed(0)}k`;
                    })()}
                  </span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              {tornadoData.map((item, idx) => {
                const isPercentMetric = tornadoMetric.startsWith('irr');
                const minDisplay = isPercentMetric ? formatPercent(item.minImpact, 1) : `${(item.minImpact / 1000).toFixed(0)}k`;
                const maxDisplay = isPercentMetric ? formatPercent(item.maxImpact, 1) : `${(item.maxImpact / 1000).toFixed(0)}k`;
                
                // Get the variable's min/max range and base value
                const variable = sensitivityVariables.find(v => v.name === item.variable);
                const varMinDisplay = variable ? `${variable.min}%` : '';
                const varMaxDisplay = variable ? `${variable.max}%` : '';
                const varBaseValue = variable ? inputs[variable.key as keyof PropertyInputs] : 0;
                const varBaseDisplay = typeof varBaseValue === 'number' ? `${varBaseValue}%` : `${varBaseValue}`;
                
                // Calculate bar widths as percentages based on delta from base
                const minDelta = item.minImpact - item.baseValue;
                const maxDelta = item.maxImpact - item.baseValue;
                const maxAbsDelta = Math.max(...tornadoData.map(d => Math.max(Math.abs(d.minImpact - d.baseValue), Math.abs(d.maxImpact - d.baseValue))));
                const minWidthPercent = (Math.abs(minDelta) / maxAbsDelta) * 100;
                const maxWidthPercent = (Math.abs(maxDelta) / maxAbsDelta) * 100;
                
                // Swap colors if max impact is negative (more intuitive: green = better, red = worse)
                const shouldSwapColors = item.maxImpact < item.baseValue;
                const leftBarColor = shouldSwapColors ? 'bg-green-500' : 'bg-red-500';
                const rightBarColor = shouldSwapColors ? 'bg-red-500' : 'bg-green-500';
                
                return (
                  <div key={idx}>
                    <div className="flex items-baseline justify-between text-sm mb-1">
                      <div className="flex items-baseline">
                        <span className="font-medium text-gray-900">{item.variable}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          <span className="text-gray-400">Range:</span> {varMinDisplay} - {varMaxDisplay}
                          <span className="mx-1.5">•</span>
                          <span className="text-blue-600">Base:</span> <span className="text-blue-600 font-semibold">{varBaseDisplay}</span>
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 bg-gray-100 rounded"></div>
                      <div className="relative flex items-center h-8">
                        <div className="flex-1 flex items-center justify-start pl-2">
                          <span className="text-xs font-medium text-white bg-black bg-opacity-50 px-2 py-0.5 rounded z-10">
                            {minDisplay}
                          </span>
                        </div>
                        <div className="absolute inset-0 flex items-center">
                          <div className="flex-1 flex items-center justify-end">
                            <div 
                              className={`h-8 ${leftBarColor} rounded-l`}
                              style={{ width: `${minWidthPercent}%` }}
                            ></div>
                          </div>
                          <div className="w-1 h-10 bg-gray-800 mx-0.5 flex-shrink-0 relative z-10"></div>
                          <div className="flex-1 flex items-center">
                            <div 
                              className={`h-8 ${rightBarColor} rounded-r`}
                              style={{ width: `${maxWidthPercent}%` }}
                            ></div>
                          </div>
                        </div>
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
            
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                <span className="text-gray-700">Variable at Minimum</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span className="text-gray-700">Variable at Maximum</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Heatmap */}
        {showHeatmap && sensitivityEnabled && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-teal-700 mb-4 pb-2 border-b-2 border-teal-500">
              Heatmap - Two-Way Sensitivity Analysis
            </h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> This heatmap tests all possible combinations of two variables to reveal interaction effects. Each cell shows the outcome when both variables are at specific values simultaneously, while all other variables remain at their base settings. Green cells indicate better outcomes, red cells indicate worse outcomes. Use this to identify which combinations of assumptions produce the most favorable or unfavorable results.
              </p>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horizontal Axis Variable
                </label>
                <select
                  value={heatmapVarX}
                  onChange={(e) => setHeatmapVarX(e.target.value as keyof PropertyInputs)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                >
                  {sensitivityVariables.map(v => (
                    <option key={v.key} value={v.key}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vertical Axis Variable
                </label>
                <select
                  value={heatmapVarY}
                  onChange={(e) => setHeatmapVarY(e.target.value as keyof PropertyInputs)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                >
                  {sensitivityVariables.map(v => (
                    <option key={v.key} value={v.key}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Metric to Analyze
                </label>
                <select
                  value={heatmapMetric}
                  onChange={(e) => setHeatmapMetric(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="irr10">IRR at 10 Years</option>
                  <option value="irr20">IRR at 20 Years</option>
                  <option value="irr40">IRR at 40 Years</option>
                  <option value="cashflow">Total Cash Flow at {projectionYears} Years</option>
                  <option value="networth">Net Worth at {projectionYears} Years</option>
                </select>
              </div>
            </div>
            
            <TableHeatmap 
              heatmapData={heatmapData}
              heatmapVarX={heatmapVarX}
              heatmapVarY={heatmapVarY}
              heatmapMetric={heatmapMetric}
              sensitivityVariables={sensitivityVariables}
              formatPercent={formatPercent}
              formatCurrency={formatCurrency}
              gapSize="1px"
              glossyOverlay={true}
            />
          </div>
        )}
        
        {/* Detailed Year-by-Year Table */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-teal-700 mb-4 pb-2 border-b-2 border-teal-500">
            Detailed Annual Projections
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-teal-50 border-b border-teal-200">
                  <th className="text-left p-2 font-semibold text-teal-800">Year</th>
                  <th className="text-left p-2 font-semibold text-teal-800">Date</th>
                  <th className="text-right p-2 font-semibold text-teal-800">Property Value</th>
                  <th className="text-right p-2 font-semibold text-teal-800">Loan Balance</th>
                  <th className="text-right p-2 font-semibold text-teal-800">Effective Rent</th>
                  <th className="text-right p-2 font-semibold text-teal-800">Operating Costs</th>
                  <th className="text-right p-2 font-semibold text-teal-800">Interest Paid</th>
                  <th className="text-right p-2 font-semibold text-teal-800">Tax Savings</th>
                  <th className="text-right p-2 font-semibold text-teal-800">Net Cash Flow</th>
                  <th className="text-right p-2 font-semibold text-teal-800">Equity</th>
                  <th className="text-right p-2 font-semibold text-teal-800">Net Worth</th>
                </tr>
              </thead>
              <tbody>
                {baseProjection.yearlyData.slice(0, projectionYears).map((year) => (
                  <tr key={year.year} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-2">{year.year}</td>
                    <td className="p-2">{year.date}</td>
                    <td className="p-2 text-right">{formatCurrency(year.propertyValue)}</td>
                    <td className="p-2 text-right">{formatCurrency(year.outstandingLoan)}</td>
                    <td className="p-2 text-right">{formatCurrency(year.effectiveRent)}</td>
                    <td className="p-2 text-right">{formatCurrency(year.totalOperatingCosts)}</td>
                    <td className="p-2 text-right">{formatCurrency(year.interestPaid)}</td>
                    <td className={`p-2 text-right ${year.taxSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(year.taxSavings)}
                    </td>
                    <td className={`p-2 text-right font-medium ${year.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(year.netCashFlow)}
                    </td>
                    <td className="p-2 text-right">{formatCurrency(year.equity)}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(year.netWorth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Disclaimer */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Important Disclaimer</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>This analysis is for informational purposes only and does not constitute financial, investment, or legal advice. Actual results may vary significantly based on market conditions, property-specific factors, and changes in German tax laws. Always consult with qualified professionals (Steuerberater, financial advisors) before making investment decisions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GermanPropertyAnalyzer;
