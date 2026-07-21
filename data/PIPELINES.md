# Merline Data Pipelines

## Pipeline Architecture

```
                        ┌─────────────────────────────────────────┐
                        │          Pipeline Orchestrator           │
                        │     (Laravel Scheduler + Horizon)        │
                        │                                          │
                        │  Schedule │ Dependencies │ Retry │ Alert │
                        └─────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────────┐
        │                           │                               │
        ▼                           ▼                               ▼
┌───────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
│  Operational →     │   │  Quality Scoring      │   │  Aggregation          │
│  Analytics Sync    │   │  Pipeline              │   │  Pipeline             │
│                    │   │                       │   │                       │
│  • App events      │   │  • Field validation   │   │  • Daily aggregates   │
│  • Batch ELT       │   │  • Statistical checks │   │  • Hourly rollups     │
│  • CDC (Phase 2)   │   │  • Enumerator scoring │   │  • Weekly summaries   │
└───────────────────┘   └───────────────────────┘   └───────────────────────┘
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
│  MV Refresh        │   │  Export Pipeline       │   │  Archive/Purge        │
│  Pipeline          │   │                       │   │  Pipeline             │
│                    │   │                       │   │                       │
│  • 15-min views    │   │  • CSV/Excel/PDF      │   │  • Cold storage       │
│  • Hourly views    │   │  • SPSS/Stata         │   │  • Parquet conversion │
│  • Daily views     │   │  • GeoJSON            │   │  • Data deletion      │
└───────────────────┘   └───────────────────────┘   └───────────────────────┘
```

---

## 1. Pipeline Inventory

### Pipeline 1: Operational → Analytics Sync

| Property | Phase 1 (MVP) | Phase 2 |
|----------|---------------|---------|
| **Method** | Application event → Queue job → SQL INSERT | Logical replication (CDC) + streaming |
| **Trigger** | On submission, indicator value, or quality check creation | Continuous (change stream) |
| **Latency** | 1-5 minutes (queue processing time) | < 30 seconds |
| **Data** | Submissions, indicator values, data quality events | Same + response values, audit events |
| **Reliability** | At-least-once (idempotent upsert) | Exactly-once (WAL offset tracking) |

**Phase 1 Implementation:**

```php
// App\Events\SubmissionSubmitted.php
class SubmissionSubmitted
{
    public function __construct(public Submission $submission) {}
}

// App\Listeners\SyncSubmissionToAnalytics.php
class SyncSubmissionToAnalytics implements ShouldQueue
{
    public function handle(SubmissionSubmitted $event): void
    {
        $submission = $event->submission;

        DB::connection('analytics')->table('fact_submissions')->upsert(
            [
                'submission_id' => $submission->id,
                'dim_organization_key' => $this->resolveOrgKey($submission),
                'dim_study_key' => $this->resolveStudyKey($submission->study_id),
                'dim_questionnaire_key' => $this->resolveQuestionnaireKey($submission->questionnaire_id),
                'dim_enumerator_key' => $this->resolveEnumeratorKey($submission->enumerator_id),
                'dim_time_completed_key' => $submission->completed_at->format('Ymd'),
                'status' => $submission->status,
                'duration_seconds' => $submission->duration_seconds,
                'flagged_for_review' => $submission->flagged_for_review,
                'validation_status' => $submission->validation_status,
                'completeness_score' => $this->calculateCompleteness($submission),
            ],
            ['submission_id'], // Conflict key (idempotent)
            ['status', 'duration_seconds', 'flagged_for_review', 'validation_status', 'completeness_score']
        );
    }
}
```

**Phase 2 CDC Setup:**

```sql
-- On primary database
CREATE PUBLICATION merline_analytics_cdc FOR TABLE
    submissions,
    response_values,
    indicator_values,
    data_quality_checks,
    ai_inference_logs;

-- On analytics replica
CREATE SUBSCRIPTION merline_analytics_sub
    CONNECTION 'host=primary port=5432 dbname=merline user=replicator'
    PUBLICATION merline_analytics_cdc
    WITH (copy_data = false);
```

### Pipeline 2: Data Quality Scoring

| Stage | Trigger | Scope | Method |
|-------|---------|-------|--------|
| L1 Field Validation | On submission create | Per response | Device-side rules |
| L2 Server Validation | On submission received | Per submission | Server-side rules |
| L3 Statistical Detection | Queue job (async) | Per submission + batch | Statistical models |
| L4 Enumerator Scoring | Scheduled (daily) | Per enumerator per study | Aggregate scoring |
| L5 Study Quality Report | Scheduled (weekly) | Per study | Composite scoring |

**L3 Statistical Detection Implementation:**

```php
class RunStatisticalQualityChecks implements ShouldQueue
{
    public function handle(): void
    {
        // Outlier detection (z-score method)
        DB::connection('analytics')->statement("
            INSERT INTO analytics.fact_data_quality (submission_key, dim_study_key,
                dim_enumerator_key, dim_time_key, check_type, status, score, details)
            SELECT
                fs.submission_key,
                fs.dim_study_key,
                fs.dim_enumerator_key,
                fs.dim_time_completed_key,
                'outlier',
                CASE WHEN z_score.abs_z > 3 THEN 'fail'
                     WHEN z_score.abs_z > 2 THEN 'warn'
                     ELSE 'pass' END,
                GREATEST(0, 100 - (z_score.abs_z * 20)),
                jsonb_build_object('z_score', z_score.abs_z, 'value', z_score.value)
            FROM analytics.fact_submissions fs
            CROSS JOIN LATERAL (
                SELECT value::DECIMAL, ABS((value - avg) / NULLIF(stddev, 0)) AS abs_z
                FROM (
                    SELECT fs.duration_seconds AS value,
                           AVG(fs2.duration_seconds) OVER study AS avg,
                           STDDEV(fs2.duration_seconds) OVER study AS stddev
                    FROM analytics.fact_submissions fs2
                    WHERE fs2.dim_study_key = fs.dim_study_key
                    AND fs2.status = 'approved'
                ) stats
                WHERE value IS NOT NULL AND stddev > 0
            ) z_score ON TRUE
            WHERE z_score.abs_z > 2
            AND fs.dim_time_completed_key = TO_CHAR(NOW(), 'YYYYMMDD')::INT
        ");

        // Straight-lining detection (same response > 80% of questions)
        DB::connection('analytics')->statement("
            INSERT INTO analytics.fact_data_quality (...)
            SELECT ...
            FROM submissions s
            JOIN response_values rv ON rv.submission_id = s.id
            GROUP BY s.id
            HAVING COUNT(DISTINCT rv.value::TEXT) <= 2
            AND COUNT(rv.id) >= 10
        ");
    }
}
```

### Pipeline 3: Aggregation Pipeline

| Aggregate | Frequency | Retention | Method |
|-----------|-----------|-----------|--------|
| `agg_daily_submissions` | Daily (incremental) | 2 years | INSERT WHERE yesterday |
| `agg_indicator_achievement` | Daily (full) | 2 years | TRUNCATE + INSERT |
| `agg_weekly_trends` | Weekly | 5 years | INSERT WHERE last week |
| `agg_monthly_summary` | Monthly | 10 years | INSERT WHERE last month |

```php
class BuildDailyAggregates implements ShouldQueue
{
    public function handle(): void
    {
        $yesterday = now()->subDay()->toDateString();

        // Daily submission aggregates
        DB::connection('analytics')->statement("
            INSERT INTO analytics.agg_daily_submissions
            SELECT
                :yesterday AS agg_date,
                fs.dim_organization_key,
                fs.dim_project_key,
                fs.dim_study_key,
                COALESCE(fs.dim_enumerator_key, 0) AS dim_enumerator_key,
                COUNT(*) AS total_submissions,
                COUNT(*) FILTER (WHERE fs.status = 'approved') AS approved_submissions,
                COUNT(*) FILTER (WHERE fs.status = 'rejected') AS rejected_submissions,
                COUNT(*) FILTER (WHERE fs.flagged_for_review) AS flagged_submissions,
                COUNT(DISTINCT fs.dim_enumerator_key) AS unique_enumerators,
                AVG(fs.duration_seconds)::INT AS avg_duration_seconds,
                AVG(dq.score)::DECIMAL(5,2) AS avg_quality_score
            FROM analytics.fact_submissions fs
            LEFT JOIN analytics.fact_data_quality dq
                ON dq.dim_submission_key = fs.submission_key
            WHERE fs.dim_time_completed_key = :date_key
            GROUP BY fs.dim_organization_key, fs.dim_project_key,
                     fs.dim_study_key, fs.dim_enumerator_key
            ON CONFLICT (agg_date, dim_study_key, dim_enumerator_key)
            DO UPDATE SET
                total_submissions = EXCLUDED.total_submissions,
                approved_submissions = EXCLUDED.approved_submissions,
                flagged_submissions = EXCLUDED.flagged_submissions,
                avg_quality_score = EXCLUDED.avg_quality_score
        ", [
            'yesterday' => $yesterday,
            'date_key' => now()->subDay()->format('Ymd'),
        ]);
    }
}
```

### Pipeline 4: Export Pipeline

```php
class GenerateExport implements ShouldQueue
{
    public function __construct(
        private string $exportId,
        private string $tenantId,
        private array $config
    ) {}

    public function handle(): void
    {
        $format = $this->config['format']; // csv, xlsx, pdf, json, geojson, spss, stata
        $query = $this->buildExportQuery();

        $path = "exports/{$this->tenantId}/{$this->exportId}/data.{$format}";

        match ($format) {
            'csv' => $this->exportCsv($query, $path),
            'xlsx' => $this->exportXlsx($query, $path),
            'json' => $this->exportJson($query, $path),
            'geojson' => $this->exportGeoJson($query, $path),
            'spss', 'stata' => $this->exportViaR($query, $path, $format),
            'pdf' => $this->exportPdf($query, $path),
            default => throw new InvalidArgumentException("Unsupported format: {$format}"),
        };

        // Generate metadata
        Storage::disk('s3')->put(
            "{$path}/metadata.json",
            json_encode([
                'export_id' => $this->exportId,
                'format' => $format,
                'generated_at' => now()->toIso8601String(),
                'row_count' => $rowCount,
                'columns' => $columns,
                'filters' => $this->config['filters'] ?? [],
            ])
        );

        // Notify user
        event(new ExportReady($this->exportId, $this->config['user_id']));
    }

    private function exportCsv(string $query, string $path): void
    {
        $tempFile = tempnam(sys_get_temp_dir(), 'export_');
        DB::connection('analytics')->statement(
            "COPY ({$query}) TO '{$tempFile}' DELIMITER ',' CSV HEADER"
        );
        Storage::disk('s3')->put($path, fopen($tempFile, 'r'));
        unlink($tempFile);
    }

    private function exportViaR(string $query, string $path, string $format): void
    {
        $csvFile = tempnam(sys_get_temp_dir(), 'export_');
        DB::connection('analytics')->statement(
            "COPY ({$query}) TO '{$csvFile}' DELIMITER ',' CSV HEADER"
        );

        $outputFile = tempnam(sys_get_temp_dir(), 'export_');
        $rScript = match ($format) {
            'spss' => "library(foreign); d <- read.csv('{$csvFile}'); write.spss(d, '{$outputFile}')",
            'stata' => "library(foreign); d <- read.csv('{$csvFile}'); write.dta(d, '{$outputFile}')",
        };

        $escaped = escapeshellarg($rScript);
        exec("Rscript -e {$escaped} 2>&1", $output, $exitCode);

        if ($exitCode !== 0) {
            throw new ExportFailedException("R export failed: " . implode("\n", $output));
        }

        Storage::disk('s3')->put($path, fopen($outputFile, 'r'));
        unlink($csvFile);
        unlink($outputFile);
    }
}
```

### Pipeline 5: Materialized View Refresh

```php
class RefreshMaterializedViews implements ShouldQueue
{
    public array $views = [
        'analytics.mv_study_dashboard' => 15,         // minutes
        'analytics.mv_indicator_tracking' => 60,       // minutes
        'analytics.mv_enumerator_performance' => 360,  // 6 hours
        'analytics.mv_geographic_coverage' => 1440,    // 24 hours
        'analytics.mv_longitudinal_trends' => 60,      // minutes
    ];

    public function handle(): void
    {
        $view = $this->view ?? null;

        $targets = $view
            ? [$view => $this->views[$view] ?? 60]
            : $this->views;

        foreach ($targets as $name => $interval) {
            $start = microtime(true);

            try {
                DB::connection('analytics')->statement(
                    "REFRESH MATERIALIZED VIEW CONCURRENTLY {$name}"
                );
                $duration = round((microtime(true) - $start) * 1000);

                Log::channel('analytics')->info("MV refreshed", [
                    'view' => $name,
                    'duration_ms' => $duration,
                ]);

                // Alert if refresh exceeds threshold
                if ($duration > 30000) { // 30 seconds
                    Notification::route('slack', config('services.slack.analytics'))
                        ->notify(new SlowMvRefresh($name, $duration));
                }
            } catch (\Exception $e) {
                Log::channel('analytics')->error("MV refresh failed", [
                    'view' => $name,
                    'error' => $e->getMessage(),
                ]);

                Notification::route('slack', config('services.slack.analytics'))
                    ->notify(new MvRefreshFailed($name, $e->getMessage()));
            }
        }
    }
}
```

**Schedule (Laravel Kernel):**

```php
protected function schedule(Schedule $schedule): void
{
    // Operational → Analytics sync (continuous via events + queue)

    // Materialized view refreshes
    $schedule->job(new RefreshMaterializedViews('analytics.mv_study_dashboard'))
        ->everyFifteenMinutes()
        ->withoutOverlapping()
        ->onOneServer();

    $schedule->job(new RefreshMaterializedViews('analytics.mv_indicator_tracking'))
        ->hourly()
        ->withoutOverlapping()
        ->onOneServer();

    $schedule->job(new RefreshMaterializedViews('analytics.mv_enumerator_performance'))
        ->everySixHours()
        ->withoutOverlapping()
        ->onOneServer();

    $schedule->job(new RefreshMaterializedViews('analytics.mv_geographic_coverage'))
        ->daily()
        ->withoutOverlapping()
        ->onOneServer();

    // Aggregation pipeline
    $schedule->job(new BuildDailyAggregates)
        ->dailyAt('01:00')
        ->withoutOverlapping()
        ->onOneServer();

    $schedule->job(new BuildWeeklyAggregates)
        ->weeklyOn(7, '02:00') // Sunday
        ->withoutOverlapping();

    // Statistical quality checks
    $schedule->job(new RunStatisticalQualityChecks)
        ->hourly()
        ->withoutOverlapping()
        ->onOneServer();

    // Data archival
    $schedule->job(new ArchiveOldData)
        ->monthly()
        ->onOneServer();
}
```

### Pipeline 6: Data Archival & Purge

| Data Category | Active Retention | Archive After | Delete After |
|---------------|-----------------|---------------|--------------|
| Submissions | Study end + 12 months | Parquet in S3 | Archive + 7 years |
| Response values | Study end + 12 months | Parquet (together with submissions) | Archive + 7 years |
| Indicator values | 5 years | Parquet in S3 | Archive + 10 years |
| Data quality logs | 90 days | Parquet in S3 | Archive + 2 years |
| AI inference logs | 90 days | Not archived | 90 days |
| Audit events | 12 months hot | Parquet in S3 | Archive + 7 years |

```php
class ArchiveOldData implements ShouldQueue
{
    public function handle(): void
    {
        $archiveDate = now()->subMonths(12);

        // Archive submissions older than 12 months
        $partitions = DB::connection('analytics')->select("
            SELECT relname FROM pg_class
            WHERE relkind = 'r'
            AND relname ~ 'fact_submissions_'
            AND relname < 'fact_submissions_' || TO_CHAR(:date, 'YYYY_MM')
        ", ['date' => $archiveDate]);

        foreach ($partitions as $partition) {
            // Export to Parquet
            DB::connection('analytics')->statement("
                COPY (SELECT * FROM {$partition->relname})
                TO '/tmp/archive/{$partition->relname}.parquet'
                WITH (FORMAT PARQUET)
            ");

            // Upload to S3 glacier
            Storage::disk('s3-archive')->put(
                "submissions/{$partition->relname}.parquet",
                fopen("/tmp/archive/{$partition->relname}.parquet", 'r'),
                ['StorageClass' => 'DEEP_ARCHIVE']
            );

            // Detach partition
            DB::connection('analytics')->statement(
                "DROP TABLE IF EXISTS {$partition->relname}"
            );

            unlink("/tmp/archive/{$partition->relname}.parquet");
        }
    }
}
```

---

## 2. Pipeline Orchestration

### 2.1 Scheduler Configuration

```
┌─────────────────────────────────────────────────┐
│            Laravel Scheduler (Kernel)            │
├─────────────────────────────────────────────────┤
│  Frequency  │  Command             │  Overlap?   │
├─────────────┼──────────────────────┼─────────────┤
│  Every 15m  │  Refresh MV (study)  │  No         │
│  Every 60m  │  Refresh MV (ind)    │  No         │
│  Every 6h   │  Refresh MV (enum)   │  No         │
│  Daily 1am  │  Build aggregates    │  No         │
│  Hourly     │  Quality checks      │  No         │
│  Monthly    │  Archive data        │  No         │
│  On event   │  Sync to analytics   │  N/A (queue)│
│  On demand  │  Export              │  Per export  │
└─────────────┴──────────────────────┴─────────────┘
```

### 2.2 Dependency Management

```yaml
pipelines:
  - name: sync-to-analytics
    depends_on: []  # No dependencies, event-driven
    retry: 3
    backoff: exponential (30s, 60s, 120s)
    alert_on: [failed, stuck]

  - name: mv-study-dashboard
    depends_on: [sync-to-analytics]
    retry: 2
    backoff: linear (60s each)
    alert_on: [failed, slow (>30s)]

  - name: build-daily-aggregates
    depends_on: [sync-to-analytics, mv-study-dashboard]
    retry: 3
    backoff: exponential (60s, 120s, 240s)
    alert_on: [failed]
    timeout: 300s

  - name: statistical-quality-checks
    depends_on: [sync-to-analytics]
    retry: 2
    alert_on: [failed, high-flag-rate]

  - name: export-data
    depends_on: [sync-to-analytics]
    retry: 1
    alert_on: [failed]
    timeout: 1800s  # 30 min for large exports

  - name: archive-data
    depends_on: []  # Standalone
    retry: 3
    alert_on: [failed]
    timeout: 3600s  # 1 hour
```

### 2.3 Retry and Error Handling

| Error Type | Retry Strategy | Escalation |
|------------|---------------|------------|
| Transient (connection timeout, deadlock) | Retry 3x with exponential backoff | Log warning |
| Data integrity (FK violation, constraint) | No retry, dead letter queue | Log error + notify admin |
| Resource exhaustion (disk full, OOM) | Retry 1x after 5 min | Critical alert (PagerDuty) |
| Logic error (bug, bad query) | No retry | Log critical + notify dev team |

**Dead Letter Queue:**

```php
class AnalyticsDeadLetterQueue
{
    public function handle(FailedPipelineJob $job): void
    {
        DB::connection('analytics')->table('pipeline_failures')->insert([
            'pipeline' => $job->pipeline,
            'payload' => json_encode($job->payload),
            'error' => $job->error,
            'failed_at' => now(),
            'retry_count' => $job->attempts,
        ]);

        // Notify pipeline owners
        Notification::route('mail', config('analytics.alert_email'))
            ->notify(new PipelineFailedAlert($job));

        // If critical data flow, trigger backfill
        if ($job->critical) {
            event(new BackfillRequested($job->pipeline, $job->timeframe));
        }
    }
}
```

---

## 3. Incremental Processing Patterns

### 3.1 High-Water Mark Pattern

```php
class IncrementalSync
{
    private string $table;
    private string $watermarkColumn = 'updated_at';

    public function sync(): int
    {
        $lastWatermark = Cache::get("pipeline:watermark:{$this->table}", '1970-01-01');

        $newWatermark = DB::connection('operational')->scalar("
            SELECT MAX({$this->watermarkColumn})
            FROM {$this->table}
            WHERE {$this->watermarkColumn} > ?
        ", [$lastWatermark]);

        if ($newWatermark === null) {
            return 0; // Nothing new
        }

        $rows = DB::connection('operational')->select("
            SELECT *
            FROM {$this->table}
            WHERE {$this->watermarkColumn} > ?
              AND {$this->watermarkColumn} <= ?
        ", [$lastWatermark, $newWatermark]);

        foreach ($rows as $row) {
            $this->upsertToAnalytics($row);
        }

        Cache::forever("pipeline:watermark:{$this->table}", $newWatermark);

        return count($rows);
    }
}
```

### 3.2 Batch Size Guidelines

| Operation | Batch Size | Notes |
|-----------|------------|-------|
| INSERT to fact table | 500-1000 rows | Avoids long-running txns |
| COPY for bulk loads | 10K-100K rows | 5-10x faster than INSERT |
| MV REFRESH CONCURRENTLY | N/A (full table) | Uses unique index |
| DELETE (archive) | 10K rows per txn | Chunk to avoid lock escalation |
| Export | Full result set | Stream to file, don't load in memory |

---

## 4. Pipeline Observability

### 4.1 Metrics Tracked Per Pipeline

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `pipeline_duration_seconds` | Execution time | > 2x baseline |
| `pipeline_rows_processed` | Rows affected | 0 = warning |
| `pipeline_errors_total` | Error count | > 0 for critical pipes |
| `pipeline_success_rate` | % success (7d rolling) | < 99% |
| `pipeline_queue_depth` | Pending jobs | > 1000 |
| `mv_refresh_duration_ms` | MV refresh time | > 30s |
| `analytics_lag_seconds` | Time since last successful sync | > 300s for critical |

### 4.2 Pipeline Health Dashboard (Grafana)

```
Pipeline Health Dashboard
├── SYNC PIPELINE
│   ├── Last sync: 30s ago [GREEN]
│   ├── Rows synced (24h): 12,450
│   ├── Errors (24h): 2 [0.02%]
│   └── Queue depth: 23
├── MV REFRESH
│   ├── study_dashboard: 2.3s [GREEN]
│   ├── indicator_tracking: 8.1s [GREEN]
│   ├── enumerator_performance: 4.7s [GREEN]
│   └── geographic_coverage: 12.2s [AMBER (>10s)]
├── AGGREGATION
│   ├── Daily aggregates: Completed 1:02am [GREEN]
│   ├── Weekly aggregates: Completed Mon 2:15am [GREEN]
│   └── Rows aggregated: 8,230
├── EXPORT
│   ├── Exports today: 5
│   ├── Avg export time: 45s
│   └── Failed exports: 0
└── ARCHIVAL
    └── Last archive: 2 days ago [GREEN]
```

### 4.3 Logging Conventions

All pipeline jobs log structured JSON:

```php
Log::channel('analytics')->info('Pipeline execution', [
    'pipeline' => 'mv-study-dashboard',
    'tenant_id' => tenant()->id,
    'duration_ms' => 2340,
    'rows_affected' => 15000,
    'status' => 'success',
    'execution_id' => (string) Str::uuid(),
]);
```

---

## 5. Pipeline Testing Strategy

| Test Type | Scope | Frequency | Method |
|-----------|-------|-----------|--------|
| Unit test | Individual transformer functions | Per PR | PHPUnit |
| Integration test | Pipeline end-to-end with test DB | Per PR | PHPUnit + test DB |
| Data quality test | Output data meets expectations | After each run | dbt tests (Phase 2) |
| Freshness test | Data is not stale | Every 15 min | Monitoring alert |
| Volume test | Pipeline handles 10x expected load | Monthly | Staging load test |
| Recovery test | Pipeline recovers from failure | Quarterly | Manual kill + restart |

---

## Pipeline Inventory Summary

| # | Pipeline | Trigger | Frequency | Priority | Phase |
|---|----------|---------|-----------|----------|-------|
| 1 | Operational → Analytics Sync | Event | Continuous | Critical | 1 |
| 2 | Data Quality Scoring | Event + Schedule | Hourly | Critical | 1 |
| 3 | Aggregation Pipeline | Schedule | Daily | High | 1 |
| 4 | Export Pipeline | On-demand | Ad-hoc | High | 1 |
| 5 | MV Refresh Pipeline | Schedule | 15-1440 min | High | 1 |
| 6 | Data Archival & Purge | Schedule | Monthly | Medium | 2 |
| 7 | CDC Streaming (Phase 2) | Continuous | Real-time | Medium | 2 |
| 8 | Data Lake Export | Schedule | Daily | Low | 2 |
