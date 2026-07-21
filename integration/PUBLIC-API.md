# Merline Public API Design

## Document Control

| Version | Date | Author | Status |
|---------|------|--------|--------|
| 1.0 | 2026-07-18 | Enterprise Integration & Ecosystem Architect | Final |

---

## 1. API Surface

### 1.1 Public vs Internal Endpoint Classification

| Category | Endpoints | Public | Partner | Internal | Rationale |
|----------|-----------|--------|---------|----------|-----------|
| **Auth** | Register, Login, Logout, Refresh | ✓ | — | — | Public user registration |
| **OAuth2** | Authorize, Token, Refresh | ✓ | ✓ | — | Third-party app auth |
| **Studies (read)** | GET studies, GET study by ID | ✓ | ✓ | — | Read-only data access |
| **Indicators (read)** | GET indicators, GET indicator by ID | ✓ | ✓ | — | Metadata read |
| **Indicator Values** | GET indicator-values | ✓ | ✓ | — | Time-series data access |
| **Submissions (read)** | GET submissions (aggregated) | ✓ | ✓ | — | Aggregated data only |
| **Submissions (write)** | POST submissions | — | ✓ | ✓ | Enumerator-only |
| **Questionnaires (read)** | GET questionnaire (published) | ✓ | ✓ | — | Published form access |
| **Data Export** | POST exports, GET downloads | ✓ | ✓ | — | Export-as-a-service |
| **Data Import** | POST imports | ✓ | ✓ | — | Data onboarding |
| **Webhooks** | Manage subscriptions, view deliveries | ✓ | ✓ | — | Developer self-service |
| **Connectors** | Manage connectors, sync status | — | ✓ | — | Partner connector management |
| **Sync** | Push, Pull, Checkpoint | — | ✓ | ✓ | Mobile sync, partner sync |
| **Dashboards (read)** | GET dashboard data | ✓ | ✓ | — | Public embeddable dashboards |
| **Reports (read)** | GET report, GET download | ✓ | ✓ | — | Published reports |
| **Admin** | All CRUD operations | — | — | ✓ | Platform management |
| **Media** | Upload, download | — | ✓ | ✓ | Media management |
| **Health** | Health check, version | ✓ | — | — | Service discovery |

### 1.2 Public API Endpoint Summary

```
Authentication & Discovery:
  POST /api/v1/auth/register
  POST /api/v1/auth/login
  POST /api/v1/auth/logout
  POST /api/v1/auth/refresh
  POST /api/v1/auth/forgot-password
  POST /api/v1/auth/reset-password
  GET  /api/v1/health
  GET  /api/v1/version

OAuth 2.1:
  GET  /api/v1/oauth/authorize
  POST /api/v1/oauth/token
  POST /api/v1/oauth/refresh
  POST /api/v1/oauth/revoke

Data Access (Read-Only):
  GET  /api/v1/studies
  GET  /api/v1/studies/{id}
  GET  /api/v1/indicators
  GET  /api/v1/indicators/{id}
  GET  /api/v1/indicator-values
  GET  /api/v1/submissions (aggregated, no PII)
  GET  /api/v1/questionnaires/{id}
  GET  /api/v1/questionnaires/{id}/questions
  GET  /api/v1/projects
  GET  /api/v1/projects/{id}

Data Export:
  POST /api/v1/exports
  GET  /api/v1/exports/{id}
  GET  /api/v1/exports/{id}/download

Data Import:
  POST /api/v1/imports
  GET  /api/v1/imports/{id}
  GET  /api/v1/imports/{id}/status

Webhook Management:
  POST   /api/v1/webhooks
  GET    /api/v1/webhooks
  GET    /api/v1/webhooks/{id}
  PUT    /api/v1/webhooks/{id}
  DELETE /api/v1/webhooks/{id}
  GET    /api/v1/webhooks/{id}/deliveries
  POST   /api/v1/webhooks/{id}/rotate-secret

OData Feed (Power BI, Tableau):
  GET  /api/v1/odata/studies
  GET  /api/v1/odata/indicators
  GET  /api/v1/odata/submissions
  GET  /api/v1/odata/indicator-values

Dashboards & Reports:
  GET  /api/v1/dashboards/{id}
  GET  /api/v1/dashboards/{id}/widgets
  GET  /api/v1/reports/{id}
  GET  /api/v1/reports/{id}/export

Connector Status (Partner):
  GET  /api/v1/partner/connectors
  GET  /api/v1/partner/connectors/{type}/status
  POST /api/v1/partner/connectors/{type}/sync
```

---

## 2. Authentication for External Developers

### 2.1 Authentication Methods

| Method | Use Case | Token Type | Lifetime |
|--------|----------|------------|----------|
| **API Key** | Server-to-server, automated scripts | Opaque (prefix `mer_pub_`) | Configurable (max 1 year) |
| **OAuth 2.1 (Authorization Code + PKCE)** | User-context apps (web, mobile) | JWT access + refresh token | 15 min access / 7 day refresh |
| **OAuth 2.1 (Client Credentials)** | Service accounts, M2M | JWT access token | 1 hour |
| **Personal Access Token (PAT)** | Developer's own account access | Opaque (prefix `mer_pat_`) | Configurable (max 1 year) |

### 2.2 API Key Management

```json
// POST /api/v1/developer/keys
{
  "name": "Production Integration",
  "scopes": ["studies:read", "indicators:read", "exports:create"],
  "expires_at": "2027-07-18T00:00:00Z"
}

// Response
{
  "data": {
    "id": "api-key-uuid",
    "name": "Production Integration",
    "key_prefix": "mer_pub_",
    "key": "mer_pub_a1b2c3d4e5f6...",   // Shown once only
    "scopes": ["studies:read", "indicators:read", "exports:create"],
    "created_at": "2026-07-18T14:30:00Z",
    "expires_at": "2027-07-18T00:00:00Z"
  }
}
```

### 2.3 OAuth 2.1 Scopes

| Scope | Access | Description |
|-------|--------|-------------|
| `openid` | Read | OpenID Connect identity |
| `email` | Read | User email address |
| `profile` | Read | User profile information |
| `offline_access` | Read | Refresh token access |
| `studies:read` | Read | Read study metadata |
| `studies:write` | Write | Create/update studies |
| `indicators:read` | Read | Read indicators and values |
| `indicators:write` | Write | Create/update indicators |
| `submissions:read` | Read | Read aggregated submission data |
| `submissions:write` | Write | Create submissions |
| `exports:create` | Write | Create data exports |
| `exports:read` | Read | Download exports |
| `imports:create` | Write | Create data imports |
| `reports:read` | Read | View reports |
| `webhooks:manage` | Write | Manage webhook subscriptions |
| `dashboards:read` | Read | View dashboards |

---

## 3. SDK Design Principles

### 3.1 Principles

1. **Native feel**: SDK should feel like idiomatic code in the target language — not like translated PHP
2. **Consistent API**: All SDKs expose the same methods, same parameter names, same response shapes
3. **First-class async**: Async/await patterns in languages that support them
4. **Zero-config defaults**: Sensible defaults for timeouts, retries, pagination
5. **Type safety**: Strongly typed where the language supports it (TypeScript, Rust, Go generics)
6. **Automatic retry**: Exponential backoff for transient failures (429, 5xx)
7. **Pagination abstraction**: SDK auto-follows pagination cursors
8. **Offline-aware**: SDK detects connectivity issues and provides consistent error objects

### 3.2 SDK Method Pattern

```
// Every SDK uses the same pattern:

const client = new MerlineClient({
  apiKey: 'mer_pub_...',
  environment: 'production' // or 'sandbox'
})

// Resource methods
const studies = await client.studies.list({ status: 'active', limit: 20 })
const study = await client.studies.get('study-uuid')
const indicators = await client.indicators.list({ studyId: 'study-uuid' })
const exportJob = await client.exports.create({
  studyId: 'study-uuid',
  format: 'csv',
  filters: { status: ['approved'] }
})
const downloadUrl = await client.exports.waitForCompletion(exportJob.id)
```

### 3.3 Planned SDKs

| Language | Status | Priority | Package Name |
|----------|--------|----------|--------------|
| JavaScript / TypeScript | Planned | P1 | `@merline/sdk` |
| Python | Planned | P1 | `merline-sdk` |
| PHP | Planned | P1 | `merline/merline-sdk` |
| Dart | Planned | P2 | `merline_sdk` |
| Go | Planned | P2 | `github.com/merline/sdk-go` |
| .NET (C#) | Planned | P2 | `Merline.Sdk` |
| Java | Planned | P3 | `io.merline.sdk` |
| Ruby | Planned | P3 | `merline-sdk` |

---

## 4. API Documentation Standards

### 4.1 Documentation Requirements

Every public API endpoint must have:

1. **OpenAPI 3.0 specification**: Complete request/response schemas
2. **Example request**: cURL, SDK (JS, Python, PHP), and raw HTTP
3. **Example response**: Full JSON response with all fields
4. **Error scenarios**: What could go wrong and how to handle it
5. **Rate limits**: Specific rate limit for the endpoint
6. **Pagination**: How to paginate if applicable
7. **Changelog**: Version history for the endpoint

### 4.2 Documentation Generation

- OpenAPI spec auto-generated from Laravel API resources (using Scribe or custom annotation processor)
- Interactive documentation at `developer.merline.app/docs/api`
- OpenAPI spec downloadable at `developer.merline.app/openapi.json`
- Postman collection auto-generated and available for import

---

## 5. Rate Limiting Tiers

### 5.1 Public API Tiers

| Tier | Price | Rate Limit | Max Burst | Features |
|------|-------|------------|-----------|----------|
| **Free** | $0 | 10 req/min | 20 | Read-only, 1 API key, 1 webhook |
| **Starter** | $29/mo | 30 req/min | 50 | Read + write, 3 API keys, 3 webhooks |
| **Professional** | $99/mo | 120 req/min | 200 | Full access, 10 API keys, 10 webhooks |
| **Enterprise** | Custom | 600 req/min | 1000 | Unlimited keys, custom SLA, priority support |

### 5.2 Partner API Tiers

| Tier | Rate Limit | Burst | SLA |
|------|------------|-------|-----|
| **Certified Partner** | 1200 req/min | 2000 | 99.95% uptime SLA |
| **Strategic Partner** | 5000 req/min | 10000 | 99.99% uptime SLA, dedicated gateway |

---

## 6. Usage Tracking & Analytics

### 6.1 Tracked Metrics

| Metric | Granularity | Retention |
|--------|-------------|-----------|
| Request count | Per endpoint, per API key, per tenant | 90 days (raw), 2 years (rolled up) |
| Latency (p50, p95, p99) | Per endpoint | 90 days |
| Error rate (4xx, 5xx) | Per endpoint, per error code | 90 days |
| Rate limit hits | Per API key | 30 days |
| Data volume (request/response size) | Per request | 7 days (raw), 90 days (rolled up) |
| Active API keys | Per organization | Current state |
| Unique consumers | Per organization | Monthly |
| Webhook deliveries | Per webhook | 30 days |

### 6.2 Developer Dashboard

The developer portal displays:

- API usage graphs (requests, errors, latency over time)
- Rate limit utilization per key
- Webhook delivery success/failure rates
- Top error codes and endpoints
- Monthly billable usage summary

---

## 7. Developer Onboarding Flow

### 7.1 Self-Service Onboarding

```
1. Register at developer.merline.app
2. Verify email address
3. Create first API key (select scopes)
4. Run quickstart (5 minutes — make first API call)
5. Explore interactive API reference
6. Select and configure webhooks (optional)
7. Download SDK (optional)
8. Access sandbox environment for testing
```

### 7.2 Partner Onboarding Flow

```
1. Submit partner application (describe integration)
2. Partnership review by Merline team (1-3 business days)
3. Sign partner agreement (NDA, terms, SLA)
4. Receive partner credentials (OAuth2 client credentials)
5. Access partner documentation (connector guides, advanced features)
6. Develop and test integration in sandbox
7. Submit for certification review
8. Certification testing by Merline QA
9. Go live — published in marketplace (optional)
10. Ongoing monitoring and support
```

---

## 8. API Changelog & Migration Guides

### 8.1 Changelog Format

```markdown
## v2.3.0 (2026-09-15)

### Added
- New endpoint: `GET /api/v1/indicator-values` with time-series filtering
- New field on `GET /api/v1/studies`: `enumerator_count` and `submission_count`
- Webhook event: `indicator.value_updated`

### Changed
- `POST /api/v1/exports` now accepts `filters.disaggregate` array parameter
- Rate limit for Professional tier increased from 60 to 120 req/min

### Deprecated
- `GET /api/v1/studies/{id}/exports` — use `POST /api/v1/exports` instead
- `X-RateLimit-Count` header replaced by `X-RateLimit-Remaining`

### Fixed
- Webhook delivery timeout increased from 5s to 10s
- OData feed correctly filters by tenant

### Migration Notes
- Update SDK to v2.3.0 for new rate limit headers
- Replace `GET /studies/{id}/exports` with `POST /exports`
```

### 8.2 Migration Guide Template

```markdown
# Migrating from API v1 to v2

## Summary
v2 introduces improved pagination, richer response objects, and OData support.

## Breaking Changes
1. Pagination: Changed from offset-based (`?page=N`) to cursor-based (`?cursor=...`)
2. Response format: `data` envelope is now consistent across all endpoints
3. Date format: All dates now ISO 8601 with timezone

## What Changed
### v1 (deprecated)
```
GET /api/v1/studies?page=2&per_page=25
```
### v2 (current)
```
GET /api/v2/studies?cursor=eyJpZCI6MTB9&limit=25
```

## What You Need to Do
1. Update SDK to v2.x
2. Replace `?page=` with `?cursor=` in pagination loops
3. Update date parsing to handle ISO 8601 format
4. Test in sandbox environment before production migration

## Timeline
- v1 deprecation: 2026-09-15
- v1 sunset: 2027-03-15
- v1 removal: 2027-09-15
```

---

## 9. Response Envelope Standards

All public API responses follow the standard envelope defined in ADR-003:

```json
{
  "data": { /* or [...] */ },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-07-18T14:30:00Z",
    "version": "2.0"
  }
}
```

With additional fields for pagination and error handling as defined in the core API specification.

---

## 10. Public API Governance

| Principle | Enforcement |
|-----------|-------------|
| **Backward compatibility** | Code review gate — no breaking changes in minor versions |
| **Documentation** | CI fails if OpenAPI spec is out of sync with code |
| **Rate limits** | Enforced at gateway, configurable per tier |
| **Deprecation** | Minimum 6 months between deprecation and sunset |
| **Security** | All public endpoints require authentication; no anonymous write access |
| **Observability** | All public API metrics tracked and available to developers |

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-18 | Enterprise Integration & Ecosystem Architect | Initial public API design |
