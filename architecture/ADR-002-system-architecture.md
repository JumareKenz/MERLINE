# ADR-002: System Architecture

## Status

Accepted

## Context

Merline requires a system architecture that supports:
- Multiple user personas (researchers, enumerators, supervisors, managers, donors, admins)
- Offline-first mobile field operations
- AI-native intelligence across all workflows
- Multi-tenancy at enterprise scale
- Integration with external MERL systems (DHIS2, KoboToolbox, etc.)
- Analytics and business intelligence
- Regulatory compliance (audit trails, data sovereignty)
- Independent deployability of subsystems

The architecture must be documented using C4 model (Level 1-2) to provide a shared mental model for all engineering teams.

## Decision

### C4 Level 1: System Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      MERLINE PLATFORM                           │
│  AI-native MERL Operating System                                │
└─────────────────────────────────────────────────────────────────┘

                    ▲              ▲              ▲
                    │              │              │
    ┌───────────────┴───┐   ┌──────┴──────┐   ┌──┴──────────────┐
    │   External        │   │   External  │   │   External      │
    │   MERL Systems    │   │   AI Models │   │   Auth Providers │
    │ (DHIS2, Kobo,     │   │ (GPT, Claude│   │ (SSO, SAML,     │
    │  Ona, etc.)       │   │  Gemini,    │   │  OAuth, LDAP)    │
    │                   │   │  Llama,     │   │                  │
    │                   │   │  Mistral)   │   │                  │
    └───────────────────┘   └─────────────┘   └──────────────────┘
```

**Actors:**
- **Researcher (Web)**: Designs studies, configures instruments, analyzes data, generates reports
- **Field Enumerator (Mobile)**: Collects data offline, syncs when connected, GPS/media capture
- **Field Supervisor (Mobile + Web)**: Monitors collection progress, validates submissions, manages teams
- **Program Manager (Web)**: Views dashboards, manages users, configures programs
- **Government Official / Donor (Web)**: Views reports, exports data, audits activities
- **System Administrator (Web)**: Manages tenants, configures integrations, monitors health
- **External System**: DHIS2, KoboToolbox, Ona, Power BI, Tableau via API/Webhooks

### C4 Level 2: Container Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MERLINE PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │
│  │    Web Application    │  │ Mobile App       │  │    API Gateway      │  │
│  │    (Next.js/React)    │  │ (Flutter/Dart)    │  │ (Laravel/Lumen)     │  │
│  │                       │  │                   │  │                     │  │
│  │ • SSR/SSG/ISR pages   │  │ • Offline forms   │  │ • Route management  │  │
│  │ • Dashboard UI        │  │ • GPS/camera      │  │ • Rate limiting     │  │
│  │ • Report viewer       │  │ • Local SQLite DB │  │ • Auth verification  │  │
│  │ • Study designer      │  │ • Sync engine     │  │ • Request validation │  │
│  │ • Admin panel         │  │ • Media caching   │  │ • API versioning    │  │
│  │ • AI chat interface   │  │ • QR/barcode      │  │ • Response caching  │  │
│  └──────────┬────────────┘  └─────────┬────────┘  └──────────┬──────────┘  │
│             │                         │                       │             │
│             ▼                         ▼                       ▼             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      WORKFLOW LAYER (Laravel)                       │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐            │  │
│  │  │ Study      │ │ Data     │ │ Field    │ │ Analytics │            │  │
│  │  │ Service    │ │ Collection│ │ Ops      │ │ Service   │            │  │
│  │  │            │ │ Service  │ │ Service  │ │           │            │  │
│  │  │ • Design   │ │ • Survey │ │ • Team   │ │ • KPI     │            │  │
│  │  │ • Sampling │ │ • Forms  │ │ • Assign │ │ • Stats   │            │  │
│  │  │ • Framework│ │ • Logic  │ │ • Sync   │ │ • GIS     │            │  │
│  │  │ • Strategy │ │ • Media  │ │ • Status │ │ • AI      │            │  │
│  └──┴────────────┴─┴──────────┴─┴──────────┴─┴───────────┴────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      AI LAYER                                        │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │ AI       │ │ RAG      │ │ Prompt   │ │ Model    │ │ Quality  │  │  │
│  │  │ Gateway  │ │ Service  │ │ Registry │ │ Router   │ │ Evaluator│  │  │
│  │  │          │ │          │ │          │ │          │ │          │  │  │
│  │  │ • Auth   │ │ • Doc    │ │ • Vsn    │ │ • Cost   │ │ • Accur. │  │  │
│  │  │ • Route  │ │ • Embed  │ │ • Audit  │ │ • Latency│ │ • Bias   │  │  │
│  │  │ • Cache  │ │ • Search │ │ • A/B    │ │ • Avail. │ │ • Audit  │  │  │
│  │  │ • Retry  │ │ • Re-rank│ │ • Test   │ │ • Failove│ │ • Report │  │  │
│  └─────────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    INTEGRATION LAYER (Laravel)                       │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │  │
│  │  │ REST API │ │ Webhook  │ │ Connector│ │ Event    │               │  │
│  │  │ Server   │ │ Engine   │ │ Registry │ │ Bus      │               │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      DATA LAYER                                      │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │PostgreSQL│ │ PostgreSQL│ │ Redis    │ │ S3/MinIO│ │ Elastic  │  │  │
│  │  │ Primary  │ │ Analytics │ │ Cache/   │ │ Object  │ │ Search   │  │  │
│  │  │ (OLTP)   │ │ (OLAP)    │ │ Queue    │ │ Store   │ │ (future) │  │  │
│  │  │          │ │ (StarRocks│ │ Pub/Sub  │ │ (media, │ │          │  │  │
│  │  │          │ │ /Timescale│ │ Session  │ │ docs)   │ │          │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                  OBSERVABILITY LAYER                                  │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │  │
│  │  │Prometheus│ │ Grafana  │ │OTel      │ │ Loki     │               │  │
│  │  │(Metrics) │ │(Dashbd)  │ │(Tracing) │ │(Logs)    │               │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Service Boundaries and Ownership

| Service | Responsibility | Data Owned | Communication |
|---------|---------------|------------|---------------|
| **API Gateway** | Auth, routing, rate limiting, request validation, response caching | Session data (Redis) | Sync (HTTP) |
| **Study Service** | Study design, logical frameworks, TOCs, indicator definitions, sampling strategies | Studies, frameworks, indicators, sampling frames | Sync (HTTP) + Async (events) |
| **Data Collection Service** | Survey instruments, question banks, form logic, validation rules, media management | Forms, questionnaires, responses, media metadata | Sync (HTTP) + Async (queued media processing) |
| **Field Ops Service** | Team management, assignments, sync orchestration, collection status, quota management | Teams, assignments, sync logs, device registrations | Sync (HTTP) + Async (sync queue) |
| **Analytics Service** | KPI computation, dashboards, statistical analysis, GIS overlays, export generation | Cached analytics, dashboards, saved reports | Async (event-driven computation) |
| **Reporting Service** | Report templates, report generation (PDF, DOCX, XLSX), scheduled reports, distribution | Report templates, generated reports | Sync (HTTP) + Async (generation jobs) |
| **Knowledge Service** | Document repository, lessons learned, evidence base, search indexing | Documents, tags, search index | Sync (HTTP) + Async (indexing) |
| **AI Gateway** | Model routing, request/response caching, fallback logic, token management | Model configurations, cache | Sync (HTTP to models) |
| **RAG Service** | Embedding generation, vector search, context assembly, citation tracking | Vector embeddings (pgvector) | Sync (HTTP) |
| **Prompt Registry** | Prompt versioning, A/B testing, prompt deployment, audit trail | Prompt versions, test cases | Sync (HTTP) |
| **Integration Service** | External API orchestration, webhook delivery, connector lifecycle, event mapping | Connector configs, webhook logs, integration state | Sync + Async |
| **Identity Service** | User management, RBAC, tenant management, SSO/SAML, MFA, audit log | Users, roles, permissions, tenants | Sync (HTTP) |
| **Notification Service** | Email, SMS, push notifications, in-app notifications, digest scheduling | Notification templates, delivery logs | Async (queue) |

### Communication Patterns

1. **Synchronous (HTTP/REST)**: For request-response workflows where the caller needs an immediate result (CRUD operations, auth, search queries). Used between API Gateway and services. All services expose REST APIs for internal consumption.

2. **Asynchronous (Queue/Events)**: For workflows that don't require immediate response (media processing, report generation, sync processing, notification delivery, analytics computation). Uses Laravel Horizon + Redis. Events published for cross-service concerns:
   - `study.published` - Triggers enumerator sync
   - `data.collected` - Triggers quality checks, analytics updates
   - `sync.completed` - Triggers supervisor notifications
   - `report.generated` - Triggers notification delivery
   - `ai.inference.completed` - Triggers quality evaluation

3. **Real-time (WebSocket)**: For live updates (dashboard refreshes, sync progress, collection monitoring). Uses Laravel Reverb (or Soketi for self-hosted).

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Service granularity | Domain-bound (wide) services | Narrower microservices increase distributed complexity without proportional benefit at this stage. Each service owns a coherent domain. Can split later as team grows. |
| Inter-service communication | REST + Events | REST for queries, events for side effects. No shared databases between services. |
| API Gateway | Laravel-based (custom) | Consistent with backend stack. Full control over routing, auth, rate limiting. Avoids additional infrastructure (Kong, Envoy, etc.) in Phase 1. |
| Sync orchestration | Field Ops Service | Central sync manager prevents data conflicts. Uses delta sync patterns. Queue-based for reliability. |
| AI abstraction | Gateway pattern | All AI requests go through AI Gateway. Services never call AI models directly. Enables cost management, fallback, caching, and observability. |
| Event store | PostgreSQL + Redis | Events stored in PostgreSQL for audit. Redis for real-time pub/sub. Kafka deferred until event volume justifies it. |

## Consequences

### Positive
- **Clear ownership**: Each service owns its data and logic, enabling independent teams
- **Evolvable**: Services can be split, merged, or replaced independently
- **Observable**: Structured logging, metrics, and tracing from day one
- **AI-agnostic**: AI Gateway abstraction prevents vendor lock-in
- **Field-resilient**: Offline-first architecture with sync orchestration handles low-connectivity

### Negative
- **Service coordination cost**: More complex than monolith for simple workflows
- **Data duplication**: Some data duplication across services (e.g., user info cached in multiple service databases)
- **Eventual consistency**: Async patterns mean some operations are not immediately consistent
- **Operational overhead**: Multiple services require more infrastructure than monolith

### Risks
- **Over-engineering**: Domain services may be too granular for 5-person team. Mitigation: start with fewer, coarser services, split as team grows.
- **Sync complexity**: Offline sync with conflict resolution is inherently hard. Mitigation: use CRDT-like patterns, test extensively with real field conditions.
- **Eventual consistency surprises**: Business stakeholders accustomed to immediate consistency may find eventual consistency confusing. Mitigation: clear communication and UX patterns (sync indicators, pending states).

## Affected Domains

Product, Frontend Engineering, Backend Engineering, Mobile Engineering, AI Systems, DevOps, QA

## Decision Owner

Principal Software Architect (PSA)

## Review Schedule

- Phase 1 delivery: Validate service boundaries against actual implementation
- Annual: Review service granularity and communication patterns
- When team reaches 10+ engineers: Evaluate further service decomposition
