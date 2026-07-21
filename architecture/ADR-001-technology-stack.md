# ADR-001: Technology Stack Selection

## Status

Accepted

## Context

Merline is an AI-native MERL operating system in pre-foundation stage (Phase 0). We must select a technology stack that supports a globally scalable, offline-first, multi-tenant platform serving researchers, enumerators, program managers, government agencies, NGOs, and donors across low-connectivity environments.

Key requirements driving technology selection:
- **Offline-first mobile**: Field data collection with no internet dependency
- **AI-native architecture**: Multi-model support (GPT, Claude, Gemini, Llama, Mistral) with RAG
- **Multi-tenancy**: Serving small NGOs to national governments from same deployment
- **Enterprise security**: SOC2/ISO-ready, audit trails, RBAC
- **Global scalability**: From single-country pilots to multi-country programs
- **Long-lived platform**: Minimum 5-year lifecycle without major rewrites
- **Small team efficiency**: Maintainable by a relatively small engineering organization

## Decision

### Backend Framework: Laravel (PHP)

**Alternatives Considered:**

| Alternative | Evaluation |
|---|---|
| **Laravel** | Mature ecosystem (15+ years), excellent ORM (Eloquent), built-in queue system, event system, auth, testing, extensive package ecosystem, first-class API support with API resources, FormRequest validation, Horizon for queue monitoring, Nova for admin. Large talent pool globally. Predictable performance profile. |
| **Django (Python)** | Strong alternative. Better ML/AI library integration. Heavier framework with more "magic". ORM less performant than Eloquent at scale. Python's async ecosystem maturing but not as proven as Laravel's queue/Swoole for PHP. Better for AI-heavy services but less ideal for CRUD + business logic heavy platforms. |
| **Rails (Ruby)** | Excellent developer experience. Similar philosophy to Laravel. Smaller talent pool. Ruby performance at scale is a known challenge. Fewer enterprise deployments in regulated sectors. |
| **Node.js/Express (JavaScript)** | Good for I/O-heavy workloads. Larger ecosystem but less opinionated — leading to architectural inconsistency. No built-in ORM, queue, or auth. Requires significant additional decision-making for every concern. Better suited for specific services than a unified backend platform. |
| **Spring Boot (Java)** | Best for extreme enterprise scale. Significant boilerplate. Much higher development cost. Talent pool is expensive. Overkill for Merline's anticipated scale through Phase 2-3. |
| **Go** | Excellent performance, simple deployment. Lack of mature web framework ecosystem. Too low-level for rapid platform development with small team. Better suited for individual microservices. |
| **FastAPI (Python)** | Excellent for API-centric services. Lacks built-in admin, ORM, queue management. Better suited for AI/ML microservices than core platform backend. |

**Rationale:** Laravel provides the best balance of developer productivity, ecosystem maturity, built-in enterprise features, and operational simplicity for a team building a data-intensive CRUD + business logic platform. Its queue system, event system, Eloquent ORM, testing infrastructure, and package ecosystem (Laravel Horizon, Telescope, Nova, Sanctum, Passport, Spatie packages) give us enterprise capabilities without NIH syndrome. PHP's extensive global talent pool reduces hiring risk. The framework has proven itself at scale (Laravel Vapor, Laracasts, and numerous enterprise deployments).

**When to reconsider:** If AI workload dominance shifts to >60% of backend processing, consider adding Python microservices for ML inference while keeping Laravel as the orchestration layer.

### Frontend Framework: Next.js (React / TypeScript)

**Alternatives Considered:**

| Alternative | Evaluation |
|---|---|
| **Next.js** | Full-stack React framework. SSR, SSG, ISR, API routes, excellent DX. TypeScript-first. Large ecosystem. Vercel deployment option. Strong community. Mature for enterprise dashboards. Supports both SPA and SSR patterns. |
| **Remix** | Better data loading patterns. Smaller ecosystem. Fewer UI component libraries. Less proven at scale. |
| **Nuxt (Vue)** | Excellent framework, similar philosophy. Vue has smaller talent pool than React. Fewer enterprise UI component libraries. |
| **SvelteKit** | Best developer experience. Smallest ecosystem. Fewer job candidates. Higher risk for enterprise longevity. |
| **Angular** | Too opinionated and verbose for the rapid iteration needed. Declining community mindshare in the SaaS space. |

**Rationale:** Next.js with React and TypeScript provides the best ecosystem, talent availability, and architectural flexibility. React's component ecosystem (Shadcn UI, TanStack Query, Zustand, React Hook Form) enables rapid development of complex data-heavy UIs. TypeScript provides the type safety necessary for a long-lived enterprise codebase. Next.js's hybrid rendering (SSR for public pages, ISR for reports, SSG for documentation) maps well to different parts of the application.

### Mobile Framework: Flutter (Dart)

**Alternatives Considered:**

| Alternative | Evaluation |
|---|---|
| **Flutter** | True cross-platform (iOS, Android, Web, Desktop). Excellent offline support via Hive, Isar, SQLite. Hot reload for rapid development. Dart is type-safe and approachable. Single codebase reduces maintenance burden 2x-3x. Strong rendering performance. SQLite-based local storage works offline. Google-backed with long-term support commitment. |
| **React Native** | JavaScript/TypeScript reuse with web team. Performance limitations for complex UI. Bridge architecture causes jank. Offline libraries less mature. Dependency on JavaScript bridge for native features. |
| **Swift/Kotlin** (native) | Best platform integration. 2x development cost (two codebases). Cannot justify for early-stage startup. |
| **Kotlin Multiplatform** | Promising but immature. Limited ecosystem. Higher risk for production use in 2026. |

**Rationale:** Flutter's offline-first capabilities are unmatched. Hive/Isar provide robust local storage with sync capabilities. Single codebase for iOS, Android, and web is critical for a small team. Hot reload dramatically accelerates field testing. Dart's type system and tooling support long-term maintenance. Flutter's widget system enables the complex form UI needed for survey instruments.

**When to reconsider:** If Flutter web performance for data-heavy dashboards proves inadequate, keep native mobile on Flutter and use Next.js for web.

### Database: PostgreSQL

**Alternatives Considered:**

| Alternative | Evaluation |
|---|---|
| **PostgreSQL** | Most advanced open-source relational database. JSONB for document storage. Excellent geospatial support (PostGIS). Full-text search. Mature multi-tenancy via schemas. Row-level security. MVCC for concurrent access. Excellent replication (streaming, logical). Partitioning. Extensive extension ecosystem. Proven at any scale. |
| **MySQL 8** | Good but lacks advanced features: no native JSONB indexes, weaker GIS, no partial indexes, no row-level security. Better for read-heavy workloads but less flexible. |
| **SQLite** | Excellent for mobile offline storage. Used in Flutter app. Not suitable for server-side multi-tenant workloads. |
| **CockroachDB** | Excellent distributed SQL. Higher operational complexity. Overkill for Merline's anticipated scale. Can be adopted later if global distributed writes are needed. |
| **MongoDB** | Schema-less is attractive for survey data but creates long-term consistency problems. No joins, no transactions (until recent versions), weaker analytics. MERL domain demands relational integrity for indicators, sampling, and statistical analysis. |

**Rationale:** PostgreSQL is the undisputed leader for data-intensive applications requiring relational integrity, geospatial queries, JSON flexibility, and enterprise features. PostGIS is critical for MERL's GIS requirements. Row-level security enables multi-tenancy at the database level. Partitioning supports data archiving at scale. Full-text search supports knowledge management. The extension ecosystem (pg_stat_statements, pgaudit, pg_partman, timescaledb) covers every operational need.

### Cache / Queue / Pub-Sub: Redis

**Alternatives Considered:**

| Alternative | Evaluation |
|---|---|
| **Redis** | Multi-purpose: cache, queue (via Laravel Horizon), session store, rate limiter, pub/sub, real-time updates. Battle-tested. Laravel has first-class support. Redis Stack adds search, JSON, time series. |
| **RabbitMQ** | Better for complex routing and guaranteed delivery. Overkill for Laravel queue workloads. Can be added later for specific event-driven patterns. |
| **Apache Kafka** | Best for event streaming and audit log persistence. Higher operational complexity. Overly complex for Phase 1-2 needs. Adopt as the platform grows. |
| **Memcached** | Cache only. No queue capabilities. Less capable than Redis for multi-purpose use. |

**Rationale:** Redis covers caching, queuing, session management, rate limiting, and real-time features from a single operational footprint. Laravel Horizon provides a beautiful queue monitoring UI on top of Redis. Easy to operate. If event streaming requirements grow (e.g., for analytics pipeline), we can add Kafka later.

### AI/ML Stack

| Component | Selection | Rationale |
|---|---|---|
| **LLM Gateway** | Custom multi-router (Laravel) | Routes to GPT-4o, Claude 3.5, Gemini 2, Llama 3, Mistral based on cost/latency/capability requirements. Single abstraction layer prevents vendor lock-in. |
| **Vector Database** | pgvector (PostgreSQL extension) | Avoids introducing a separate vector DB. Good enough for Phase 1-2 RAG workloads. Can migrate to Pinecone/Weaviate/Qdrant if scale demands it. |
| **Embeddings** | Voyage / OpenAI / local (BGE) | Create embeddings via configurable provider. Store in pgvector. |
| **RAG Pipeline** | LangChain / LlamaIndex | Orchestration layer for document retrieval, context building. Abstracted behind service interface so implementation can be swapped. |
| **Model Evaluation** | LangSmith / MLflow | Track prompt versions, model responses, quality metrics. |
| **Prompt Registry** | Database-backed versioned prompts | Every prompt is versioned, audited, and deployable independently. |
| **AI Observability** | LangFuse / Helicone | Monitor token usage, latency, cost, quality per model per tenant. |

### Infrastructure: Kubernetes (via Rancher/K3s or managed K8s)

**Alternatives Considered:**

| Alternative | Evaluation |
|---|---|
| **Kubernetes** | Industry standard for container orchestration. Steep learning curve but essential for multi-service architecture. Managed options (EKS, AKS, GKE) reduce ops burden. K3s for edge/on-prem deployments. |
| **Docker Compose + VMs** | Simpler for early stage. Cannot scale beyond single host. Manual failover. Higher long-term cost. Consider for Phase 0-1 dev environments only. |
| **AWS ECS / Fargate** | Simpler than K8s but less portable. Vendor lock-in. Less community support for advanced patterns (service mesh, operators). |
| **Nomad (HashiCorp)** | Simpler than K8s. Smaller ecosystem. Fewer integrations with monitoring/tracing tools. |

**Rationale:** Kubernetes is the critical infrastructure decision that enables the entire platform vision. It provides: service discovery, load balancing, auto-scaling, rolling deployments, self-healing, secret management, and a unified API across cloud providers, on-prem, and edge. The operational complexity is justified by the platform's anticipated growth trajectory and need for multi-environment consistency.

**Mitigation:** Use managed Kubernetes (EKS/GKE/AKS) to reduce control plane ops. Use Helm for package management. Use K3s for lightweight deployments. Reserve Phase 0-1 for Docker Compose; adopt K8s at Phase 2.

### CI/CD: GitHub Actions

**Alternatives Considered:**

| Alternative | Evaluation |
|---|---|
| **GitHub Actions** | Native integration with our code hosting. Large marketplace. Good matrix builds, caching, self-hosted runners. No additional cost for public repos or 2000 min/month free. |
| **GitLab CI** | Excellent if on self-hosted GitLab. Stronger built-in registry. Must migrate code hosting. |
| **Jenkins** | Most flexible but highest maintenance burden. Plugin management complexity. Avoid unless specific compliance requirements exist. |
| **CircleCI** | Excellent performance. Separate billing and management from code hosting. Higher cost. |
| **AWS CodePipeline** | Deep AWS integration. Ties infrastructure decisions to cloud provider. Less portable. |

**Rationale:** GitHub Actions provides the best integration-to-cost ratio for an early-stage project starting on GitHub. Sufficient for the anticipated build pipeline complexity. Easy to add self-hosted runners for GPU-based AI workloads later.

## Consequences

### Positive
- **Developer productivity**: Laravel + Next.js + Flutter allows feature velocity across three platforms with shared mental models
- **Talent accessibility**: PHP, JavaScript/TypeScript, and Dart have large developer pools globally
- **Enterprise readiness**: PostgreSQL, Redis, and Kubernetes form a proven enterprise stack
- **Vendor independence**: AI abstraction layer prevents lock-in; PostgreSQL avoids proprietary database costs
- **Offline-first**: Flutter + SQLite + Laravel sync layer supports field operations natively
- **Operational simplicity**: Fewer unique technologies than typical stacks; team can develop deep expertise

### Negative
- **AI microservices gap**: Python microservices will be needed for heavy ML workloads, adding a fourth language to the stack
- **Laravel real-time limitations**: WebSocket/real-time features require additional infrastructure (Laravel Reverb, Soketi, or Pusher)
- **Kubernetes complexity**: Operational overhead of K8s requires dedicated DevOps skill from Phase 2 onward
- **PHP performance ceiling**: For CPU-bound workloads, PHP will be slower than Go/Rust; mitigated by service decomposition

### Risks
- **LLM dependency**: AI features depend on third-party model APIs; fallback strategies and local model support (Llama) mitigate but don't eliminate risk
- **Flutter web limitations**: Flutter web performance for complex dashboards is unproven at Merline's scale; may need to supplement with Next.js if gaps emerge
- **pgvector scale limits**: At extreme scale (100M+ vectors), dedicated vector DB may be needed; migration path is documented

## Affected Domains

Entire platform. All engineering teams. Infrastructure operations.

## Decision Owner

Principal Software Architect (PSA)

## Review Schedule

- Phase 1 (after 6 months): Validate all decisions against real implementation experience
- Phase 2 (after 12-18 months): Evaluate K8s adoption timing, AI microservice architecture
- Annual: Review AI stack for vendor lock-in risk and model landscape changes
