# Merline Data Visualization

## Design Philosophy

Visualizations in Merline exist to **explain data, not decorate it.** Every chart, graph, and map must serve a decision-making purpose. Visual hierarchy, clarity, and accessibility are paramount.

Charts should be readable instantly. If a user needs to study a chart to understand it, the chart has failed.

---

## 1. Chart Color Palette

### 1.1 Categorical Palette (12 colors)

The categorical palette is designed for distinction, not aesthetics. Colors are chosen to be distinguishable by all common forms of color vision deficiency.

```
#1  #0D7377  Teal (Primary)        → Category 1
#2  #4F46E5  Indigo (Secondary)     → Category 2
#3  #D97706  Amber                  → Category 3
#4  #BC1C1C  Red                    → Category 4
#5  #1E7E34  Green                  → Category 5
#6  #7C3AED  Violet                 → Category 6
#7  #DB2777  Pink                   → Category 7
#8  #0891B2  Cyan                   → Category 8
#9  #65A30D  Lime                   → Category 9
#10 #EA580C  Orange                 → Category 10
#11 #0284C7  Sky Blue               → Category 11
#12 #A1A1AA  Zinc (neutral)         → Category 12
```

### 1.2 Colorblind-Safe Pairs

For charts with limited categories (2-4), use these safe pairs:

| Pair | Colors | Distinguishable by |
|------|--------|-------------------|
| Pair 1 | #0D7377 + #D97706 | All CVD types |
| Pair 2 | #4F46E5 + #EA580C | All CVD types |
| Pair 3 | #0891B2 + #DB2777 | All CVD types |
| Pair 4 | #1E7E34 + #7C3AED | Most CVD types |
| Pair 5 | #0D7377 + #A1A1AA | All CVD types |

### 1.3 Sequential Palette (5-step)

For continuous data (densities, rates, percentages):

```
Light → Dark
Step 1: #E8F4F4  (light bg)
Step 2: #A3D6D6
Step 3: #57B5B5
Step 4: #0D7377  (primary)
Step 5: #074A4C  (dark)
```

### 1.4 Diverging Palette (5-step)

For data with a meaningful midpoint (deviation from target, % change):

```
Negative → Neutral → Positive
Step -2: #BC1C1C  (red)
Step -1: #FCA5A5  (light red)
Step 0:  #F1F3F5  (neutral)
Step +1: #A3D6D6  (light teal)
Step +2: #0D7377  (teal)
```

### 1.5 Chart Background

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Chart area | Transparent | Transparent |
| Grid lines | #E9ECEF (1px) | #333538 (1px) |
| Axis lines | #DEE2E6 (1.5px) | #3D3F42 (1.5px) |
| Axis labels | #495057 | #86898E |
| Zero line | #DEE2E6 (2px) | #CED4DA (2px) |
| Annotation fill | #F8F9FA | #212225 |

---

## 2. Chart Types and Usage Guidelines

### 2.1 Bar Chart

| Use Case | Variant | Example |
|----------|---------|---------|
| Compare categories | Vertical bar | Submissions by region |
| Show ranking | Horizontal bar | Indicator achievement ranking |
| Part-to-whole | Stacked bar | Age distribution by gender |
| Compare groups | Grouped bar | Vaccination rate by district, pre/post |

**Guidelines:**
- Start y-axis at 0 (never truncate)
- Sort bars by value (descending) for ranking
- Max 15 bars before scrolling/grouping
- Label data directly on/above bars when space allows
- Horizontal bars for long category labels

### 2.2 Line Chart

| Use Case | Variant | Example |
|----------|---------|---------|
| Show trend over time | Single line | Monthly submission count |
| Compare trends | Multi-line | Enumerator performance trends |
| Show target vs actual | Line + threshold | Indicator progress vs target |
| Show confidence | Line + band | Survey estimate with confidence interval |

**Guidelines:**
- Always label the y-axis (what are we measuring?)
- Show at least 3 data points for a meaningful trend
- Use dots on data points when fewer than 20 points
- No dots when more than 20 (line only)
- Include baseline/target reference lines where applicable

### 2.3 Area Chart

| Use Case | Variant | Example |
|----------|---------|---------|
| Show volume over time | Stacked area | Cumulative submissions by enumerator |
| Show composition | Percentage area | Response distribution by month |
| Show gap | Area with baseline | Progress toward target (fill to target) |

**Guidelines:**
- Use 20-30% opacity for fill
- Stack order: largest category at bottom
- Max 5 stacked categories
- Always include a zero baseline

### 2.4 Pie / Donut Chart

| Use Case | Variant | Example |
|----------|---------|---------|
| Part-to-whole (2-5 categories) | Donut | Gender distribution |
| Show completion | Semi-donut | Submission completion rate |

**Guidelines:**
- NEVER use pie charts for more than 5 categories
- Prefer donut (has center for total label)
- Sort slices largest to smallest, clockwise from 12 o'clock
- Always show values as both percentage and count
- Recommendation: Replace with bar chart for clarity

### 2.5 Scatter Plot

| Use Case | Variant | Example |
|----------|---------|---------|
| Show correlation | Basic scatter | Duration vs quality score |
| Show groups | Colored scatter | Response patterns by enumerator |
| Show magnitude | Bubble chart | Program size vs impact (bubble = budget) |

**Guidelines:**
- Include trend line (linear regression) when appropriate
- Use 30% opacity points for overlapping data
- Always label outliers
- Quadrant lines for 2x2 analysis (high/low x high/low)

### 2.6 Heatmap

| Use Case | Variant | Example |
|----------|---------|---------|
| Show patterns across 2 dimensions | Matrix | Response rate by region × month |
| Show density | Geo heatmap | Submission density map |
| Show calendar patterns | Calendar | Daily submission volume (GitHub-style) |

**Guidelines:**
- Use sequential color palette (light → dark = low → high)
- Always show value on hover
- Include row/column totals

### 2.7 Gauge / Speedometer

| Use Case | Variant | Example |
|----------|---------|---------|
| Show progress to target | Semi-circle | Quality score: 85/100 |
| Show KPI status | With ranges | Indicator: Red/Yellow/Green zone |

**Guidelines:**
- Show current value prominently in center
- Show target value below
- Color ranges: Red (0-60%), Amber (60-80%), Green (80-100%)
- Always show numeric value (not just visual)
- Max 3 gauges per row

### 2.8 Sparkline

| Use Case | Variant | Example |
|----------|---------|---------|
| Show trend in table/card | Mini line | Submissions trend last 30 days |
| Show mini progress | Mini bar | Indicator progress sparkline |

**Guidelines:**
- Width: 80-120px
- Height: 20-30px
- No axis labels (context provided by surrounding text)
- Show last 7-30 data points
- Color by trend direction (green = up, red = down)

---

## 3. Typography in Charts

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Chart title | Inter | 16px | 600 | Text primary |
| Axis title | Inter | 13px | 500 | Text secondary |
| Axis labels | Inter | 12px | 400 | Text tertiary |
| Data labels | Inter | 12px | 500 | Text primary |
| Legend | Inter | 12px | 400 | Text secondary |
| Tooltip | Inter | 13px | 400 | Text primary |
| KPI value | Inter | 32px | 700 | Text primary |
| KPI label | Inter | 13px | 500 | Text secondary |
| KPI delta | Inter | 14px | 500 | Success/error color |

---

## 4. Legend, Tooltip, and Annotation Design

### 4.1 Legend

```
Position: Top-right of chart area (default)
          Bottom-center (for wide charts)
          Right side (for tall charts)

Style:    Horizontal row of [color swatch] + [label]
          Vertical list for 5+ items

Swatch:   12×12px rounded square (2px border radius)
          or line segment for line charts

Interaction: Click to toggle visibility (dim, don't remove)
             with transition animation (150ms)
```

### 4.2 Tooltip

```
┌─────────────────────────────────────────┐
│ Submission Trend                         │  ← 13px, 600 weight
│─────────────────────────────────────────│
│ January 2026:   1,247 submissions       │  ← 12px
│ February 2026:  1,523 submissions       │
│ Change:         +22% from last month    │  ← color-coded
└─────────────────────────────────────────┘

Width: 200-300px
Padding: 10px 14px
Background: --bg-elevated (white in light, #2A2B2E in dark)
Border radius: 6px
Shadow: shadow-3
Arrow: 8px triangle pointing to data point
Appear: 100ms delay (avoid flicker during mouse movement)
```

### 4.3 Annotations

```
┌──────────────────────────────────────────┐
│                                          │
│   ╱╲                                    │
│  ╱  ╲      ★ Baseline target: 85%      │
│ ╱    ╲     ── Actual: 62%              │
│╱      ╲    📍 Key milestone date       │
│        ╲                               │
│         ╲                              │
└──────────────────────────────────────────┘

Style:    Small text (12px) with connecting line to data point
          Background badge when overlapping data
          Arrow line from annotation to point
Color:    Text secondary, line gray
Position: Avoid overlapping data
```

---

## 5. Interactive Chart Patterns

### 5.1 Hover

| Chart Type | Hover Behavior |
|------------|---------------|
| Bar | Highlight bar, show tooltip with exact value |
| Line | Show data point dot, tooltip with all series values |
| Pie/Donut | Expand slice slightly, show tooltip |
| Scatter | Highlight point, show tooltip with coordinates |
| Heatmap | Show cell value in tooltip |
| Map | Show popup with location data |
| Gauge | Show exact value animation |

### 5.2 Click

| Chart Type | Click Behavior |
|------------|---------------|
| Bar | Drill down to sub-categories, or navigate to detail |
| Line | Filter to that series, or drill to date detail |
| Pie/Donut | Filter to that segment |
| Scatter | Open data point detail |
| Map | Zoom to location, show detail panel |

### 5.3 Drill-Down

```
Level 1: Region view (4 bars)
  → Click Northern Region
Level 2: District view within North (8 bars)
  → Click Gulu District
Level 3: Enumerator view (individual data points)
  → Click enumerator
Level 4: Submission detail (individual responses)
```

- Breadcrumb at top: "Dashboard > Northern Region > Gulu District"
- Back button to return to previous level
- Animation: drill-down slides left, drill-up slides right

### 5.4 Cross-Filtering

```
Click a bar in Chart A → Charts B, C, D update to show data for that segment

Example:
  Click "Northern Region" in region bar chart
    → Line chart updates to show only Northern trend
    → Pie chart updates to show Northern demographics
    → Map zooms to Northern region

Reset: Click "Clear all filters" or click the same element again
```

### 5.5 Chart Actions Menu

```
[⋮] Menu on hover/click:
  ├── Export as PNG
  ├── Export as SVG (Phase 2)
  ├── View data table
  ├── Copy as image
  └── Reset zoom (for time series)
```

---

## 6. Dashboard Chart Grid

### 6.1 KPI Display

```
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│                    │  │                    │  │                    │  │                    │
│    1,247           │  │      91%           │  │       48           │  │       3.2           │
│    Submissions     │  │    Quality Score   │  │    Enumerators     │  │    Avg Duration     │
│    ↑ 12% from      │  │    ↑ 3% from       │  │    → same as       │  │    ↓ 8% from        │
│    last month      │  │    last week       │  │    last month      │  │    last week        │
│                    │  │                    │  │                    │  │                    │
└────────────────────┘  └────────────────────┘  └────────────────────┘  └────────────────────┘

Large number: 32px, 700 weight
Label: 13px, 500 weight, secondary color
Delta: 13px, 500 weight, green or red with arrow
Sparkline (optional): 80×24px mini line chart
```

### 6.2 Chart Widget Sizing

| Widget | Min Width | Min Height | Aspect Ratio |
|--------|-----------|------------|--------------|
| KPI card | 200px | 120px | - |
| Bar/Line chart | 300px | 250px | 16:9 |
| Pie/Donut | 250px | 250px | 1:1 |
| Map | 350px | 300px | 4:3 |
| Heatmap | 300px | 250px | 6:5 |
| Data table | 400px | 300px | - |
| Gauge | 200px | 200px | 1:1 |

---

## 7. Map Visualization

### 7.1 Map Types

| Type | Use Case | Example |
|------|----------|---------|
| Point markers | Individual submissions | Household survey locations |
| Heatmap | Density visualization | Submission concentration |
| Choropleth | Region-level data | Vaccination rate by district |
| Clusters | Large point sets | 10,000+ survey points (auto-cluster) |

### 7.2 Map Interaction

| Interaction | Behavior |
|-------------|----------|
| Pan | Drag to move |
| Zoom | Scroll wheel, pinch, +/- buttons, double-click |
| Click marker | Popup with submission summary |
| Click region | Filter dashboard to that region |
| Search | "Search location" input with autocomplete |
| Layer toggle | Switch between satellite/street map |
| Draw | Draw study area boundary (for supervisor assignment) |

### 7.3 Map Styling

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Base map | Light streets | Dark streets (no inverted) |
| Point marker | Primary teal, 8px circle + stroke | Primary teal, 8px |
| Selected marker | Primary teal, 16px circle with pulse | Same |
| Cluster | Teal circle with count number | Same |
| Study area | 2px teal border, 20% fill | Same |
| Heatmap color | Sequential (transparent → teal → dark) | Same |
| Choropleth fill | Sequential palette | Same (light enough to see) |

---

## 8. Chart Implementation Notes

### 8.1 Library Selection

| Library | Use Case |
|---------|----------|
| Recharts (React) | Web dashboards (bar, line, area, pie, scatter) |
| D3.js | Custom visualizations (heatmap, advanced charts) |
| Mapbox GL / Leaflet | Interactive maps |
| Nivo | React-native compatible charts (mobile) |

### 8.2 Performance

- Charts with <100 data points: render immediately
- Charts with 100-1000 data points: debounce interactions, use canvas
- Charts with 1000+ data points: aggregate (show weekly/monthly averages, not raw)
- Map markers: cluster at zoom levels below 12
- Time-series: limit to 2 years of daily data; older data aggregated

### 8.3 Accessibility

```tsx
<figure role="figure" aria-label="Monthly submissions chart showing increase from 800 to 1,247 over 6 months">
  <ChartComponent />
  <figcaption className="sr-only">
    Monthly submissions: January 800, February 950, March 1,100, April 1,180, May 1,200, June 1,247
  </figcaption>
  <table className="accessible-data-table">
    {/* Full data in table format for screen readers */}
  </table>
</figure>
```

---

## 9. Data Visualization Do's and Don'ts

### ✅ Do

- Start bar/area charts at zero baseline
- Use direct data labels (near the data, not in a separate legend)
- Sort categorical data by value (meaningful order)
- Show confidence intervals / error bars where appropriate
- Provide accessible data table below every chart
- Use consistent color mapping across all charts on a screen
- Show both absolute and relative values
- Include clear titles and axis labels

### ❌ Don't

- Don't use 3D charts (distorts perception)
- Don't use pie charts with more than 5 slices
- Don't use dual y-axes (misleading)
- Don't truncate y-axis (exaggerates differences)
- Don't use color as the only encoding (add size, shape, or text)
- Don't include decorative chart elements (chart junk)
- Don't use area charts with negative values
- Don't use rainbow color scales (hard to read)
- Don't show data without context (what are we comparing to?)
- Don't use animation to draw attention (let users explore)
