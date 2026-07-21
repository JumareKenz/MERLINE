# Merline Business Intelligence Architecture

## BI Stack

```
┌────────────────────────────────────────────────────────────────────┐
│                        BI CONSUMPTION LAYER                        │
├─────────────────────┬──────────────────────┬──────────────────────┤
│   Embedded Dashboards│  Metabase (Phase 1) │  Superset (Phase 2)  │
│   (in-app Next.js)   │  (standalone BI)    │  (enterprise BI)     │
├─────────────────────┴──────────────────────┴──────────────────────┤
│                       API / SEMANTIC LAYER                         │
│              Analytics REST API  │  GraphQL Analytics              │
├────────────────────────────────────────────────────────────────────┤
│                       ANALYTICS STORAGE                            │
│              PostgreSQL Analytics Replica                          │
│              Star Schema  │  Materialized Views  │  Aggregates     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 1. Dashboard Catalogue

### 1.1 Executive Dashboard (Country Director, Donor)

**Purpose:** Portfolio-level performance at a glance. Answers: "Are our programs achieving results?"

| Widget | Type | Data Source | Refresh |
|--------|------|-------------|---------|
| Active Programs | KPI Counter | mv_study_dashboard | 15 min |
| Total Submissions | KPI Counter | mv_study_dashboard | 15 min |
| Avg Quality Score | Gauge (0-100) | mv_study_dashboard | 15 min |
| Indicator Achievement Rate | KPI Counter | mv_indicator_tracking | 60 min |
| RAG Status by Program | Stacked Bar | mv_indicator_tracking | 60 min |
| Geographic Coverage | Choropleth Map | mv_geographic_coverage | 24 hours |
| Program Performance Table | Sortable Table | mv_study_dashboard | 15 min |
| Trend: Submission Over Time | Line Chart | agg_daily_submissions | 24 hours |
| Recent Alerts (flagged items) | Alert List | fact_data_quality | 15 min |
| Top 5 Indicators at Risk | Horizontal Bar | mv_indicator_tracking | 60 min |

**Filters:** Organization, Date Range, Sector, Country

**Drill-down:** Click program → Program Dashboard → Study Dashboard

**Personas:** Country Director (P6), Donor (P7)

### 1.2 Program Manager Dashboard

**Purpose:** Project health, indicator tracking, team performance. Answers: "Are my projects on track?"

| Widget | Type | Data Source | Refresh |
|--------|------|-------------|---------|
| Project Status Overview | KPI Row | mv_study_dashboard | 15 min |
| Study Progress Bars | Progress Bars | mv_study_dashboard | 15 min |
| Indicator Achievement by Study | Grouped Bar | mv_indicator_tracking | 60 min |
| RAG Indicator Status | RAG Grid (heatmap) | mv_indicator_tracking | 60 min |
| Budget vs Timeline | Gantt/Table | dim_project + mv_study_dashboard | 24 hours |
| Enumerator Activity | Table | mv_enumerator_performance | 6 hours |
| Quality Score Trend | Line Chart | mv_study_dashboard | 15 min |
| Data Collection Pace | Line Chart | agg_daily_submissions | 24 hours |
| Flagged Submissions | Table | fact_submissions | 15 min |
| Team Workload Distribution | Horizontal Bar | mv_enumerator_performance | 6 hours |

**Filters:** Project, Study, Date Range, Status

**Drill-down:** Click study → Study Dashboard → Submission Detail

**Personas:** Program Manager (P4)

### 1.3 M&E Officer Dashboard

**Purpose:** Data quality oversight, enumerator performance, coverage completeness

| Widget | Type | Data Source | Refresh |
|--------|------|-------------|---------|
| Overall Data Quality Score | Gauge (RAG) | fact_data_quality | 15 min |
| Quality Score by Study | Bar Chart | fact_data_quality | 15 min |
| Enumerator Quality Ranking | Table (sortable) | mv_enumerator_performance | 6 hours |
| Flag Rate by Enumerator | Scatter Plot | mv_enumerator_performance | 6 hours |
| Completeness Over Time | Line Chart | fact_data_quality | 15 min |
| GPS Accuracy Metrics | Histogram | fact_submissions | 15 min |
| Duration Anomaly Detection | Scatter Plot | fact_submissions | 15 min |
| Geographic Gaps (low coverage) | Heat Map | mv_geographic_coverage | 24 hours |
| Missing Data Patterns | Table | fact_data_quality | 15 min |
| Enumerator Consistency Score | Bar Chart | mv_enumerator_performance | 6 hours |

**Filters:** Study, Enumerator, Date Range, Check Type, Score Range

**Drill-down:** Click enumerator → Enumerator Detail → Submission List

**Personas:** M&E Officer (P5), Field Supervisor (P3)

### 1.4 Researcher Dashboard

**Purpose:** Study progress, submission analysis, preliminary findings

| Widget | Type | Data Source | Refresh |
|--------|------|-------------|---------|
| Study Progress Summary | Progress Bars | mv_study_dashboard | 15 min |
| Submission Status Breakdown | Donut Chart | fact_submissions | 15 min |
| Completion Rate vs Target | Gauge | mv_study_dashboard | 15 min |
| Indicator Values (baseline vs actual) | Bullet Chart | mv_indicator_tracking | 60 min |
| Response Distribution per Question | Histogram | fact_submissions | 15 min |
| Preliminary Findings Table | Table | fact_indicator_values | 60 min |
| Enumerator Performance | Table | mv_enumerator_performance | 6 hours |
| Sample Achievement (target vs actual) | Progress Bar | mv_study_dashboard | 15 min |
| Quality Score Overview | Gauge | mv_study_dashboard | 15 min |
| Submission Timeline | Line Chart | agg_daily_submissions | 24 hours |

**Filters:** Questionnaire, Date Range, Enumerator, Status

**Drill-down:** Click submission → Submission Detail → Response Value

**Personas:** Researcher (P1)

### 1.5 Donor/Partner Dashboard

**Purpose:** Outcome indicators, efficiency metrics, standardized reporting

| Widget | Type | Data Source | Refresh |
|--------|------|-------------|---------|
| Program Outcome Indicators | KPI Cards | mv_indicator_tracking | 60 min |
| Indicator RAG Status | RAG Grid | mv_indicator_tracking | 60 min |
| Geographic Coverage | Map | mv_geographic_coverage | 24 hours |
| Indicator Trend Over Time | Line Chart | mv_longitudinal_trends | 60 min |
| Efficiency: Cost per Submission | KPI | fact_submissions + dim_project | 24 hours |
| Data Quality Summary | Score Card | fact_data_quality | 15 min |
| Submissions Over Time | Line Chart | agg_daily_submissions | 24 hours |
| Disaggregation View | Grouped Bar | fact_indicator_values | 60 min |

**Filters:** Project, Indicator, Period, Disaggregation

**Drill-down:** Click indicator → Indicator Detail → Value History

**Personas:** Donor (P7)

### 1.6 Field Operations Dashboard

**Purpose:** Real-time collection stats, enumerator activity, assignment tracking

| Widget | Type | Data Source | Refresh |
|--------|------|-------------|---------|
| Live Submission Counter | KPI Counter | fact_submissions | ~1 min (polling) |
| Active Enumerators Now | KPI Counter | fact_submissions | ~1 min |
| Enumerator Map (live locations) | Point Map | fact_submissions | ~1 min |
| Assignment Status Overview | Donut Chart | dim_study + fact_submissions | 15 min |
| Today's Activity by Team | Bar Chart | agg_daily_submissions | 5 min |
| Overdue Assignments | Table | dim_study + fact_submissions | 15 min |
| Sync Status (pending submissions) | KPI | fact_submissions | ~1 min |
| Recent Flags | Alert List | fact_data_quality | 15 min |

**Filters:** Team, Study, Date

**Drill-down:** Click enumerator → Enumerator Detail → Assignments → Submissions

**Personas:** Field Supervisor (P3)

### 1.7 System Admin Dashboard

**Purpose:** Tenant usage, platform performance, cost tracking

| Widget | Type | Data Source | Refresh |
|--------|------|-------------|---------|
| Active Tenants | KPI Counter | analytics_public.tenant_metrics | 24 hours |
| Total Submissions (all tenants) | KPI Counter | analytics_public.tenant_metrics | 24 hours |
| Storage Usage (by tenant) | Bar Chart | analytics_public.tenant_metrics | 24 hours |
| API Calls (by endpoint) | Line Chart | analytics_public.platform_usage | 5 min |
| Active Users (by tenant) | Table | analytics_public.tenant_metrics | 24 hours |
| Pipeline Health Status | Status Table | system health checks | 1 min |
| Database Size (by schema) | Bar Chart | pg_stat_user_tables | 24 hours |
| AI Token Usage (by tenant) | Bar Chart | analytics_public.ai_usage | 24 hours |
| Monthly Active Users Trend | Line Chart | analytics_public.platform_usage | 24 hours |
| Error Rate (5xx, queue failures) | Line Chart | analytics_public.platform_usage | 5 min |

**Filters:** Tenant, Date Range

**Personas:** System Admin (P8)

---

## 2. KPI Framework

### 2.1 KPI Definition Template

```yaml
kpi:
  id: "submission_completion_rate"
  label: "Submission Completion Rate"
  category: "Data Collection"
  business_question: "Are we collecting the expected amount of data?"
  formula: >
    COUNT(submissions WHERE status = 'approved' AND period = current)
    / SUM(assignment.target_count) × 100
  numerator: "Approved submissions in period"
  denominator: "Total expected submissions (sum of assignment targets)"
  unit: "Percentage"
  range: "0-100%"
  direction: "Higher is better"
  target: ">= 90%"
  threshold_warning: "< 80%"
  threshold_critical: "< 70%"
  granularity: "Study, Enumerator, Date"
  dimensions:
    - "Study type"
    - "Geography (admin level 1)"
    - "Enumerator"
    - "Questionnaire"
  filters:
    - "Exclude test submissions"
    - "Exclude drafts"
  owner: "M&E Officer"
  refresh_frequency: "Every 15 minutes"
  interpretation: >
    Green (>90%): On track. Amber (80-90%): Monitor closely.
    Red (<80%): Intervention needed. Investigate enumerator performance,
    access issues, or sample size overestimation.
  action_thresholds:
    - level: "warning"
      value: 80
      action: "Notify field supervisor, review assignment completion"
    - level: "critical"
      value: 70
      action: "Escalate to program manager, consider extension or reassignment"
```

### 2.2 KPI Catalogue (Phase 1)

| # | KPI ID | Name | Category | Formula | Target | Persona |
|---|--------|------|----------|---------|--------|---------|
| 1 | `submission_completion_rate` | Submission Completion Rate | Data Collection | approved / target × 100 | >= 90% | PM, M&E |
| 2 | `data_quality_score` | Data Quality Score | Quality | weighted avg of 6 dimensions | >= 85% | M&E |
| 3 | `flag_rate` | Submission Flag Rate | Quality | flagged / total × 100 | < 5% | M&E, Supervisor |
| 4 | `enumerator_productivity` | Enumerator Productivity | Field Ops | submissions / enumerator / day | >= 10/day | Supervisor |
| 5 | `indicator_achievement_rate` | Indicator Achievement Rate | Impact | indicators achieved / total × 100 | >= 75% | Exec, Donor |
| 6 | `indicator_on_track_rate` | Indicator On-Track Rate | Impact | (achieved + on_track) / total × 100 | >= 85% | PM, Exec |
| 7 | `geographic_coverage_pct` | Geographic Coverage | Coverage | admin units with data / total × 100 | >= 95% | M&E |
| 8 | `submission_timeliness` | Submission Timeliness | Quality | on-time / total × 100 | >= 90% | PM |
| 9 | `avg_duration_minutes` | Average Collection Time | Efficiency | AVG(duration_seconds) / 60 | Study-specific | Researcher |
| 10 | `enumerator_consistency` | Enumerator Consistency | Quality | 1 - (variance within / variance between) | >= 0.8 | M&E |
| 11 | `active_enumerator_rate` | Active Enumerator Rate | Field Ops | active_enumerators / total × 100 | >= 80% | Supervisor |
| 12 | `sample_achievement_rate` | Sample Achievement | Study | achieved_sample / planned × 100 | >= 95% | Researcher |
| 13 | `donor_reporting_readiness` | Donor Reporting Readiness | Compliance | donor indicators with data / total | >= 90% | PM |
| 14 | `ai_cost_per_submission` | AI Cost Per Submission | Cost | total_ai_cost / submissions | < $0.05 | Admin |
| 15 | `pipeline_freshness` | Pipeline Freshness | Operations | time since last successful sync | < 5 min | Admin |

### 2.3 RAG Thresholds

| Status | Color | Meaning | Action |
|--------|-------|---------|--------|
| Green | #0D7377 | On track, meeting targets | Continue monitoring |
| Amber | #D97706 | Below target, needs attention | Investigate, create action plan |
| Red | #BC1C1C | Critical, intervention required | Escalate, immediate action |
| Gray | #A1A1AA | No data / not applicable | N/A |

---

## 3. Self-Service Analytics

### 3.1 Capabilities

| Capability | Phase 1 | Phase 2 |
|------------|---------|---------|
| Pre-built dashboards | ✓ (7 dashboards) | ✓ (extended) |
| Chart type selection | Limited (in-app widget) | Full (Superset) |
| Filtering & segmentation | ✓ (all dashboards) | ✓ (custom filters) |
| Custom KPI builder | ✗ | ✓ (metric definition UI) |
| Ad-hoc SQL queries | ✗ | ✓ (SQL Lab in Superset) |
| Cross-filtering (click) | ✓ (within dashboard) | ✓ (across dashboards) |
| Save custom views | ✗ | ✓ (personal dashboards) |
| Share via link | ✓ (dashboard URLs) | ✓ (scheduled distribution) |
| Export to PDF/PNG | ✓ | ✓ |
| Drill-down / Drill-through | ✓ (3 levels) | ✓ (unlimited) |
| Natural language query | ✗ | ✓ (AI Insight Engine) |

### 3.2 Embedded Analytics

Dashboards are embedded directly in the Next.js application via iframe or API:

```typescript
// app/dashboard/study/[id]/page.tsx
export default function StudyDashboard({ params }: Props) {
  const { data: dashboard } = useQuery({
    queryKey: ['study-dashboard', params.id],
    queryFn: () => fetch(`/api/v1/analytics/dashboards/study/${params.id}`).then(r => r.json()),
    refetchInterval: 60_000, // Auto-refresh every minute
  });

  if (!dashboard) return <DashboardSkeleton />;

  return (
    <DashboardLayout>
      <DashboardHeader study={dashboard.study} />
      <KpiRow metrics={dashboard.kpis} />
      <div className="grid grid-cols-2 gap-4">
        <ChartWidget
          title="Submissions Over Time"
          type="line"
          data={dashboard.submissions_trend}
          config={{ xAxis: 'date', yAxis: 'count', color: '#0D7377' }}
        />
        <ChartWidget
          title="Indicator RAG Status"
          type="bar"
          data={dashboard.indicator_rag}
          config={{ xAxis: 'indicator', yAxis: 'achievement', colorBy: 'rag_status' }}
        />
        <MapWidget
          title="Geographic Coverage"
          data={dashboard.geographic_coverage}
          config={{ type: 'choropleth', adminLevel: 1 }}
        />
        <TableWidget
          title="Recent Flags"
          data={dashboard.recent_flags}
          columns={['enumerator', 'type', 'score', 'date']}
        />
      </div>
    </DashboardLayout>
  );
}
```

### 3.3 Analytics REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics/dashboards` | List available dashboards |
| GET | `/api/v1/analytics/dashboards/{type}/{id}` | Get dashboard data (study, project, org) |
| GET | `/api/v1/analytics/kpis/{dashboardId}` | Get KPI values for dashboard |
| GET | `/api/v1/analytics/query` | Execute analytics query (with SQL guardrails) |
| POST | `/api/v1/analytics/export` | Request data export |
| GET | `/api/v1/analytics/metrics/{metricId}` | Get single metric definition + data |

**Query API with Guardrails:**

```php
// app/Http/Controllers/AnalyticsQueryController.php
class AnalyticsQueryController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'dimensions' => 'required|array|min:1',
            'metrics' => 'required|array|min:1',
            'filters' => 'array',
            'order_by' => 'string',
            'limit' => 'integer|max:10000',
        ]);

        // Build safe SQL from semantic layer
        $query = $this->queryBuilder->build(
            dimensions: $request->dimensions,
            metrics: $request->metrics,
            filters: $request->filters ?? [],
            orderBy: $request->order_by,
            limit: min($request->limit ?? 1000, 10000),
        );

        // Execute on analytics replica
        $results = DB::connection('analytics')->select($query->sql, $query->bindings);

        return response()->json([
            'data' => $results,
            'meta' => [
                'query' => $query->explain,
                'row_count' => count($results),
                'execution_ms' => $query->executionTime,
            ],
        ]);
    }
}
```

---

## 4. Scheduled Report Distribution

### 4.1 Report Schedule

| Report | Audience | Frequency | Format | Channels |
|--------|----------|-----------|--------|----------|
| Executive Brief | Country Director, Donor | Weekly (Monday) | PDF (1-page) | Email, In-app |
| Program Progress | Program Manager | Weekly (Friday) | PDF + Excel | Email, In-app |
| Data Quality Report | M&E Officer | Daily (morning) | Dashboard link | In-app |
| Enumerator Performance | Field Supervisor | Weekly (Wednesday) | PDF + Table | Email, In-app |
| Donor Indicator Update | Donor Partners | Monthly (1st) | PDF (branded) | Email |
| System Usage Report | System Admin | Monthly (1st) | Dashboard + CSV | Email |

### 4.2 Distribution Pipeline

```php
class GenerateScheduledReport implements ShouldQueue
{
    public function __construct(
        private string $reportType,
        private string $tenantId,
        private array $recipients
    ) {}

    public function handle(): void
    {
        // 1. Query analytics data
        $data = match ($this->reportType) {
            'executive_brief' => $this->buildExecutiveBrief(),
            'data_quality' => $this->buildDataQualityReport(),
            'enumerator_perf' => $this->buildEnumeratorReport(),
            default => throw new InvalidArgumentException("Unknown report type"),
        };

        // 2. Generate PDF via DomPDF or BrowserShot
        $pdf = Pdf::loadView("reports.{$this->reportType}", [
            'data' => $data,
            'organization' => tenant()->organization,
            'generated_at' => now(),
        ]);

        $path = "reports/{$this->tenantId}/scheduled/{$this->reportType}_{$now}.pdf";
        Storage::disk('s3')->put($path, $pdf->output());

        // 3. Distribute
        foreach ($this->recipients as $recipient) {
            Mail::to($recipient)->send(new ScheduledReportMail(
                reportType: $this->reportType,
                downloadUrl: Storage::disk('s3')->temporaryUrl($path, now()->addDays(7)),
                generatedAt: now(),
            ));
        }

        // 4. Log distribution
        Log::channel('analytics')->info('Scheduled report distributed', [
            'type' => $this->reportType,
            'tenant' => $this->tenantId,
            'recipients' => count($this->recipients),
        ]);
    }
}
```

---

## 5. BI Tool Integration

### 5.1 Phase 1: Metabase

**Connection:** Metabase connects directly to the analytics PostgreSQL replica.

```
Analytics Replica
    │
    └── Metabase (read-only user)
        ├── Questions (saved SQL queries)
        ├── Dashboards (curated per persona)
        └── Embedded (iframes in Merline app)
```

**Embedding Example:**
```html
<iframe
  src="https://metabase.example.com/embed/dashboard/42#busted=true&theme=light"
  width="100%"
  height="800"
  frameborder="0"
></iframe>
```

### 5.2 Phase 2: Apache Superset

```
Analytics Replica
    │
    └── Superset (with SQL Lab)
        ├── Datasets (virtual datasets from semantic views)
        ├── Charts (custom visualization library)
        ├── Dashboards (persona-specific)
        ├── SQL Lab (ad-hoc queries with guardrails)
        ├── Saved Queries (reusable analytics)
        └── API (embedding + external access)
```

---

## Dashboard Catalogue Summary

| # | Dashboard | Primary Persona | Widgets | Refresh | Phase |
|---|-----------|----------------|---------|---------|-------|
| 1 | Executive Dashboard | Country Director, Donor | 10 | 15-60 min | 1 |
| 2 | Program Manager Dashboard | Program Manager | 10 | 15 min-24h | 1 |
| 3 | M&E Officer Dashboard | M&E Officer, Supervisor | 10 | 15 min-6h | 1 |
| 4 | Researcher Dashboard | Researcher | 10 | 15-60 min | 1 |
| 5 | Donor/Partner Dashboard | Donor, Partner | 8 | 15-60 min | 1 |
| 6 | Field Operations Dashboard | Field Supervisor | 8 | 1-15 min | 1 |
| 7 | System Admin Dashboard | System Admin | 10 | 1 min-24h | 2 |

**Total dashboards: 7 (6 Phase 1, 1 Phase 2)**
**Total KPI definitions: 15**
**Total widget types: 12 (KPI, Bar, Line, Pie, Map, Table, Gauge, Scatter, Progress, Alert, Donut, RAG Grid)**
