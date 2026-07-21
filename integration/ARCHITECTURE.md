# Merline Integration Architecture

## Document Control

| Version | Date | Author | Status |
|---------|------|--------|--------|
| 1.0 | 2026-07-18 | Enterprise Integration & Ecosystem Architect | Final |

---

## 1. Integration Architecture Overview

Merline's integration architecture is organized into three concentric layers: the **API Platform**, the **Integration Engine**, and the **Ecosystem Layer**. Every external interaction flows through a single API Gateway that enforces authentication, rate limiting, versioning, and observability.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ECOSYSTEM LAYER                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │Public API│ │Partner   │ │Plugin    │ │Market-   │ │Developer │ │
│  │Consumers │ │Connectors│ │Registry  │ │place     │ │Portal    │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────────────┐
│                       INTEGRATION ENGINE                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │Connector │ │Webhook   │ │Event     │ │Data      │ │Mapping   │ │
│  │Framework │ │Engine    │ │Stream    │ │Transform │ │Engine    │ │
│  │          │ │          │ │(Pub/Sub) │ │Pipeline  │ │(Schema)  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────────────┐
│                         API PLATFORM                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │REST API  │ │GraphQL   │ │gRPC      │ │WebSocket │ │Async/    │ │
│  │(Primary) │ │(Strategic)│ │(Internal)│ │(Real-time)│ │Batch APIs │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              API GATEWAY (Laravel)                            │  │
│  │  Auth │ Rate Limit │ Version │ Route │ Cache │ Observability │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. API Platform Design

### 2.1 Three-Tier API Surface

| Tier | Audience | Base Path | Auth | SLA | Rate Limit |
|------|----------|-----------|------|-----|------------|
| **Public API** | External developers, third-party apps | `/api/v1/` | API Key, OAuth2 | 99.9% | 30 req/min |
| **Partner API** | Certified integration partners | `/api/v1/partner/` | OAuth2 + mTLS | 99.95% | 120 req/min |
| **Internal API** | Frontend, mobile, first-party services | `/api/v1/internal/` | JWT (Sanctum) | 99.99% | 120 req/min |

### 2.2 API Categories

```
Public API Endpoints:
├── Data Export & Import
│   ├── GET  /exports/{id}/download
│   ├── POST /imports (CSV, Excel, JSON, XML)
│   └── GET  /studies/{id}/data
├── Metadata & Discovery
│   ├── GET  /studies
│   ├── GET  /indicators
│   └── GET  /questionnaires/{id}
├── Webhook Management
│   ├── POST /webhooks
│   ├── GET  /webhooks/{id}
│   ├── PUT  /webhooks/{id}
│   ├── DELETE /webhooks/{id}
│   └── GET  /webhooks/{id}/deliveries
├── Authentication (OAuth2)
│   ├── POST /oauth/authorize
│   ├── POST /oauth/token
│   └── POST /oauth/refresh
└── Status & Health
    ├── GET  /health
    └── GET  /version

Partner API Endpoints (certified connectors):
├── Sync Operations
│   ├── POST /partner/sync/push
│   ├── GET  /partner/sync/pull
│   └── POST /partner/sync/status
├── Connector Management
│   ├── POST /partner/connectors/{type}/auth
│   ├── POST /partner/connectors/{type}/sync
│   └── GET  /partner/connectors/{type}/status
└── Bulk Operations
    ├── POST /partner/bulk/submissions
    └── POST /partner/bulk/indicators

Internal API Endpoints (reserved):
├── All core CRUD endpoints (117 MVP endpoints)
├── Sync (mobile push/pull)
├── Media upload (chunked)
└── Admin operations
```

### 2.3 Authentication by API Tier

| Tier | Method | Implementation |
|------|--------|----------------|
| **Public** | API Key | `X-API-Key` header. Key hashed with bcrypt. Prefix `mer_pub_`. |
| **Public** | OAuth2 (Authorization Code + PKCE) | For user-context operations. Standard OAuth 2.1 with PKCE. |
| **Partner** | OAuth2 (Client Credentials) | Machine-to-machine. Client ID + Client Secret. |
| **Partner** | mTLS | Optional for high-security partners. Certificate-based. |
| **Internal** | JWT (Laravel Sanctum) | Short-lived (15 min) + refresh token rotation. |

---

## 3. Webhook Architecture

### 3.1 Webhook Delivery Model

```
┌──────────┐     Event Published     ┌─────────────┐    HTTP POST    ┌──────────┐
│  Merline  │ ──────────────────────▶│ Webhook      │ ──────────────▶│ Consumer │
│  Platform │                        │ Engine       │                │ System   │
│           │                        │              │◀─── 2xx/4xx ──│          │
│           │                        │ ┌──────────┐ │                └──────────┘
│           │                        │ │ Queue     │ │                     │
│           │                        │ │ (Redis)   │ │                ┌──────────┐
│           │                        │ └──────────┘ │                │ Dead     │
│           │                        │              │                │ Letter Q │
└──────────┘                        └──────────────┘                └──────────┘
```

### 3.2 Webhook Event Catalogue

| Event | Trigger | Payload | Retry Policy |
|-------|---------|---------|--------------|
| `study.created` | New study created | Study object | 5 retries, exponential backoff |
| `study.status_changed` | Study lifecycle transition | Study ID, old/new status | 5 retries |
| `submission.created` | New data submission | Submission summary | 5 retries |
| `submission.approved` | Submission approved after QA | Submission ID | 5 retries |
| `submission.flagged` | Quality flag raised | Submission ID, flag reason | 5 retries |
| `indicator.value_updated` | Indicator value changed | Indicator ID, new value | 5 retries |
| `report.generated` | Report generation complete | Report ID, download URL | 3 retries |
| `sync.completed` | Device sync completed | Device ID, count | 3 retries |
| `integration.failed` | Connector sync failure | Connector ID, error | Immediate alert, no retry |
| `ai.insight_generated` | AI insight/recommendation | Insight ID, score | 3 retries |

### 3.3 Webhook Delivery Guarantees

| Property | Guarantee | Implementation |
|----------|-----------|----------------|
| **Delivery** | At-least-once | Persistent queue (Redis) with confirmation |
| **Ordering** | Best-effort per event type | Timestamp ordering; parallel delivery across types |
| **Idempotency** | Required from consumer | `X-Webhook-Id` header must be used for dedup |
| **Timeout** | 10 seconds | Consumer must respond within 10s or retry |
| **Retry** | Exponential backoff | 1min → 5min → 15min → 30min → 60min |
| **Dead letter** | After 5 failures | Stored in `webhook_failures` table; admin alert |
| **Signature** | HMAC-SHA256 | `X-Webhook-Signature` header with shared secret |

### 3.4 Webhook Management API

```
POST   /api/v1/webhooks                     Create webhook subscription
GET    /api/v1/webhooks                      List subscriptions
GET    /api/v1/webhooks/{id}                 Get subscription details
PUT    /api/v1/webhooks/{id}                 Update subscription
DELETE /api/v1/webhooks/{id}                 Delete subscription
GET    /api/v1/webhooks/{id}/deliveries      List delivery attempts
POST   /api/v1/webhooks/{id}/rotate-secret   Rotate signing secret
```

**Webhook subscription request:**
```json
{
  "url": "https://consumer.example.com/merline-webhooks",
  "events": ["submission.created", "submission.approved"],
  "secret": "whsec_...",
  "filter": {
    "study_id": "uuid",
    "organization_id": "uuid"
  },
  "retry_config": {
    "max_retries": 5,
    "backoff_minutes": [1, 5, 15, 30, 60]
  },
  "headers": {
    "Authorization": "Bearer custom-token"
  }
}
```

### 3.5 Webhook Monitoring

| Metric | Description | Alert |
|--------|-------------|-------|
| `webhook.delivery.count` | Total deliveries per webhook | — |
| `webhook.delivery.success` | Successful deliveries (2xx) | — |
| `webhook.delivery.failed` | Failed deliveries (4xx, 5xx) | > 10% failure rate |
| `webhook.delivery.latency` | Round-trip delivery time | > 5s p95 |
| `webhook.dead_letter.count` | Items in dead letter queue | > 0 |
| `webhook.retry.count` | Active retries | > 50 |

---

## 4. Connector Framework

### 4.1 Connector Architecture

Every connector follows a unified pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    Connector Base Class                       │
├─────────────────────────────────────────────────────────────┤
│  authenticate() : Token                                     │
│  fetch(resource, params) : Response                         │
│  push(resource, payload) : Result                           │
│  mapDirection(source, target) : MappedData                  │
│  validate(schema, data) : ValidationResult                  │
│  handleError(exception) : ErrorResult                       │
│  getStatus() : ConnectorStatus                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Connector Lifecycle

```
Registered → Configured → Authenticated → Active → Syncing → Error
    │                                                        │
    └───────── Disabled ← Failed ← Retry ←──────────────────┘
```

| State | Description |
|-------|-------------|
| **Registered** | Connector type installed, not yet configured |
| **Configured** | Connection parameters set (URL, credentials, options) |
| **Authenticated** | Credentials verified against external system |
| **Active** | Ready for data sync |
| **Syncing** | Data transfer in progress |
| **Error** | Sync failed; awaiting retry or manual intervention |
| **Disabled** | Connector paused by admin |
| **Failed** | Permanent failure; requires reconfiguration |

### 4.3 Connector Configuration Schema

```json
{
  "connector_type": "dhis2",
  "name": "MOH Kenya DHIS2 Instance",
  "config": {
    "base_url": "https://dhis2.health.go.ke",
    "api_version": "2.41",
    "auth_method": "basic",
    "credentials": {
      "username_ref": "vault://connectors/dhis2/username",
      "password_ref": "vault://connectors/dhis2/password"
    }
  },
  "sync_config": {
    "direction": "bidirectional",
    "frequency": "scheduled",
    "cron": "0 2 * * *",
    "resources": ["organisationUnits", "dataElements", "dataValues"],
    "conflict_resolution": "server_wins"
  },
  "mapping_rules": [
    {
      "source": "merline.indicator.vaccination_rate",
      "target": "dhis2.dataElement.abc123",
      "transform": "direct",
      "filters": { "period": "MONTHLY" }
    }
  ]
}
```

### 4.4 Connector Retry and Error Handling

| Error Type | Action | Retry |
|------------|--------|-------|
| Network timeout | Retry with backoff | 3 attempts |
| Authentication failure | Notify admin, disable connector | No retry |
| Rate limited (429) | Wait Retry-After, retry | Up to 5 attempts |
| Schema mismatch | Log error, flag for admin review | No retry |
| Data validation failure | Rollback transaction, log details | No retry |
| Server error (5xx) | Retry with exponential backoff | 3 attempts |

### 4.5 Connector Package Structure

```
connectors/
├── dhis2/
│   ├── manifest.json           # Connector metadata
│   ├── Dhis2Connector.php       # Main connector class
│   ├── Dhis2Auth.php            # Authentication handler
│   ├── Mappers/
│   │   ├── OrganisationUnitMapper.php
│   │   ├── DataElementMapper.php
│   │   └── DataValueMapper.php
│   ├── Validators/
│   │   └── Dhis2ResponseValidator.php
│   └── Tests/
│       ├── Dhis2ConnectorTest.php
│       └── Dhis2MapperTest.php
├── koboToolbox/
├── redcap/
├── commcare/
├── powerbi/
├── arcgis/
└── slack/
```

---

## 5. Plugin Architecture

### 5.1 Extension Points

| Extension Point | Hook | Description |
|-----------------|------|-------------|
| **Dashboard Widget** | `registerDashboardWidgets()` | Custom visualization widgets |
| **Report Section** | `registerReportSections()` | Custom report content generators |
| **Export Format** | `registerExportFormats()` | Custom data export formats |
| **Import Handler** | `registerImportHandlers()` | Custom data import formats |
| **Validation Rule** | `registerValidationRules()` | Custom field validation logic |
| **Notification Channel** | `registerNotificationChannels()` | Custom notification delivery |
| **AI Model Provider** | `registerAiModels()` | Custom AI model integration |
| **Data Transformation** | `registerTransformations()` | Custom data mapping functions |
| **Webhook Action** | `registerWebhookActions()` | Custom webhook-triggered actions |
| **Authentication Method** | `registerAuthMethods()` | Custom auth providers |

*(Detailed plugin architecture in `PLUGIN-ARCHITECTURE.md`)*

---

## 6. Event Streaming Architecture

### 6.1 Event Bus Topology

```
┌──────────┐   Domain Events   ┌──────────────┐   Stream   ┌──────────┐
│  Laravel  │ ────────────────▶│  Event Bus    │ ─────────▶│ Consumer │
│  Services │                  │  (Redis Pub)  │           │ Services │
│           │                  │               │           │          │
│  Study    │                  │  ┌──────────┐ │           │ Analytics│
│  Service  │◀────────────────┤ │ PostgreSQL│ │◀──────────│ Service  │
│           │   Event Store     │ │ (Audit)   │ │           │          │
│  Data     │                  │ └──────────┘ │           │ AI       │
│  Collec   │                  │               │           │ Service  │
│           │                  │  ┌──────────┐ │           │          │
│  FieldOps │                  │ │ Dead Letter│ │           │ Notifica│
│           │                  │ │ Queue     │ │           │ Service  │
└──────────┘                  └──────────────┘           └──────────┘
```

### 6.2 Event Schema (CloudEvents)

All events conform to the [CloudEvents](https://cloudevents.io/) 1.0 specification:

```json
{
  "specversion": "1.0",
  "type": "com.merline.study.created",
  "source": "/organizations/org-uuid",
  "id": "event-uuid-v7",
  "time": "2026-07-18T14:30:00Z",
  "datacontenttype": "application/json",
  "subject": "study/study-uuid",
  "data": {
    "study_id": "uuid",
    "project_id": "uuid",
    "title": "Kenya Health Impact Evaluation",
    "status": "concept",
    "changed_by": "user-uuid"
  }
}
```

*(Complete event catalogue in `EVENT-CATALOGUE.md`)*

---

## 7. Developer Portal Design

### 7.1 Portal Structure

```
developer.merline.app/
├── Getting Started
│   ├── Quickstart (5 minutes)
│   ├── Authentication Setup
│   └── Your First API Call
├── Documentation
│   ├── API Reference (OpenAPI)
│   ├── Webhooks Guide
│   ├── SDKs & Libraries
│   └── Connector Guide
├── Guides & Tutorials
│   ├── Building a Dashboard Integration
│   ├── Syncing DHIS2 Data
│   ├── Creating Custom Reports
│   └── Webhook Best Practices
├── Dashboard
│   ├── API Key Management
│   ├── Usage Analytics
│   ├── Webhook Delivery Logs
│   └── Rate Limit Status
├── Playground
│   ├── Interactive API Console
│   ├── Sandbox Environment
│   └── Mock Data Generator
├── Community
│   ├── Forum
│   ├── Discord
│   ├── GitHub Discussions
│   └── Stack Overflow
└── Changelog
    ├── API Changelog
    ├── SDK Releases
    └── Deprecation Notices
```

*(Detailed developer portal structure in `DEVELOPER-EXPERIENCE.md`)*

---

## 8. API Gateway and Management

### 8.1 Gateway Responsibilities

| Function | Implementation | Detail |
|----------|---------------|--------|
| **Authentication** | Laravel middleware | Validates JWT, API keys, OAuth2 tokens |
| **Rate Limiting** | Redis-based token bucket | Per-tier, per-tenant, per-key limits |
| **Request Validation** | Laravel FormRequest | Schema validation before service call |
| **Routing** | Laravel route groups | Version-based routing to service endpoints |
| **Caching** | Redis response cache | ETags, conditional GET, TTL-based |
| **Logging** | Structured JSON logs | Request ID, duration, auth context |
| **CORS** | Configurable whitelist | Per-tenant allowed origins |
| **API Versioning** | URL path prefix | `/api/v1/`, `/api/v2/` with deprecation headers |

### 8.2 Gateway Request Flow

```
Client                     API Gateway                    Service
  │                            │                            │
  │  1. HTTP Request           │                            │
  │──────────────────────────▶│                            │
  │                            │  2. Rate Limit Check       │
  │                            │  3. Auth Validate          │
  │                            │  4. Tenant Resolution       │
  │                            │  5. Route Resolution        │
  │                            │  6. Request Validation      │
  │                            │───────────────────────────▶│
  │                            │  7. Service Response       │
  │                            │◀───────────────────────────│
  │                            │  8. Response Transform      │
  │                            │  9. Audit Log              │
  │◀───────────────────────────│                            │
  │ 10. HTTP Response          │                            │
```

---

## 9. Rate Limiting and Throttling

### 9.1 Rate Limit Tiers

| Tier | Rate | Burst | Window | Applies To |
|------|------|-------|--------|------------|
| **Free** | 10 req/min | 20 | 1 min | Unauthenticated |
| **Starter** | 30 req/min | 50 | 1 min | API Key (free tier) |
| **Professional** | 120 req/min | 200 | 1 min | API Key (paid) |
| **Enterprise** | 600 req/min | 1000 | 1 min | API Key + custom SLA |
| **Partner** | 1200 req/min | 2000 | 1 min | Certified partners |
| **Internal** | Unlimited | — | — | First-party services |
| **Sync** | 60 req/min | 100 | 1 min | Mobile sync endpoints |
| **Webhook** | 1000 deliveries/min | 2000 | 1 min | Outbound webhooks |

### 9.2 Rate Limit Response Headers

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1721312400
Retry-After: 45   (only on 429)
X-RateLimit-Key: api_key_prefix
```

### 9.3 Throttling Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| **Token bucket** | Fixed rate with burst capacity | General API usage |
| **Sliding window** | Rolling time window per key | Webhook deliveries |
| **Concurrent limit** | Max concurrent requests per key | Long-running exports |
| **Quota-based** | Daily/monthly usage allowance | Tiered plans |
| **Tenant isolation** | Per-tenant limits on shared resources | Multi-tenant fairness |

---

## 10. API Versioning and Deprecation Policy

### 10.1 Versioning Strategy

| Aspect | Decision |
|--------|----------|
| **Scheme** | URL path (`/api/v1/`, `/api/v2/`) |
| **Granularity** | Whole-API version (not per-endpoint) |
| **Current version** | `v1` |
| **Max concurrent versions** | 2 (current + previous) |
| **Backward compatibility** | Within same version: additive only (new fields, new endpoints) |
| **Breaking changes** | New version required |

### 10.2 Deprecation Timeline

```
Month 0:  New API version v2 released
Month 0:  v1 receives Deprecation header
Month 0:  v1 documentation updated with migration guide
Month 6:  v1 receives Sunset header
Month 6:  Last opportunity to migrate
Month 9:  v1 traffic drops to < 5% of total
Month 12: v1 decommissioned (HTTP 410 Gone)
```

### 10.3 Deprecation Headers

```
# v1 endpoint response (from Month 0)
Deprecation: true; date="Tue, 18 Jul 2027 23:59:59 GMT"
Sunset: Sat, 18 Jul 2028 23:59:59 GMT
Link: </api/v2/studies>; rel="successor-version"

# v2 endpoint response
Merline-Api-Version: 2.0
```

### 10.4 Version Lifecycle

| Phase | Description | Duration |
|-------|-------------|----------|
| **Preview** | Available for testing, no SLA | 3 months |
| **General Availability (GA)** | Full support, SLA applies | Indefinite |
| **Deprecated** | No new features, security fixes only | 6 months |
| **Sunset** | Scheduled removal, active migration alerts | 3 months |
| **Retired** | Returns 410 Gone | After sunset |

---

## 11. Integration Security

### 11.1 Security Controls by Layer

| Layer | Control | Implementation |
|-------|---------|----------------|
| **Transport** | TLS 1.3 | Required for all external API traffic |
| **Auth** | OAuth 2.1 + API Keys | Short-lived tokens, hashed keys |
| **Request signing** | HMAC-SHA256 | Webhook payload signatures |
| **IP allowlisting** | Configurable per connector | Enterprise tier |
| **Secret management** | HashiCorp Vault / AWS Secrets Manager | Connector credentials never in code |
| **Audit** | Full request/response logging | All integration events captured |
| **Schema validation** | JSON Schema per endpoint | Prevents malformed data injection |

### 11.2 Connector Security Requirements

- No connector stores credentials — uses vault references
- All external HTTP requests subject to egress network policies
- Connector responses validated against expected schema before processing
- Rate limit per connector prevents runaway sync loops
- Connector failures never cascade to core platform services

---

## 12. Integration Observability

### 12.1 Key Metrics

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| `integration.connector.health` | Connector status check | Any connector unhealthy > 5 min |
| `integration.webhook.delivery_latency` | Webhook engine | p95 > 5s |
| `integration.webhook.failure_rate` | Webhook engine | > 5% per webhook |
| `integration.sync.duration` | Sync engine | > 30 min per sync |
| `integration.sync.conflict_rate` | Sync engine | > 10% of submissions |
| `integration.api.latency_p95` | API Gateway | > 2s public, > 500ms internal |
| `integration.api.error_rate` | API Gateway | > 1% 5xx, > 5% 4xx |
| `integration.event.backlog` | Event bus | > 10,000 pending |

### 12.2 Dashboards

| Dashboard | Audience | Content |
|-----------|----------|---------|
| **Integration Health** | Platform team | All connector statuses, webhook delivery rates, sync queues |
| **API Performance** | Platform team | Latency percentiles, error rates, rate limit hits |
| **Partner Health** | Partner support | Per-partner usage, errors, webhook delivery |
| **Event Pipeline** | Platform team | Event throughput, backlog, dead letter queue |

---

## Document Ownership

| Section | Owner |
|---------|-------|
| API Platform | Enterprise Integration Architect |
| Webhook Architecture | Enterprise Integration Architect |
| Connector Framework | Backend Engineering Lead |
| Plugin Architecture | Enterprise Integration Architect |
| Event Streaming | Enterprise Integration Architect + AI Systems Architect |
| Developer Portal | Enterprise Integration Architect |
| API Gateway | Backend Engineering Lead + DevOps Lead |
| Rate Limiting | Enterprise Integration Architect |
| API Versioning | Enterprise Integration Architect |
| Integration Security | Security Architect |
| Integration Observability | Enterprise Integration Architect + DevOps Lead |

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-18 | Enterprise Integration & Ecosystem Architect | Initial integration architecture |
