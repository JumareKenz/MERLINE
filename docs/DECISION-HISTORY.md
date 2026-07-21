# Merline Decision History

## Version: 1.0.0 | Owner: Principal Software Architect | Status: Draft

---

## 1. Decision Index

| ID | Title | Status | Date | Owner | Supersedes |
|----|-------|--------|------|-------|------------|
| ADR-001 | Technology Stack Selection | Accepted | 2026-07-18 | PSA | — |
| ADR-002 | System Architecture | Accepted | 2026-07-18 | PSA | — |
| ADR-003 | API Design | Accepted | 2026-07-18 | PSA | — |
| ADR-004 | Data Architecture | Accepted | 2026-07-18 | PSA | — |
| ADR-005 | Deployment Architecture | Accepted | 2026-07-18 | PSA | — |

---

## 2. Decision Timeline

```
Jul 2026
├── 18 Jul: ADR-001 — Technology Stack (Laravel, Next.js, Flutter, PostgreSQL, Redis, K8s)
├── 18 Jul: ADR-002 — System Architecture (C4, 12 services, domain-aligned)
├── 18 Jul: ADR-003 — API Design (REST-first, GraphQL strategically, URL versioning)
├── 18 Jul: ADR-004 — Data Architecture (PostgreSQL, schema-per-tenant, pgvector)
└── 18 Jul: ADR-005 — Deployment Architecture (AWS primary, multi-cloud optional, K8s)

Future (Planned):
├── Q3 2026: ADR-006 — AI Model Strategy (model tiers, routing, fallback)
├── Q4 2026: ADR-007 — Mobile Offline Sync Protocol
├── Q1 2027: ADR-008 — Analytics Data Pipeline
├── Q2 2027: ADR-009 — Public API & SDK
└── Q3 2027: ADR-010 — Plugin Architecture
```

---

## 3. Key Decisions with Rationale

### ADR-001: Technology Stack

**Decision**: Laravel (backend), Next.js (frontend), Flutter (mobile), PostgreSQL (database), Redis (cache/queue), Kubernetes (infrastructure), multi-model AI.

**Rationale**: Laravel offers the best balance of productivity, ecosystem maturity, and enterprise features for a small team building a data-intensive CRUD platform. PostgreSQL is the most versatile database for MERL's diverse data types (relational, geospatial, JSON, vector). Flutter provides unmatched offline-first mobile capabilities. Multi-model AI prevents vendor lock-in.

**Trade-offs**: Python microservices are needed for heavy AI workloads, adding a fourth language. Kubernetes operational complexity requires dedicated DevOps from Phase 2. PHP has performance ceiling for CPU-bound workloads.

**Alternatives rejected**: Django (weaker ORM at scale), Rails (smaller talent pool), Node.js (less opinionated — inconsistency risk), React Native (offline limitations), MongoDB (consistency problems for relational MERL data), MySQL (weaker GIS, no row-level security).

### ADR-002: System Architecture

**Decision**: C4 model documentation. 12 domain-aligned services communicating via REST + async events. API Gateway pattern. AI abstraction layer.

**Rationale**: Domain-aligned services provide clear ownership and independent deployability. REST + event communication balances simplicity with async capability. AI Gateway prevents vendor lock-in and enables cost management.

**Trade-offs**: Service coordination is more complex than a monolith. Some data duplication across services. Eventual consistency requires UX patterns (sync indicators).

**Alternatives rejected**: Monolith (does not scale with team growth), fine-grained microservices (overkill for 5-person team), gRPC-only (poor browser support).

### ADR-003: API Design

**Decision**: REST as primary API style. URL-based versioning (`/api/v1/`). JWT authentication (Sanctum) + OAuth2 (Passport). Consistent JSON envelope format.

**Rationale**: REST provides broadest client compatibility. URL versioning is most explicit and least error-prone. Consistent envelope simplifies client development.

**Trade-offs**: Over-fetching/under-fetching requires multiple requests for complex UIs (mitigated by strategic GraphQL). Versioning maintenance burden.

### ADR-004: Data Architecture

**Decision**: PostgreSQL schema-per-tenant multi-tenancy. pgvector for vector embeddings (Phase 1-2). PostgreSQL native partitioning for high-volume tables. TimescaleDB for time-series (Phase 2+).

**Rationale**: Schema-per-tenant provides best isolation without database-per-tenant operational cost. pgvector avoids separate vector DB in early phases. Partitioning supports natural MERL data lifecycle.

**Trade-offs**: Schema migrations must run across all tenant schemas. Shared database instance creates resource contention risk. pgvector has scale limits (<10M vectors).

### ADR-005: Deployment Architecture

**Decision**: AWS primary cloud provider. Multi-cloud optionality (GCP for AI workloads, DR). Kubernetes orchestration. GitHub Actions CI/CD. Canary deployments.

**Rationale**: AWS has best global coverage for MERL's target markets (Africa, Middle East, Asia). Kubernetes provides portability across cloud and on-premise. Canary deployments minimize production risk.

**Trade-offs**: K8s operational cost ($100-300/month per cluster control plane). CI/CD complexity requires dedicated DevOps attention. Full K8s may be excessive for early stage (Docker Compose for Phase 0-1).

---

## 4. Superseded Decisions

None. This is the initial decision set for Phase 0.

---

## 5. Decision Workflow

### 5.1 How Decisions Are Made

```
Proposal → Review → Decision → Record → Communicate
```

| Stage | Description | Participants |
|-------|-------------|-------------|
| **1. Proposal** | Author identifies need, drafts ADR with context and alternatives | Any team member |
| **2. Review** | Stakeholders review proposal, discuss trade-offs | Domain owners, PSA |
| **3. Decision** | Decision owner accepts, rejects, or requests changes | PSA / Domain Architect |
| **4. Record** | ADR committed to `architecture/ADR-NNN-title.md` | Author |
| **5. Communicate** | Decision announced in engineering channel | PSA |

### 5.2 When an ADR Is Needed

An ADR is required when:
- Selecting or changing a major technology or framework
- Defining or modifying system architecture patterns
- Making decisions with significant cost, security, or scaling implications
- Choosing between approaches with non-trivial trade-offs

### 5.3 ADR Template

Every ADR follows this structure:

```markdown
# ADR-NNN: Title

## Status

[Proposed | Accepted | Deprecated | Superseded]

## Context

[What is the problem? What factors influenced the decision?]

## Decision

[What was decided?]

## Alternatives Considered

[List alternatives rejected, with reasoning]

## Consequences

### Positive
[Benefits of this decision]

### Negative
[Drawbacks or costs]

### Risks
[What could go wrong? Mitigations?]

## Affected Domains

[Which parts of the platform are affected?]

## Decision Owner

[Who made this decision?]

## Review Schedule

[When should this decision be revisited?]
```

---

## 6. Related Documents

- [Documentation Architecture](ARCHITECTURE.md)
- All ADRs in `architecture/ADR-*.md`
- [Glossary](GLOSSARY.md)
- [Knowledge Governance](KNOWLEDGE-GOVERNANCE.md)
