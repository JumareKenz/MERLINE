# Merline Analytics Architecture

## Overview

The Merline analytics platform transforms raw research data into trusted organizational intelligence. It follows a layered architecture: Operational → Analytics → Semantic → BI → Insights, with governance embedded at every layer.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INSIGHTS LAYER                               │
│  Decision Intelligence  │  Recommendations  │  AI-Generated Briefs  │
├─────────────────────────────────────────────────────────────────────┤
│                         BI LAYER                                     │
│  Dashboards │  Self-Service  │  Scheduled Reports  │  Embedding     │
├─────────────────────────────────────────────────────────────────────┤
│                       SEMANTIC LAYER                                 │
│  Business Metrics  │  KPI Definitions  │  Calculated Fields         │
├─────────────────────────────────────────────────────────────────────┤
│                     ANALYTICS STORAGE                                │
│  Star Schema (Fact/Dim)  │  Materialized Views  │  Aggregate Tables │
│  PostgreSQL Analytics Replica  │  TimescaleDB Hypertables          │
├─────────────────────────────────────────────────────────────────────┤
│                   TRANSFORMATION LAYER                               │
│  SQL-based ELT  │  Materialized View Pipeline  │  dbt (Phase 2)     │
├─────────────────────────────────────────────────────────────────────┤
│                  DATA INGESTION LAYER                                │
│  CDC (Logical Replication)  │  Event Publishing  │  Batch Import    │
├─────────────────────────────────────────────────────────────────────┤
│                    OPERATIONAL STORAGE                               │
│  PostgreSQL Primary (OLTP)  │  Redis Streams  │  S3 Object Store    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Data Flow Architecture

### 1.1 End-to-End Data Flow

```
Collection  ──►  Validation  ──►  Ingestion  ──►  Transformation  ──►  Storage  ──►  Serving  ──►  Consumption
   │               │               │                │                   │             │              │
   ▼               ▼               ▼                ▼                   ▼             ▼              ▼
Mobile/Web     Validation       API Endpoint    SQL ELT Jobs        Analytics     REST API       Dashboards
Forms          Rules            Event Bus       Materialized        Replica       GraphQL        Reports
               Auto-Flag        Queue           Views               Star Schema   Semantic       AI Insights
                               CDC (Phase 2)   dbt (Phase 2)       Aggregates    Layer          Exports
```

### 1.2 Operational to Analytics Flow

**Phase 1 (Application-Level Events):**
1. User action triggers Laravel event (e.g., `SubmissionSubmitted`)
2. Event listener dispatches analytics job to queue (Horizon/Redis)
3. Job transforms operational data into analytics schema
4. Transformed data written to analytics replica via normal INSERT/UPDATE
5. Materialized views refreshed CONCURRENTLY on schedule

**Phase 2 (CDC via Logical Replication):**
1. PostgreSQL logical replication streams changes from primary to analytics replica
2. Change events captured from: `submissions`, `response_values`, `indicator_values`, `audit_events`
3. Analytics replica applies transformations via triggers or application workers
4. Near-real-time analytics (sub-second lag for critical tables)

### 1.3 Analytics Replica Design

| Property | Specification |
|----------|---------------|
| **Engine** | PostgreSQL 16+ (same version as primary) |
| **Connection** | Separate read-only connection pool (`pgsql_analytics`) |
| **Data sync** | SQL-based ELT (Phase 1); Logical replication (Phase 2) |
| **Refresh** | Batch incremental (5-15 min); Full refresh on request |
| **Lag tolerance** | Dashboard: 5 min; Reports: 15 min; Export: real-time not required |
| **Isolation** | No writes from analytics layer back to primary |
| **Schema** | `analytics` schema per tenant + `analytics_public` for cross-tenant |

**Lag SLA:**

| Data Category | Max Acceptable Lag | Target P95 |
|---------------|-------------------|------------|
| Submission counts | 5 min | 30 sec |
| Indicator values | 15 min | 5 min |
| Data quality scores | 5 min | 1 min |
| Enumerator performance | 1 hour | 15 min |
| Dashboard aggregates | 15 min | 5 min |
| Export data | 24 hours (snapshot) | 1 hour |

### 1.4 Query Routing

```
Application Request
    │
    ├── Operational Query (real-time, write) → Primary DB
    │   └─ Auth, submission ingestion, form publish, assignment create
    │
    ├── Dashboard Query (aggregate, stale-ok) → Analytics Replica
    │   └─ Study dashboard, indicator tracking, enumerator perf
    │
    ├── Report Query (complex joins, stale-ok) → Analytics Replica
    │   └─ PDF reports, data export, cross-tabulation
    │
    └── BI Tool Query (ad-hoc, analytics) → Analytics Replica
        └─ Metabase/Superset dashboards, custom SQL queries
```

---

## 2. Multi-Tenant Analytics

### 2.1 Per-Tenant Analytics

Each tenant (`tenant_{id}`) has an isolated `analytics` schema containing:
- All star-schema fact and dimension tables (prefixed `analytics_`)
- Tenant-specific materialized views
- Tenant-specific aggregate tables

### 2.2 Cross-Tenant Platform Analytics

A dedicated `analytics_public` schema stores platform-wide data:

```
analytics_public.tenant_metrics
analytics_public.platform_usage_daily
analytics_public.system_health
```

These are populated by a system-level pipeline that queries across tenant schemas with elevated privileges. Platform admins see cross-tenant overview; tenant admins see only their own data.

### 2.3 Tenant Data Isolation Rules

| Rule | Implementation |
|------|----------------|
| Tenant cannot see other tenant's analytics | Schema-per-tenant isolation |
| Cross-tenant aggregates exclude PII | Only counts, storage GB, active users |
| Platform analytics opt-out | Configurable tenant setting |
| Data portability | Full schema dump per tenant |

---

## 3. Semantic Layer Design

### 3.1 Business Metric Definitions

Every metric in the semantic layer is defined with:

```yaml
metric:
  name: "submission_completion_rate"
  label: "Submission Completion Rate"
  definition: "Percentage of expected submissions that have been received"
  formula: "COUNT(submissions WHERE status = 'approved') / SUM(assignment.target_count) * 100"
  dimensions:
    - study_id
    - enumerator_id
    - date
    - questionnaire_id
  filters:
    - "status != 'draft'"
    - "deleted_at IS NULL"
  granularity: "study"
  owner: "M&E Officer"
  refresh: "Every 15 min"
  interpretation: "Higher is better. Target > 90%. Below 80% requires intervention."
```

### 3.2 Semantic Views

```sql
-- Layer 1: Raw analytics tables (star schema)
CREATE VIEW analytics.v_study_progress AS
SELECT ... FROM analytics.fact_submissions ...;

-- Layer 2: Business metrics (semantic definitions)
CREATE VIEW analytics.v_metric_submission_rate AS
SELECT
    study_id,
    COUNT(*) FILTER (WHERE status = 'approved')::FLOAT /
        NULLIF(AVG(target_count), 0) * 100 AS completion_rate
FROM analytics.fact_submissions
GROUP BY study_id;

-- Layer 3: Calculated KPIs (composite metrics)
CREATE VIEW analytics.v_kpi_dashboard AS
SELECT
    study_id,
    completion_rate,
    avg_quality_score,
    CASE
        WHEN completion_rate >= 90 AND avg_quality_score >= 85 THEN 'green'
        WHEN completion_rate >= 75 AND avg_quality_score >= 70 THEN 'amber'
        ELSE 'red'
    END As rag_status
FROM ...;
```

### 3.3 Metric Catalogue (Phase 1)

| Metric ID | Name | Source | Dimensions |
|-----------|------|--------|------------|
| `total_submissions` | Total Submissions | fact_submissions | study, date, enumerator |
| `approved_submissions` | Approved Submissions | fact_submissions | study, date, enumerator |
| `completion_rate` | Completion Rate | fact_submissions + assignments | study, enumerator |
| `quality_score` | Avg Quality Score | fact_data_quality | study, enumerator, date |
| `flag_rate` | Flag Rate | fact_submissions | study, enumerator |
| `active_enumerators` | Active Enumerators | dim_enumerator + fact_submissions | study, date |
| `submissions_per_day` | Daily Submission Rate | fact_submissions | study, date, enumerator |
| `indicator_achievement` | Indicator Achievement | fact_indicator_values | indicator, period |
| `on_track_ratio` | On-Track Indicator Ratio | fact_indicator_values | study, level |
| `enumerator_consistency` | Enumerator Consistency Score | fact_data_quality | enumerator |

---

## 4. Data Quality Pipeline

### 4.1 Quality Dimensions Scored

| Dimension | Score Range | Description |
|-----------|-------------|-------------|
| Completeness | 0-100 | % of required questions answered |
| Accuracy | 0-100 | % of values within expected ranges |
| Consistency | 0-100 | % of cross-field logical checks passed |
| Timeliness | 0-100 | % of submissions within expected duration |
| Uniqueness | 0 or 100 | No duplicate detection |
| GPS Validity | 0-100 | % of GPS points within study area |

### 4.2 Composite Quality Score

```
Quality Score = (Completeness × 0.25) + (Accuracy × 0.25) +
                (Consistency × 0.20) + (Timeliness × 0.10) +
                (Uniqueness × 0.10) + (GPS Validity × 0.10)
```

### 4.3 Quality Scoring Pipeline

```
Submission Received
    │
    ├── Phase 1: Field Validation (real-time, on-device)
    │   └─ Required fields, type checks, range checks, pattern match
    │
    ├── Phase 2: Server Validation (real-time, on-ingest)
    │   └─ Cross-field logic, GPS geofence, duration check, duplicate check
    │
    ├── Phase 3: Statistical Detection (async, queue)
    │   └─ Outlier detection, straight-lining, enumerator pattern analysis
    │
    └── Phase 4: Batch Quality Scoring (scheduled, daily)
        └─ Enumerator-level metrics, study-level trends, bias detection
```

---

## 5. Export and Data Portability

### 5.1 Export Formats

| Format | Use Case | Implementation |
|--------|----------|----------------|
| CSV | Universal data exchange | PostgreSQL COPY via analytics replica |
| Excel (.xlsx) | Business users | Laravel PhpSpreadsheet, styled templates |
| PDF | Reports, stakeholder comms | Laravel DomPDF/BrowserShot |
| JSON | API consumers, developers | Laravel API resources |
| GeoJSON | GIS/mapping software | PostGIS ST_AsGeoJSON |
| SPSS (.sav) | Statistical analysis | PHP library or R bridge |
| Stata (.dta) | Econometric analysis | PHP library or R bridge |
| Parquet | Data lake/warehouse | PostgreSQL COPY with PARQUET format |
| SQL Dump | Full data portability | pg_dump per tenant schema |

### 5.2 Export Pipeline

```
User Requests Export
    │
    ├── Permission Check (can-export, data scope)
    │
    ├── Query Construction (dimensions, filters, period)
    │   ├── Analytics Replica → Data extraction (chunked for large sets)
    │   └── S3 → Media file inclusion (if requested)
    │
    ├── Format Conversion (queue-backed for large exports)
    │   ├── CSV/JSON → Direct streaming
    │   ├── Excel/PDF → Laravel job (Horizon)
    │   └── SPSS/Stata → R/Python bridge job
    │
    ├── Storage (S3 with signed URL)
    │   └── /exports/{tenant}/{export_id}/{filename}.{format}
    │
    └── Notification (download link via email or in-app)
```

### 5.3 Export Size Limits

| Size | Method | Time Estimate |
|------|--------|---------------|
| < 10K rows | Synchronous response | < 2 sec |
| 10K - 100K rows | Queued job | < 30 sec |
| 100K - 1M rows | Queued batch job | < 5 min |
| > 1M rows | Async with streaming | < 30 min |

---

## 6. Data Lake Integration (Phase 2+)

### 6.1 Architecture

```
Analytics Replica  ──►  Parquet Export  ──►  S3 Data Lake
    │                        │
    │                        ▼
    │                  AWS Glue / Athena
    │                        │
    │                        ▼
    │                  External Tables (for rare/complex queries)
    │
    └──►  Hot Path  ──►  Dashboard Queries (< 15 min)
         Cold Path  ──►  Historical Analysis (< 24 hours)
```

### 6.2 Data Lake Schema in S3

```
s3://merline-datalake/{tenant}/
  ├── submissions/dt=2026-07-18/
  │   └── submissions_20260718_001.parquet
  ├── indicator_values/dt=2026-07-18/
  │   └── indicators_20260718_001.parquet
  ├── data_quality/dt=2026-07-18/
  │   └── quality_20260718_001.parquet
  └── exports/
      └── {export_id}/
          ├── data.csv
          ├── data.xlsx
          └── metadata.json
```

---

## 7. Integration with Operational Database

### 7.1 Read/Write Split

| Operation | Database | Rationale |
|-----------|----------|-----------|
| All INSERT/UPDATE/DELETE | Primary | Write consistency |
| Dashboard queries | Analytics Replica | Aggregate-heavy, stale-ok |
| Report generation | Analytics Replica | Complex joins, read-only |
| Data export | Analytics Replica | Bulk reads, stale-ok |
| AI model inference data | Analytics Replica | Feature extraction, read-only |
| User session/auth | Primary | Must be consistent |
| Form preview/load | Primary or Read Replica | Fresh data needed |

### 7.2 Analytics Database Configuration

```ini
# postgresql.conf for Analytics Replica
shared_buffers = '8GB'                    # 2x primary for large scans
work_mem = '256MB'                        # Larger for aggregation queries
maintenance_work_mem = '2GB'              # For MV refreshes
max_parallel_workers_per_gather = 8       # More parallelism for analytics
effective_cache_size = '24GB'
random_page_cost = 1.1                    # SSD-optimized
default_statistics_target = 1000          # Better query plans for skewed data
```

---

## 8. Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Analytics DB engine | PostgreSQL (no separate warehouse) | Avoids stack complexity in Phase 1; same engine as primary |
| Refresh strategy | Incremental batch (5-15 min) | Sufficient freshness for dashboards; CDC adds complexity |
| Multi-tenant analytics | Schema-per-tenant + public analytics | Isolation + platform-wide visibility |
| Semantic layer | SQL views (no Looker/Metric Store) | Lightweight, no additional infrastructure |
| BI tool | Metabase (Phase 1) → Apache Superset (Phase 2) | Metabase lighter for initial setup; Superset for enterprise |
| Data lake | Parquet in S3 (Phase 2+) | Columnar format optimal for analytics at rest |
| ETL framework | SQL-only (Phase 1) → dbt (Phase 2) | SQL reduces learning curve; dbt adds testing/docs |
| Statistical analysis | PostgreSQL + R bridge | R for computation, SQL for data management |
| Real-time analytics | Redis Streams + polling | Event-driven with 5-min refresh threshold |
