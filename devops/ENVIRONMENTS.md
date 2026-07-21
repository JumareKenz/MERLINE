# Merline Environment Strategy

## 1. Environment Overview

| Environment | Purpose | Infrastructure | Who Uses It | Deploy Method |
|-------------|---------|---------------|-------------|---------------|
| **Local** | Developer workstations | Docker Compose | Engineers | Local `docker compose up` |
| **Dev** | Integration testing, feature validation | Shared EKS, small nodes | Engineering team | Auto on `main` merge |
| **Integration** | Service integration contracts | Shared EKS (dev cluster) | Engineering team | Manual trigger |
| **Staging** | Pre-production validation, load tests | Production-like (smaller) | Engineering + QA | Auto after E2E pass |
| **Production** | Live customer traffic | Multi-AZ EKS, full HA | End users | Canary with approval |
| **DR** | Disaster recovery | Warm standby (DR region) | Operations | Manual failover |
| **Ephemeral** | Per-branch preview environments | On-demand K8s namespaces | Developers | Auto on PR creation |
| **Sandbox** | Demos, training, partner access | Low-resource K8s namespace | Customer success | Manual deploy |

---

## 2. Local Development Environment

```
Developer Machine
├── Docker Desktop (or Rancher Desktop)
├── docker-compose.yml (merline platform)
│   ├── PostgreSQL 16 (postgis/postgis)
│   ├── Redis 7 (redis:7-alpine)
│   ├── MinIO (S3-compatible object storage)
│   ├── MailHog (email capture)
│   ├── Laravel API (FrankenPHP, hot reload)
│   ├── Queue Workers (Horizon)
│   ├── Scheduler (Laravel schedule:work)
│   └── Next.js Frontend (hot reload)
├── Flutter SDK (mobile development)
└── ngrok / Tailscale (mobile API tunnel)
```

### Quick Start

```bash
# Prerequisites
choco install docker-desktop
choco install php composer
npm install -g pnpm
flutter upgrade

# Clone and start
git clone https://github.com/merline/merline
cd merline
cp .env.example .env
docker compose up -d

# Run migrations
docker compose exec api php artisan migrate
docker compose exec api php artisan db:seed

# Access
# API:       http://localhost:8080
# Frontend:  http://localhost:3000
# MinIO:     http://localhost:9001 (admin/minioadmin)
# MailHog:   http://localhost:8025
```

---

## 3. Development Environment (Shared)

### Architecture

```
EKS Cluster: merline-dev
Namespace: dev
Node Group: 2x t3.medium (on-demand)

Components:
- Reduced resource limits (all pods)
- 1 API replica (instead of 3)
- Single PostgreSQL (db.t3.small)
- Single Redis (cache.t3.small)
- MinIO instead of S3
- MailHog instead of SES
- No CDN (direct to ALB)
```

### Deployment

```bash
# Auto-deployed on every merge to main
# Pipeline: CI → Deploy to Dev
# URL: https://dev.merline.app

# Manual redeploy
helm upgrade --install merline-api ./charts/merline-api \
    --namespace dev \
    --values ./charts/merline-api/values/dev.yaml \
    --set image.tag=<git-sha>
```

### Access Controls

| Resource | Access |
|----------|--------|
| Dev EKS cluster | All engineers (AWS IAM + aws-auth ConfigMap) |
| Dev database | Read-only via Bastion. Write via application only. |
| Dev environment variables | AWS Secrets Manager, `/merline/dev/` |
| Dev logs | Grafana Loki (dev datasource) |

### Data Management

- **Database reset**: Weekly full refresh from anonymized staging snapshot
- **Test data**: Seed scripts create realistic test data (10 tenants, 100 studies)
- **AI costs**: Mock AI responses (no real API calls to paid models)
- **Storage**: MinIO reset on redeploy (ephemeral)

---

## 4. Integration/Testing Environment

### Purpose

- Service-to-service contract testing
- Integration test execution
- Migration validation
- Performance regression detection

### Configuration

```
EKS Cluster: merline-dev (shared with Dev)
Namespace: integration
Node Group: Spot instances (t3.large)

Components:
- Full service mesh (Istio — Phase 2)
- Database with production-like schema
- Real AI models (low-cost: Mistral, Llama via API)
- Test data generator with production-like volume
```

### Test Triggers

```bash
# Manual trigger via GitHub Actions
# On-demand: "Run Integration Tests" workflow

# Tests executed:
# 1. Service contract tests (Pact)
# 2. End-to-end user flows (Playwright)
# 3. Performance regression (k6)
# 4. Security scan (full suite)
# 5. Migration test (apply + rollback)
```

---

## 5. Staging Environment

### Architecture

```
EKS Cluster: merline-staging
Namespace: staging
Node Group: 3x t3.large (on-demand)
Database: db.t3.medium Multi-AZ
Redis: cache.t3.medium
CDN: CloudFront (staging distribution)
Monitoring: Full Prometheus + Grafana + Loki + Tempo
```

### Production Parity

| Aspect | Staging | Production |
|--------|---------|------------|
| K8s version | Same (1.29) | Same (1.29) |
| Helm charts | Same values, smaller replicas | Production values |
| PostgreSQL version | Same (16) | Same (16) |
| Redis version | Same (7) | Same (7) |
| Architecture | Multi-AZ (2 AZs) | Multi-AZ (3 AZs) |
| Monitoring | Full stack | Full stack |
| CDN | CloudFront | CloudFront |
| SSL | cert-manager + Let's Encrypt | ACM |
| Secrets | AWS Secrets Manager | AWS Secrets Manager |
| Deploy process | Same Helm+Argo (no approval) | Same + approval gate |

### Differences

- **Scale**: Staging runs 1-2 replicas (vs 3-10 in prod)
- **Data**: Anonymized subset of production data
- **AI models**: Lower-cost models (Mistral, Llama instead of GPT-4)
- **Backup**: Daily backup (vs hourly in prod)
- **Autoscaling**: Disabled (fixed replica count)

### Deployment

```bash
# Auto-deployed after E2E tests pass on Dev
# Pipeline: CI → Deploy Dev → E2E → Deploy Staging
# URL: https://staging.merline.app
```

### Load Testing

```yaml
name: Load Test
on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly, Monday 6 AM
  workflow_dispatch:

jobs:
  k6-load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run k6 load test
        run: |
          docker run --rm -i grafana/k6 run - < tests/load/staging.js
        env:
          K6_BASE_URL: https://staging.merline.app
          K6_VUS: 200
          K6_DURATION: 10m
```

---

## 6. Production Environment

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PRODUCTION (eu-west-1)                          │
│                                                                      │
│  ┌──────────────────────────────────────────────┐                   │
│  │           EKS Cluster: merline-prod            │                   │
│  │           Kubernetes 1.29                      │                   │
│  │           Multi-AZ (eu-west-1a, b, c)          │                   │
│  │                                               │                   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────┐  │                   │
│  │  │ Services   │  │ Batch      │  │ GPU    │  │                   │
│  │  │ 3-10 pods  │  │ 2-8 pods   │  │ 0-5    │  │                   │
│  │  └────────────┘  └────────────┘  └────────┘  │                   │
│  └──────────────────────────────────────────────┘                   │
│                                                                      │
│  ┌──────────────────────────────────────────────┐                   │
│  │  RDS PostgreSQL Multi-AZ                       │                   │
│  │  db.r6g.large × 1 primary + 2 read replicas    │                   │
│  │  PgBouncer (EKS sidecar)                       │                   │
│  └──────────────────────────────────────────────┘                   │
│                                                                      │
│  ┌──────────────────────────────────────────────┐                   │
│  │  ElastiCache Redis Cluster                     │                   │
│  │  cache.r6g.large × 3 shards (1+1 each)         │                   │
│  └──────────────────────────────────────────────┘                   │
│                                                                      │
│  ┌──────────────────────────────────────────────┐                   │
│  │  CDN: CloudFront + WAF                        │                   │
│  │  DNS: Route53 (merline.app)                  │                   │
│  │  SSL: ACM (*.merline.app)                    │                   │
│  └──────────────────────────────────────────────┘                   │
│                                                                      │
│  ┌──────────────────────────────────────────────┐                   │
│  │  Observability: Prometheus + Grafana +        │                   │
│  │                  Loki + Tempo                  │                   │
│  └──────────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Deployment

```bash
# Auto: Canary (10% → 50% → 100%) with approval gate
# Manual (hotfix): CI + approval + deploy
# Rollback: helm rollback (automatic on error threshold breach)
# URL: https://merline.app
```

### Production Runbooks

| Scenario | Runbook | Owner |
|----------|---------|-------|
| Instance failure | Pod auto-restarts (K8s) | Automated |
| Node failure | Pods rescheduled (Cluster Autoscaler) | Automated |
| AZ failure | Multi-AZ handles traffic to remaining AZs | Automated |
| Database failover | RDS Multi-AZ automatic failover | Automated |
| Region failure | Manual DR failover (RTO < 1h) | DevOps On-Call |
| Data corruption | PITR via WAL archive (RTO < 4h) | DevOps On-Call |
| Security incident | Incident response runbook | Security Lead |
| Deployment failure | Automatic rollback (Helm) | Automated |
| Traffic spike | HPA + Cluster Autoscaler | Automated |

---

## 7. Disaster Recovery Environment

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DR (eu-central-1)                               │
│                                                                      │
│  Warm Standby:                                                       │
│  - EKS Cluster: merline-dr (2x t3.medium, scaled down)              │
│  - RDS PostgreSQL: db.r6g.large (single-AZ, cross-region replica)   │
│  - ElastiCache: cache.r6g.large (single shard, empty)              │
│  - S3: CRR enabled (backups, media)                                 │
│                                                                      │
│  On Failover:                                                        │
│  - Scale up EKS nodes to production size                            │
│  - Promote RDS read replica to primary                               │
│  - Update Route53 DNS to DR ALB                                      │
│  - Restore S3 data if needed (or use CRR copy)                       │
│  - Redis rebuilt from cache warming                                  │
│                                                                      │
│  RTO: < 1 hour  |  RPO: < 5 minutes                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### DR Activation Conditions

- Primary region (eu-west-1) unavailable for > 15 minutes
- RDS primary unrecoverable
- Data corruption affecting > 1% of records
- Security incident requiring full isolation
- Scheduled DR drill (quarterly)

### DR Drill Procedure

```bash
# Scheduled quarterly DR drill
# 1. Announce drill in #incidents channel
# 2. Execute failover procedure
./scripts/dr/failover.sh --source eu-west-1 --target eu-central-1

# 3. Run validation tests
./scripts/dr/validate.sh --url https://dr.merline.app

# 4. Fail back
./scripts/dr/failback.sh --source eu-central-1 --target eu-west-1

# 5. Document results
./scripts/dr/report.sh --output docs/dr/drill-2026-Q3.md
```

---

## 8. Ephemeral Preview Environments

### Architecture

```
Per PR:
- New K8s namespace: `preview-pr-{number}`
- Deploy API + Worker + Frontend with PR's image tag
- Shared PostgreSQL (preview schema) + Redis
- URL: https://pr-{number}.preview.merline.app
- TTL: 7 days (auto-destroy after PR merge/close)
```

### GitHub Actions for Preview

```yaml
name: Preview Deploy
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy preview
        run: |
          helm upgrade --install merline-pr-${{ github.event.number }} \
            ./charts/merline-api \
            --namespace preview \
            --set image.tag=${{ github.event.pull_request.head.sha }} \
            --set ingress.host=pr-${{ github.event.number }}.preview.merline.app

      - name: Comment PR with preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 Preview deployed: https://pr-${context.issue.number}.preview.merline.app`
            })
```

---

## 9. Environment Parity Requirements

| Requirement | Dev | Staging | Production |
|-------------|-----|---------|------------|
| Kubernetes version | ✅ Same | ✅ Same | ✅ Same |
| PostgreSQL version | ✅ Same | ✅ Same | ✅ Same |
| Redis version | ✅ Same | ✅ Same | ✅ Same |
| Helm charts | ✅ Same | ✅ Same | ✅ Same |
| Docker images | ✅ Same | ✅ Same | ✅ Same |
| Deployment process | ✅ Same | ✅ Same | ✅ Same (with approval) |
| Monitoring stack | Full | Full | Full |
| Resource sizing | 1/4 scale | 1/2 scale | Full |
| Data volume | Synthetic | Anonymized subset | Real |
| Replica count | 1 | 2 | 3-20 |
| Multi-AZ | No | Yes (2 AZ) | Yes (3 AZ) |
| CDN | No | Yes | Yes |
| AI costs | Mock | Low-cost models | Full model suite |
| Backup schedule | None | Daily | Hourly + WAL |
| Autoscaling | No | No | Yes |

---

## 10. Configuration Management

### Per-Environment Configuration

```
config/
├── backend/
│   ├── .env.example              # Template with all keys documented
│   ├── .env.local                # Local development overrides (gitignored)
│   ├── config/
│   │   ├── app.php
│   │   ├── database.php
│   │   ├── cache.php
│   │   ├── queue.php
│   │   ├── services.php
│   │   ├── ai.php
│   │   └── tenant.php
│   └── environments/
│       ├── dev.php
│       ├── staging.php
│       └── prod.php
└── frontend/
    ├── .env.local
    └── next.config.js
```

### Environment Variables (Kubernetes ConfigMap)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: merline-api-config
  namespace: production
data:
  APP_ENV: "production"
  APP_URL: "https://merline.app"
  APP_DEBUG: "false"
  DB_CONNECTION: "pgsql"
  DB_HOST: "pgbouncer.production.svc.cluster.local"
  DB_PORT: "6432"
  DB_DATABASE: "merline"
  REDIS_HOST: "redis.production.svc.cluster.local"
  REDIS_PORT: "6379"
  AWS_BUCKET: "merline-media-prod"
  AWS_REGION: "eu-west-1"
  AWS_ENDPOINT: "s3.eu-west-1.amazonaws.com"
  MAIL_MAILER: "ses"
  SESSION_DRIVER: "redis"
  CACHE_DRIVER: "redis"
  QUEUE_CONNECTION: "redis"
  FILESYSTEM_DISK: "s3"
  SCOUT_DRIVER: "postgresql"
```

### Secrets (External Secrets Operator)

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: merline-api-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: merline-api-secrets
    creationPolicy: Owner
  dataFrom:
    - extract:
        key: /merline/production
```

### Feature Flags

```php
<?php
// config/features.php

return [
    'ai_insight_generator' => env('FEATURE_AI_INSIGHT_GENERATOR', false),
    'offline_dashboard' => env('FEATURE_OFFLINE_DASHBOARD', false),
    'new_sync_engine' => env('FEATURE_NEW_SYNC_ENGINE', false),
    'export_to_dhis2' => env('FEATURE_EXPORT_DHIS2', false),
];
```

### Feature Flag Configuration Per Environment

| Feature | Local | Dev | Staging | Production |
|---------|-------|-----|---------|------------|
| `ai_insight_generator` | false | true | true | true (canary) |
| `offline_dashboard` | true | true | true | false (Phase 2) |
| `new_sync_engine` | true | true | true | false (A/B test) |
| `export_to_dhis2` | false | false | true | false |

---

## 11. Environment Management Commands

```bash
# ─── Local ───
docker compose up -d                          # Start all services
docker compose down                            # Stop all services
docker compose logs -f api                    # Follow API logs
docker compose exec api php artisan migrate   # Run migrations

# ─── Dev ───
kubectl config use-context merline-dev
kubectl get pods -n dev
helm upgrade --install merline-api ./charts/merline-api -n dev -f ./charts/merline-api/values/dev.yaml

# ─── Staging ───
kubectl config use-context merline-staging
kubectl logs -n staging -l app=merline-api --tail=100 -f

# ─── Production ───
kubectl config use-context merline-prod
helm list -n production
kubectl exec -n production deploy/merline-api -- php artisan cache:clear
```
