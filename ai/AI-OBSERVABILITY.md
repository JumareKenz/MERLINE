# AI Observability & Monitoring

## 1. Overview

Comprehensive observability across all AI operations — covering models, providers, latency, cost, quality, and user satisfaction. Enables real-time monitoring, historical analysis, and proactive alerting.

---

## 2. Metrics Framework

### 2.1 Metric Categories

| Category | Key Metrics | Priority |
|----------|-------------|----------|
| **Latency** | P50/P95/P99 response time, time-to-first-token | Critical |
| **Cost** | Cost per inference, daily/weekly/monthly spend, per-tenant cost | Critical |
| **Token Usage** | Input/output/completion tokens per model, per capability | High |
| **Quality** | Quality score, satisfaction rate, edit rate, hallucination rate | Critical |
| **Reliability** | Error rate, success rate, provider failover rate | Critical |
| **Usage** | Request volume, active users, sessions per capability | High |
| **Safety** | Block rate, guardrail trigger rate, false positive rate | High |
| **Model Performance** | Per-model metrics, per-provider uptime | Medium |

### 2.2 Metric Definitions

```json
{
  "metric": "latency_p95_ms",
  "description": "95th percentile of end-to-end inference latency in milliseconds",
  "source": "AI Gateway",
  "aggregation": "p95 over 5-min window",
  "dimensions": ["model", "capability", "tenant", "provider"],
  "alert_threshold": {
    "warning": 5000,
    "critical": 10000
  }
}
```

---

## 3. Data Collection

### 3.1 Inference Event Schema

```json
{
  "inference_id": "uuid",
  "timestamp": "2026-03-20T14:30:00.000Z",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "session_id": "uuid",
  "capability": "questionnaire_design",
  "agent": "survey_design",
  "model": "gpt-4o",
  "provider": "openai",
  "model_tier": "T2",
  "latency_ms": 3420,
  "token_usage": {
    "prompt_tokens": 1250,
    "completion_tokens": 480,
    "total_tokens": 1730,
    "cached_prompt_tokens": 0
  },
  "cost_usd": 0.00865,
  "quality_score": 0.87,
  "confidence": 0.91,
  "review_level": "auto_accept",
  "user_satisfaction": "thumbs_up",
  "guardrail_actions": ["pii_redacted", "no_block"],
  "error": null,
  "retry_count": 0,
  "fallback_used": false
}
```

### 3.2 Storage

| Data | Storage | Retention | Aggregation |
|------|---------|-----------|-------------|
| Raw inference events | ClickHouse | 90 days | — |
| Aggregated metrics (hourly) | ClickHouse | 1 year | avg, p50, p95, p99, count, sum |
| Aggregated metrics (daily) | ClickHouse | 2 years | avg, p50, p95, p99, count, sum |
| Cost data | ClickHouse + billing system | 7 years | sum by tenant, capability, model |
| Guardrail events | ClickHouse | 90 days | — |
| User feedback | PostgreSQL | 2 years | — |
| Quality scores | ClickHouse | 90 days | — |

---

## 4. Dashboards

### 4.1 Executive Dashboard

- **AI Cost**: Daily/weekly/monthly spend, trend, top spenders
- **Usage**: Total requests, active users, top capabilities
- **Quality**: Overall satisfaction rate, top issues
- **Reliability**: Error rate, average latency, provider uptime

### 4.2 Operations Dashboard

- **Real-time Latency**: Current P50/P95/P99 by capability
- **Provider Health**: Error rate by provider, failover events
- **Queue Depth**: Async job queue depth and age
- **Rate Limiting**: Current rate limit utilization
- **Error Log**: Recent errors with details

### 4.3 Quality Dashboard

- **Satisfaction Trends**: Daily satisfaction rate by capability
- **Edit Rate**: % of outputs edited before acceptance
- **Hallucination Rate**: Detected hallucinations by capability
- **Review Queue**: Pending human reviews, avg review time
- **Top Failure Reasons**: Categorical breakdown of rejections

### 4.4 Cost Dashboard

- **Spend by Model**: Cost breakdown by model
- **Spend by Capability**: Cost breakdown by capability
- **Spend by Tenant**: Top spending tenants
- **Cost per Inference**: Average cost by capability
- **Budget Alerts**: Tenants approaching budget limits

---

## 5. Alerting

### 5.1 Alert Rules

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| **High latency** | P95 > 10s for 5 min | Critical | Page on-call engineer |
| **Error rate spike** | Error rate > 5% for 5 min | Critical | Page on-call, auto-fallback |
| **Provider down** | 100% errors from provider for 2 min | Critical | Auto-failover, page on-call |
| **Cost anomaly** | Daily cost > 2× average | Warning | Notify team, investigate |
| **Quality drop** | Satisfaction < 70% for 1 hour | Warning | Notify AI team |
| **Guardrail rate high** | Block rate > 10% for 1 hour | Warning | Investigate guardrail tuning |
| **Budget near limit** | 80% of monthly budget used | Warning | Notify tenant admin |
| **Queue backup** | Queue depth > 1000 for 5 min | Warning | Scale workers |

### 5.2 Alert Channels

| Channel | Critical | Warning | Info |
|---------|----------|---------|------|
| PagerDuty / Opsgenie | Yes | No | No |
| Slack (#ai-alerts) | Yes | Yes | Yes |
| Email | Yes | Yes | No |
| Dashboard notification | Yes | Yes | Yes |

---

## 6. Tracing

### 6.1 Distributed Tracing

Every AI request is traceable end-to-end:

```
User → API Gateway → AI Gateway → Model Router → Provider API → Response

Trace: inference_id = "inf_abc123"
  ├── [100ms] Input Guardrails
  ├── [50ms]  Model Routing
  ├── [200ms] RAG Retrieval
  ├── [2500ms] LLM Inference
  ├── [100ms] Output Guardrails
  ├── [150ms] Quality Evaluation
  └── [50ms]  Response Formatting
```

### 6.2 Trace Context Propagation

- Trace ID = inference_id (UUID)
- Propagated via HTTP headers (W3C Trace Context)
- All services log trace ID with their spans
- Sampling: 100% of requests traced (high-value, moderate volume)

---

## 7. Logging

### 7.1 Structured Logging

```json
{
  "timestamp": "2026-03-20T14:30:00.000Z",
  "level": "info",
  "service": "ai-gateway",
  "trace_id": "inf_abc123",
  "span_id": "span_xyz",
  "message": "Inference completed",
  "data": {
    "model": "gpt-4o",
    "latency_ms": 3420,
    "success": true
  }
}
```

### 7.2 Log Levels

| Level | Use Case |
|-------|----------|
| ERROR | Failed inference, provider error, guardrail block |
| WARN | High latency, retry, fallback used, budget warning |
| INFO | Normal inference, successful operations |
| DEBUG | Prompt content, full request/response (controlled, on-demand) |

---

## 8. Cost Tracking

### 8.1 Real-time Cost Calculation

```
cost = (prompt_tokens × prompt_rate) + (completion_tokens × completion_rate)
```

Rate table maintained per model, updated monthly.

### 8.2 Cost Attribution

| Dimension | Purpose |
|-----------|---------|
| Tenant | Billing, budget enforcement |
| Capability | ROI analysis, optimization |
| Model | Provider selection decisions |
| User | Usage patterns, abusers |
| Study/Project | Project-specific cost tracking |

### 8.3 Budget Enforcement

| Mechanism | Action at 80% | Action at 100% |
|-----------|---------------|----------------|
| Per-tenant monthly budget | Warning notification | Auto-downgrade to T1-only |
| Per-capability daily budget | Warning notification | Block capability for day |
| Platform-wide monthly budget | Review, optimization | Manual intervention |
