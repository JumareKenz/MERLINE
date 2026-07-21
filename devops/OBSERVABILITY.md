# Merline Observability Architecture

## 1. Observability Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MERLINE OBSERVABILITY                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │Prometheus │  │  Loki    │  │  Tempo   │  │  Grafana          │   │
│  │(Metrics)  │  │(Logs)    │  │(Traces)  │  │(Dashboards)       │   │
│  └─────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│        │              │              │                 │             │
│        ▼              ▼              ▼                 ▼             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Alert-   │  │  LogQL   │  │ TraceQL  │  │  On-Call         │   │
│  │ manager  │  │  Queries │  │  Queries │  │  (PagerDuty)     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  OpenTelemetry Collector (Agent Mode, DaemonSet)              │   │
│  │  Receives: OTLP (traces, metrics, logs)                      │   │
│  │  Exports: Prometheus (metrics), Loki (logs), Tempo (traces)  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Synthetic Monitoring (Checkly / Grafana Synthetics)         │   │
│  │  • API endpoint checks (every 1m)                           │   │
│  │  • Browser check (every 5m)                                 │   │
│  │  • SSL certificate expiry                                   │   │
│  │  • Multi-region checks                                      │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Sizing (Production)

| Component | Nodes | Storage | Retention | Cost/Month (est.) |
|-----------|-------|---------|-----------|-------------------|
| Prometheus (kube-prometheus-stack) | 2 pods + 2G PVC | 50GB (PV) | 15 days | ~$20 |
| Loki (`simple-scalable`) | 3 read + 3 write + 50G PV | 500GB (S3) | 30 days | ~$80 |
| Tempo | 2 pods + 50G PV (S3 backend) | 500GB (S3) | 14 days | ~$60 |
| Grafana | 2 pods + 10G PV | 10GB | — | ~$20 |
| OpenTelemetry Collector | DaemonSet (1 per node) | — | — | ~$10 |
| **Total** | | | | **~$190/mo** |

---

## 2. Metrics Collection (RED Method)

### RED Metrics Per Service

| Service | Rate | Errors | Duration |
|---------|------|--------|----------|
| **API Gateway** | Requests/s per endpoint | HTTP 5xx rate, HTTP 4xx rate | Latency p50/p95/p99 |
| **Study Service** | Requests/s per operation | Error rate by operation | Query latency, write latency |
| **Data Collection** | Submissions/s, sync requests/s | Validation errors, sync failures | Sync duration, validation time |
| **Field Ops** | Assignments created/s, sync ops/s | Sync conflicts, assignment errors | Sync processing time |
| **Analytics** | Dashboard loads/min, exports/min | Computation errors | Query latency, export time |
| **Reporting** | Report generations/min | Generation failures | Generation time |
| **AI Gateway** | Requests/s per model | Model errors, fallback activations | Inference latency, token generation time |
| **RAG Service** | Embedding requests/min | Embedding failures, search errors | Embedding time, search latency |
| **Identity Service** | Auth requests/s | Auth failures, rate limit hits | Auth latency |
| **Queue Workers** | Jobs processed/s, queue depth | Job failures, retry rate | Job processing time |
| **Frontend** | Page views/s, API calls/s | Client errors | Page load time, API latency |
| **Database** | Queries/s, connections, replication lag | Deadlocks, connection timeouts | Query latency p50/p95/p99 |
| **Redis** | Operations/s, cache hit ratio, memory usage | Eviction rate, failover events | Command latency |
| **Infrastructure** | CPU/memory/disk per node | Node failures, OOM kills | Pod startup time |

### Custom Business Metrics

```
merline_studies_active{tenant="abc123"}
merline_submissions_total{tenant="abc123", status="submitted"}
merline_sync_duration_seconds{tenant="abc123", device_id="...", status="success"}
merline_ai_cost_total{tenant="abc123", model="gpt-4o"}
merline_ai_tokens_total{tenant="abc123", model="gpt-4o", direction="input|output"}
merline_ai_cache_hit_total{tenant="abc123", model="gpt-4o"}
merline_queue_depth{queue="reports", priority="high"}
merline_tenant_resource_usage{tenant="abc123", resource="connections"}
merline_sync_conflict_total{tenant="abc123", resolution="lww|manual"}
```

### Prometheus ServiceMonitor Example

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: merline-api
spec:
  selector:
    matchLabels:
      app: merline-api
  endpoints:
    - port: http
      path: /metrics
      interval: 15s
      scrapeTimeout: 10s
  namespaceSelector:
    matchNames:
      - production
```

### Laravel Metrics Exporter

```php
<?php
// routes/web.php (health/metrics endpoint)
use Prometheus\CollectorRegistry;
use Prometheus\RenderTextFormat;

Route::get('/metrics', function (CollectorRegistry $registry) {
    // HTTP request counter
    $counter = $registry->getOrRegisterCounter(
        'merline',
        'http_requests_total',
        'Total HTTP requests',
        ['method', 'endpoint', 'status']
    );
    $counter->incBy(1, ['GET', '/api/studies', '200']);

    // Request duration histogram
    $histogram = $registry->getOrRegisterHistogram(
        'merline',
        'http_request_duration_seconds',
        'HTTP request duration in seconds',
        ['method', 'endpoint'],
        [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
    );
    $histogram->observe(0.125, ['GET', '/api/studies']);

    $renderer = new RenderTextFormat();
    return response($renderer->render($registry->getMetricFamilySamples()))
        ->header('Content-Type', RenderTextFormat::MIME_TYPE);
});
```

---

## 3. Structured Logging Standards

### Log Format (JSON)

```json
{
  "@timestamp": "2026-07-18T12:00:00.000Z",
  "level": "info",
  "message": "Study created successfully",
  "service": "study-service",
  "environment": "production",
  "tenant_id": "tenant_abc123",
  "trace_id": "abc123def456",
  "span_id": "ghi789",
  "user_id": "user_xyz",
  "request_id": "req_001",
  "duration_ms": 245,
  "http": {
    "method": "POST",
    "path": "/api/v1/studies",
    "status": 201,
    "user_agent": "Mozilla/5.0..."
  },
  "error": {
    "exception": "ValidationException",
    "message": "Study code already exists",
    "stack_trace": "..."
  }
}
```

### Laravel Logging Configuration

```php
<?php
// config/logging.php

return [
    'default' => env('LOG_CHANNEL', 'stack'),

    'channels' => [
        'stack' => [
            'driver' => 'stack',
            'channels' => ['json'],
        ],

        'json' => [
            'driver' => 'monolog',
            'handler' => StreamHandler::class,
            'handler_with' => [
                'stream' => 'php://stdout',
            ],
            'formatter' => MonologJsonFormatter::class,
            'formatter_with' => [
                'format' => 'json',
                'include_stacktraces' => true,
            ],
            'processors' => [
                WebProcessor::class,
                IntrospectionProcessor::class,
            ],
        ],
    ],
];
```

### Log Levels

| Level | Usage | Examples |
|-------|-------|----------|
| `debug` | Development only | SQL queries, variable dumps |
| `info` | Normal operations | Study created, user logged in, sync completed |
| `notice` | Notable events | Slow query detected, cache miss rate high |
| `warning` | Potential issues | Rate limit approaching, retry attempts, high latency |
| `error` | Recoverable errors | Payment failed, email send failed, sync conflict |
| `critical` | System degradation | Database connection failure, queue backup |
| `alert` | Immediate action | Service down, disk full, certificate expiring |
| `emergency` | System unusable | Catastrophic failure, data corruption detected |

---

## 4. Distributed Tracing

### OpenTelemetry Configuration

```yaml
# OpenTelemetry Collector Configuration
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  memory_limiter:
    ballast_size_mib: 512
    limit_mib: 2048
    spike_limit_mib: 256
    check_interval: 5s
  attributes:
    actions:
      - key: environment
        value: production
        action: upsert
      - key: cluster
        value: merline-prod
        action: upsert

exporters:
  prometheus:
    endpoint: 0.0.0.0:8889
  loki:
    endpoint: http://loki:3100/loki/api/v1/push
  otlp:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch, attributes]
      exporters: [loki]
```

### Laravel OpenTelemetry Setup

```php
<?php
// app/Providers/ObservabilityServiceProvider.php

class ObservabilityServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(TracerProvider::class, function () {
            $resource = ResourceInfoFactory::defaultResource()
                ->merge(ResourceInfo::create(Attributes::create([
                    'service.name' => config('app.name'),
                    'service.version' => config('app.version'),
                    'deployment.environment' => config('app.env'),
                ])));

            $exporter = new OTLPExporter(
                endpoint: config('otel.endpoint', 'http://otel-collector:4318'),
            );

            $spanProcessor = new BatchSpanProcessor($exporter);

            return TracerProvider::builder()
                ->addSpanProcessor($spanProcessor)
                ->setResource($resource)
                ->build();
        });

        $this->app->singleton(TracerInterface::class, function ($app) {
            return $app->make(TracerProvider::class)
                ->getTracer(config('app.name'));
        });
    }

    public function boot(): void
    {
        // Auto-instrument HTTP requests
        $this->app->make(OpenTelemetryMiddleware::class);

        // Auto-instrument database queries
        DB::listen(function ($query) {
            $span = $this->app->make(TracerInterface::class)
                ->spanBuilder('db.query')
                ->setAttribute('db.system', 'postgresql')
                ->setAttribute('db.statement', $query->sql)
                ->setAttribute('db.parameters', json_encode($query->bindings))
                ->setAttribute('db.duration_ms', $query->time)
                ->startSpan();
            $span->end();
        });

        // Auto-instrument queue jobs
        $this->app['events']->listen(JobProcessing::class, function ($event) {
            // Create trace span for job
        });
    }
}
```

### Trace Sampling Strategy

| Service | Sampling Rate | Notes |
|---------|---------------|-------|
| API Gateway | 100% | Critical for error detection |
| All services (normal) | 10% | Head-based sampling |
| Errors | 100% | Always capture error traces |
| Slow requests (>1s) | 100% | Always capture slow traces |
| AI endpoints | 100% | Cost and quality tracking |
| Sync endpoints | 10% | High volume, error sampling |

---

## 5. Dashboard Design

### Dashboard Hierarchy

```
Grafana
├── Executive Dashboards
│   ├── CEO Dashboard (Platform health, business KPIs, costs)
│   └── CTO Dashboard (Reliability, performance, incidents)
│
├── Service Dashboards (per service)
│   ├── API Gateway
│   │   ├── RED metrics panel
│   │   ├── Top 10 slowest endpoints
│   │   ├── HTTP status breakdown
│   │   └── Rate limiting activity
│   ├── Study Service
│   │   ├── Request rate by operation
│   │   ├── Query performance
│   │   └── Error breakdown
│   ├── AI Gateway
│   │   ├── Requests per model
│   │   ├── Cost per model per tenant
│   │   ├── Token usage
│   │   ├── Cache hit rate
│   │   └── Latency distribution per model
│   ├── Queue Workers
│   │   ├── Queue depth per queue
│   │   ├── Processing time
│   │   ├── Job failure rate
│   │   └── Worker saturation
│   └── [All services...]
│
├── Infrastructure Dashboards
│   ├── Kubernetes Cluster
│   │   ├── Node CPU/memory/network
│   │   ├── Pod resource usage
│   │   ├── HPA scaling activity
│   │   └── Cluster autoscaler events
│   ├── PostgreSQL
│   │   ├── Query performance (pg_stat_statements)
│   │   ├── Connections, replication lag
│   │   ├── Cache hit ratio
│   │   └── Slow queries (top 20)
│   ├── Redis
│   │   ├── Memory usage, evictions, hit ratio
│   │   ├── Command latency
│   │   └── Queue depth
│   └── S3/CloudFront
│       ├── Storage usage
│       ├── Transfer rate
│       └── Error rate
│
├── Business Dashboards
│   ├── Platform-wide KPIs
│   ├── Tenant health
│   ├── Data collection progress
│   └── Sync health
│
└── Compliance Dashboards
    ├── Audit log integrity
    ├── Data retention status
    ├── Certificate expiry
    └── Security scan status
```

### CEO Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│ CEO Dashboard                        Last 24 hours │
├──────────────────┬──────────────────┬───────────────┤
│  System Health   │  Business KPIs   │  Cost         │
│                  │                  │               │
│  ┌────────────┐  │  ┌────────────┐  │  ┌─────────┐ │
│  │ Uptime     │  │  │ Active     │  │  │ Daily   │ │
│  │ 99.97%     │  │  │ Studies 42 │  │  │ Cost    │ │
│  │            │  │  │            │  │  │ $1,234  │ │
│  │ Last 30d   │  │  │ Tenants 8 │  │  │         │ │
│  └────────────┘  │  └────────────┘  │  │ Monthly │ │
│  ┌────────────┐  │  ┌────────────┐  │  │ $37,020│ │
│  │ Incidents  │  │  │ Submissions│  │  └─────────┘ │
│  │ Last 7d: 2 │  │  │ Today: 847│  │             │ │
│  │ MTTR: 12m  │  │  │ Total:    │  │             │ │
│  │            │  │  │ 124,502   │  │             │ │
│  └────────────┘  │  └────────────┘  │             │ │
├──────────────────┴──────────────────┴───────────────┤
│  Service Health Overview (RED graph per service)     │
│  ┌────┬────────┬────────┬────────┬────────────────┐ │
│  │Svc │ Rate   │ Errors │ Latency│ Sparkline      │ │
│  ├────┼────────┼────────┼────────┼────────────────┤ │
│  │API │ 120/s  │ 0.01%  │ 45ms   │ ▁▃▂▁▃▄▂▁▂▃    │ │
│  │AI  │ 15/s   │ 0.5%   │ 850ms  │ ▂▃▄▃▂▁▂▃▄▅    │ │
│  │DB  │ 450/s  │ 0%     │ 12ms   │ ▁▁▂▁▂▁▁▂▁▂    │ │
│  └────┴────────┴────────┴────────┴────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 6. Alert Rules

### Alert Severity Levels

| Level | Response Time | Notification | Color |
|-------|---------------|--------------|-------|
| **P0 (Critical)** | < 5 minutes | PagerDuty phone call + Slack | 🔴 Red |
| **P1 (High)** | < 15 minutes | PagerDuty push + Slack | 🟠 Orange |
| **P2 (Warning)** | < 1 hour | Slack notification | 🟡 Yellow |
| **P3 (Info)** | < 24 hours | Jira ticket | 🔵 Blue |

### Alert Rules (Prometheus)

```yaml
# prometheus-rules.yaml
groups:
  - name: merline-service-alerts
    interval: 30s
    rules:
      - alert: ServiceDown
        expr: up{job=~"merline-.*"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "{{ $labels.job }} has been unreachable for > 1 minute"

      - alert: HighErrorRate
        expr: |
          (
            rate(http_requests_total{job=~"merline-.*", status=~"5.."}[5m])
            /
            rate(http_requests_total{job=~"merline-.*"}[5m])
          ) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate ({{ $value | humanizePercentage }}) on {{ $labels.job }}"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{job=~"merline-.*"}[5m]))
          > 2.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 latency > 2s on {{ $labels.job }}"

  - name: merline-database-alerts
    interval: 30s
    rules:
      - alert: DatabaseConnectionsExhausted
        expr: pg_stat_activity_count{datname="merline"} > 150
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connections near limit"

      - alert: ReplicationLag
        expr: pg_replication_lag_seconds > 60
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Replication lag > 60s"

  - name: merline-queue-alerts
    interval: 30s
    rules:
      - alert: QueueBacklog
        expr: redis_queue_length > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Queue {{ $labels.queue }} backlog > 10,000"

      - alert: HighJobFailureRate
        expr: rate(horizon_job_failed_total[15m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High queue job failure rate"

  - name: merline-infrastructure-alerts
    interval: 30s
    rules:
      - alert: NodeNotReady
        expr: kube_node_status_condition{condition="Ready", status="true"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Kubernetes node {{ $labels.node }} not ready"

      - alert: DiskSpaceCritical
        expr: node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk space below 10% on {{ $labels.node }}"

      - alert: CertificateExpiring
        expr: certmanager_certificate_expiration_timestamp_seconds - time() < 86400 * 30
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Certificate for {{ $labels.name }} expires in < 30 days"

  - name: merline-ai-alerts
    interval: 30s
    rules:
      - alert: AICostSpike
        expr: |
          merline_ai_cost_total{tenant!=""}[1h]
          / scalar(merline_ai_cost_total{tenant!=""}[1h] offset 24h)
          > 2.0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "AI cost spike in last hour for tenant {{ $labels.tenant }}"

      - alert: AIHighLatency
        expr: |
          histogram_quantile(0.95, rate(merline_ai_inference_duration_seconds_bucket{model!=""}[5m]))
          > 10.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency > 10s for model {{ $labels.model }}"
```

### Notification Routing

```yaml
# alertmanager.yml
route:
  receiver: default
  group_by: ['alertname', 'cluster', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - match:
        severity: critical
      receiver: pagerduty-critical
      repeat_interval: 30m
    - match:
        severity: warning
      receiver: slack-warning
      repeat_interval: 4h
    - match:
        alertname: 'CertificateExpiring'
      receiver: email-certificates
      repeat_interval: 24h

receivers:
  - name: pagerduty-critical
    pagerduty_configs:
      - routing_key: <PD_ROUTING_KEY>
        severity: critical
        description: '{{ template "pagerduty.description" . }}'

  - name: slack-warning
    slack_configs:
      - api_url: <SLACK_WEBHOOK>
        channel: '#alerts'
        title: '{{ template "slack.title" . }}'
        text: '{{ template "slack.text" . }}'
```

---

## 7. SLO / SLI Definitions

### Service Level Objectives

| Service | SLI | SLO Target | Measurement Window |
|---------|-----|------------|-------------------|
| **API Gateway** | Availability (5xx < 1%) | 99.9% | Rolling 30 days |
| **API Gateway** | Latency (p99 < 500ms) | 99% of requests | Rolling 30 days |
| **All Services** | Availability (5xx < 1%) | 99.95% | Rolling 30 days |
| **All Services** | Latency (p95 < 1s) | 99% of requests | Rolling 30 days |
| **Sync** | Sync success rate | 99.9% | Rolling 7 days |
| **Sync** | Sync latency (p95 < 30s) | 99% of syncs | Rolling 7 days |
| **AI Gateway** | Availability (model errors < 5%) | 99% | Rolling 30 days |
| **AI Gateway** | Latency (p95 < 5s) | 95% of requests | Rolling 30 days |
| **Database** | Query latency (p99 < 100ms) | 99% of queries | Rolling 30 days |
| **Database** | Uptime | 99.99% | Rolling 30 days |
| **Platform** | End-to-end submission | 99.9% | Rolling 30 days |
| **Platform** | Dashboard load time < 3s | 95% of loads | Rolling 7 days |

### SLI Recording Rules

```yaml
groups:
  - name: merline-slos
    interval: 30s
    rules:
      # API Gateway Availability SLI
      - record: sli:api_gateway:availability_30d
        expr: |
          (
            sum(rate(http_requests_total{job="merline-api", status!~"5.."}[30d]))
            /
            sum(rate(http_requests_total{job="merline-api"}[30d]))
          )

      # Sync Success Rate SLI
      - record: sli:sync:success_rate_7d
        expr: |
          (
            sum(rate(merline_sync_total{status="success"}[7d]))
            /
            sum(rate(merline_sync_total[7d]))
          )

      # Platform Availability (composite)
      - record: sli:platform:availability_30d
        expr: |
          min(
            sli:api_gateway:availability_30d,
            sli:database:uptime_30d
          )
```

### Error Budget Policy

| SLO | Error Budget | Monthly Allowable Error | Policy |
|-----|--------------|------------------------|--------|
| 99.9% | 0.1% | 43m 12s downtime/month | Bug fixes priority, no feature deploys if budget < 50% |
| 99.95% | 0.05% | 21m 36s downtime/month | All hands on deck if budget exhausted |
| 99.99% | 0.01% | 4m 19s downtime/month | Immediate rollback if breached |

```yaml
# Error budget alert
- alert: ErrorBudgetBurned
  expr: |
    (
      1 - (
        sum(rate(http_requests_total{job="merline-api", status!~"5.."}[30d]))
        / sum(rate(http_requests_total{job="merline-api"}[30d]))
      )
    ) > 0.01 * 0.5  # 50% of error budget consumed
  labels:
    severity: warning
  annotations:
    summary: "API Gateway has consumed >50% of monthly error budget"
```

---

## 8. On-Call Rotation Design

### Rotation Schedule

```
Primary (1 week) → Secondary (1 week) → Off (2 weeks)
────────────────────────────────────────────────────
Week 1: Alice (Primary)    Bob (Secondary)
Week 2: Bob (Primary)      Charlie (Secondary)
Week 3: Charlie (Primary)  Alice (Secondary)
Week 4: Alice (Primary)    Bob (Secondary)
(repeats)
```

### On-Call Responsibilities

| Role | Responsibility | Shift |
|------|---------------|-------|
| **Primary On-Call** | Acknowledge and respond to P0/P1 alerts within 5 minutes | 24/7, week-long |
| **Secondary On-Call** | Backup if primary doesn't respond within 5 minutes. Handles P2 alerts. | 24/7, week-long |
| **Engineering Manager** | Incident commander for major incidents | 9-5, escalation |

### Escalation Policy

```
Alert Fired
    │
    ▼
Primary On-Call
    ├── Responds within 5 min → Handles incident
    └── No response in 5 min
            │
            ▼
        Secondary On-Call
            ├── Responds within 5 min → Handles incident
            └── No response in 5 min
                    │
                    ▼
                Engineering Manager
                    ├── Responds within 10 min
                    └── No response → VP Engineering
```

### Follow-the-Sun (Phase 2+)

```
Region      Primary Hours (local)   Secondary
────────────────────────────────────────────────
EMEA        08:00 - 18:00 UTC       APAC covers overnight
APAC        08:00 - 18:00 UTC+8     AMER covers overnight
AMER        08:00 - 18:00 UTC-5     EMEA covers overnight
```

### On-Call Tools

| Tool | Purpose |
|------|---------|
| PagerDuty | Incident alerting, escalation, scheduling |
| Slack | Communication, alert notifications |
| Grafana OnCall | Integrated with Prometheus alerts |
| FireHydrant | Incident response management, runbooks |
| OpsGenie | Alternative (if PagerDuty not available) |

### On-Call Runbook Access

All runbooks are accessible from:
1. **Grafana**: Alert → "Runbook" link
2. **Wiki**: `https://wiki.merline.app/runbooks/`
3. **Repository**: `docs/runbooks/` in git
4. **PagerDuty**: Alert → "View Runbook"
