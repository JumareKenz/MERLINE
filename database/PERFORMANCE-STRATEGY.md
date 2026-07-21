# Merline Database Performance Strategy

## Overview

This document defines the performance architecture for the Merline database layer. It covers indexing strategy, caching integration (Redis), connection pooling, query optimization patterns, bulk operations, materialized view refresh, and N+1 prevention.

**Performance targets**:
- P99 query latency < 100ms for OLTP queries
- P99 query latency < 500ms for analytics queries
- Materialized view refresh < 30s per tenant
- Bulk insert throughput > 10,000 rows/second
- Sync endpoint handles 500 concurrent submissions

---

## 1. Indexing Strategy

### 1.1 Index Design Principles

| Principle | Rationale |
|-----------|-----------|
| **Index by query pattern, not column** | Every index must serve a known query or FK traversal |
| **Prefer composite indexes** | Multi-column queries benefit from covering indexes |
| **Partial indexes for sparse data** | `WHERE is_active = TRUE` indexes for soft-delete patterns |
| **Covering indexes for hot queries** | Include all selected columns to avoid heap lookups |
| **GIN for JSONB, GiST for geography** | Extension-specific index types |
| **Concurrent creation** | Avoid locks on production tables |

### 1.2 Index Catalogue

#### Critical indexes (measured P99 > 50ms improvement)

```sql
-- 1. Tenant-scoped lookups (every query includes organization_id)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_projects_org_status 
    ON projects(organization_id, status) 
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_studies_org_status 
    ON studies(organization_id, status) 
    WHERE deleted_at IS NULL;

-- 2. Submission queries by enumerator and sync status
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_submissions_enum_sync 
    ON submissions(enumerator_id, is_synced) 
    WHERE deleted_at IS NULL;

-- 3. Submission queries by study and date range (dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_submissions_study_date 
    ON submissions(study_id, completed_at) 
    WHERE deleted_at IS NULL AND status != 'draft';

-- 4. Indicator value time-series queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_indicator_values_lookup 
    ON indicator_values(indicator_id, period_end DESC, is_actual) 
    WHERE status = 'approved';

-- 5. Audit trail by entity
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_audit_entity_time 
    ON public.audit_events(entity_type, entity_id, created_at DESC);

-- 6. Assignment status for supervisor dashboards
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_assignments_status_due 
    ON assignments(enumerator_id, status, due_date) 
    WHERE deleted_at IS NULL;

-- 7. Questionnaire version lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_qnr_current_version 
    ON questionnaires(study_id, is_current, version DESC) 
    WHERE deleted_at IS NULL AND is_current = TRUE;

-- 8. Response value by question (analysis queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_response_question_submission 
    ON response_values(question_id, submission_id);

-- 9. Knowledge item search by tags
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_knowledge_tags 
    ON knowledge_items USING GIN(tags);
```

#### Performance-sensitive composite indexes

```sql
-- Covering indexes for frequent queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_projects_list 
    ON projects(organization_id, status, created_at DESC) 
    INCLUDE (code, name, start_date, end_date)
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_studies_list 
    ON studies(project_id, status, created_at DESC) 
    INCLUDE (code, title, study_type, start_date, end_date)
    WHERE deleted_at IS NULL;

-- Dashboard: submission aggregation by day
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_submissions_daily_agg 
    ON submissions(study_id, (completed_at::date)) 
    INCLUDE (status)
    WHERE deleted_at IS NULL AND status = 'submitted';
```

### 1.3 JSONB Access Pattern Indexing

```sql
-- Question options querying (find questions with specific option)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_question_option_value 
    ON questions USING GIN((options -> 'value'));

-- Submission metadata queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_submission_metadata 
    ON submissions USING GIN(metadata jsonb_path_ops);
```

### 1.4 Full-Text Search Indexes

```sql
-- All major searchable entities
ALTER TABLE projects ADD COLUMN search_vector tsvector 
    GENERATED ALWAYS AS (to_tsvector('english', COALESCE(name,'') || ' ' || COALESCE(description,''))) STORED;

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_projects_search 
    ON projects USING GIN(search_vector);

-- For studies
ALTER TABLE studies ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', COALESCE(title,'') || ' ' || COALESCE(purpose,''))) STORED;
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_studies_search 
    ON studies USING GIN(search_vector);
```

---

## 2. Redis Caching Strategy

### 2.1 Cache Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ Application  │────▶│  Redis 7+    │────▶│  PostgreSQL   │
│ (Laravel)    │◀────│  (Cache)     │◀────│  (Database)   │
└─────────────┘     └──────────────┘     └──────────────┘
                           │
                    ┌──────┴──────┐
                    │  Redis       │
                    │  Session     │
                    │  Queue       │
                    │  Rate Limit  │
                    │  Pub/Sub     │
                    └─────────────┘
```

### 2.2 Cache Layers

| Layer | TTL | Storage | Invalidation |
|-------|-----|---------|--------------|
| **Query result** | 60-300s | Redis String (JSON) | Tag-based flush on entity update |
| **Model** | 300-600s | Redis String (serialized) | Model event flush |
| **Session** | Session lifetime | Redis String | On logout/expiry |
| **Rate limit** | Window duration | Redis Sorted Set | TTL-based |
| **Lock** | As needed | Redis String | TTL or release |
| **Counter** | Perpetual | Redis String | Increment/decrement |

### 2.3 Cache Key Schema

```
merline:{tenant_id}:{entity}:{id}:{suffix}
merline:{tenant_id}:query:{md5_of_sql}:{params_hash}

Examples:
merline:abc123:project:uuid-123:detail
merline:abc123:study:uuid-456:dashboard
merline:abc123:query:a1b2c3d4
```

### 2.4 Laravel Cache Implementation

```php
<?php
// app/Services/CacheService.php

class CacheService
{
    private const TTL_DEFAULT = 300; // 5 minutes
    private const TTL_QUERY = 120;   // 2 minutes
    private const TTL_DASHBOARD = 60; // 1 minute

    public function __construct(
        private Cache $cache,
        private ContextService $context
    ) {}

    public function remember(string $key, callable $callback, ?int $ttl = null): mixed
    {
        $prefixed = $this->prefix($key);
        return $this->cache->remember($prefixed, $ttl ?? self::TTL_DEFAULT, $callback);
    }

    public function invalidate(string $entity, string $id): void
    {
        $pattern = "merline:{$this->context->tenantId()}:{$entity}:{$id}:*";
        $keys = $this->cache->keys($pattern);
        $this->cache->deleteMultiple($keys);
    }

    public function invalidateByTag(string $tag): void
    {
        $this->cache->tags([$this->context->tenantId(), $tag])->flush();
    }

    private function prefix(string $key): string
    {
        $tenantId = $this->context->tenantId();
        return "merline:{$tenantId}:{$key}";
    }
}
```

### 2.5 Cache Invalidation Events

```php
<?php
// app/Observers/ProjectObserver.php

class ProjectObserver
{
    public function __construct(
        private CacheService $cache,
        private BroadcastService $broadcast
    ) {}

    public function saved(Project $project): void
    {
        $tags = ['project', "project:{$project->id}"];
        $this->cache->invalidateByTag($tags);
        $this->broadcast->entityUpdated('project', $project->id);
    }

    public function deleted(Project $project): void
    {
        $this->cache->invalidateByTag(['project', "project:{$project->id}"]);
    }

    public function restored(Project $project): void
    {
        $this->cache->invalidateByTag(['project', "project:{$project->id}"]);
    }
}
```

### 2.6 Hot Cache Strategies

#### Dashboard Data (Pre-computed)

```php
<?php
// Cached aggregated dashboard data
$dashboardData = $cacheService->remember("study:{$studyId}:dashboard", function () {
    return [
        'total_submissions' => Submission::where('study_id', $studyId)->count(),
        'approved' => Submission::where('study_id', $studyId)->where('status', 'approved')->count(),
        'flagged' => Submission::where('study_id', $studyId)->where('flagged_for_review', true)->count(),
        'completion_rate' => $this->calculateRate($studyId),
    ];
}, 60); // 1 minute TTL
```

#### Reference Data (Long-lived)

```php
<?php
// Question types, indicator levels, study types — rarely change
$questionTypes = $cacheService->remember('reference:question_types', function () {
    return QuestionType::all()->keyBy('code');
}, 86400); // 24 hours
```

---

## 3. Read Replica Usage

### 3.1 Replica Architecture

```
                 ┌──────────────────┐
                 │  PostgreSQL      │
                 │  Primary (Write) │
                 └────────┬─────────┘
                          │
                          │ Streaming Replication
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
        ┌─────────┐ ┌─────────┐ ┌─────────┐
        │ Replica  │ │ Replica  │ │Analytics│
        │ 1 (RO)   │ │ 2 (RO)   │ │ Replica │
        └─────────┘ └─────────┘ └─────────┘
              │           │           │
              ▼           ▼           ▼
        ┌──────────────────────────────────┐
        │         Read/Write Split          │
        │         (Laravel)                 │
        └──────────────────────────────────┘
```

### 3.2 Laravel Read/Write Connection Configuration

```php
<?php
// config/database.php

'pgsql' => [
    'read' => [
        'host' => [
            env('DB_REPLICA_1_HOST', '127.0.0.1'),
            env('DB_REPLICA_2_HOST', '127.0.0.1'),
        ],
        'port' => env('DB_REPLICA_PORT', 5432),
    ],
    'write' => [
        'host' => env('DB_PRIMARY_HOST', '127.0.0.1'),
        'port' => env('DB_PRIMARY_PORT', 5432),
    ],
    'driver' => 'pgsql',
    'database' => env('DB_DATABASE', 'merline'),
    'username' => env('DB_USERNAME', 'merline'),
    'password' => env('DB_PASSWORD', ''),
    'charset' => 'utf8',
    'prefix' => '',
    'schema' => 'public',
    'sslmode' => 'prefer',
    'options' => [
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_STRINGIFY_FETCHES => false,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ],
],
```

### 3.3 Read Replica Query Routing

```php
<?php
// Read replica usage per query type

// AUTOMATIC: SELECT queries go to replica, INSERT/UPDATE/DELETE go to primary
$projects = Project::where('organization_id', $orgId)->get(); // Replica

// EXPLICIT: Force primary for read-after-write consistency
$project = Project::onWriteConnection()->find($id);

// ANALYTICS: Route heavy analytics to dedicated analytics replica
$reportData = DB::connection('pgsql_analytics')->select("
    SELECT ... FROM mv_indicator_performance WHERE ...
");
```

### 3.4 Replica Query Patterns

| Query Type | Target | Rationale |
|-----------|--------|-----------|
| Dashboard loads | Replica or Analytics | Heavy aggregation queries |
| Form previews | Replica | Read-only, cached |
| Report generation | Analytics Replica | Complex joins, materialized views |
| Submissions sync | Primary | Write-heavy, needs consistency |
| User authentication | Primary | Session consistency |
| Data export | Replica | Read-only, can be stale |

---

## 4. Connection Pooling

### 4.1 PgBouncer Configuration

```ini
[databases]
merline = host=localhost port=5432 dbname=merline
merline_replica = host=replica.local port=5432 dbname=merline

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# Pool mode: transaction-level (best for Laravel)
pool_mode = transaction
default_pool_size = 50
max_client_conn = 200
max_db_connections = 100

# Timeouts
server_idle_timeout = 300
client_idle_timeout = 600
query_timeout = 30
```

### 4.2 Laravel Connection Pool Integration

```php
<?php
// config/database.php

'pgsql' => [
    'driver' => 'pgsql',
    'host' => env('PGBOUNCER_HOST', '127.0.0.1'),
    'port' => env('PGBOUNCER_PORT', 6432),
    'database' => env('DB_DATABASE', 'merline'),
    // ... standard config
    'options' => [
        PDO::ATTR_EMULATE_PREPARES => true, // Required for PgBouncer transaction mode
        // ... other options
    ],
],
```

### 4.3 Connection Sizing

```
Formula: Connections = (max_children × (max_requests_per_child / request_duration)) + overhead

Estimation:
- Web workers: 10 (php-fpm) × 3 connections = 30
- Queue workers: 20 (Horizon) × 2 connections = 40
- Scheduler: 2 × 1 = 2
- Analytics/Reports: 5 × 2 = 10
- Pool overhead: 18

Total: ~100 connections → pool_size = 50 (buffer through PgBouncer)
```

---

## 5. Query Optimization Guidelines

### 5.1 General Rules

| Rule | Description |
|------|-------------|
| **Select only needed columns** | Avoid `SELECT *` in production code |
| **Use eager loading** | Prevent N+1 queries via `->with()` |
| **Chunk large datasets** | Use `->chunk()` or `->cursor()` for bulk |
| **Avoid N+1 in loops** | Batch queries, never query inside loops |
| **Use DB::raw sparingly** | Only for complex aggregations |
| **Index all FK columns** | Every foreign key must have an index |
| **Use EXPLAIN ANALYZE** | Verify query plans in CI |

### 5.2 EXPLAIN ANALYZE Checklist

```sql
-- Before deploying any query:
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT p.name, COUNT(s.id) as study_count
FROM projects p
LEFT JOIN studies s ON s.project_id = p.id
WHERE p.organization_id = 'uuid'
  AND p.deleted_at IS NULL
GROUP BY p.id, p.name;

-- Check for:
-- ❌ Seq Scan on large tables (>100K rows)
-- ❌ Nested Loop without index
-- ❌ Sort with high memory usage
-- ✅ Index Only Scan
-- ✅ Bitmap Heap Scan + Bitmap Index Scan
```

### 5.3 Common Query Anti-Patterns

```php
// ❌ BAD: N+1 query
$projects = Project::all();
foreach ($projects as $project) {
    echo $project->studies->count(); // Triggers N queries
}

// ✅ GOOD: Eager load
$projects = Project::withCount('studies')->get();

// ❌ BAD: Query in loop
foreach ($studyIds as $id) {
    $study = Study::find($id); // N queries
}

// ✅ GOOD: Batch query
$studies = Study::whereIn('id', $studyIds)->get()->keyBy('id');

// ❌ BAD: Pagination with offset on large dataset
$submissions = Submission::orderBy('id')->skip(100000)->take(50)->get();

// ✅ GOOD: Keyset pagination
$submissions = Submission::where('id', '>', $lastSeenId)
    ->orderBy('id')
    ->take(50)
    ->get();
```

---

## 6. N+1 Query Prevention

### 6.1 Detection Tools

```php
<?php
// app/Providers/AppServiceProvider.php

public function boot(): void
{
    // Development: Log N+1 queries
    if (app()->isLocal()) {
        DB::listen(function ($query) {
            if (count($query->bindings) > 0) {
                $backtrace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 10);
                // Detect patterns that suggest N+1
            }
        });

        // Use Laravel's built-in N+1 detection
        Model::preventLazyLoading(!app()->isProduction());
    }
}
```

### 6.2 Eager Loading Strategy

```php
<?php
// Always eager-load relationships used in views/JSON responses

// Default eager loads (Model level)
class Study extends Model
{
    protected $with = ['project:id,code,name'];
    
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
    
    public function indicators(): HasMany
    {
        return $this->hasMany(Indicator::class);
    }
    
    public function questionnaires(): HasMany
    {
        return $this->hasMany(Questionnaire::class);
    }
}

// Controller: selective eager loading
$study = Study::with([
    'indicators' => fn($q) => $q->where('status', 'approved'),
    'questionnaires.sections.questions',
    'submissions' => fn($q) => $q->where('status', 'approved'),
])->findOrFail($id);
```

### 6.3 Lazy Loading Prevention

```php
<?php
// config/app.php

'prevent_lazy_loading' => env('PREVENT_LAZY_LOADING', !env('APP_DEBUG')),

// Production: throw exception on lazy load
public function boot(): void
{
    Model::preventLazyLoading(
        !app()->isProduction()
    );
}
```

---

## 7. Bulk Insert/Update Patterns

### 7.1 Bulk Submission Ingestion

```php
<?php
// app/Services/SubmissionIngestionService.php

class SubmissionIngestionService
{
    public function ingestBatch(array $submissions): void
    {
        DB::transaction(function () use ($submissions) {
            // Batch insert submissions
            $submissionIds = [];
            foreach (array_chunk($submissions, 500) as $chunk) {
                $insertData = array_map(fn($s) => [
                    'id' => (string) Str::uuid7(),
                    'submission_id' => $s['id'],
                    'questionnaire_id' => $s['qnr_id'],
                    'study_id' => $s['study_id'],
                    'status' => 'submitted',
                    'completed_at' => $s['completed_at'],
                    'form_version' => $s['form_version'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ], $chunk);
                
                DB::table('submissions')->insert($insertData);
            }

            // Batch insert response values
            foreach (array_chunk($this->extractResponses($submissions), 1000) as $chunk) {
                DB::table('response_values')->insert($chunk);
            }
        });
    }

    public function ingestSingle(Submission $submission): void
    {
        DB::transaction(function () use ($submission) {
            $submission->save();
            
            // Bulk insert response values
            $responses = $submission->responses->map(fn($r) => [
                'id' => (string) Str::uuid7(),
                'submission_id' => $submission->id,
                'question_id' => $r['question_id'],
                'value' => json_encode($r['value']),
                'created_at' => now(),
            ])->toArray();
            
            DB::table('response_values')->insert($responses);
        });
    }
}
```

### 7.2 Bulk Indicator Value Updates

```php
<?php
// Batch update with upsert
DB::table('indicator_values')->upsert(
    $values,
    ['indicator_id', 'period_start', 'period_end', 'disaggregation_dimension', 'disaggregation_category'],
    ['value', 'numerator_value', 'denominator_value', 'updated_at']
);
```

### 7.3 COPY Command for Large Imports

```php
<?php
// Use PostgreSQL COPY for >10K row imports
$path = storage_path('import/submissions.csv');

DB::statement("
    COPY submissions (id, submission_id, questionnaire_id, study_id, 
                      status, completed_at, form_version, created_at, updated_at)
    FROM '{$path}' 
    DELIMITER ',' CSV HEADER
");
```

---

## 8. Materialized View Refresh Strategy

### 8.1 Refresh Priorities

| View | Refresh Interval | Refresh Method | Criticality |
|------|-----------------|----------------|-------------|
| mv_study_progress | Every 15 min | CONCURRENTLY | High |
| mv_indicator_performance | Every 60 min | CONCURRENTLY | Medium |
| mv_enumerator_performance | Every 6 hours | CONCURRENTLY | Low |
| mv_daily_submissions | Every 24 hours | CONCURRENTLY | Medium |

### 8.2 Refresh Implementation

```php
<?php
// app/Console/Kernel.php

protected function schedule(Schedule $schedule): void
{
    // Refresh materialized views on a schedule
    $schedule->command('views:refresh study-progress')
        ->everyFifteenMinutes()
        ->withoutOverlapping()
        ->onOneServer();

    $schedule->command('views:refresh indicator-performance')
        ->hourly()
        ->withoutOverlapping()
        ->onOneServer();

    $schedule->command('views:refresh enumerator-performance')
        ->everySixHours()
        ->withoutOverlapping()
        ->onOneServer();

    // Event-driven refresh
    $schedule->command('views:refresh study-progress')
        ->everyMinute()
        ->when(function () {
            return Cache::get('flag:refresh_study_progress', false);
        })
        ->withoutOverlapping();
}

// app/Console/Commands/RefreshMaterializedView.php

class RefreshMaterializedView extends Command
{
    public function handle(): int
    {
        $view = $this->argument('view');
        $start = microtime(true);

        try {
            DB::statement("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_{$view}");
            
            $duration = microtime(true) - $start;
            Log::info("Materialized view refreshed: {$view}", [
                'duration_ms' => round($duration * 1000),
            ]);

            return Command::SUCCESS;
        } catch (\Exception $e) {
            Log::error("Materialized view refresh failed: {$view}", [
                'error' => $e->getMessage(),
            ]);
            return Command::FAILURE;
        }
    }
}
```

### 8.3 Trigger-Based Refresh

```php
<?php
// For near-real-time updates on critical views
// app/Events/SubmissionApproved.php

class SubmissionApproved
{
    public function __construct(public Submission $submission) {}
}

// app/Listeners/RefreshStudyProgress.php

class RefreshStudyProgress
{
    public function handle(SubmissionApproved $event): void
    {
        Cache::set('flag:refresh_study_progress', true, 60);
    }
}
```

---

## 9. Query Performance Monitoring

### 9.1 pg_stat_statements

```sql
-- Log slow queries
SELECT query, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Identify most-called queries
SELECT query, calls, rows, rows/calls AS avg_rows
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 20;
```

### 9.2 Laravel Query Logging

```php
<?php
// config/database.php

'logging' => [
    'slow_threshold' => 100, // ms
    'enabled' => env('DB_QUERY_LOG', false),
],

// app/Providers/AppServiceProvider.php

public function boot(): void
{
    DB::whenQueryingForLongerThan(100, function ($connection, $query) {
        Log::warning('Slow query detected', [
            'sql' => $query->sql,
            'bindings' => $query->bindings,
            'time' => $query->time,
            'connection' => $connection->getName(),
        ]);
    });
}
```

### 9.3 Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Query latency P99 | >200ms | >500ms | Review indexes, add cache |
| Connection pool utilization | >70% | >90% | Scale pool, add replicas |
| Replication lag | >10s | >60s | Check replica health |
| Cache hit ratio | <90% | <80% | Review cache strategy |
| Materialized view refresh | >30s | >60s | Optimize view query |
| Lock contention | >1s | >5s | Check blocking queries |

---

## 10. Performance Testing

### 10.1 Load Test Scenarios

| Scenario | Users | Actions | Target |
|----------|-------|---------|--------|
| Dashboard load | 50 concurrent | Load study dashboard | < 2s |
| Sync endpoint | 100 concurrent | Submit responses | < 3s per batch |
| Report generation | 10 concurrent | Generate PDF report | < 30s |
| Search | 20 concurrent | Full-text search | < 1s |
| Data export | 5 concurrent | Export 100K rows | < 60s |

### 10.2 Index Usage Verification

```sql
-- Check index usage stats
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'tenant_' || current_setting('app.tenant_id')
ORDER BY idx_scan ASC
LIMIT 20; -- Unused indexes
```

---

## 11. Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Primary indexing** | B-tree + partial + covering | Multi-tenant queries need composite indexes on org_id + status |
| **JSONB indexing** | GIN with jsonb_path_ops | Faster containment queries on response values |
| **Vector indexing** | IVFFlat (Phase 1) → HNSW (Phase 2) | IVFFlat faster to build; HNSW better accuracy at scale |
| **Connection pooling** | PgBouncer (transaction mode) | Laravel's short-lived connections benefit from transaction pooling |
| **Read replicas** | 2 RO + 1 Analytics | Dashboard/report queries isolated from OLTP |
| **Cache** | Redis 7+ (tagged, multi-layer) | Tagged invalidation prevents stale data with fine-grained control |
| **Materialized view refresh** | CONCURRENTLY + schedule + event trigger | Balances freshness with performance impact |
| **Bulk operations** | INSERT chunked + COPY for >10K | COPY is 5-10x faster than multi-row INSERT |
