# Merline Frontend Performance Strategy

## Core Web Vitals Targets

| Metric | Target | Mobile Target | Measurement |
|--------|--------|---------------|-------------|
| LCP (Largest Contentful Paint) | < 2.0s | < 2.5s | Lighthouse / CrUX |
| FID (First Input Delay) | < 50ms | < 100ms | Lighthouse / CrUX |
| CLS (Cumulative Layout Shift) | < 0.05 | < 0.1 | Lighthouse / CrUX |
| TTFB (Time to First Byte) | < 300ms | < 600ms | Server timing |
| FCP (First Contentful Paint) | < 1.0s | < 1.5s | Lighthouse |
| INP (Interaction to Next Paint) | < 100ms | < 200ms | Lighthouse / CrUX |
| SI (Speed Index) | < 2.5s | < 3.5s | Lighthouse |

---

## Code Splitting Strategy

### Route-Based Splitting (Automatic via Next.js App Router)

Each route directory in `src/app/` is automatically code-split by Next.js. Critical routes use preload/prefetch:

```typescript
// Priority loading for key routes
<Link href="/dashboard" prefetch>          // Always prefetch
<Link href="/projects" prefetch>           // Always prefetch
<Link href="/projects/[id]" prefetch={false}> // Lazy prefetch (on hover)
```

### Component-Based Splitting

```typescript
// Dynamic imports for heavy components
const FormBuilder = dynamic(() => import('@/features/questionnaires/FormBuilder'), {
  loading: () => <FormBuilderSkeleton />,
  ssr: false, // full-screen editor, no SSR needed
});

const ChartWidget = dynamic(() => import('@/components/charts/ChartWidget'), {
  loading: () => <ChartSkeleton />,
});

const MapWidget = dynamic(() => import('@/components/maps/MapWidget'), {
  loading: () => <MapSkeleton />,
  ssr: false, // map libraries are client-only
});
```

### Split Points (Heavy Components)

| Component | Bundle Size (est.) | Split Strategy |
|-----------|-------------------|----------------|
| Form Builder (full 3-panel) | ~250KB | Dynamic import, no SSR |
| ECharts | ~180KB | Dynamic import, loaded on dashboard routes |
| MapLibre GL | ~200KB | Dynamic import, loaded on map widgets |
| dnd-kit | ~35KB | Dynamic import in form builder only |
| html2canvas + jspdf | ~60KB | Dynamic import on export action |
| Rich text editor (report editor) | ~80KB | Dynamic import in report editor |
| TanStack Table (virtual) | ~25KB | Loaded on data/list pages |
| Framer Motion | ~30KB | Loaded globally (small, reused everywhere) |

---

## Image Optimization

| Strategy | Implementation |
|----------|---------------|
| Automatic WebP | `next/image` automatically serves WebP in modern browsers |
| Lazy loading | Default `loading="lazy"` for below-fold images |
| Responsive sizes | `sizes` attribute per breakpoint |
| Blur placeholder | `placeholder="blur"` with `blurDataURL` for above-fold images |
| Remote images | Configure `remotePatterns` in `next.config.js` for S3/CDN |
| Avatar optimization | 48×48 default, 96×96 retina, auto-WebP |
| Chart export images | Server-generated thumbnails, not client-side rasterization |
| Organization logos | Max 200KB, converted to WebP on upload |

```typescript
// next.config.js
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 768, 1024, 1280, 1536],
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.merline.io' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
    ],
  },
};
```

---

## Data Prefetching

### Server-Side Prefetch (React Server Components)

```typescript
// App Router page — prefetch data on server
async function ProjectListPage() {
  const projects = await fetchProjects({ page: 1 });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectListClient initialData={projects} />
    </HydrationBoundary>
  );
}
```

### TanStack Query Prefetch

```typescript
// Prefetch dashboard data on hover
const prefetchDashboard = useQueryClient();
const onHover = () => {
  prefetchDashboard.prefetchQuery({
    queryKey: ['dashboard', 'executive'],
    queryFn: () => api.get('/dashboard/executive'),
    staleTime: 30_000,
  });
};
```

### Link Prefetch

```typescript
// Next.js <Link> prefetch attribute
<Link href="/projects/123" prefetch>  // Prefetch page JS + data on visible
<Link href="/reports">                // Prefetch JS only on visible
```

---

## Bundle Size Budget

| Category | Budget | Measurement |
|----------|--------|-------------|
| Initial JS (critical path) | < 120KB gzip | Webpack Bundle Analyzer |
| Initial CSS | < 20KB gzip | Tailwind JIT output |
| Route page JS (average) | < 50KB gzip | Per-route analysis |
| Dynamic import (form builder) | < 100KB gzip | Code-split chunk |
| Dynamic import (chart lib) | < 60KB gzip | Code-split chunk |
| Dynamic import (map) | < 80KB gzip | Code-split chunk |
| Total JS (all routes loaded) | < 400KB gzip | Worst case |
| Total assets (images, fonts) | < 200KB | Above the fold |

### Monitoring

```typescript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
module.exports = withBundleAnalyzer(nextConfig);
```

### Enforcement

- CI pipeline fails if any route chunk exceeds budget by >20%
- PR comment with bundle size diff
- Weekly bundle size report in monitoring dashboards

---

## Tree Shaking

| Library | Configuration |
|---------|--------------|
| Lucide Icons | Import individual icons: `import { Search, Home } from 'lucide-react'` (not `import *`) |
| ECharts | Import only used chart types: `import { BarChart, LineChart } from 'echarts/charts'` |
| Lodash (if used) | Use `lodash-es` (ES module) for tree shaking |
| Tailwind | JIT mode: only generated classes appear in output |
| date-fns | Import individual functions: `import { format, parseISO } from 'date-fns'` |

### ECharts Import Optimization

```typescript
// Import only needed components (reduces from 780KB to ~180KB)
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { init } from 'echarts/core';
```

---

## Virtual Scrolling

### When to Virtualize

| Scenario | Threshold | Library |
|----------|-----------|---------|
| Questions in form builder | > 100 | TanStack Virtual |
| Submission table rows | > 500 | TanStack Virtual |
| Indicator library list | > 500 | TanStack Virtual |
| Activity feed items | > 200 | TanStack Virtual |
| Dashboard chart data points | > 1000 | ECharts `sampling: 'lttb'` |

### Virtualized Table Setup

```typescript
// Submission table with virtual rows
const [sorting, setSorting] = useState<SortingState>([]);
const table = useReactTable({
  columns,
  data,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  // virtual rows
  rowVirtualizer: useVirtualizer({
    count: data.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 52, // row height
    overscan: 10,
  }),
});
```

---

## Memoization Strategy

| Pattern | Location | Tool |
|---------|----------|------|
| Expensive computations | Derived state | `useMemo` |
| Callback stability | Event handlers in lists | `useCallback` |
| Component renders | List items, chart components | `React.memo` with comparison fn |
| TanStack Query | All server data (built-in memoization) | Query cache |
| Form values | Selector functions | Zustand `useShallow` |
| Reselect patterns | Derived/computed state | Zustand derived selectors |

```typescript
// Zustand selector with shallow comparison
const { sidebarOpen, toggleSidebar } = useUIStore(
  useShallow((state) => ({ sidebarOpen: state.sidebarOpen, toggleSidebar: state.toggleSidebar }))
);
```

---

## Lighthouse CI Targets

```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "throttlingMethod": "simulate"
      }
    },
    "assert": {
      "preset": "lighthouse:no-pwa",
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 1500 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "interactive": ["warn", { "maxNumericValue": 3500 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 200 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

---

## CDN & Caching

| Asset Type | CDN | Cache TTL | Cache Strategy |
|------------|-----|-----------|----------------|
| Static JS/CSS | CloudFront/Vercel Edge | 1 year | Immutable content hash |
| Fonts | CloudFront | 1 year | Immutable |
| User avatars | CloudFront | 1 hour | Cache with ETag |
| Organization logos | CloudFront | 1 day | Cache with ETag |
| Map tiles | MapLibre CDN / self-hosted | 7 days | Standard |
| API responses (GET) | Vercel Data Cache | 30s (configurable) | TanStack Query cache |
| Dashboard aggregates | Server Redis cache | 60s | Pre-computed |
| Report PDFs | CloudFront | 1 hour | Cache with ETag |

---

## Runtime Performance Checklist

- [ ] All list renders use unique `key` props (never index)
- [ ] No unnecessary re-renders in form builder canvas (>500 items)
- [ ] Dashboard widgets fetch independently (no waterfall)
- [ ] TanStack Query staleTime tuned per data type (static: 5min, dynamic: 30s)
- [ ] Animations use `transform` and `opacity` only (GPU-accelerated)
- [ ] No layout thrashing (batch DOM reads/writes)
- [ ] Event listeners debounced (search: 300ms, resize: 200ms)
- [ ] Web Workers for heavy computation (data transformation, CSV parsing — Phase 2)
- [ ] `will-change` only on animated elements during animation
- [ ] Font display: `swap` for all custom fonts
