# Merline Data & Analytics Phase 2 Implementation Plan

## Phase 2 Overview

Phase 2 transitions from the Phase 1 "app-event-driven sync to analytics replica" pattern to a full analytics platform with CDC (logical replication), dbt transformation, data lake, and advanced BI.

### What Changes

| Capability | Phase 1 (Current) | Phase 2 |
|------------|-------------------|---------|
| Data sync | App-event-driven, Laravel jobs pushing to analytics schema | PostgreSQL logical replication + Change Data Capture (CDC) |
| Transformations | SQL views + Laravel aggregations | dbt Core models with version control, testing, documentation |
| BI tool | Metabase | Apache Superset (self-hosted) |
| Data lake | None | S3 Parquet data lake with partitioning |
| Data catalog | Manual documentation | Amundsen / DataHub |
| Orchestration | Laravel Scheduler + Horizon | Apache Airflow (or Dagster) |
| Machine learning | None | Python ML pipeline integration |
| Real-time | Polling-based | Streaming via pgoutput + Kafka (optional) |

### What Stays

| Capability | Rationale |
|------------|-----------|
| PostgreSQL as primary | Proven operational database |
| Analytics replica | Dedicated read-only analytics node |
| Star schema (Kimball) | Industry standard, well-designed |
| Schema-per-tenant isolation | Security requirement |
| Metabase for self-service | Continue until Superset stable |
| Laravel backend | Core application unchanged |
| R integration for statistics | Already designed and proven |

---

## 1. Implementation Sequence

### Phase 1.5 — Stabilization (Weeks 1-6 — foundation for Phase 2)

```
Week 1-2     Week 3-4       Week 5-6
──────────   ──────────     ──────────
Analytics    Quality        Governance
replica      monitoring     framework
live         dashboards     rollout
Review       R statistic    Data quality
MV refresh   integration    SLAs defined
performance  live           Ownership
```

**Deliverables:**
- Analytics replica running with < 1 min lag
- Data quality monitoring active (≥ 15 rules)
- R integration with ≥ 5 statistical tests
- Governance framework documented and socialized

### Phase 2.1 — CDC & Data Lake Foundation (Weeks 7-12)

```
Week 7-8         Week 9-10       Week 11-12
───────────      ──────────      ───────────
PostgreSQL       Airflow         S3 Parquet
logical          deployment      data lake
replication      DAG setup       with
setup            + S3 hooks      partitioning
```

| Task | Duration | Dependencies | Owner |
|------|----------|--------------|-------|
| Set up PostgreSQL logical replication slots | 1 week | DB admin access | DevOps |
| Create publication for analytics tables | 0.5 week | Replication slots | Data Engineer |
| Deploy pgoutput decoder plugin | 0.5 week | PostgreSQL 16+ | DevOps |
| Deploy Airflow (Docker/K8s) | 1 week | Infrastructure ready | DevOps |
| Create base CDC DAGs (operational sync) | 1 week | Airflow running | Data Engineer |
| Implement S3 Parquet sink for CDC | 1.5 weeks | CDC DAGs working | Data Engineer |
| Set up S3 partitioning (year/month/day) | 0.5 week | Parquet sink | Data Engineer |
| Create Iceberg/Hive table format | 1 week | Parquet data | Data Engineer |
| Configure lifecycle policies (S3 → Glacier) | 0.5 week | Buckets created | DevOps |
| Implement data quality checks on CDC | 1 week | CDC pipeline | Data Engineer |
| Testing & validation | 1 week | All above | QA |

### Phase 2.2 — dbt Transformation Layer (Weeks 13-18)

```
Week 13-14      Week 15-16       Week 17-18
───────────     ───────────      ───────────
dbt project     dbt models       dbt tests
init + core     advanced         + docs
models          + staging        + CI/CD
```

| Task | Duration | Dependencies | Owner |
|------|----------|--------------|-------|
| Initialize dbt project repository | 0.5 week | CDC pipeline | Data Engineer |
| Set up dbt profile (PG + S3 targets) | 0.5 week | Project init | Data Engineer |
| Create staging models (raw → staging) | 2 weeks | CDC delivering | Data Engineer |
| Create intermediate models (staging → intermediate) | 2 weeks | Staging models | Data Engineer |
| Create mart models (intermediate → marts) | 2 weeks | Intermediate | Data Engineer |
| Implement dbt tests (singular + generic) | 1 week | Models exist | Data Engineer |
| Configure dbt docs + lineage | 1 week | Models exist | Data Engineer |
| Set up dbt CI/CD (GitHub Actions) | 1 week | Repo + tests | DevOps |
| dbt Slim CI (state-based runs) | 0.5 week | CI/CD | Data Engineer |
| dbt source freshness monitoring | 0.5 week | Pipeline stable | Data Engineer |
| Create exposure definitions (dashboards ↔ models) | 1 week | Mart models | Data Engineer |

**dbt Model Layers:**

```
┌─────────────────────────────────────────────────────────────┐
│  Source (raw tables from CDC into S3 + PG staging)          │
│  ├─ public.submissions_raw                                  │
│  ├─ public.response_values_raw                              │
│  └─ public.indicator_values_raw                             │
├─────────────────────────────────────────────────────────────┤
│  Staging (cleaned, typed, renamed)                          │
│  ├─ stg_merl__submissions                                   │
│  ├─ stg_merl__response_values                               │
│  ├─ stg_merl__indicators                                    │
│  └─ stg_merl__subjects                                      │
├─────────────────────────────────────────────────────────────┤
│  Intermediate (joins, business logic, deduplication)        │
│  ├─ int_submissions_enriched                                │
│  ├─ int_indicator_calculations                              │
│  └─ int_quality_metrics                                     │
├─────────────────────────────────────────────────────────────┤
│  Marts (Kimball star schema)                                │
│  ├─ mart_analytics	fact_submissions                        │
│  ├─ mart_analytics	fact_indicator_values                   │
│  ├─ mart_analytics	dim_study (SCD2)                        │
│  └─ mart_analytics	dim_location (SCD2)                     │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2.3 — Superset Migration (Weeks 19-22)

```
Week 19-20       Week 21-22
───────────      ───────────
Superset         Dashboard
deployment       migration
+ setup          + embedding
```

| Task | Duration | Dependencies | Owner |
|------|----------|--------------|-------|
| Deploy Apache Superset (Docker/K8s) | 1 week | Infrastructure | DevOps |
| Configure PostgreSQL analytics connection | 0.5 week | Superset running | Data Engineer |
| Set up RBAC in Superset | 1 week | Connection ready | Data Engineer |
| Configure Superset + Keycloak SSO | 1 week | RBAC done | DevOps |
| Create Superset dataset definitions | 1 week | dbt marts ready | Data Engineer |
| Create SQL Lab schemas (logical views) | 0.5 week | Datasets | Data Engineer |
| Migrate 7 Phase 1 Metabase dashboards | 2 weeks | Datasets + RBAC | BI Analyst |
| Implement embedded dashboards (Next.js) | 1.5 weeks | Dashboards ready | Frontend |
| Configure scheduled report delivery (email/Slack) | 1 week | Dashboards | BI Analyst |
| Set up Superset alerting & anomaly detection | 1 week | Reports | Data Engineer |
| Parallel run Metabase + Superset (1 month) | — | Migration complete | All |
| Decommission Metabase | — | Parallel run successful | DevOps |

### Phase 2.4 — Advanced Analytics & ML (Weeks 23-28)

```
Week 23-24        Week 25-26         Week 27-28
───────────       ───────────        ───────────
Python ML         Causal             Predictive
pipeline          inference          indicator
setup             engine             models
```

| Task | Duration | Dependencies | Owner |
|------|----------|--------------|-------|
| Deploy ML service (FastAPI container) | 1 week | Python env | ML Engineer |
| Dataset feature store (dbt + S3 features) | 2 weeks | dbt marts | Data Engineer |
| Python ML pipeline (training → eval → deploy) | 2 weeks | Feature store | ML Engineer |
| Causal inference engine (DID, RDD, matching) | 2 weeks | ML pipeline | ML/Stats |
| Predictive indicator models (ARIMA, Prophet) | 2 weeks | Historical data | ML Engineer |
| Anomaly detection on data quality metrics | 1 week | ML pipeline | ML Engineer |
| NLP on open-text responses (topic modeling) | 2 weeks | Text data | ML Engineer |
| ML model registry + versioning | 1 week | ML pipeline | ML Engineer |
| Monitoring & drift detection | 1 week | Models deployed | ML Engineer |
| Superset + ML model integration (charts) | 1 week | Superset + ML | BI/ML |

### Phase 2.5 — Data Catalog & Discovery (Weeks 29-30)

```
Week 29-30
───────────
DataHub
deployment
+ ingestion
```

| Task | Duration | Dependencies | Owner |
|------|----------|--------------|-------|
| Deploy DataHub (K8s) | 1.5 weeks | Infrastructure | DevOps |
| Configure metadata ingestion from PostgreSQL | 0.5 week | DataHub running | Data Engineer |
| Configure metadata ingestion from dbt | 0.5 week | dbt docs | Data Engineer |
| Configure metadata ingestion from Superset | 0.5 week | Superset | Data Engineer |
| Set up data lineage visualization | 0.5 week | Ingestion | Data Engineer |
| Integrate business glossary (exported from gov) | 0.5 week | Glossary | Data Steward |
| Enable data discovery search | 0.5 week | Ingestion done | Data Engineer |
| Configure ownership badges | 0.25 week | DataHub | Data Steward |
| User training & rollout | 1 week | All configured | Change Manager |

### Phase 2.6 — Production Hardening (Weeks 31-34)

```
Week 31-32       Week 33-34
───────────      ───────────
Performance      Operational
tuning +         runbook +
load testing     team training
```

| Task | Duration | Dependencies | Owner |
|------|----------|--------------|-------|
| Performance load testing (CDC + dbt + Superset) | 2 weeks | All components | QA/DevOps |
| dbt model performance optimization | 1 week | Load test results | Data Engineer |
| Superset query performance tuning | 1 week | Load test results | Data Engineer |
| CDC pipeline throughput optimization | 0.5 week | Performance gaps | Data Engineer |
| Disaster recovery for data lake | 1 week | All pipelines | DevOps |
| Documentation + runbooks | 2 weeks | System stable | Data Engineer |
| On-call rotation setup | 0.5 week | Documentation | DevOps |
| SLA definition + monitoring | 1 week | Runbooks | DevOps/Data |
| Security audit (data access, encryption) | 1 week | All systems | Security |
| Final go/no-go review | — | All above | Governance Committee |

---

## 2. Dependency Map

```
Phase 1.5 (weeks 1-6)
    │
    ▼
Phase 2.1 — CDC & Data Lake (weeks 7-12)
    │
    ├─────────────────────────────────────────────┐
    ▼                                             ▼
Phase 2.2 — dbt                         Phase 2.3 — Superset
(weeks 13-18)                           (weeks 19-22)
    │                                             │
    ├──────────────────────┬──────────────────────┤
    │                      ▼                      │
    │           Phase 2.4 — Advanced ML           │
    │           (weeks 23-28)                     │
    │                                             │
    ├──────────────────────┬──────────────────────┤
    │                      ▼                      │
    │           Phase 2.5 — Data Catalog          │
    │           (weeks 29-30)                     │
    │                                             │
    ▼                                             ▼
    └──────────────────┬──────────────────────────┘
                       ▼
              Phase 2.6 — Production Hardening
              (weeks 31-34)
```

**Critical path:** Phase 2.1 → Phase 2.2 → Phase 2.3 (Superset migration blocks dashboard migration)

**Parallelizable:** Phase 2.4 ML can start once dbt marts are available (week 15+), overlapping with Phase 2.3

---

## 3. Infrastructure Requirements

### Phase 2.1 Additions

| Resource | Specification | Estimated Cost/Month |
|----------|--------------|---------------------|
| CDC worker nodes | 2 × t3.large (or equivalent) | ~$140 |
| S3 data lake (Parquet) | 500GB - 2TB (first year) | ~$30-120 |
| S3 Glacier (archival) | Cost-optimized | ~$10-30 |
| Airflow (MWAA or self-hosted) | 1 × m5.large | ~$150 |
| Additional read replica | 1 × db.r6g.large | ~$250 |

### Phase 2.2 Additions

| Resource | Specification | Cost/Month |
|----------|--------------|------------|
| dbt Cloud (or self-hosted) | Team plan (3 dev seats) | ~$100 |
| CI/CD runner (GPU not needed) | 1 × t3.medium | ~$30 |

### Phase 2.3 Additions

| Resource | Specification | Cost/Month |
|----------|--------------|------------|
| Superset (K8s/Docker) | 2 × t3.large + 4GB Redis | ~$200 |
| Superset metadata DB | db.t3.small | ~$50 |

### Phase 2.4 Additions

| Resource | Specification | Cost/Month |
|----------|--------------|------------|
| ML inference (FastAPI) | 2 × t3.large | ~$140 |
| ML training (spot instances) | 1 × g4dn.xlarge (spot) | ~$100 |
| Model registry (S3 + MLflow) | 100GB | ~$20 |

### Phase 2.5 Additions

| Resource | Specification | Cost/Month |
|----------|--------------|------------|
| DataHub (K8s) | 2 × t3.large + 8GB mem | ~$200 |
| Elasticsearch (for search) | 1 × t3.medium | ~$40 |
| Neo4j (for lineage graph) | db.t3.medium | ~$50 |

### Summary Infrastructure Cost

| Phase | Monthly Cost | One-time Setup |
|-------|-------------|----------------|
| Phase 1.5 | $0 (existing) | $0 |
| Phase 2.1 | ~$580-690 | ~$2,000 |
| Phase 2.2 | ~$130 | ~$500 |
| Phase 2.3 | ~$250 | ~$2,000 |
| Phase 2.4 | ~$260 | ~$3,000 |
| Phase 2.5 | ~$290 | ~$1,500 |
| Phase 2.6 | $0 (existing) | ~$2,000 |
| **Total** | **~$1,510-1,620/month** | **~$11,000** |

---

## 4. Team Requirements

### Phase 1.5 (Current team: 0 additional)

| Role | FTE | Skills |
|------|-----|--------|
| Data Engineer (existing) | 0.5 | PostgreSQL, Laravel, SQL, PHP |
| DevOps (existing) | 0.1 | RDS, VPC, monitoring |

### Phase 2.1 (Hire: 1)

| Role | FTE | Skills |
|------|-----|--------|
| Senior Data Engineer | 1.0 | PostgreSQL CDC, Airflow, S3, Parquet, Spark (optional) |
| DevOps | 0.3 | K8s, Terraform, CI/CD |

### Phase 2.2-2.3 (Hire: 2)

| Role | FTE | Skills |
|------|-----|--------|
| Analytics Engineer (dbt) | 1.0 | dbt, SQL, data modeling, git |
| BI Analyst | 1.0 | Superset, Metabase, dashboard design, SQL |
| Data Engineer (existing) | 0.5 | Support + review |

### Phase 2.4 (Hire: 1-2)

| Role | FTE | Skills |
|------|-----|--------|
| ML Engineer | 1.0 | Python, sklearn, PyTorch, MLflow |
| Statistician | 0.5 | Causal inference, R, experimental design |

### Phase 2.5 (Existing: 0 additional)

| Role | FTE | Skills |
|------|-----|--------|
| Data Steward | 0.3 | Metadata management, glossary |
| Data Engineer (existing) | 0.3 | Catalog ingestion configuration |

---

## 5. Testing & Rollout Strategy

### 5.1 Testing Phases

| Phase | Testing Type | Approach |
|-------|-------------|----------|
| 2.1 | Unit + Integration | CDC pipeline: compare source → replica row counts, checksums. Airflow DAG unit tests. S3 Parquet validation (schema, compression ratio). |
| 2.2 | dbt test suite | dbt `test` command: singular tests (custom SQL assertions), generic tests (unique, not_null, accepted_values, relationships). Source freshness tests. |
| 2.3 | UAT + Parallel Run | All 7 dashboards built in Superset. Parallel Metabase + Superset for 4 weeks. UAT with 2-3 power users per persona. Gate: user satisfaction ≥ 4/5. |
| 2.4 | ML evaluation | Train/test split (80/20). Holdout validation. Backtesting on historical data. Model cards documenting performance, bias, limitations. |
| 2.5 | QA + UX | Search accuracy test (10 known queries). Lineage visualization review. Glossary term coverage ≥ 90%. |
| 2.6 | Load + Chaos | CDC throughput: 10× peak volume. dbt: 50-model concurrent run. Superset: 50 concurrent dashboard views. Chaos: node failure, network partition, DB failover. |

### 5.2 Rollout Gates

| Gate | Criteria | Who Decides |
|------|----------|-------------|
| G1: CDC stable | < 30s lag at peak, zero data loss in 7 days | Data Engineer + QA |
| G2: dbt models certified | All gold/silver models pass tests, lineage complete | Data Owner |
| G3: Superset ready | 7 dashboards migrated, UAT approved, performance acceptable | BI Analyst + UX |
| G4: ML models validated | Precision/recall ≥ 80%, no bias detected, drift monitoring active | ML Engineer + Statistician |
| G5: Catalog complete | 90%+ coverage, search accurate, lineage visual | Data Steward |
| G6: Production ready | Load tests pass, runbooks written, on-call trained | DevOps + QA |
| **G7: Go-live** | All gates G1-G6 met, Governance Committee approves | Governance Committee |

### 5.3 Rollout Approach

```
Canary → Tenant Group A (2-3 small tenants) → Tenant Group B (5-10 medium) → All tenants
```

| Stage | Duration | Validation |
|-------|----------|------------|
| Canary (internal) | 1 week | Engineering team validates all pipelines |
| Group A (small) | 2 weeks | 2-3 tenants, daily monitoring |
| Group B (medium) | 2 weeks | 5-10 tenants, dashboard-level validation |
| All tenants | 2 weeks | Full rollout, daily standups, war room if needed |

**Rollback plan:** Phase 2 components are additive — old Phase 1 systems remain operational. Rollback = redirect traffic to Phase 1 infra. Data lake can be rebuilt from WAL archives if corrupted.

---

## 6. Success Criteria & KPIs

### Phase 2.1 — CDC & Data Lake

| KPI | Target | Measurement |
|-----|--------|-------------|
| CDC replication lag | P99 ≤ 10s | Prometheus metric |
| Data loss | Zero (exactly-once delivery) | Source → sink checksums |
| S3 data lake size | ≤ $120/month storage cost | S3 billing |
| Airflow DAG success rate | ≥ 99.5% | Airflow metrics |

### Phase 2.2 — dbt

| KPI | Target | Measurement |
|-----|--------|-------------|
| Model freshness | P95 ≤ 30 min refresh | dbt source freshness |
| Test pass rate | ≥ 99% | dbt test results |
| Documentation coverage | 100% of mart models | dbt docs generation |
| CI/CD deployment time | ≤ 15 min | GitHub Actions timing |

### Phase 2.3 — Superset

| KPI | Target | Measurement |
|-----|--------|-------------|
| Dashboard load time | P95 ≤ 3s | Superset performance |
| Query response time | P95 ≤ 5s | Superset SQL Lab |
| User adoption (MAU) | ≥ 80% of target users | Superset analytics |
| Dashboard quality score | ≥ 4/5 user rating | Monthly survey |

### Phase 2.4 — ML

| KPI | Target | Measurement |
|-----|--------|-------------|
| Predictive model accuracy | MAPE ≤ 15% | Backtesting |
| Model drift detection | Alert within 24 hrs | ML monitoring |
| Inference latency | P99 ≤ 500ms | FastAPI metrics |
| Automated insight delivery | ≥ 5 insights/week | Scheduled reports |

### Phase 2.5 — Catalog

| KPI | Target | Measurement |
|-----|--------|-------------|
| Table documentation | ≥ 90% | DataHub completeness |
| Glossary term linkage | ≥ 80% of tables | DataHub |
| Data discovery search | ≥ 4/5 user satisfaction | Survey |
| Lineage coverage | 100% of mart tables | DataHub lineage |

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation | Contingency |
|------|-----------|--------|------------|-------------|
| CDC causes primary DB load | Medium | High | Use logical replication slots (not triggers), throttle with pgoutput config, monitor primary impact during testing | Switch to batch-based CDC with pg_dump fallback |
| dbt model complexity | Medium | Medium | Start simple (staging → marts), add intermediate layer later. Use dbt `ref` for modularity | Keep SQL views as fallback for complex models |
| Superset migration rejected by users | Low | High | Parallel run for 4+ weeks, early UAT, dedicated training sessions | Keep Metabase running indefinitely for legacy dashboards |
| ML model fails to generalize | Medium | High | Start with simple models (linear regression, ARIMA), validate on out-of-sample data, document limitations | Use rule-based benchmark as comparison baseline |
| Data catalog adoption low | Medium | Medium | Integrate into existing workflows, embed in dashboard UI, mandatory for data publishing | Automated metadata collection with minimal manual effort |
| Team hiring delays | High | Medium | Phase pipeline - overlap phases, contract resources, cross-train existing team | Outsource specific components (dbt setup, Superset migration) |
| Cost overrun | Medium | Medium | Use spot instances for ML training, S3 lifecycle policies, right-size instances monthly | Set monthly budget alerts, pause non-critical components |

---

## 8. Timeline Summary

```
Weeks 1-6   │ Phase 1.5 — Stabilization
            │   ├─ Analytics replica performance review
            │   ├─ Quality monitoring dashboards
            │   ├─ R statistical integration
            │   └─ Governance framework rollout
            │
Weeks 7-12  │ Phase 2.1 — CDC & Data Lake
            │   ├─ PostgreSQL logical replication
            │   ├─ Airflow deployment
            │   └─ S3 Parquet data lake
            │
Weeks 13-18 │ Phase 2.2 — dbt Transformation
            │   ├─ dbt project setup
            │   ├─ Staging + intermediate models
            │   ├─ Mart models (star schema)
            │   └─ Testing + documentation + CI/CD
            │
Weeks 19-22 │ Phase 2.3 — Superset Migration
            │   ├─ Superset deployment + RBAC
            │   ├─ Dashboard migration (7 dashboards)
            │   └─ Embedded dashboards (Next.js)
            │
Weeks 23-28 │ Phase 2.4 — Advanced Analytics & ML
            │   ├─ Python ML pipeline
            │   ├─ Causal inference engine
            │   ├─ Predictive indicator models
            │   └─ Anomaly detection
            │
Weeks 29-30 │ Phase 2.5 — Data Catalog
            │
Weeks 31-34 │ Phase 2.6 — Production Hardening
            │
Total: 34 weeks (8.5 months) from Phase 1.5 start
Estimated team: 3-5 additional hires + existing engineers
Estimated infrastructure: ~$1,500-1,700/month additional
```

## 9. Quick Reference

| Component | Phase | Status | Tech | Team |
|-----------|-------|--------|------|------|
| Analytics replica | 1 | ✅ Designed | PostgreSQL read replica | DevOps |
| Event-driven sync | 1 | ✅ Designed | Laravel Horizon + jobs | Backend |
| Star schema | 1 | ✅ Designed (4 facts, 8 dims) | PostgreSQL | Data Eng |
| MVs + aggregates | 1 | ✅ Designed | PostgreSQL | Data Eng |
| Metabase | 1 | ✅ Designed | Open-source BI | BI Analyst |
| R statistics | 1.5 | 🔧 In plan | R via Rscript | Data Eng |
| Quality monitoring | 1.5 | 🔧 In plan | Laravel + Grafana | Data Eng |
| CDC | 2 | 📋 Planned | PG logical rep + pgoutput | Data Eng |
| Airflow | 2 | 📋 Planned | Managed MWAA | DevOps |
| S3 data lake | 2 | 📋 Planned | Parquet + Iceberg | Data Eng |
| dbt | 2 | 📋 Planned | Core + Cloud | Analytics Eng |
| Superset | 2 | 📋 Planned | Apache Superset | BI Analyst |
| ML pipeline | 2 | 📋 Planned | FastAPI + sklearn + MLflow | ML Eng |
| Causal inference | 2 | 📋 Planned | Python + R | ML/Stats |
| DataHub | 2 | 📋 Planned | DataHub + ES + Neo4j | Data Eng |
| Predictive models | 2 | 📋 Planned | ARIMA, Prophet | ML Eng |

**Legend:** ✅ Designed | 🔧 In plan | 📋 Planned
