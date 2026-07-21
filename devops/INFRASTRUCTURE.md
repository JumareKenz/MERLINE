# Merline Infrastructure Architecture

## 1. Cloud Provider Evaluation

### Decision: AWS Primary, GCP Secondary (Multi-Cloud)

| Criterion | AWS | GCP | Azure |
|-----------|-----|-----|-------|
| Global regions in MERL markets | **Best** (Africa: Cape Town, Middle East: Bahrain, India: Mumbai) | Moderate (fewer Africa/ME regions) | Moderate |
| Managed K8s (EKS/GKE/AKS) | Mature | **Best (GKE)** | Good |
| Managed PostgreSQL | RDS/Aurora | Cloud SQL | Flexible Server |
| Object Storage | **S3 (de facto standard)** | GCS (S3-compatible) | Blob Storage |
| AI/ML services | SageMaker | **Vertex AI (best)** | Azure AI |
| Egress costs | Higher | **Lower** | Moderate |
| Enterprise support | **Largest ecosystem** | Growing | Microsoft-centric |
| Talent pool | **Largest** | Growing | Enterprise-focused |
| On-premise parity | Outposts | **Anthos (best)** | Azure Arc |

**Primary (AWS):**
- EKS for Kubernetes orchestration
- RDS PostgreSQL for managed databases (Multi-AZ, read replicas)
- ElastiCache for Redis
- S3 for object storage
- CloudFront for CDN
- Route53 for DNS
- ACM for SSL certificates
- WAF + Shield for security

**Secondary (GCP):**
- Disaster recovery (cross-cloud)
- AI/ML workloads benefiting from Vertex AI TPUs
- Cost arbitrage for compute-heavy workloads

### Region Selection

| Environment | Primary Region | DR Region |
|-------------|---------------|-----------|
| Production | `eu-west-1` (Ireland) — GDPR-friendly, broad service catalog | `eu-central-1` (Frankfurt) — cross-region DR |
| Staging | `eu-west-1` | — |
| Dev | `eu-west-1` (shared, smaller instances) | — |
| DR | — | `eu-central-1` (warm standby) |

Future regions for data sovereignty (Phase 3+):
- `af-south-1` (Cape Town) — Africa operations
- `me-south-1` (Bahrain) — Middle East
- `ap-south-1` (Mumbai) — South Asia

---

## 2. Resource Requirements Per Environment

### Development Environment

| Resource | Spec | Nodes | Cost/Month (est.) |
|----------|------|-------|-------------------|
| EKS Control Plane | Standard | 1 | $73 |
| Worker Nodes (on-demand) | t3.medium (2vCPU, 4GB) | 2 | ~$70 |
| RDS PostgreSQL | db.t3.small (2vCPU, 2GB) | 1 | ~$30 |
| ElastiCache Redis | cache.t3.small (1vCPU, 1.5GB) | 1 | ~$20 |
| S3 | Standard | — | ~$5 |
| **Total** | | | **~$200/mo** |

### Staging Environment

| Resource | Spec | Nodes | Cost/Month (est.) |
|----------|------|-------|-------------------|
| EKS Control Plane | Standard | 1 | $73 |
| Worker Nodes (on-demand) | t3.large (2vCPU, 8GB) | 3 | ~$170 |
| RDS PostgreSQL | db.t3.medium (2vCPU, 4GB) Multi-AZ | 1 | ~$100 |
| ElastiCache Redis | cache.t3.medium (1vCPU, 3.2GB) | 1 | ~$40 |
| S3 | Standard | — | ~$10 |
| **Total** | | | **~$400/mo** |

### Production Environment (Phase 1 targets)

| Resource | Spec | Nodes | Cost/Month (est.) |
|----------|------|-------|-------------------|
| EKS Control Plane | Standard | 1 | $73 |
| Worker Nodes (on-demand) | m6i.large (2vCPU, 8GB) | 5 | ~$350 |
| Worker Nodes (spot) | m6i.xlarge (4vCPU, 16GB) | 5 | ~$200 |
| Worker Nodes (spot - GPU) | g5.xlarge (1 GPU, 4vCPU, 16GB) | 2 | ~$250 |
| RDS PostgreSQL | db.r6g.large (2vCPU, 16GB) Multi-AZ | 1 primary + 2 replicas | ~$500 |
| ElastiCache Redis | cache.r6g.large (2vCPU, 13GB) Cluster | 1 cluster (3 shards) | ~$300 |
| S3 + CloudFront | Standard + CDN | — | ~$100 |
| NAT Gateway | — | 1 per AZ (3 AZs) | ~$100 |
| ALB | — | 2 (internal + external) | ~$50 |
| **Total** | | | **~$1,900/mo** |

### Disaster Recovery Environment (Warm Standby)

| Resource | Spec | Notes |
|----------|------|-------|
| EKS Control Plane | Standard | Always running |
| Worker Nodes (minimum) | 2x t3.medium | Scaled down, scale up on failover |
| RDS PostgreSQL | db.r6g.large (single-AZ, no replicas) | Cross-region replication |
| S3 | CRR enabled | Cross-region replication |

---

## 3. Network Architecture

### VPC Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                          VPC (10.0.0.0/16)                           │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              Public Subnets (10.0.1.0/24, 10.0.2.0/24,        │ │
│  │                           10.0.3.0/24)                        │ │
│  │                                                                │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │ │
│  │  │ NAT GW   │  │ ALB      │  │ Bastion  │                     │ │
│  │  │ (AZ-a)   │  │ (Public) │  │ (jump)   │                     │ │
│  │  └──────────┘  └──────────┘  └──────────┘                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │         Private Subnets (10.0.11.0/24, 10.0.12.0/24,          │ │
│  │                       10.0.13.0/24)                           │ │
│  │                                                                │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │ │
│  │  │ EKS Worker    │  │ Internal ALB  │  │ Service Mesh     │    │ │
│  │  │ Nodes         │  │ (service-svc) │  │ (Istio - Ph2)   │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │         Data Subnets (10.0.21.0/24, 10.0.22.0/24,             │ │
│  │                       10.0.23.0/24)                           │ │
│  │                                                                │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │ │
│  │  │ RDS PostgreSQL│  │ ElastiCache   │  │ S3 VPC Endpoint  │    │ │
│  │  │ (Multi-AZ)    │  │ Redis Cluster │  │ (Gateway)        │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘    │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Subnet Layout

| Tier | CIDR | Per AZ | Purpose |
|------|------|--------|---------|
| Public | 10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24 | /28 | NAT GW, ALB, Bastion |
| Private | 10.0.11.0/24, 10.0.12.0/24, 10.0.13.0/24 | /28 | EKS workers, internal ALB |
| Data | 10.0.21.0/24, 10.0.22.0/24, 10.0.23.0/24 | /28 | RDS, Redis, S3 Endpoint |
| Protected | 10.0.31.0/24, 10.0.32.0/24, 10.0.33.0/24 | /28 | Future PCI/HIPAA workloads |

### Network Security

```
Security Groups:

┌─────────────────────────────────────────────────────────────────────┐
│ ALB Security Group                                                  │
│ Ingress: 443 (HTTPS) from 0.0.0.0/0                                │
│ Ingress: 80 (HTTP) → redirect to 443                               │
│ Egress: 443 to EKS worker nodes                                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ EKS Worker Security Group                                           │
│ Ingress: 443 from ALB SG                                           │
│ Ingress: 10250 (kubelet) from EKS control plane SG                 │
│ Ingress: 3000-10000 (NodePort) from internal sources               │
│ Egress: 443 to RDS, Redis, S3 Endpoint                             │
│ Egress: 443 to external APIs (AI models, webhooks)                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ RDS Security Group                                                  │
│ Ingress: 5432 from EKS worker SG                                   │
│ Ingress: 5432 from Bastion SG (for maintenance)                    │
│ Egress: None (locked down)                                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ElastiCache Redis Security Group                                    │
│ Ingress: 6379 from EKS worker SG                                   │
│ Egress: None                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Network Architecture Decisions

| Component | Decision | Rationale |
|-----------|----------|-----------|
| NAT Gateway | 1 per AZ (3 AZs) | High availability. Each AZ has independent NAT. |
| VPC Endpoints | S3 Gateway Endpoint | Free. No egress costs for S3 traffic. |
| VPN | AWS Client VPN | Developer access to private resources. SSO integration. |
| Transit Gateway | Phase 3+ | For on-premise and multi-region connectivity. |
| Direct Connect | Phase 3+ | For government clients with dedicated connectivity. |

---

## 4. Database Infrastructure

### Primary PostgreSQL (RDS)

```
┌──────────────────────────────────────────────────────────────┐
│                    RDS PostgreSQL (Primary)                    │
│                      db.r6g.large (2vCPU, 16GB)               │
│                      Multi-AZ (synchronous standby)           │
│                      Storage: 500GB gp3 (3000 IOPS baseline)  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │ Primary     │  │ Standby    │  │ Read       │             │
│  │ (AZ-a)      │──│ (AZ-b)     │  │ Replica 1  │             │
│  │ Writes      │  │ Sync       │  │ (AZ-c)     │             │
│  └────────────┘  └────────────┘  │ Read       │             │
│                                  │ Replica 2  │             │
│                                  │ (AZ-a)     │             │
│                                  └────────────┘             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PgBouncer (on EKS or RDS Proxy)                      │   │
│  │  Transaction pooling. 50 pool size. Port 6432.        │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Connection Pooling — PgBouncer

```ini
[databases]
merline = host=primary.xxx.rds.amazonaws.com port=5432 dbname=merline
merline_replica = host=replica.xxx.rds.amazonaws.com port=5432 dbname=merline

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
pool_mode = transaction
default_pool_size = 50
max_client_conn = 300
max_db_connections = 100
server_idle_timeout = 300
query_timeout = 30
```

### Read Replica Usage

| Replica | Purpose | Instance Type | Region |
|---------|---------|---------------|--------|
| Replica 1 (RO) | Application reads, dashboards | db.r6g.large | Same AZ |
| Replica 2 (RO) | Reports, data exports | db.r6g.large | Same region, different AZ |
| Replica 3 (Analytics) | Heavy analytical queries, materialized views | db.r6g.xlarge | Same region |
| DR Replica | Disaster recovery | db.r6g.large | DR region (eu-central-1) |

### Database Parameter Groups

```ini
# Memory
shared_buffers = '4GB'                   # 25% of RAM
effective_cache_size = '12GB'            # 75% of RAM
work_mem = '64MB'
maintenance_work_mem = '1GB'

# Connections (managed by PgBouncer)
max_connections = 200

# WAL (for PITR and CDC)
wal_level = 'logical'
wal_compression = 'zstd'
min_wal_size = '4GB'
max_wal_size = '16GB'

# Performance
random_page_cost = 1.1                   # SSD-optimized
effective_io_concurrency = 200
default_statistics_target = 500

# Autovacuum (aggressive for high write volume)
autovacuum_max_workers = 4
autovacuum_naptime = '60s'
autovacuum_vacuum_scale_factor = 0.01
autovacuum_analyze_scale_factor = 0.005

# Extensions
shared_preload_libraries = 'pg_stat_statements, auto_explain, pg_cron'
```

### Backup Configuration

| Backup Type | Schedule | Retention | Method |
|-------------|----------|-----------|--------|
| Automated snapshot | Daily (RDS automated) | 35 days | RDS managed |
| Manual snapshot | Pre-deployment | 90 days | Manual trigger |
| WAL archiving | Continuous | 7 days (PITR window) | RDS automated |
| Export (pg_dump) | Weekly | 90 days | Custom job to S3 |
| Cross-region snapshot | Daily | 35 days | RDS cross-region |

---

## 5. Cache Infrastructure (Redis)

### Redis Cluster Design

```
┌──────────────────────────────────────────────────────────────┐
│           ElastiCache for Redis (Cluster Mode)                │
│                      cache.r6g.large                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Shard 1      │  │  Shard 2      │  │  Shard 3      │       │
│  │  (Primary)    │  │  (Primary)    │  │  (Primary)    │       │
│  │  + 1 Replica  │  │  + 1 Replica  │  │  + 1 Replica  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  Slots: 0-5460     Slots: 5461-10922  Slots: 10923-16383    │
└──────────────────────────────────────────────────────────────┘
```

### Redis Use Cases

| Use Case | Data Type | Eviction Policy | Memory Estimate |
|----------|-----------|----------------|-----------------|
| Session store | String (JSON) | volatile-ttl | 500MB (100K sessions) |
| Cache (query results) | String (JSON) | allkeys-lru | 2GB |
| Queue (Laravel Horizon) | List + Stream | noeviction | 1GB |
| Rate limiter | Sorted Set | volatile-ttl | 200MB |
| Pub/Sub (real-time) | Pub/Sub channels | — | 100MB |
| Lock manager | String (NX) | volatile-ttl | 50MB |
| Counter | String | volatile-ttl | 50MB |
| **Total** | | | **~4GB** |

### Cache Key Schema

```
merline:{tenant_id}:{entity}:{id}:{suffix}
merline:{tenant_id}:query:{md5_of_sql}
merline:{tenant_id}:session:{user_id}

Examples:
merline:tenant_abc:project:uuid-123:detail
merline:tenant_abc:study:uuid-456:dashboard
merline:tenant_abc:session:user-789
```

### Redis Replication

| Shard | Purpose | Region |
|-------|---------|--------|
| Primary cluster | Cache, queue, session, rate limit | Production region |
| Replica group | Read-heavy cache workloads | Same region |
| Global datastore (future) | Cross-region active-passive | DR region |

---

## 6. Storage Infrastructure (S3)

### Bucket Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    S3 Organization                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  merline-media-{env}         (Media files)                    │
│  /tenant/{id}/study/{id}/media/{uuid}                        │
│  ├── photos/    → CloudFront cache (1 hour)                  │
│  ├── audio/     → CloudFront cache (1 day)                   │
│  ├── video/     → CloudFront cache (7 days)                  │
│  └── signatures/→ Direct access (no cache)                   │
│                                                              │
│  merline-reports-{env}       (Generated reports)              │
│  /tenant/{id}/report/{id}.pdf                                │
│  → CloudFront signed URLs (24 hour expiry)                   │
│                                                              │
│  merline-documents-{env}     (Uploaded documents)             │
│  /tenant/{id}/doc/{uuid}.pdf                                 │
│  → CloudFront signed URLs (7 day expiry)                     │
│                                                              │
│  merline-backups-{env}       (Database backups)               │
│  /db/{tenant}/{date}/dump.sql.gz                             │
│  /config/{service}/{date}/backup.tar.gz                      │
│  → Direct access (restricted IAM)                            │
│  → Object Lock (write-once, immutable)                       │
│                                                              │
│  merline-ai-artifacts-{env}  (Model artifacts)               │
│  /models/{name}/{version}/                                   │
│  /embeddings/cache/                                          │
│  → Direct access (restricted IAM)                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Lifecycle Policies

| Bucket | Transition | Expiration |
|--------|------------|------------|
| media | 30d → S3 Standard-IA, 90d → S3 Glacier Instant Retrieval, 365d → S3 Glacier Deep Archive | 7 years |
| reports | 7d → S3 Standard-IA, 90d → S3 Glacier | 7 years |
| documents | 90d → S3 Standard-IA, 365d → S3 Glacier | 7 years |
| backups | 7d → S3 Standard-IA, 30d → S3 Glacier | 90 days (daily), 35 days (WAL) |
| ai-artifacts | No transition | 90 days |

### S3 Security

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::merline-media-prod",
        "arn:aws:s3:::merline-media-prod/*"
      ],
      "Condition": {
        "Bool": { "aws:SecureTransport": "false" }
      }
    },
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::merline-backups-prod",
        "arn:aws:s3:::merline-backups-prod/*"
      ],
      "Condition": {
        "Bool": { "aws:SecureTransport": "false" }
      }
    }
  ]
}
```

- **Server-side encryption**: AES-256 (SSE-S3) for all buckets
- **Object Lock**: Enabled on backups bucket (governance mode, 30-day retention)
- **Block Public Access**: Enabled on all buckets
- **VPC Endpoint**: S3 Gateway Endpoint for private subnet access
- **Cross-Region Replication**: backups and media buckets to DR region

---

## 7. Kubernetes Cluster Design

### Cluster Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    EKS Cluster (merline-prod)                  │
│                    Kubernetes 1.29                            │
│                    Region: eu-west-1                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Node Groups                               │    │
│  │                                                       │    │
│  │  System (OD): m6i.large × 2  (kube-system, monitoring) │    │
│  │  Services (OD): m6i.large × 3  (API, web services)    │    │
│  │  Batch (Spot): m6i.xlarge × 3  (queue workers, cron)   │    │
│  │  GPU (Spot):   g5.xlarge × 2   (AI inference)          │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │           Namespaces                                  │    │
│  │                                                       │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │    │
│  │  │ api-gw │ │ study  │ │ data-  │ │ field- │        │    │
│  │  │        │ │        │ │ coll   │ │ ops    │        │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘        │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │    │
│  │  │ analytic│ │ repor- │ │ know-  │ │ ai     │        │    │
│  │  │ s       │ │ ting   │ │ ledge  │ │        │        │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘        │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │    │
│  │  │ identity│ │ integr-│ │ notif- │ │ queue  │        │    │
│  │  │        │ │ ation  │ │ ication│ │ workers│        │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘        │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │           Add-ons                                     │    │
│  │                                                       │    │
│  │  • cert-manager (Let's Encrypt + internal CA)         │    │
│  │  • External Secrets Operator (AWS Secrets Manager)    │    │
│  │  • nginx-ingress (external traffic)                   │    │
│  │  • Cluster Autoscaler (node-level)                    │    │
│  │  • Karpenter (future replacement for CA)              │    │
│  │  • Prometheus Stack (kube-prometheus)                 │    │
│  │  • Loki Stack (logging)                               │    │
│  │  • OpenTelemetry Collector (traces)                   │    │
│  │  • Falco (runtime security)                           │    │
│  │  • Kubecost (cost monitoring)                         │    │
│  │  • Trivy Operator (vulnerability scanning)            │    │
│  │  • Velero (backup)                                    │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Node Group Configuration

```yaml
# System Node Group (critical infrastructure)
nodeGroup: system
instanceType: m6i.large
minSize: 2
maxSize: 4
desiredSize: 2
labels:
  role: system
taints:
  - key: "CriticalAddonsOnly"
    value: "true"
    effect: "NoSchedule"

# Service Node Group (application workloads)
nodeGroup: services
instanceType: m6i.large
minSize: 3
maxSize: 10
desiredSize: 3
labels:
  role: services

# Batch Node Group (queue workers, cron, async processing)
nodeGroup: batch
instanceType: m6i.xlarge
minSize: 2
maxSize: 8
desiredSize: 2
spot: true
spotAllocationStrategy: capacity-optimized
labels:
  role: batch
taints:
  - key: "worker"
    value: "true"
    effect: "NoSchedule"

# GPU Node Group (AI inference — self-hosted models Phase 2+)
nodeGroup: gpu
instanceType: g5.xlarge
minSize: 0
maxSize: 5
desiredSize: 0
spot: true
labels:
  role: gpu
taints:
  - key: "nvidia.com/gpu"
    value: "true"
    effect: "NoSchedule"
```

### Autoscaling Configuration

```yaml
# Cluster Autoscaler
clusterAutoscaler:
  enabled: true
  scaleDownDelayAfterAdd: 10m
  scaleDownUnneededTime: 10m
  maxNodeProvisionTime: 15m

# Horizontal Pod Autoscaler (per service)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    - type: Pods
      pods:
        metric:
          name: queue_length
        target:
          type: AverageValue
          averageValue: 100
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 60
        - type: Pods
          value: 4
          periodSeconds: 60
```

### Pod Resource Requests/Limits (Baseline)

| Workload | CPU Request | CPU Limit | Memory Request | Memory Limit | Replicas |
|----------|-------------|-----------|----------------|--------------|----------|
| API Gateway | 500m | 1000m | 512Mi | 1Gi | 3-10 |
| Study Service | 500m | 1000m | 512Mi | 1Gi | 2-6 |
| Data Collection | 500m | 1000m | 512Mi | 1Gi | 2-6 |
| Field Ops | 500m | 1000m | 512Mi | 1Gi | 2-6 |
| Analytics | 1000m | 2000m | 1Gi | 2Gi | 2-4 |
| Reporting | 500m | 1000m | 1Gi | 2Gi | 2-4 |
| Knowledge | 500m | 1000m | 512Mi | 1Gi | 2-4 |
| Identity | 500m | 1000m | 512Mi | 1Gi | 2-4 |
| Integration | 500m | 1000m | 512Mi | 1Gi | 2-4 |
| AI Gateway | 500m | 1000m | 512Mi | 1Gi | 2-6 |
| RAG Service | 1000m | 2000m | 1Gi | 2Gi | 2-4 |
| Queue Workers | 500m | 2000m | 512Mi | 1Gi | 5-20 |
| Next.js Frontend | 500m | 1000m | 512Mi | 1Gi | 2-6 |

### Pod Disruption Budgets

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-gateway-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api-gateway
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: queue-workers-pdb
spec:
  maxUnavailable: 20%
  selector:
    matchLabels:
      app: queue-worker
```

---

## 8. CDN Strategy (CloudFront)

### Distribution Configuration

```
CloudFront Distribution (d123.cloudfront.net)
├── Origin: merline-media-{env}.s3.eu-west-1.amazonaws.com
│   ├── Cache Policy: CachingOptimized (24h TTL)
│   ├── Origin Request Policy: AllViewerExceptHostHeader
│   ├── Behaviors:
│   │   ├── /media/photos/* → TTL 1h, Forward query strings
│   │   ├── /media/audio/* → TTL 24h, Forward query strings
│   │   ├── /media/video/* → TTL 7d, Forward query strings
│   │   └── /reports/* → TTL 0, Signed URLs required
│   └── Error pages: 403 → /index.html (SPA fallback)
│
├── Origin: {app-load-balancer}.elb.amazonaws.com (custom origin)
│   ├── Cache Policy: CachingDisabled (API)
│   ├── Origin Request Policy: AllViewer
│   └── Behaviors:
│       ├── /api/* → No cache, Forward all headers
│       ├── /_next/* → TTL 1y, immutable
│       └── /static/* → TTL 1y, immutable
│
├── WAF: Associated Web ACL (rate limiting, IP blocking, SQLi/XSS)
├── SSL: Custom SSL certificate (ACM, *.merline.app)
├── Price Class: Use All Edge Locations (Global)
└── Logging: S3 bucket for access logs
```

### Signed URLs for Reports

```php
<?php
use Aws\CloudFront\CloudFrontClient;

$client = new CloudFrontClient([
    'region' => 'eu-west-1',
    'version' => 'latest',
]);

$keyPairId = env('CLOUDFRONT_KEY_PAIR_ID');
$privateKey = file_get_contents(storage_path('cloudfront-private-key.pem'));

$signedUrl = $client->getSignedUrl([
    'url' => "https://d123.cloudfront.net/reports/tenant_{$id}/report.pdf",
    'expires' => time() + 86400, // 24 hours
    'key_pair_id' => $keyPairId,
    'private_key' => $privateKey,
]);
```

---

## 9. DNS and SSL Management

### DNS Architecture (Route53)

```
merline.app (Public Hosted Zone in Route53)
├── merline.app → CloudFront Distribution (ALIAS)
├── api.merline.app → ALB (ALIAS)
├── *.merline.app → CloudFront Distribution (ALIAS)
├── admin.merline.app → CloudFront Distribution (ALIAS)
├── dev.merline.app → Dev ALB (ALIAS, private)
├── staging.merline.app → Staging ALB (ALIAS)
│
├── _dmarc.merline.app → DMARC policy
├── _domainkey.merline.app → DKIM (SES)
├── merline._domainkey.merline.app → DKIM selector
│
├── TXT: v=spf1 include:amazonses.com ~all
├── MX: 10 inbound-smtp.eu-west-1.amazonaws.com
│
└── (Private Hosted Zone) internal.merline.app → Internal ALB, RDS, Redis
```

### SSL Certificate Strategy

| Certificate | Domains | Issuer | Renewal |
|-------------|---------|--------|---------|
| Public | `*.merline.app`, `merline.app` | AWS ACM | Automatic (60 day) |
| Internal | `*.internal.merline.app` | Private CA (ACM) | Automatic (13 months) |
| Staging | `*.staging.merline.app` | Let's Encrypt (cert-manager) | Automatic (60 day) |
| Dev | `*.dev.merline.app` | Let's Encrypt (cert-manager) | Automatic (60 day) |

### cert-manager Configuration (Cluster Issuer)

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: devops@merline.app
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - dns01:
          route53:
            region: eu-west-1
            hostedZoneID: Z123456789
```

---

## 10. Infrastructure as Code (Terraform)

### Module Structure

```
terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   └── prod/
│       ├── main.tf
│       ├── variables.tf
│       └── terraform.tfvars
├── modules/
│   ├── networking/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── eks/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── rds/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── redis/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── s3/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── cloudfront/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── iam/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── monitoring/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── state/
    └── backend.tf (S3 + DynamoDB locking)
```

### State Management

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "merline-terraform-state"
    key            = "environments/prod/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "merline-terraform-locks"
  }
}
```

---

## 11. Scaling Targets by Phase

| Metric | Phase 1 (0-6mo) | Phase 2 (6-18mo) | Phase 3 (18-36mo) |
|--------|----------------|------------------|-------------------|
| Concurrent users | 1,000 | 10,000 | 100,000 |
| Daily responses | 100K | 1M | 10M |
| Tenants | 10 | 100 | 1,000+ |
| Storage (S3) | 500GB | 5TB | 50TB |
| DB storage | 100GB | 500GB | 5TB+ |
| DB connections (pooled) | 100 | 300 | 500+ |
| Redis memory | 4GB | 16GB | 64GB |
| K8s worker nodes | 5-10 | 15-30 | 50-100 |
| Uptime target | 99.9% | 99.95% | 99.99% |

---

## 12. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Multi-AZ deployment | 3 AZs (eu-west-1a, b, c) | Balance of resilience and cost. Survives 1 AZ failure. |
| NAT Gateway per AZ | 3 NAT Gateways | Prevents cross-AZ data transfer costs for NAT traffic. |
| Spot instances for batch/GPU | Yes | 60-70% cost reduction for fault-tolerant workloads. |
| PgBouncer vs RDS Proxy | PgBouncer on EKS | More configuration control. Same cost. Runs in Kubernetes. |
| Cluster Autoscaler vs Karpenter | Cluster Autoscaler (Phase 1) | Simpler. Karpenter considered for Phase 2 for faster scaling. |
| Velero for backup | Yes | K8s resource backup + restore. Supports S3 for storage. |
| CloudFront WAF | Yes | Integrated DDoS protection, rate limiting, and OWASP rules. |

