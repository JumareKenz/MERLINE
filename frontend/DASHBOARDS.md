# Merline Dashboard & Data Visualization Architecture

## Dashboard Types (MVP)

| Dashboard | Route | Purpose | Widgets |
|-----------|-------|---------|---------|
| Executive | `/dashboard` | Organization-wide overview | KPI row, program cards, map, activity feed, alerts, indicator tracking |
| Project | `/projects/[id]?tab=overview` | Single project metrics | KPI row, study progress bars, indicator achievement, team activity |
| Study (auto) | `/studies/[id]?tab=dashboard` | Auto-generated study dashboard | Submission counter, quality gauge, indicator RAG, enumerator table, map |
| Indicator Detail | `/studies/[id]/indicators/[indId]` | Deep dive on one indicator | Trend chart, bar chart by district, disaggregation charts, data table |
| Enumerator | `/data-collection/enumerators/[id]` | Single enumerator metrics | KPI row, submissions trend, quality score, flag breakdown |

---

## Dashboard Grid Layout

### Grid System

```typescript
interface DashboardLayout {
  id: string;
  widgetId: string;
  x: number;  // grid column (0-11, 12-column grid)
  y: number;  // grid row
  w: number;  // width in columns (1-12)
  h: number;  // height in rows (1-6)
  minW?: number;
  minH?: number;
}
```

- 12-column responsive grid
- Widgets auto-arrange in grid flow on initial load
- Drag handle on widget header for repositioning (Phase 2: persist custom layouts)
- Resize handle on bottom-right corner
- Breakpoints: Desktop (12 cols), Tablet (6 cols), Mobile (1 col, stacked)
- Server-side default layout per dashboard type, per study

### Widget Component

```typescript
interface DashboardWidgetProps {
  widget: WidgetDefinition;
  data: WidgetData | undefined;
  isLoading: boolean;
  error: Error | null;
  filters: DashboardFilters;
  onDrillDown: (params: DrillDownParams) => void;
  onResize: (size: { w: number; h: number }) => void;
}
```

---

## Chart Components (ECharts)

### Chart Type Inventory

| Chart | ECharts Type | Use Case |
|-------|-------------|----------|
| Bar | `bar` | Submissions by district, indicator by region |
| Horizontal Bar | `bar` with `xAxis/yAxis` swap | Ranked indicators, enumerator performance |
| Stacked Bar | `bar` with `stack` | Submissions by enumerator by status |
| Grouped Bar | `bar` with series | Indicator comparison across time periods |
| Line | `line` | Submission trends over time |
| Area | `line` with `areaStyle` | Cumulative submissions, coverage |
| Smooth Line | `line` with `smooth` | Trend with seasonal patterns |
| Stepped Line | `line` with `step` | Before/after intervention |
| Pie | `pie` | Distribution by category |
| Donut | `pie` with `radius` | Quality score breakdown |
| Rose | `pie` with `roseType` | Proportional comparison |
| Scatter | `scatter` | GPS point distribution, correlation |
| Bubble | `scatter` with `symbolSize` | Multi-dimensional data (x, y, size) |
| Heatmap | `heatmap` | Geographic density, time x category matrix |
| Radar | `radar` | Multi-indicator comparison |
| Gauge | `gauge` | Quality score, completion percentage |
| Funnel | `funnel` | Response funnel, data quality stages |
| KPI Card | Custom React component | Single metric with trend |
| Sparkline | `line` (mini) | Inline trend in KPI cards |
| Map (Choropleth) | `map` with GeoJSON | Regional indicator values |
| Map (Bubble) | `scatter` over `map` | Geo-distribution of submissions |
| Map (Heatmap) | `heatmap` over `map` | Density of responses |

### ECharts Wrapper

```typescript
// components/charts/MerlineChart.tsx
interface MerlineChartProps {
  chartType: ChartType;
  data: unknown;
  options?: EChartsOptionOverrides;
  height?: number | string;
  loading?: boolean;
  error?: Error;
  onDrillDown?: (params: DrillDownParams) => void;
  theme?: 'light' | 'dark';
  ariaLabel?: string;
}
```

### Chart Configuration

```typescript
const defaultChartOptions: EChartsOption = {
  animationDuration: 300,
  animationEasing: 'cubicOut',
  grid: { top: 40, right: 20, bottom: 40, left: 60 },
  tooltip: { trigger: 'axis', confine: true },
  legend: { bottom: 0, type: 'scroll' },
  // Color palette follows design system tokens
  color: ['#1A6DB5', '#2E9E5E', '#E8A317', '#BC1C1C', '#8B5CF6', '#EC4899'],
  // Accessibility
  aria: { show: true, label: { description: 'Chart description' } },
};
```

---

## Filter Bar

```
┌─────────────────────────────────────────────────────────────────────┐
│  Date: [Last 30 Days ▼]  |  Study: [All Studies ▼]  |  Region: [All ▼]  │
│  + Add Filter  [▼ Disaggregation: Gender ▼]  [▼ Dimension: Female ▼]  │
│  [Apply Filters]  [Reset]                                            │
│                                                                       │
│  Active: Date (Jul 18 – Aug 17), Region (Northern)                   │
│  [× Date] [× Northern]  [Clear All]                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Filter Bar Architecture

```typescript
interface DashboardFilters {
  dateRange: { preset: PresetKey; from?: string; to?: string };
  projectId?: string;
  studyId?: string;
  dimensions: Array<{ dimension: string; value: string }>;
  search?: string;
}

// Zustand store for filter state (persists across navigation within dashboard)
interface DashboardFilterStore {
  filters: DashboardFilters;
  setDateRange: (range: DashboardFilters['dateRange']) => void;
  addDimension: (dim: { dimension: string; value: string }) => void;
  removeDimension: (index: number) => void;
  resetFilters: () => void;
}
```

### Date Range Presets

| Preset | Label | Range |
|--------|-------|-------|
| `last_7d` | Last 7 days | Now - 7 days |
| `last_30d` | Last 30 days | Now - 30 days |
| `last_90d` | Last quarter | Now - 90 days |
| `this_year` | This year | Jan 1 – Now |
| `custom` | Custom | User-defined start/end |

---

## Drill-Down Navigation

### Architecture

```typescript
// URL-based drill-down state
// /studies/[studyId]/dashboard → click indicator card →
// /studies/[studyId]/indicators/[indicatorId]?date_range=last_30d&region=Northern

// Breadcrumb automatically builds from URL path + searchParams
// Dashboard > Health Baseline > Vaccination Rate > Northern Region
```

### Drill-Down Paths

| Source Interaction | Target | URL Change |
|-------------------|--------|------------|
| Click indicator card | Indicator detail dashboard | `/studies/[id]?tab=dashboard` → `/studies/[id]/indicators/[indId]` |
| Click bar/bar segment | Region/dimension detail | Add dimension filter to current URL |
| Click enumerator row | Enumerator performance | `/data-collection/enumerators/[enumId]` |
| Click submission | Submission detail | `/data-collection/submissions/[subId]` |
| Click widget data point | Related report | Modal or inline expansion |
| Click map feature | Region details | Map zooms + filter applied |
| Click pie segment | Category detail | Filter added for that category |

---

## Export

| Format | Implementation | Trigger |
|--------|---------------|---------|
| PNG (chart) | ECharts `getDataURL({ type: 'png' })` | Right-click chart → "Export as PNG" |
| PNG (dashboard) | `html2canvas` on dashboard container | "Export Dashboard" button |
| PDF (dashboard) | `html2canvas` → `jspdf` | "Export as PDF" button |
| CSV (data table) | Generate from raw data array → download blob | "Export Data" button |
| Shareable link | Copy current URL (filters preserved) → short URL | "Share" button |

---

## Auto-Refresh

```typescript
interface DashboardConfig {
  widgetId: string;
  refreshInterval: number; // in milliseconds, 0 = no refresh
  lastRefreshedAt: number;
}

// Default intervals
const REFRESH_CONFIG = {
  'submission-counter': 30_000,     // 30s during data collection
  'quality-score': 60_000,          // 1min
  'activity-feed': 30_000,          // 30s
  'indicator-tracking': 300_000,    // 5min
  'map': 120_000,                   // 2min
  'enumerator-table': 60_000,       // 1min
  'kpi-row': 120_000,               // 2min
};
```

### Implementation

- TanStack Query `refetchInterval` per query key
- Respects browser tab visibility (pause when hidden via `document.hidden`)
- Manual refresh button in widget header
- Websocket push for critical updates (Phase 2)

---

## Dashboard Template System (Phase 2, Architecture Ready)

```typescript
interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  studyTypes: StudyType[]; // which study types this template applies to
  layout: DashboardLayout[];
  widgetDefinitions: WidgetDefinition[];
  defaultFilters?: Partial<DashboardFilters>;
}

// Pre-built templates
const DASHBOARD_TEMPLATES = {
  baseline: { /* submission progress, indicators, demographics */ },
  midline: { /* trend comparison, indicator change, quality */ },
  endline: { /* final vs baseline, achievement, impact */ },
  kap: { /* knowledge score, attitude distribution, practices */ },
};
```

---

## Performance with Large Datasets

| Concern | Strategy |
|---------|----------|
| Initial load | Server-side aggregated data (pre-computed KPIs, bucketed time series) |
| Chart rendering | ECharts `sampling: 'lttb'` for >1000 data points (LTTB downsampling) |
| Large table data | TanStack Virtual (virtual rows) + TanStack Query (paginated fetch) |
| Map performance | Clustering for >1000 markers (supercluster), GeoJSON simplification |
| Widget independence | Each widget fetches its own data; no cascade re-render |
| Dashboard load | Skeleton per widget; widgets render progressively as data arrives |
| Date range changes | Server-side aggregation; client only renders pre-aggregated buckets |
| Concurrent viewers | Dashboard data cached via TanStack Query; shared across tabs |

### API Aggregation Endpoints

```typescript
// Backend provides pre-aggregated dashboard data
GET /api/v1/studies/{id}/dashboard/summary
  → KPI values, basic counts (fast, <100ms)

GET /api/v1/studies/{id}/dashboard/indicators
  → All indicator values with RAG (medium, <500ms)

GET /api/v1/studies/{id}/dashboard/trends?granularity=day&from=...&to=...
  → Time-series data (bucketed server-side)

GET /api/v1/studies/{id}/dashboard/geo
  → GeoJSON with aggregated submission points
```
