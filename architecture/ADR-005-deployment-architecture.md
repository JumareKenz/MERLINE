# ADR-005: Deployment Architecture

## Status

Accepted

## Context

Merline must be deployed reliably across multiple environments while supporting:
- Global distribution (users in low-connectivity regions)
- Multi-cloud portability (avoid vendor lock-in)
- Regulatory compliance (data sovereignty in specific countries)
- Small team operational efficiency (no dedicated SRE team in Phase 1)
- Cost predictability (startup budget constraints)
- Enterprise SLAs (99.9%+ uptime for production)

## Decision

### Cloud Provider: Multi-Cloud Strategy (AWS Primary, GCP Secondary)

**Decision:** AWS as primary cloud provider. GCP as secondary for disaster recovery and specific AI workloads.

**Alternatives Considered:**

| Alternative | Evaluation |
|---|---|
| **AWS** | Broadest service catalog. Best global coverage (including regions in Africa, Asia, Middle East critical for MERL). Mature Kubernetes (EKS), managed PostgreSQL (RDS/Aurora), S3 for object storage. Largest community and talent pool. Higher egress costs than GCP. |
| **GCP** | Best AI/ML services (Vertex AI, TPUs). Strong Kubernetes (GKE is best managed K8s). Lower egress costs. Fewer global regions in developing countries relevant to MERL. Smaller enterprise support ecosystem. |
| **Azure** | Best for Microsoft-centric enterprises. Strong in government sector. Less relevant for MERL-specific global distribution needs. |
| **On-premise / Private cloud** | Required for specific government clients with data sovereignty requirements. Kubernetes abstraction enables deployment consistency. K3s for edge deployments. |

**Rationale:** AWS provides the best global coverage for MERL's target markets (including AWS Africa - Cape Town, AWS Middle East - Bahrain). EKS is a mature managed K8s service. RDS PostgreSQL / Aurora PostgreSQL cover database needs. S3 is the de facto standard for object storage. GCP is maintained as a secondary option for:
- AI/ML workloads that benefit from TPUs or Vertex AI
- Disaster recovery replication (multi-cloud DR)
- Cost optimization (workload portability prevents price gouging)

**On-premise strategy:** Kubernetes abstraction means on-premise deployments (K3s, Rancher) use the same Helm charts and deployment pipelines. This is critical for government clients with data sovereignty requirements.

### Environment Strategy

| Environment | Purpose | Infrastructure | Access |
|-------------|---------|---------------|--------|
| **Local** | Developer local development | Docker Compose (Laravel, PostgreSQL, Redis, MinIO) | Developers |
| **Dev** | Integration testing, AI evaluation | Shared K8s namespace (small nodes). Reduced resource limits. | Engineering team |
| **Staging** | Pre-production validation, load testing | Mirrors production (smaller scale). Same K8s config, same deployment pipeline. | Engineering + QA |
| **Production** | Live customer workloads | Multi-AZ K8s cluster. Managed PostgreSQL. Auto-scaling. Full observability. | Operations |
| **DR** | Disaster recovery | Cross-region replica. Cold standby (warm for critical services). | Operations (activated on failover) |
| **Sandbox** | Customer demos, training | Low-resource K8s namespace. Ephemeral environments. | Customer success |

**Merge-to-deploy pipeline:**
```
Feature Branch → PR → Dev Deploy (auto) → Tests → Merge to Main → Staging Deploy (auto) → E2E Tests → Production Deploy (approval gate)
```

### Containerization Strategy

**Decision:** Docker containers orchestrated by Kubernetes. Helm charts for package management.

**Image strategy:**
- **Base images**: Minimal Alpine-based images for PHP (Laravel), Node.js (Next.js), Python (AI services)
- **PHP-FPM + Nginx**: Separate containers for PHP-FPM and Nginx (sidecar pattern) or combined based on service requirement
- **Multi-stage builds**: Builder pattern for PHP with Composer dependencies, Node.js with npm packages, Python with pip packages
- **Image registry**: GitHub Container Registry (ghcr.io) co-located with code
- **Tagging**: `{service}-{git-sha}-{timestamp}`. `latest` always points to current prod deployment
- **Vulnerability scanning**: Trivy scanning in CI pipeline. Critical/CVEs block deployment.

**Kubernetes configuration:**
- **Namespaces per service**: Isolated resource quotas, network policies
- **Resource limits**: CPU/memory requests and limits for every container
- **Horizontal Pod Autoscaling (HPA)**: Based on CPU/memory or custom metrics (queue depth, request latency)
- **Pod Disruption Budgets (PDB)**: Ensure minimum availability during upgrades
- **Network policies**: Zero-trust, deny-by-default, explicit allow between services
- **Ingress**: nginx-ingress or Traefik with TLS termination (Let's Encrypt / cert-manager)
- **Secrets**: External Secrets Operator with AWS Secrets Manager or HashiCorp Vault

### CI/CD Pipeline Design

**Platform:** GitHub Actions

**Pipeline stages:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CI PIPELINE (on PR)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Lint    │─▶│  Static  │─▶│   Test   │─▶│   Build & Push   │  │
│  │  (ESLint │  │  Analysis│  │  (PHPUnit│  │   Docker Image   │  │
│  │  Pint)   │  │  (PHPStan│  │   Jest,  │  │   to ghcr.io     │  │
│  │          │  │  TS)     │  │  Flutter)│  │                  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      CD PIPELINE (on merge to main)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Deploy  │─▶│   E2E    │─▶│  Deploy  │─▶│   Smoke Test    │  │
│  │  to Dev  │  │   Tests  │  │  to Stg  │  │   + Integration  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘  │
│                                                                     │
│                     ┌──────────────────────────────────────┐       │
│                     │   Manual Approval Gate               │       │
│                     │   (Release Manager)                  │       │
│                     └──────────────────────────────────────┘       │
│                                │                                   │
│                     ┌──────────────────────────────────────┐       │
│                     │   Deploy to Production               │       │
│                     │   (Canary: 10% → 50% → 100%)        │       │
│                     │   Monitored rollback on error        │       │
│                     └──────────────────────────────────────┘       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Deployment strategy:**
- **Canary deployments**: New version rolled out incrementally (10% → 50% → 100%)
- **Health checks**: Liveness and readiness probes on every container
- **Rollback**: Immediate rollback if error rate > 0.1% or p95 latency > 500ms
- **Blue-green**: For database migrations requiring schema changes (parallel environments)

### Monitoring and Observability Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| **Metrics** | Prometheus + Grafana | CPU, memory, request rate, error rate, latency (RED metrics). Custom business metrics. |
| **Logging** | Loki + Promtail | Centralized structured log aggregation. LogQL for querying. |
| **Tracing** | OpenTelemetry + SigNoz / Jaeger | Distributed tracing across services. Trace correlation with logs and metrics. |
| **Alerting** | Grafana Alerting / Alertmanager | PagerDuty integration for critical alerts. Slack for warnings. |
| **Uptime** | Better Uptime / Checkly | External synthetic monitoring. SSL certificate expiry. |
| **APM** | Laravel Telescope (Dev/Staging) + SigNoz (Prod) | Performance profiling. Slow query detection. N+1 detection. |
| **Cost monitoring** | AWS Cost Explorer + Kubecost | Resource utilization optimization. Per-tenant cost allocation. |
| **AI observability** | LangFuse / Helicone | LLM token usage, cost, latency, quality per model per tenant. |

**Critical dashboards:**
1. **Service Health**: Uptime, error rate, latency p50/p95/p99 per service
2. **Database**: Connection count, query latency, cache hit ratio, replication lag
3. **Queue**: Queue depth, processing time, failure rate per queue
4. **AI**: Token consumption, cost per model per tenant, cache hit rate
5. **Sync**: Sync success rate, conflict rate, sync payload size, device counts
6. **Business**: Active studies, response volume, active users per tenant

**Alert thresholds:**
- **Pager (immediate)**: Service down, error rate > 5%, p99 latency > 2s, queue backlog > 10000
- **Warning (same day)**: High CPU/memory, p95 latency > 1s, certificate < 30 days
- **Info (ticket)**: Disk > 80%, old deployment, dependency updates available

### Scaling Strategy

| Dimension | Strategy | Automation |
|-----------|----------|------------|
| **Compute (horizontal)** | HPA based on CPU/memory + custom metrics | Auto |
| **Compute (vertical)** | Right-sizing based on historical usage | Quarterly review |
| **Database (reads)** | Read replicas + pgpool/pgbouncer | Manual (triggered at threshold) |
| **Database (writes)** | Vertical scaling first, then read replicas for reporting | Manual |
| **Cache (Redis)** | Vertical scaling; cluster mode for large tenants | Manual |
| **Queue workers** | HPA-based queue worker scaling (Laravel Horizon metrics) | Auto |
| **AI inference** | GPU node pool auto-scaling (if self-hosted models) | Auto |
| **Object storage** | Virtually unlimited (S3) | Auto |

**Phase 1 scaling targets:** 1,000 concurrent users, 100,000 responses/day, 10 tenants, 99.9% uptime
**Phase 2 scaling targets:** 10,000 concurrent users, 1M responses/day, 100 tenants, 99.95% uptime
**Year 5 targets:** 100,000 concurrent users, 10M responses/day, 1,000+ tenants, 99.99% uptime

### Disaster Recovery

| Scenario | RTO | RPO | Recovery Strategy |
|----------|-----|-----|-------------------|
| **Single AZ failure** | < 5 min | < 1 sec | Multi-AZ K8s + RDS Multi-AZ. Traffic shifted to healthy AZ. |
| **Single region failure** | < 1 hour | < 5 min | Cross-region replica (warm standby). DNS switch via Route53. |
| **Data corruption** | < 4 hours | < 24 hours | PITR to pre-corruption moment. Restore from WAL archive. |
| **Catastrophic data loss** | < 8 hours | < 1 hour | Restore from daily full backup + WAL replay. |
| **Ransomware / security incident** | < 24 hours | < 1 week | Restore from immutable backup (S3 Object Lock). |
| **K8s cluster failure** | < 30 min | — | IaC-based cluster rebuild (Terraform/Pulumi). Helm chart rehydration. |

**DR plan components:**
1. **Infrastructure as Code** (Terraform/Pulumi): Full environment definition in version control
2. **State backups**: Terraform state backed up to S3 with versioning
3. **Deployment automation**: Helm charts + GitHub Actions enable full rebuild from scratch
4. **Data replication**: Cross-region PostgreSQL streaming replication (or WAL shipping)
5. **S3 Cross-Region Replication (CRR)**: For media and documents
6. **Regular DR drills**: Full failover test quarterly
7. **Runbook**: Documented recovery procedures for every scenario

### Assumptions Requiring Validation

1. **Regional distribution**: Cloud region selection assumes target market geographies. If primary market shifts (e.g., Africa-first), region selection may change.
2. **Compliance requirements**: SOC2/ISO certification assumed. If FedRAMP or specific government certifications needed, additional controls required.
3. **Self-hosted AI**: GPU node pool for self-hosted models assumed for Phase 2+. If AI stays API-only, GPU costs eliminated.
4. **On-premise demand**: Significant on-premise deployment assumed for government clients. If market is primarily cloud, infrastructure strategy simplifies.

## Consequences

### Positive
- **Portability**: Kubernetes + Docker + Terraform provide true cloud and on-premise portability
- **Cost control**: Multi-cloud optionality prevents vendor lock-in pricing
- **Developer experience**: Local Docker Compose, CI/CD automation, and consistent environments
- **Recovery confidence**: Tested DR procedures with clear RTO/RPO targets
- **Observability**: Comprehensive metrics, logs, and tracing from day one
- **Compliance-ready**: Infrastructure supports audit, data sovereignty, and regulatory requirements

### Negative
- **Kubernetes operational cost**: Managed K8s clusters cost $100-300/month per cluster (control plane). Acceptable operational expense.
- **CI/CD complexity**: Pipeline maintenance requires dedicated DevOps attention
- **Learning curve**: Team must develop Kubernetes competency in parallel with platform development

### Risks
- **Infrastructure cost overruns**: Without optimization, cloud costs can grow faster than revenue. Mitigation: cost monitoring (Kubecost), right-sizing reviews, reserved instances.
- **Over-engineering**: Full K8s infrastructure may be excessive for early stage. Mitigation: Docker Compose for Phase 0-1, migrate to K8s at Phase 2 when scaling demands it.
- **Multi-cloud complexity**: Running effectively across two clouds is operationally demanding. Mitigation: AWS primary, GCP as DR/AI only; not fully active-active.

## Affected Domains

DevOps, Backend Engineering, AI Systems, Security, QA

## Decision Owner

Principal Software Architect (PSA)

## Review Schedule

- Phase 0-1 (first 6 months): Docker Compose development, prepare K8s migration plan
- Phase 2 go/no-go: Decision to migrate from Docker Compose to K8s
- Quarterly: Cloud cost review and optimization
- Annual: DR drill results review and plan update
