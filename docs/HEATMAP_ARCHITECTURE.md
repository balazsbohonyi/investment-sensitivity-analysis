# HTML Table-Based Heatmap Architecture

## Overview
A clean, responsive heatmap implementation using HTML `<table>` elements with proper semantic structure, configurable gaps, and perfect alignment of labels with cells.

## Key Requirements

### 1. Label Rotation (90° Left)
- ✅ Vertical variable label (main label): Rotated 90° to the left
- ✅ Vertical value labels (row labels): Rotated 90° to the left
- Both use `transform: rotate(-90deg)` for consistent rotation

### 2. Cell Value Styling
- ✅ Badge-style labels on colored cells
- ✅ Semi-transparent black background (`rgba(0, 0, 0, 0.5)`)
- ✅ White text for contrast
- ✅ Same styling as tornado chart min/max badges

### 3. Responsive Design
- ✅ Mobile-friendly with multiple breakpoints (1024px, 768px, 480px)
- ✅ Cell sizes scale down on smaller screens
- ✅ Font sizes adjust proportionally
- ✅ Horizontal scroll on very small screens

### 4. Container Control
- ✅ Wrapper container to control table width
- ✅ Centered with `max-width` and `margin: 0 auto`
- ✅ Smooth touch scrolling on mobile devices

### 5. Gap Configuration
- ✅ Configurable: 0px (no gaps) or 1px gaps
- ✅ Controlled via `border-spacing` property

## Table Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    [Horizontal Variable Label]              │
├────────┬──────┬──────┬──────┬──────┬──────┬────────────────┤
│        │      │ 2.0% │ 3.0% │ 4.0% │ 5.0% │ 6.0%           │
├────────┼──────┼──────┼──────┼──────┼──────┼────────────────┤
│   V    │ 5.0% │ Cell │ Cell │ Cell │ Cell │ Cell           │
│   e    ├──────┼──────┼──────┼──────┼──────┼────────────────┤
│   r    │ 4.0% │ Cell │ Cell │ Cell │ Cell │ Cell           │
│   t    ├──────┼──────┼──────┼──────┼──────┼────────────────┤
│   i    │ 3.0% │ Cell │ Cell │ Cell │ Cell │ Cell           │
│   c    ├──────┼──────┼──────┼──────┼──────┼────────────────┤
│   a    │ 2.0% │ Cell │ Cell │ Cell │ Cell │ Cell           │
│   l    ├──────┼──────┼──────┼──────┼──────┼────────────────┤
│        │ 1.0% │ Cell │ Cell │ Cell │ Cell │ Cell           │
│   V    │      │      │      │      │      │                │
│   a    │      │      │      │      │      │                │
│   r    │      │      │      │      │      │                │
└────────┴──────┴──────┴──────┴──────┴──────┴────────────────┘
```

## Component Structure

### 1. Table Element
```html
<table className="heatmap-table" style={{ borderSpacing: gapSize }}>
```

**Props:**
- `gapSize`: `"0"` for no gaps, `"1px"` for 1px gaps (configurable)

### 2. Header Row (Horizontal Variable Label)
```html
<thead>
  <tr>
    <th colSpan={7}>Interest Rate</th>
  </tr>
</thead>
```

**Styling:**
- Centered text
- Spans entire table width
- Gray background

### 3. Column Headers (Horizontal Value Labels)
```html
<tr>
  <th></th> {/* Empty corner */}
  <th></th> {/* Vertical label space */}
  <th>2.0%</th>
  <th>3.0%</th>
  <th>4.0%</th>
  <th>5.0%</th>
  <th>6.0%</th>
</tr>
```

**Styling:**
- Small font size
- Gray text color
- Centered horizontally
- Bottom padding

### 4. Data Rows with Vertical Labels
```html
<tbody>
  <tr>
    {/* Vertical variable label - spans all rows, rotated 90° left */}
    <th rowSpan={5} className="vertical-label">
      <div className="rotated-text">Rent Increase</div>
    </th>
    
    {/* Vertical value label - rotated 90° left */}
    <th className="row-label">
      <div className="rotated-text">5.0%</div>
    </th>
    
    {/* Data cells with badge-styled labels */}
    <td className="data-cell" style={{ backgroundColor: color }}>
      <span className="cell-value">14.5%</span>
    </td>
    <td className="data-cell" style={{ backgroundColor: color }}>
      <span className="cell-value">13.2%</span>
    </td>
    <td className="data-cell" style={{ backgroundColor: color }}>
      <span className="cell-value">11.8%</span>
    </td>
    <td className="data-cell" style={{ backgroundColor: color }}>
      <span className="cell-value">10.5%</span>
    </td>
    <td className="data-cell" style={{ backgroundColor: color }}>
      <span className="cell-value">9.2%</span>
    </td>
  </tr>
  {/* Remaining 4 rows - no vertical variable label */}
</tbody>
```

## CSS/Styling Strategy

### 1. Gap Control
```css
/* No gaps */
table { border-collapse: collapse; }

/* 1px gaps */
table { 
  border-collapse: separate; 
  border-spacing: 1px;
}
```

### 2. Vertical Text Rotation
```css
/* Vertical variable label - rotated 90° left */
.vertical-label {
  position: relative;
  width: 40px;
  padding: 0;
}

.vertical-label .rotated-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-90deg);
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

/* Vertical value labels - rotated 90° left */
.row-label {
  position: relative;
  width: 30px;
  padding: 0;
}

.row-label .rotated-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-90deg);
  white-space: nowrap;
  font-size: 11px;
  color: #6b7280;
}
```

### 3. Cell Styling
```css
td.data-cell {
  width: 100px;
  height: 80px;
  text-align: center;
  vertical-align: middle;
  position: relative;
  padding: 0;
}

/* Cell value label - styled like tornado chart min/max badges */
.cell-value {
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 14px;
  display: inline-block;
}
```

### 4. Container & Responsive Design
```css
/* Container to control heatmap width */
.heatmap-container {
  max-width: 800px;
  margin: 0 auto;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
}

/* Responsive breakpoints */
@media (max-width: 1024px) {
  td.data-cell {
    width: 80px;
    height: 70px;
  }
  
  .cell-value {
    font-size: 13px;
    padding: 3px 6px;
  }
}

@media (max-width: 768px) {
  td.data-cell {
    width: 60px;
    height: 60px;
  }
  
  .cell-value {
    font-size: 11px;
    padding: 2px 5px;
  }
  
  .vertical-label .rotated-text {
    font-size: 12px;
  }
  
  .row-label .rotated-text {
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  td.data-cell {
    width: 50px;
    height: 50px;
  }
  
  .cell-value {
    font-size: 10px;
    padding: 2px 4px;
  }
}
```

## React Component Architecture

### Props Interface
```typescript
interface TableHeatmapProps {
  heatmapData: Array<{
    x: number;
    y: number;
    xLabel: string;
    yLabel: string;
    value: number;
  }>;
  heatmapVarX: string;
  heatmapVarY: string;
  heatmapMetric: string;
  sensitivityVariables: Array<{ key: string; name: string }>;
  formatPercent: (value: number, decimals?: number) => string;
  formatCurrency: (value: number) => string;
  gapSize?: '0' | '1px'; // Configurable gap
}
```

### Color Calculation
```typescript
const getColor = (value: number, min: number, max: number) => {
  const normalized = (value - min) / (max - min);
  
  if (normalized < 0.5) {
    // Red to Yellow
    const red = 255;
    const green = Math.round(255 * normalized * 2);
    return `rgb(${red}, ${green}, 100)`;
  } else {
    // Yellow to Green
    const red = Math.round(255 * (1 - (normalized - 0.5) * 2));
    const green = 255;
    return `rgb(${red}, ${green}, 100)`;
  }
};
```

### Data Organization
```typescript
// Group data by rows (y values)
const rows = [4, 3, 2, 1, 0].map(y => {
  const rowData = [0, 1, 2, 3, 4].map(x => 
    heatmapData.find(d => d.x === x && d.y === y)
  );
  return { y, data: rowData };
});
```

## Advantages of Table-Based Approach

### 1. Perfect Alignment
- Native browser table alignment ensures labels match cells exactly
- No manual positioning calculations needed
- `rowSpan` and `colSpan` handle multi-cell labels naturally

### 2. Semantic HTML
- `<th>` for headers (accessibility)
- `<td>` for data cells
- Screen readers can navigate properly

### 3. Configurable Gaps
- `border-collapse: collapse` → No gaps
- `border-spacing: 1px` → 1px gaps
- Easy to switch

### 4. Responsive
- CSS can adjust cell sizes at breakpoints
- Text wraps naturally in cells
- Mobile-friendly with smaller dimensions

### 5. No Layout Bugs
- No flexbox alignment issues
- No absolute positioning problems
- Browser handles cell sizing automatically

### 6. Simpler Code
- No complex flex calculations
- No manual gap math
- Cleaner component logic

## Implementation Plan

### Step 1: Create TableHeatmap Component
- Define component structure
- Add props interface
- Set up basic table skeleton

### Step 2: Implement Table Structure
- Header row with horizontal variable label
- Column header row with value labels
- Data rows with vertical labels and cells

### Step 3: Add Styling
- Configure gap mode (collapse vs spacing)
- Style cells with colors
- Rotate vertical labels
- Add hover effects

### Step 4: Add Interactivity
- Hover tooltips showing exact values
- Click to highlight row/column (optional)
- Responsive sizing

### Step 5: Test & Refine
- Verify alignment at all screen sizes
- Check gap configurations
- Test color gradients
- Validate accessibility

## Example Code Structure

```tsx
const TableHeatmap: React.FC<TableHeatmapProps> = ({
  heatmapData,
  heatmapVarX,
  heatmapVarY,
  heatmapMetric,
  sensitivityVariables,
  formatPercent,
  formatCurrency,
  gapSize = '0'
}) => {
  const minValue = Math.min(...heatmapData.map(d => d.value));
  const maxValue = Math.max(...heatmapData.map(d => d.value));
  
  const xVarName = sensitivityVariables.find(v => v.key === heatmapVarX)?.name;
  const yVarName = sensitivityVariables.find(v => v.key === heatmapVarY)?.name;
  
  const isPercentMetric = heatmapMetric.startsWith('irr');
  
  const tableStyle: React.CSSProperties = {
    borderCollapse: gapSize === '0' ? 'collapse' : 'separate',
    borderSpacing: gapSize === '0' ? '0' : gapSize
  };
  
  return (
    <div className="heatmap-container">
      <table style={tableStyle} className="mx-auto">
        <thead>
          {/* Horizontal variable label */}
          <tr>
            <th colSpan={7} className="text-center py-3 text-sm font-semibold text-gray-700 bg-gray-50">
              {xVarName}
            </th>
          </tr>
          {/* Column headers */}
          <tr>
            <th className="w-10"></th> {/* Vertical var label space */}
            <th className="w-8"></th>  {/* Row label space */}
            {[0, 1, 2, 3, 4].map(x => {
              const cell = heatmapData.find(d => d.x === x);
              return (
                <th key={x} className="text-xs text-gray-600 px-2 pb-2 text-center">
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
                {/* Vertical variable label - only on first row, rotated 90° left */}
                {idx === 0 && (
                  <th 
                    rowSpan={5} 
                    className="vertical-label bg-gray-50"
                    style={{ position: 'relative', width: '40px', padding: 0 }}
                  >
                    <div 
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-90deg)',
                        whiteSpace: 'nowrap',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#374151'
                      }}
                    >
                      {yVarName}
                    </div>
                  </th>
                )}
                
                {/* Row label - rotated 90° left */}
                <th 
                  className="row-label bg-gray-50"
                  style={{ position: 'relative', width: '30px', padding: 0 }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%) rotate(-90deg)',
                      whiteSpace: 'nowrap',
                      fontSize: '11px',
                      color: '#6b7280'
                    }}
                  >
                    {firstCell?.yLabel}%
                  </div>
                </th>
                
                {/* Data cells with badge-styled values */}
                {rowCells.map((cell, x) => {
                  if (!cell) return null;
                  const color = getColor(cell.value, minValue, maxValue);
                  const displayValue = isPercentMetric 
                    ? formatPercent(cell.value, 1)
                    : `${(cell.value / 1000).toFixed(0)}k`;
                  const fullValue = isPercentMetric 
                    ? formatPercent(cell.value) 
                    : formatCurrency(cell.value);
                  
                  return (
                    <td 
                      key={x}
                      className="data-cell"
                      style={{ 
                        backgroundColor: color,
                        width: '100px',
                        height: '80px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        padding: 0
                      }}
                      title={fullValue}
                    >
                      <span
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '14px',
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
      </table>
    </div>
  );
};

// CSS classes for responsive design
const styles = `
.heatmap-container {
  max-width: 800px;
  margin: 0 auto;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 1024px) {
  .data-cell {
    width: 80px !important;
    height: 70px !important;
  }
  .data-cell span {
    font-size: 13px !important;
    padding: 3px 6px !important;
  }
}

@media (max-width: 768px) {
  .data-cell {
    width: 60px !important;
    height: 60px !important;
  }
  .data-cell span {
    font-size: 11px !important;
    padding: 2px 5px !important;
  }
  .vertical-label div {
    font-size: 12px !important;
  }
  .row-label div {
    font-size: 10px !important;
  }
}

@media (max-width: 480px) {
  .data-cell {
    width: 50px !important;
    height: 50px !important;
  }
  .data-cell span {
    font-size: 10px !important;
    padding: 2px 4px !important;
  }
}
`;
```

## Summary

This table-based approach solves all alignment issues by leveraging native browser table layout:
- ✅ Perfect alignment (native table behavior)
- ✅ Configurable gaps (border-spacing)
- ✅ Semantic HTML (accessibility)
- ✅ Responsive design (CSS breakpoints)
- ✅ Simpler code (no manual positioning)
- ✅ Vertical labels (rowSpan + rotation)
- ✅ Horizontal labels (colSpan + th elements)

The implementation is straightforward, maintainable, and reliable across all browsers and screen sizes.
