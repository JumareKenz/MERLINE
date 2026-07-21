# ADR-003: API Design

## Status

Accepted

## Context

Merline needs a consistent, predictable, and developer-friendly API strategy that serves:
- **Web frontend** (Next.js) - Rich, data-intensive dashboard and study design UIs
- **Mobile app** (Flutter) - Offline data collection with sync capabilities
- **External integrations** (DHIS2, KoboToolbox, etc.) - Machine-to-machine data exchange
- **Third-party developers** - Future API-first ecosystem for plugins and extensions

The API must support the domain complexity of MERL workflows while remaining intuitive for both frontend developers and external integrators.

## Decision

### Primary API: REST (with strategic GraphQL for specific use cases)

**Decision:** REST as the primary API style for all service-to-service and service-to-client communication. GraphQL limited to specific high-complexity query surfaces (reports, analytics dashboards) where client-driven data shaping provides clear benefit.

**Alternatives Considered:**

| Alternative | Evaluation |
|---|---|
| **REST** | Predictable, cacheable, toolable. Every language has HTTP clients. Laravel has first-class API resource support. Best for CRUD-heavy MERL workflows (studies, forms, responses). Mobile sync benefits from resource-level caching and partial updates. |
| **GraphQL only** | Excellent for complex dashboard queries. Overkill for most CRUD operations. Caching is complex. Mobile sync with GraphQL is harder (no HTTP caching for POST queries). Tooling ecosystem less mature for PHP/Laravel. Client complexity higher. |
| **gRPC** | Best for high-throughput service-to-service. Poor browser support. Requires protobuf compilation pipeline. Adds unnecessary complexity for Phase 1 service communication. |
| **tRPC** | Excellent TypeScript-to-TypeScript type safety. Only useful for Next.js frontend. Excludes mobile and external integrations. |

**Rationale:** REST provides the broadest compatibility across all clients (web, mobile, external systems, AI services). Laravel's API resources, FormRequest validation, and response formatting make REST development highly productive. GraphQL is introduced only where it provides clear value — specifically for the analytics/reporting dashboard where client-side data shaping reduces over-fetching. The unification pattern is: serve REST by default, add GraphQL as a thin layer over the same business services for query-heavy surfaces.

### API Versioning: URL-based versioning (v1, v2, etc.)

**Decision:** Version identifier in URL path: `/api/v1/studies`, `/api/v2/studies`

**Alternatives:**

| Alternative | Evaluation |
|---|---|
| **URL path (v1, v2)** | Most explicit. Easy to route. Easy for clients to understand. Easy to deprecate old versions. Supported natively by Laravel route groups. |
| **Accept header** | Clean URLs. Harder for clients to discover. Complex in Laravel. Poor mobile library support. |
| **Query parameter (?v=1)** | Easy to forget. Can be cached incorrectly. Not standard practice. |

**Rationale:** URL path versioning is the most explicit and least error-prone approach. Laravel route groups make it easy to maintain multiple versions. Deprecation path: old versions get `Deprecation` header, then `Sunset` header, then removal after notice period.

**Versioning policies:**
- Minor changes (new fields, new endpoints): Backward compatible within version
- Breaking changes (field removal, behavior change): New version
- Deprecation notice: Minimum 6 months with `Deprecation` and `Sunset` headers
- Maximum concurrent versions: 2 (current + previous)

### Authentication and Authorization

| Concern | Decision | Rationale |
|---------|----------|-----------|
| **Authentication** | JWT (Laravel Sanctum) for web/mobile. OAuth2 (Laravel Passport) for third-party integrations. | Sanctum provides simple token-based auth for SPA and mobile. Passport provides full OAuth2 for external integrations. |
| **Token format** | JWT with short expiry (15min access, 7-day refresh for mobile). | Short-lived tokens reduce breach impact. Refresh tokens enable seamless mobile experience. |
| **Multi-tenancy** | Tenant ID in JWT claims. Row-level security in PostgreSQL. Tenant isolation at API Gateway. | Tenant context resolved at gateway, passed to services via headers. No service needs to parse tenant from URL. |
| **RBAC** | Roles: System Admin, Tenant Admin, Program Manager, Researcher, Supervisor, Enumerator, Donor Viewer. Permissions enforced at service layer via middleware. | Roles map to MERL user hierarchy. Attribute-based access (ABAC) added later if needed. |
| **API key auth** | For third-party integrations. Key hashes stored, never plaintext. | Supports machine-to-machine auth without user context. |
| **SSO/SAML** | Supported via dedicated auth provider. Enterprise feature for government/academic clients. | Standard enterprise requirement. Implemented as OAuth2 identity provider bridge. |

### Response Format Standards

All API responses follow a consistent envelope:

```json
// Successful response
{
  "data": { ... },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-07-18T14:30:00Z",
    "version": "1.0"
  }
}

// Collection response
{
  "data": [ ... ],
  "meta": {
    "current_page": 1,
    "per_page": 25,
    "total": 142,
    "last_page": 6,
    "has_more": true
  }
}

// Error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The given data was invalid.",
    "details": {
      "title": ["The title field is required."],
      "start_date": ["The start date must be a date after today."]
    },
    "request_id": "req_abc123"
  }
}
```

**Naming conventions:**
- `camelCase` for field names (consistent with JavaScript/Dart conventions)
- `snake_case` for query parameters (consistent with URL convention)
- Plural resource names: `/api/v1/studies`, `/api/v1/studies/{id}/indicators`
- Consistent resource nesting (max depth: 3)

### Error Handling Conventions

| HTTP Code | Meaning | Usage |
|-----------|---------|-------|
| 200 | Success | GET, PUT, PATCH (single resource) |
| 201 | Created | POST (resource created) |
| 204 | No Content | DELETE (success, no body) |
| 400 | Bad Request | Malformed input, validation errors |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource state conflict (e.g., version conflict during sync) |
| 422 | Unprocessable Entity | Business rule violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Error | Unexpected server error (never leak details) |
| 502/503 | Upstream Error | Service unavailable, downstream failure |

**Error response fields:**
- `error.code`: Machine-readable error code (e.g., `VALIDATION_ERROR`, `NOT_FOUND`, `RATE_LIMITED`, `SYNC_CONFLICT`)
- `error.message`: Human-readable, user-safe description
- `error.details`: Array or object with field-level errors (for validation)
- `error.request_id`: Correlates to server logs for debugging

### Pagination, Filtering, Sorting

**Pagination:**
- Default: `?page=1&per_page=25` (cursor-based for large collections)
- Cursor pagination for high-write collections: `?cursor=eyJpZCI6MX0&limit=25`
- Response includes `meta` with pagination info

**Filtering:**
- Standard: `?status=active&tenant_id=abc`
- Range: `?created_at[from]=2026-01-01&created_at[to]=2026-06-30`
- Multiple values: `?status[]=active&status[]=draft`
- Search: `?q=search_term` (full-text search across configured fields)
- Advanced filters use JSON-encoded: `?filter={"status":"active","indicator_count[gte]":5}`

**Sorting:**
- Standard: `?sort=name,-created_at` (prefix `-` for descending)
- Multi-sort: `?sort[]=name&sort[]=-created_at`
- Default sort is always `-created_at` (most recent first)

### Rate Limiting

| Client Type | Limit | Window | Burst |
|-------------|-------|--------|-------|
| Authenticated web (session) | 120 req/min | 1 min | 200 |
| Mobile (JWT) | 60 req/min | 1 min | 100 |
| Third-party (API key) | 30 req/min | 1 min | 50 |
| Unauthenticated | 10 req/min | 1 min | 20 |

**Response headers:**
```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 115
X-RateLimit-Reset: 1721312400
Retry-After: 45
```

**On exceed:** HTTP 429 with standard error JSON. No silent drops.

### Sync API (Mobile-Specific)

A dedicated sync endpoint pattern for offline-mobile:

```
POST /api/v1/sync/push   - Push local changes from device
  Body: { "changes": { "responses": [...], "media": [...] }, "last_synced_at": "..." }
  Response: { "accepted": [...], "conflicts": [...], "server_time": "..." }

GET /api/v1/sync/pull?since=2026-07-18T14:00:00Z&device_id=abc
  Response: { "changes": { "studies": [...], "forms": [...], "assignments": [...] }, "sync_token": "..." }
```

Sync follows these principles:
- **Delta sync**: Only changes since last sync are transmitted
- **Conflict detection**: Server detects conflicts based on `updated_at` timestamps
- **Conflict resolution**: "Last writer wins" by default, with manual resolution for critical fields
- **Idempotency**: `idempotency_key` header prevents duplicate processing
- **Chunked upload**: Large media files use chunked upload with resume capability

### API Documentation

- **OpenAPI 3.0** specification auto-generated from Laravel annotations (using Scribe or similar)
- **Interactive docs** at `/docs/api` (Swagger UI / Stoplight Elements)
- **Postman collection** generated from OpenAPI spec
- **Change log** maintained for each API version

## Consequences

### Positive
- **Consistency**: Single API style across all services reduces cognitive load for developers
- **Compatibility**: REST is universally supported by all client platforms
- **Toolability**: OpenAPI docs, Postman collections, and SDK generation are standard
- **Mobile-friendly**: Sync API pattern specifically designed for offline-flrst use case
- **Caching**: HTTP caching (ETags, conditional requests) reduces bandwidth in field conditions

### Negative
- **Over-fetching/under-fetching**: REST sometimes requires multiple requests for complex UIs (mitigated by strategic GraphQL)
- **Versioning overhead**: Maintaining multiple API versions increases testing burden
- **Documentation maintenance**: OpenAPI spec must stay in sync with implementation

### Risks
- **Sync conflict resolution**: Simple "last writer wins" may cause data loss in some MERL scenarios. Mitigation: field-level conflict tracking, supervisor override.
- **Rate limiting too restrictive**: Field conditions with batch uploads may exceed limits. Mitigation: separate sync endpoints have higher limits, configurable per tenant.

## Affected Domains

Frontend Engineering, Mobile Engineering, Backend Engineering, AI Systems, Enterprise Integration, QA

## Decision Owner

Principal Software Architect (PSA)

## Review Schedule

- Phase 1 implementation: Validate sync API pattern against real field conditions
- After first external integration: Validate API documentation and developer experience
- Annual: Review versioning policy and deprecation schedule compliance
