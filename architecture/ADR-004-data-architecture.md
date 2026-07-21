# ADR-004: Data Architecture

## Status

Accepted

## Context

Merline must handle diverse data types across the MERL domain:
- **Transactional data**: Studies, indicators, survey responses, user management
- **Geospatial data**: GPS coordinates, boundaries, GIS overlays
- **Media data**: Photos, audio recordings, video, documents
- **Time-series data**: Longitudinal study data, KPI trends, collection rates
- **Vector data**: Embeddings for RAG, semantic search
- **Configuration data**: Form definitions, validation rules, workflow configurations
- **Audit data**: All actions, changes, and access logs
- **Analytics data**: Pre-computed aggregations, dashboards, report snapshots

Key requirements: multi-tenancy, offline support, geospatial queries, full-text search, audit trail, soft deletes, data portability, regulatory compliance (GDPR, data sovereignty).

## Decision

### Database Technology Selection

| Purpose | Technology | Rationale |
|---------|-----------|-----------|
| **Primary OLTP** | PostgreSQL 16+ | Relational integrity, JSONB flexibility, PostGIS, full-text search, row-level security, partitioning, mature replication |
| **Analytics/OLAP** | PostgreSQL (with TimescaleDB) | Shared technology reduces stack complexity. TimescaleDB for time-series data. Columnar storage for analytics. Can migrate to StarRocks/ClickHouse if analytics load demands it. |
| **Vector Storage** | pgvector (PostgreSQL extension) | Avoids separate vector database in Phase 1-2. Sufficient for <10M vectors. Migrate to Pinecone/Qdrant if scale demands. |
| **Cache** | Redis 7+ | In-memory cache, session store, rate limiter. Redis Stack for search and JSON capabilities. |
| **Object Storage** | AWS S3 / MinIO (self-hosted) | Media files, generated reports, document repository, model artifacts. S3 API standard ensures portability. |
| **Search** | PostgreSQL FTS (Phase 1) → Elasticsearch/Melchior (Phase 2+) | PostgreSQL built-in full-text search sufficient for Phase 1. Dedicated search engine when scale demands it. |
| **Audit Log** | PostgreSQL (partitioned) | All audit events stored in dedicated partitioned table. PostgreSQL native partitioning for time-based retention. |

### Multi-Tenancy Strategy: Schema-per-Tenant

**Decision:** PostgreSQL schema-per-tenant isolation. Shared infrastructure, isolated data.

**Alternatives Considered:**

| Alternative | Evaluation |
|---|---|
| **Schema-per-tenant** | Best isolation. Separate schema per tenant. Shared public schema for global data (users, tenants). Easy backup/restore per tenant. Natural tenant boundary for row-level security. Easy tenant data portability. |
| **Database-per-tenant** | Best isolation but highest operational cost. Connection pool management is complex. Cannot scale efficiently for hundreds of tenants. |
| **Row-level security (same tables)** | Simplest infrastructure. Tenant_id column + RLS policies. Risk of data leakage between tenants. Harder to backup/restore per tenant. No natural partitioning boundary. |

**Rationale:** Schema-per-tenant provides the best balance of isolation, operational simplicity, and cost efficiency. Each tenant gets their own schema (e.g., `tenant_abc123`) containing all tenant-specific tables. Global tables (users, tenants, plans) live in the `public` schema. Connection pooling works naturally — Laravel's tenant-aware connection resolves the correct schema. Backup/restore per tenant is straightforward (pg_dump per schema). Data portability (tenant migration) is a schema dump.

**Tenant resolution:**
1. API Gateway authenticates request → extracts tenant from JWT claims
2. Middleware sets tenant context via `X-Tenant-Id` header
3. Laravel service resolves tenant schema and sets `search_path`
4. All queries automatically scope to tenant schema

### Data Partitioning Strategy

| Table Type | Strategy | Rationale |
|------------|----------|-----------|
| **High-volume transactional** (responses, events) | PostgreSQL native partitioning by time (monthly/quarterly) | Natural MERL data lifecycle. Studies run on known timeframes. Enables partition pruning for queries. |
| **Time-series** (KPIs, metrics, collection stats) | TimescaleDB hypertable | Automatic partitioning by time. Built-in compression for old data. Continuous aggregates for downsampling. |
| **Audit log** | PostgreSQL partitioning by month | Retention policy: hot (3 months), warm (12 months), cold (7 years, compressed/archived). |
| **Vector embeddings** | pgvector with IVF indexes | Indexing by tenant and document type. Partition by time for RAG freshness. |
| **Media** | S3 bucket organization: `/tenant/{id}/study/{id}/type/{uuid}` | Hierarchical path structure. Lifecycle policies for archival. |

### Backup and Recovery

| Backup Type | Frequency | Retention | Method |
|-------------|-----------|-----------|--------|
| **Full database** | Daily | 30 days | `pg_dump` with custom format. Encrypted at rest. |
| **WAL archiving** | Continuous | 7 days | Point-in-time recovery (PITR). Enables recovery to any second. |
| **Schema-level backup** | Per tenant backup | On request | `pg_dump` per tenant schema for migration/portability. |
| **Object storage backup** | Daily | 30 days | Cross-region replication for critical data. S3 lifecycle to Glacier for long-term. |
| **Disaster recovery** | — | — | Cross-region replica with WAL streaming. RTO < 1 hour, RPO < 5 minutes. |

**Recovery testing:** Full recovery drill quarterly. Measured RTO/RPO validated against targets.

### Data Retention Policies

| Data Category | Active Retention | Archive | Delete |
|---------------|-----------------|---------|--------|
| Study data (responses, forms) | Duration of study + 12 months | Compressed (Parquet in S3) | After archive + 7 years (configurable per tenant) |
| User data | Duration of employment + 24 months | Anonymized | After archive + 5 years |
| Audit logs | 12 months in primary DB | Compressed in S3 | After 7 years (GDPR requires 3-10 depending on sector) |
| Sessions/tokens | Until expiry | Not archived | Deleted on expiry or logout |
| Media files | Duration of study + 12mo | Glacier/Deep Archive | After archive + 7 years |
| Analytics/cached | Configurable TTL (1-90 days) | Not archived | After TTL expiry |
| AI inference logs | 90 days | Not archived | After 90 days (unless flagged for quality review) |

### Analytics Data Pipeline

```
┌──────────┐    ┌──────────────┐    ┌───────────────┐    ┌───────────┐
│  Primary  │───▶│ Change Data  │───▶│ Analytics DB  │───▶│  BI Tools │
│  Database │    │ Capture (CDC)│    │ (TimescaleDB) │    │ (Metabase)│
│  (OLTP)   │    │              │    │               │    │           │
└──────────┘    └──────────────┘    └───────────────┘    └───────────┘
                     │                      │
                     ▼                      ▼
              ┌──────────────┐    ┌───────────────┐
              │  Event Log   │    │  Data Lake    │
              │  (PostgreSQL) │    │  (S3/Parquet) │
              └──────────────┘    └───────────────┘
```

**Pipeline stages:**
1. **Capture**: CDC via native PostgreSQL logical replication or custom triggers. All data changes published to event log.
2. **Transform**: Laravel jobs transform transactional data into analytics-optimized schemas (star/snowflake schemas).
3. **Load**: Transformed data written to analytics database and/or data lake (Parquet format in S3).
4. **Serve**: Analytics DB queried by Metabase, Grafana, or custom dashboards via REST API.
5. **Archive**: Cold data compressed to Parquet and stored in S3 with lifecycle policies.

**CDC approach:** PostgreSQL logical replication provides near-real-time data capture without application-level overhead. For Phase 1, application-level event publishing is sufficient; CDC is adopted when analytics volume demands it.

**Analytics data model conventions:**
- **Fact tables**: Responses, events, sync operations, AI inferences
- **Dimension tables**: Studies, indicators, users, tenants, time, geography
- **Star schema** for analytics (denormalized, query-optimized)
- **Separate analytics schema** per tenant (mirrors transactional schema structure)

### Data Integrity and Migration

- **Migrations**: All schema changes via Laravel migrations. Version-controlled. Deployable independently.
- **Rollbacks**: Every migration must have a rollback. Critical migrations tested with production-like data volume.
- **Soft deletes**: All domain entities use soft deletes with `deleted_at` column. Hard delete only after retention period via scheduled job.
- **Audit trail**: `laravel-audit` package or custom solution. Every create/update/delete recorded with user, timestamp, and changed fields.
- **Versioning**: Key entities (forms, indicators, reports) support version tracking for historical analysis.

## Consequences

### Positive
- **Strong data integrity**: PostgreSQL's relational model ensures referential integrity across MERL entities
- **Tenant isolation**: Schema-per-tenant prevents cross-tenant data leakage
- **Flexibility**: JSONB columns support semi-structured survey data without sacrificing relational integrity
- **Geospatial**: PostGIS enables sophisticated GIS analytics
- **Audit-ready**: Partitioned audit tables support compliance requirements
- **Recoverable**: PITR and tested recovery procedures protect against data loss

### Negative
- **Schema-per-tenant overhead**: Schema migrations must be applied across all tenant schemas. Laravel's multi-tenant packages (e.g., stancl/tenancy) automate this but add migration complexity.
- **Shared database risk**: All tenants share the same PostgreSQL instance. Resource contention possible. Mitigation: connection pooling, resource limits (cgroups/cgroups v2), monitoring per-tenant resource consumption.
- **CDC complexity**: Logical replication setup requires PostgreSQL expertise. Simple application-level events may suffice for Phase 1.

### Risks
- **pgvector scale**: At >10M vectors per tenant, query performance may degrade. Mitigation: monitor vector query latency, migrate to dedicated vector DB if thresholds exceeded.
- **TimescaleDB learning curve**: Time-series optimization requires specific expertise. Mitigation: standard PostgreSQL queries work without TimescaleDB; time-series features adopted incrementally.
- **Multi-tenant migration complexity**: Schema changes across hundreds of tenants require careful orchestration. Mitigation: rolling migrations with locking prevention, zero-downtime migration patterns.

## Affected Domains

Backend Engineering, Database Architecture, DevOps, AI Systems, Security, QA

## Decision Owner

Principal Software Architect (PSA)

## Review Schedule

- Phase 1 migration run: Validate multi-tenant migration tooling
- Monthly (first 6 months): Monitor pgvector performance metrics
- Quarterly: Review backup restore testing results
- Annual: Evaluate analytics pipeline throughput and decide on CDC adoption
