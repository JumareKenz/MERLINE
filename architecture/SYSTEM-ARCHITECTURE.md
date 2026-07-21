# Merline System Architecture

## Overview

Merline is an AI-native MERL (Monitoring, Evaluation, Research, Learning) operating system. This document describes the system architecture at multiple layers using the C4 model approach, covering service boundaries, data flow, security, AI integration, offline capabilities, and scalability.

---

## 1. System Context (C4 Level 1)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MERLINE PLATFORM                                   │
│      AI-native MERL Operating System                                        │
│                                                                             │
│  Core Capabilities:                                                         │
│  • Study Design (ToC, LogFrames, Indicators, Sampling)                      │
│  • Data Collection (Surveys, Questionnaires, FGDs, KIIs, Observations)      │
│  • Field Operations (Offline mobile, GPS, media, sync)                      │
│  • Analytics (Dashboards, KPIs, Statistical Analysis, GIS)                  │
│  • AI Intelligence (Design assistance, data quality, insight generation)     │
│  • Reporting (Technical reports, donor reports, executive briefs)           │
│  • Knowledge Management (Institutional memory, evidence repository)         │
│  • Integration (API, webhooks, connectors)                                  │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐    ┌──────────────────┐    ┌───────────────────┐
    │  Researchers  │    │ Field Enumerators│    │  Field Supervisors│
    │  (Web)        │    │  (Mobile)        │    │  (Mobile + Web)   │
    └──────┬───────┘    └────────┬─────────┘    └─────────┬─────────┘
           │                     │                        │
    ┌──────┴─────────────────────┴────────────────────────┴─────────┐
    │                        MERLINE API                               │
    │              (REST + GraphQL + WebSocket)                        │
    └──────┬─────────────────────┬────────────────────────┬─────────┘
           │                     │                        │
    ┌──────┴─────────┐    ┌──────┴────────┐    ┌─────────┴─────────┐
    │ Program Mgrs   │    │ Gov/Donors    │    │   External        │
    │ (Web)          │    │ (Web)         │    │   Systems (API)   │
    └────────────────┘    └───────────────┘    │   DHIS2, Kobo,    │
                                               │   Ona, Power BI   │
                                               └───────────────────┘
```

### Actors

| Actor | Interface | Primary Actions |
|-------|-----------|-----------------|
| **Researcher** | Web (Next.js) | Design studies, configure instruments, analyze data, generate reports, configure AI workflows |
| **Field Enumerator** | Mobile (Flutter) | Collect data offline, capture GPS/media, submit responses, receive assignments |
| **Field Supervisor** | Mobile + Web | Monitor collection progress, validate submissions, manage teams, resolve sync conflicts |
| **Program Manager** | Web | View dashboards, manage users, configure programs, approve reports |
| **Government Official / Donor** | Web | View reports, export data for external analysis, audit activities |
| **System Administrator** | Web | Manage tenants, configure integrations, monitor system health, manage billing |
| **External System** | API | DHIS2, KoboToolbox, Ona, Power BI, Tableau, SurveyCTO |

---

## 2. Container Diagram (C4 Level 2)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              MERLINE PLATFORM                                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌─────────────────────────────────────────┐  ┌──────────────────────────────────┐   │
│  │          FRONTEND LAYER                  │  │        MOBILE LAYER              │   │
│  │  ┌───────────────────────────────────┐  │  │  ┌────────────────────────────┐  │   │
│  │  │  Next.js Application             │  │  │  │  Flutter Application       │  │   │
│  │  │  (React / TypeScript / Tailwind)  │  │  │  │  (Dart)                    │  │   │
│  │  │                                   │  │  │  │                            │  │   │
│  │  │ • SSR/SSG/ISR pages              │  │  │  │ • Offline survey forms     │  │   │
│  │  │ • TanStack Query (API client)    │  │  │  │ • Local SQLite DB (Isar)   │  │   │
│  │  │ • Zustand (state management)     │  │  │  │ • GPS + camera capture     │  │   │
│  │  │ • Shadcn UI / Radix components   │  │  │  │ • QR/barcode scanning      │  │   │
│  │  │ • React Hook Form + Zod          │  │  │  │ • Optimistic sync engine   │  │   │
│  │  │ • Recharts / D3 (visualization)  │  │  │  │ • Offline media cache      │  │   │
│  │  │ • MapLibre (GIS maps)            │  │  │  │ • Push notifications       │  │   │
│  │  │ • AI chat interface              │  │  │  │                            │  │   │
│  │  └───────────────────┬───────────────┘  │  └──────────┬─────────────────┘  │   │
│  └──────────────────────┼──────────────────┘  └───────────┼─────────────────────┘   │
│                         │                                │                          │
└─────────────────────────┼────────────────────────────────┼──────────────────────────┘
                          │                                │
                          ▼                                ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY (Laravel)                                    │
│                                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Auth     │  │ Rate     │  │ Request  │  │ Route    │  │ Response │  │ GraphQL │ │
│  │ Middleware│  │ Limiter  │  │ Validator│  │ Dispatcher│  │ Cache    │  │ Endpoint│ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                          SERVICE LAYER (Laravel)                                      │
│                                                                                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │   Study      │ │    Data      │ │   Field Ops  │ │   Analytics  │ │  Reporting │  │
│  │   Service    │ │  Collection  │ │   Service    │ │   Service    │ │  Service   │  │
│  │              │ │  Service     │ │              │ │              │ │            │  │
│  │ • Study CRUD │ │ • Forms      │ │ • Teams      │ │ • KPI engine │ │ • Templates│  │
│  │ • ToC/LogFra │ │ • Logic      │ │ • Assignments│ │ • Statistics │ │ • PDF/DOCX │  │
│  │ • Indicators │ │ • Validation │ │ • Sync mgmt  │ │ • GIS        │ │ • Schedule │  │
│  │ • Sampling   │ │ • Media      │ │ • Status     │ │ • Exports    │ │ • Delivery │  │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬─────┘  │
│         │                │                │                │                │        │
│  ┌──────┴───────┐ ┌──────┴───────┐ ┌──────┴───────┐        │                │        │
│  │  Knowledge   │ │  Identity    │ │  Integration │        │                │        │
│  │  Service     │ │  Service     │ │  Service     │        │                │        │
│  │              │ │              │ │              │        │                │        │
│  │ • Documents  │ │ • Users      │ │ • Connectors │        │                │        │
│  │ • Search     │ │ • Roles      │ │ • Webhooks   │        │                │        │
│  │ • Tags       │ │ • Tenants    │ │ • Mapping    │        │                │        │
│  │ • Lessons    │ │ • SSO/SAML   │ │ • DHIS2 sync │        │                │        │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘        │                │        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────┘
          │                │                │                │                │
          ▼                ▼                ▼                ▼                ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              AI LAYER                                                 │
│                                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   AI Gateway  │  │  RAG Service  │  │ Prompt       │  │ Model Router │             │
│  │               │  │               │  │ Registry     │  │              │             │
│  │ • Auth/route  │  │ • Embeddings  │  │ • Versioning │  │ • Cost-based │             │
│  │ • Cache/retry │  │ • Vector      │  │ • A/B testing│  │ • Latency    │             │
│  │ • Fallback    │  │   search      │  │ • Audit trail│  │ • Capability │             │
│  │ • Observability│ │ • Context     │  │ • Deploy     │  │ • Failover   │             │
│  │               │  │   assembly    │  │              │  │              │             │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                                       │
│  External AI Models: GPT-4o / Claude 3.5 / Gemini 2 / Llama 3 / Mistral               │
│  Vector Store: pgvector (PostgreSQL)                                                   │
│  Observability: LangFuse / Helicone                                                    │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                                                                       │
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                                 │
│                                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ PostgreSQL Primary│  │ PostgreSQL       │  │  Redis 7+        │  │  Object Store  │ │
│  │ (OLTP)            │  │ Analytics        │  │  (Cache/Queue/   │  │  (S3/MinIO)    │ │
│  │                   │  │ (TimescaleDB)    │  │   PubSub/Session)│  │               │ │
│  │ • Schema/tenant   │  │                  │  │                  │  │ • Media       │ │
│  │ • Multi-AZ        │  │ • Hypertables    │  │ • Laravel Horizon│  │ • Reports    │ │
│  │ • PITR            │  │ • Compression    │  │ • Rate limiter   │  │ • Documents  │ │
│  │ • pgvector        │  │ • Continuous agg │  │ • Permissions    │  │ • Backups    │ │
│  │ • PostGIS         │  │                  │  │ • Live updates   │  │ • AI artifacts│ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                                       │
│  ┌───────────────────────────────────────────────────────────────────────────────┐   │
│  │                           Elasticsearch (Phase 2+)                            │   │
│  │                     Full-text search, faceted search, log analytics            │   │
│  └───────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────┐
│                         INFRASTRUCTURE LAYER                                          │
│                                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  Kubernetes       │  │  Service Mesh    │  │  Ingress         │  │  Certificate   │ │
│  │  (EKS/K3s)        │  │  (Istio/Linkerd) │  │  Controller      │  │  Manager       │ │
│  │                   │  │  (Phase 2+)      │  │  (nginx)         │  │  (cert-manager)│ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐    │
│  │  Observability Stack: Prometheus / Grafana / Loki / OpenTelemetry / SigNoz    │    │
│  └──────────────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Major Technology Decisions

| Layer | Technology | Rationale (short) | Full ADR |
|-------|-----------|-------------------|----------|
| **Backend** | Laravel (PHP) | Best DX, Eloquent, built-in queue/events/auth, mature ecosystem, large talent pool | ADR-001 |
| **Frontend** | Next.js (React/TypeScript) | SSR/SSG/ISR, rich ecosystem, type safety, excellent DX | ADR-001 |
| **Mobile** | Flutter (Dart) | True cross-platform, offline-first SQLite, hot reload, single codebase | ADR-001 |
| **Database** | PostgreSQL 16+ | Relational + JSONB + PostGIS + pgvector + RLS + partitioning | ADR-001, ADR-004 |
| **Cache/Queue** | Redis 7+ | Multi-purpose: cache, queue (Horizon), session, rate limit, pub/sub | ADR-001 |
| **Object Storage** | S3 / MinIO | Media, reports, documents, backups. Standard API ensures portability. | ADR-001 |
| **Infrastructure** | Docker + Kubernetes | Portability across cloud/on-prem. Helm charts. Auto-scaling. | ADR-001, ADR-005 |
| **CI/CD** | GitHub Actions | Native code integration, sufficient for Phase 1-2 scale | ADR-001 |
| **Monitoring** | Prometheus + Grafana + Loki + OTel | Industry standard OSS stack. SigNoz for APM/tracing. | ADR-005 |
| **AI Models** | Multi-model (GPT, Claude, Gemini, Llama, Mistral) | Prevents vendor lock-in. Routing by cost/latency/capability. | ADR-001 |

---

## 4. Service Descriptions

### 4.1 Study Service
Owns the entire study lifecycle: design, logical frameworks, theory of change, indicator definitions, sampling strategies, and study configuration. Provides endpoints for study CRUD, clone, versioning, and publishing.

**Dependencies:** Identity Service (auth), Data Collection Service (form definitions)

### 4.2 Data Collection Service
Manages survey instruments, question banks, form logic (skip patterns, validations, calculations), media capture configuration. Handles response submission, validation, and storage.

**Dependencies:** Study Service, Identity Service

### 4.3 Field Ops Service
Orchestrates field operations: enumerator team management, assignment distribution, sync orchestration, collection progress tracking, quota enforcement. This is the central coordinator for mobile field operations.

**Dependencies:** Study Service, Data Collection Service, Identity Service

### 4.4 Analytics Service
Computes KPIs, statistical analyses, indicator values, cross-tabulations, GIS overlays, and trend analyses. Pre-computes dashboard data for performance. Exports to CSV, XLSX, SPSS, Stata formats.

**Dependencies:** Data Collection Service, Study Service, Identity Service

### 4.5 Reporting Service
Manages report templates, generates PDF/DOCX reports, handles scheduled report delivery, email distribution, and report archiving.

**Dependencies:** Analytics Service, Knowledge Service

### 4.6 Knowledge Service
Document repository, lessons learned database, evidence base, full-text search (PostgreSQL FTS → Elasticsearch). Tagging and categorization system.

**Dependencies:** Identity Service

### 4.7 Identity Service
User management, role-based access control (RBAC), tenant management, SSO/SAML authentication, MFA, API key management, audit logging.

**Dependencies:** None (used by all services)

### 4.8 Integration Service
External system connectivity: DHIS2, KoboToolbox, Ona, SurveyCTO connectors. Webhook engine for event-driven integrations. API gateway for third-party developers.

**Dependencies:** All services (for data mapping)

### 4.9 AI Gateway
Abstraction layer for all AI model interactions: routing, caching, fallbacks, token management, cost tracking. All platform AI requests go through this service.

**Dependencies:** External AI model APIs, RAG Service

### 4.10 RAG Service
Document embedding, vector storage (pgvector), semantic search, context assembly, citation tracking. Powers AI-assisted research design, data quality checks, and insight generation.

**Dependencies:** AI Gateway, Knowledge Service

### 4.11 Prompt Registry
Version-controlled prompt management: create, test, deploy, A/B test prompts. Audit trail for all prompt changes. Deployment targets by model, tenant, or study type.

**Dependencies:** AI Gateway

### 4.12 Notification Service
Multi-channel notification delivery: email (Laravel Mail), SMS (Twilio/AT), push notifications (FCM/APNs), in-app notifications. Template management, delivery scheduling, delivery status tracking.

**Dependencies:** Identity Service

---

## 5. Data Flow Descriptions

### 5.1 Study Design and Data Collection Flow

```
Researcher (Web)    
    │
    ▼
Study Service ──► Creates study with framework, indicators, sampling plan
    │
    ▼
Data Collection Service ──► Creates forms, questions, validation rules, logic
    │
    ▼
Field Ops Service ──► Assigns to teams, sets quotas
    │
    ▼
Sync Queue ──► Enumerators pull assignments on mobile (when online)
    │
    ▼
Enumerator (Mobile) ──► Collects data offline, captures GPS/media
    │
    ▼
Sync Engine ──► Pushes responses when connectivity available
    │
    ├──► Data Collection Service ──► Validates and stores responses
    ├──► Field Ops Service ──► Updates collection status
    └──► Analytics Service ──► Triggers KPI recalculation
```


### 5.2 AI-Assisted Workflow

```
User request (any UI) 
    │
    ▼
AI Gateway ──► Authenticates, routes to appropriate model
    │              │
    │              ▼
    │          Prompt Registry ──► Loads versioned prompt
    │              │
    │              ▼
    │          RAG Service ──► Retrieves relevant context
    │              │              │
    │              │              ▼
    │              │          pgvector ──► Semantic search
    │              │
    │              ▼
    │          Model Router ──► Selects model (cost/latency/capability)
    │              │              │
    │              │              ├──► GPT-4o (complex analysis)
    │              │              ├──► Claude 3.5 (document processing)
    │              │              ├──► Gemini 2 (multimodal)
    │              │              ├──► Llama 3 (on-premise/data sensitive)
    │              │              └──► Mistral (cost-sensitive)
    │              │
    │              ▼
    │          Response ──► Caches, logs, returns to user
    │
    ▼
Quality Evaluator ──► Async evaluation of response quality
    │
    ▼
Audit Log ──► All AI interactions recorded for audit
```


### 5.3 Offline Sync Flow

```
Mobile Device (Offline)
    │
    ├──► Local Isar DB ──► Collect responses, cache media
    ├──► Sync Queue ──► Queues changes for transmission
    └──► Pending Outbox ──► Tracks unsynced items
    
    │ [Connectivity detected]
    ▼
Sync Engine
    │
    ├──► PUSH: POST /api/v1/sync/push
    │        │
    │        ▼
    │    Field Ops Service
    │        │
    │        ├──► Conflict Detection ──► Timestamp comparison
    │        ├──► Conflict Resolution ──► LWW or manual
    │        ├──► Response Processing ──► Validate & store
    │        └──► Media Processing ──► Upload queue (chunked)
    │
    ├──► PULL: GET /api/v1/sync/pull
    │        │
    │        ▼
    │    Sync Engine ──► Returns changes since last sync
    │            │
    │            └──► Studies, forms, assignments, metadata updates
    │
    └──► Sync Logging ──► Records sync events, conflicts, retries
    
    │ [Sync complete]
    ▼
Mobile Device ──► Updates local DB, clears sync queue
```


### 5.4 Integration Data Flow (DHIS2 Example)

```
DHIS2 Instance (External)
    │
    ▼
Integration Service
    │
    ├──► Connector Manager ──► Authenticates, maps data models
    ├──► Event Listener ──► Listens for changes (webhook or polling)
    │        │
    │        ▼
    │    Data Mapper ──► Transforms between MERL and DHIS2 schemas
    │        │
    │        ▼
    │    Sync Engine ──► Two-way sync with conflict resolution
    │        │
    │        ├──► MERL → DHIS2: Push indicators, aggregate data
    │        └──► DHIS2 → MERL: Pull org units, program data
    │
    └──► Audit Log ──► Records all integration events
```

---

## 6. Security Architecture Summary

| Domain | Approach | Implementation |
|--------|----------|---------------|
| **Authentication** | JWT (Sanctum) + OAuth2 (Passport) + SSO/SAML | Short-lived access tokens, long-lived refresh tokens for mobile |
| **Multi-tenancy** | Schema-per-tenant + JWT tenant claims | Tenant isolation at database level, resolved at API Gateway |
| **Authorization** | RBAC (roles + permissions) | Middleware-enforced at service level. 7 roles mapped to MERL hierarchy. |
| **Transport** | TLS 1.3 everywhere | Ingress terminates TLS. mTLS for service-to-service (Phase 2+). |
| **Encryption at rest** | AES-256 | RDS encryption, S3 server-side encryption, EBS volume encryption |
| **Secrets management** | External Secrets Operator | Secrets stored in AWS Secrets Manager / Vault, never in code |
| **Audit trail** | Immutable audit log | All CRUD operations, auth events, AI inferences, sync events logged |
| **Data validation** | Server-side + client-side | Laravel FormRequest validation. Zod for frontend. |
| **Rate limiting** | Redis-based token bucket | Per-user, per-IP, per-API-key. Sync endpoints have higher limits. |
| **SQL injection** | Parameterized queries | Eloquent ORM inherently prevents SQLi. Raw queries reviewed. |
| **XSS/CSP** | Content Security Policy | Strict CSP headers. React's automatic XSS protection. |
| **CORS** | Whitelist-based | Only allowed origins can access API. |
| **API keys** | Hashed storage | Key hashes stored using bcrypt. Never store plaintext keys. |
| **OWASP Top 10** | Mitigation plan | Regular security review. Dependency scanning (Dependabot). SAST (PHPStan, SonarQube). |

---

## 7. AI Architecture Summary

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Model Access** | AI Gateway (Laravel) | Single entry point for all AI. Routes to appropriate model based on request type, cost budget, latency requirements. |
| **Supported Models** | GPT-4o, Claude 3.5, Gemini 2, Llama 3, Mistral | Configurable per tenant. Failover chain: primary → secondary → fallback. |
| **Self-hosted Models** | Llama 3 (GPU node pool) | For data-sensitive tenants, offline-capable deployments. Ollama/vLLM for inference. |
| **RAG Pipeline** | LangChain / LlamaIndex | Document chunking, embeddings, vector search, context assembly with citations. |
| **Vector Store** | pgvector (PostgreSQL extension) | Shared with primary database. Reduced operational complexity. |
| **Embeddings** | Voyage / OpenAI / BGE | Configurable provider. Cached to reduce API costs. |
| **Prompt Management** | Prompt Registry (Database) | Versioned prompts with A/B testing, audit trail, targeted deployment. |
| **AI Observability** | LangFuse / Helicone | Token tracking, cost allocation, latency monitoring, quality scoring. |
| **Evaluation** | LangSmith / Custom eval | Automated quality evaluation on evaluation datasets. Human-in-the-loop for edge cases. |
| **Explainability** | Citation + Trace | Every AI output includes citations to source documents. Full trace of model reasoning. |
| **Human Override** | Always available | AI recommends; human decides. Every AI action can be overridden. |

**AI Governance Rules:**
1. No AI action is irreversible without human confirmation
2. Every AI output includes confidence score and source citations
3. All AI interactions are audited per tenant
4. Model behavior can be evaluated against tenant-specific ground truth
5. Prompt changes require version-controlled deployment
6. Costs are tracked per tenant, per model, per feature

---

## 8. Offline-First Architecture Summary

| Capability | Approach | Implementation |
|-----------|----------|---------------|
| **Local Storage** | Isar Database (SQLite-based) | High-performance local database for Flutter. Supports complex queries, indexes, full-text search. |
| **Media Cache** | Local file system + LRU eviction | Camera captures, voice recordings stored locally until sync. LRU eviction prevents storage overflow. |
| **Sync Engine** | Custom delta sync | Tracks changes via changelog. Only sends changed records. Resume capability for interrupted sync. |
| **Conflict Detection** | Timestamp-based | Server compares `updated_at` timestamps. Field-level conflict tracking. |
| **Conflict Resolution** | Last Writer Wins (default) | Manual resolution for critical fields (supervisor intervention). Configurable per study. |
| **Sync Queue** | Persistent queue (Hive) | Changes queued locally. Retry with exponential backoff. Prioritized sync (responses > media > metadata). |
| **Optimistic Updates** | Local-first | UI immediately reflects changes. Background sync ensures server consistency. |
| **Data Integrity** | Checksums + validation | Response integrity verified via checksums on sync. Server validates all rules before acceptance. |
| **Offline Auth** | Cached credentials + refresh token | Enumerators authenticate once; cached token works offline. Token refresh on next connection. |
| **Connectivity Awareness** | Network status monitoring | App detects connectivity changes. Adapts sync behavior (full sync on WiFi, metadata-only on mobile data). |

**Offline-first principles for all features:**
- Every feature that works online must also work offline
- Users should never lose data due to connectivity loss
- Sync should be invisible to the user (background operations)
- Conflict resolution should be rare and transparent
- Media uploads support chunked upload with resume

---

## 9. Scalability Approach

| Dimension | Phase 1 (0-6 mo) | Phase 2 (6-18 mo) | Phase 3 (18-36 mo) |
|-----------|------------------|-------------------|-------------------|
| **Infrastructure** | Docker Compose (single server) | Managed K8s (EKS), 3-5 nodes | Multi-AZ K8s, auto-scaling, spot instances |
| **Database** | Single PostgreSQL + read replica | Read replicas + connection pooling | Sharding, Citus, or distributed PostgreSQL |
| **Cache** | Single Redis | Redis cluster with read replicas | Redis cluster + global replication |
| **Queue** | Single Horizon | Multiple queue workers per service | Auto-scaling queue workers |
| **Search** | PostgreSQL FTS | Elasticsearch | Elasticsearch cluster across AZs |
| **AI** | External API models | + Self-hosted small models | + GPU node pool for inference |
| **Storage** | Single S3 bucket | S3 + lifecycle policies | Cross-region replication + archiving |
| **CDN** | None | CloudFront for static/media assets | Multi-region CDN |
| **Observability** | Prometheus + Grafana | + Loki + OTel tracing | + Full APM + custom dashboards |
| **Tenant capacity** | < 10 tenants | < 100 tenants | < 1,000+ tenants |
| **Response volume** | < 100K/month | < 1M/month | < 10M/month |
| **Concurrent users** | < 1,000 | < 10,000 | < 100,000 |

**Scalability design decisions:**
- All services are stateless (scale horizontally behind load balancer)
- Session state stored in Redis (not local filesystem)
- Database is the only stateful component; use read replicas aggressively
- Queue workers scale independently of web workers
- Media processing is async (queued, not inline)
- Analytics computation is async (event-driven, not request-response)
- AI inference is async for non-real-time features

---

## 10. Development Workflow

### Local Development

```
┌─────────────────────────────────────────────────────┐
│                 Developer Machine                     │
│                                                       │
│  ┌──────────────┐   ┌──────────────┐                │
│  │  Next.js     │   │  Laravel API  │                │
│  │  (port 3000)  │   │  (port 8080)  │                │
│  └──────┬───────┘   └──────┬───────┘                │
│         │                  │                         │
│         └──────────┬───────┘                         │
│                    │                                  │
│         ┌──────────┴──────────┐                      │
│         │   Docker Compose    │                      │
│         │                     │                      │
│         │  • PostgreSQL       │                      │
│         │  • Redis            │                      │
│         │  • MinIO (S3)       │                      │
│         │  • MailHog (email)  │                      │
│         └────────────────────┘                      │
│                                                       │
│  Flutter App (device emulator or physical device)     │
│  ┌──────────────────────────────────────────┐        │
│  │  • Connects to local API via ngrok/tunnel │        │
│  │  • SQLite (Isar) works locally           │        │
│  │  • Offline testing via airplane mode     │        │
│  └──────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

### Standard Workflow

1. **Feature branch** from `main`
2. **Local development** with Docker Compose
3. **Pre-commit hooks**: Laravel Pint (PHP CS), ESLint, TypeScript check
4. **CI on PR**: Lint, static analysis, unit tests, build
5. **Review**: PR review by at least one other engineer
6. **Merge to `main`**: Auto-deploys to Dev environment
7. **E2E tests**: Automated tests on Dev environment
8. **Staging deploy**: Auto on successful Dev test pass
9. **Manual gate**: Release manager approval
10. **Production deploy**: Canary rollout with automated rollback
11. **Post-deploy**: Smoke tests, monitoring review

---

## 11. Key Assumptions Requiring Validation

| Assumption | Risk If Wrong | Validation Approach |
|------------|---------------|---------------------|
| Schema-per-tenant scales to 1000+ tenants | Migration overhead becomes unmanageable | Load test with 100+ tenant schemas in Phase 2 |
| pgvector handles <10M vectors per tenant | Need dedicated vector DB, additional ops | Benchmark at 1M, 5M, 10M vectors during Phase 1 |
| Laravel performance sufficient for 1000+ concurrent users | Need Go/Java services for some paths | Load test during Phase 1; prepare async migration paths |
| Flutter performs well for complex survey instruments | Web rendering or heavy forms may lag | Field test with complex surveys (>200 questions, media) |
| Multi-cloud strategy is cost-effective | Operational complexity > cost savings | Quarterly cloud cost review after Phase 2 |
| Offline sync handles 1000+ devices per study | Sync conflicts, server load increase | Scale test sync with 100, 500, 1000 simulated devices |
| AI cost per tenant is predictable | Costs vary unpredictably with usage | Implement usage budgets per tenant from day one |
| Small team (5-8 engineers) can maintain this architecture | Architecture too ambitious for team size | Start with fewer services; expand as team grows |

---

## Document Ownership

| Section | Owner |
|---------|-------|
| System Context | PSA |
| Container Diagram | PSA |
| Service Descriptions | PSA + Domain Leads |
| Data Flow | PSA + Backend Lead |
| Security Architecture | PSA + Security Architect |
| AI Architecture | PSA + AI Systems Architect |
| Offline-First | PSA + Mobile Lead |
| Scalability | PSA + DevOps Lead |
| Development Workflow | PSA + Engineering Leads |

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-18 | PSA | Initial architecture document |
