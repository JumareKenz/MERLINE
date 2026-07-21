# Merline CI/CD Pipeline Design

## 1. Branch Strategy: Trunk-Based Development with Feature Flags

```
main ───────────────────────────────────────────────────────────────
  │          │           │            │              │
  │ PR #1    │ PR #2     │ PR #3      │ Hotfix #1    │ Release v1.2
  │ feature/ │ feature/  │ feature/   │ fix/         │
  │ study-   │ offline-  │ ai-        │ prod-crash   │
  │ designer │ sync      │ gateway    │              │
  │          │           │            │              │
  └──────────┴───────────┴────────────┴──────────────┘
       │           │           │             │
       ▼           ▼           ▼             ▼
   ┌────────┐ ┌────────┐ ┌────────┐   ┌──────────┐
   │ Dev    │ │ Dev    │ │ Dev    │   │ Dev      │
   │ Deploy │ │ Deploy │ │ Deploy │   │ Deploy   │
   └────────┘ └────────┘ └────────┘   └──────────┘
                     │
                     ▼
               ┌──────────┐
               │ Staging   │
               │ Deploy    │
               └──────────┘
                     │
               (Approval Gate)
                     │
                     ▼
               ┌──────────┐
               │ Production│
               │ Deploy   │
               └──────────┘
```

**Rules:**
- `main` is always deployable. No direct commits.
- Feature branches branch from `main`, merge back via PR.
- Feature flags enable/disable incomplete features in production.
- Hotfix branches (`fix/description`) bypass feature branches but still require PR.
- Release tags (`v1.2.3`) are created from `main` for version tracking.

---

## 2. GitHub Actions Workflow Structure

### Workflow Organization

```
.github/workflows/
├── ci.yml                          # CI pipeline (PR trigger)
├── cd.yml                          # CD pipeline (push to main)
├── hotfix.yml                      # Hotfix pipeline
├── release.yml                     # Release / version tagging
├── security-scan.yml               # Scheduled security scans
├── cleanup.yml                     # Registry cleanup
├── terraform-plan.yml              # Infrastructure plan (PR)
├── terraform-apply.yml             # Infrastructure apply (push to main)
├── migration-test.yml              # Database migration tests
├── load-test.yml                   # Load tests (scheduled)
└── dr-drill.yml                    # DR drill automation
```

### CI Pipeline (`ci.yml`)

```yaml
name: CI

on:
  pull_request:
    branches: [main]
    paths:
      - 'backend/**'
      - 'frontend/**'
      - 'ai/**'

concurrency:
  group: ci-${{ github.head_ref }}
  cancel-in-progress: true

jobs:
  # ─── Static Analysis ───
  lint-backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          extensions: pgsql, redis, pcntl
      - run: composer install --prefer-dist --no-progress
      - run: ./vendor/bin/pint --test
      - run: ./vendor/bin/phpstan analyse --level=8

  lint-frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit

  # ─── Security Scan ───
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Dependency scan (backend)
        run: |
          cd backend
          composer audit
      - name: Dependency scan (frontend)
        run: |
          cd frontend
          npm audit --audit-level=high
      - name: SAST (Semgrep)
        uses: semgrep/semgrep-action@v1
        with:
          config: p/default

  # ─── Tests ───
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_DB: merline_test
          POSTGRES_USER: merline
          POSTGRES_PASSWORD: merline
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          extensions: pgsql, redis, pcntl
      - run: composer install --prefer-dist --no-progress
      - name: Run tests
        run: php artisan test --parallel --coverage --min=80
        env:
          DB_CONNECTION: pgsql
          DB_HOST: localhost
          DB_DATABASE: merline_test
          DB_USERNAME: merline
          DB_PASSWORD: merline
          REDIS_HOST: localhost
          APP_ENV: testing

  test-frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:ci

  # ─── Build & Push ───
  build-api:
    needs: [lint-backend, test-backend, security-scan]
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - name: Build & push API image
        uses: docker/build-push-action@v5
        with:
          context: backend
          file: backend/docker/Dockerfile.api
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/api:${{ github.sha }}
            ghcr.io/${{ github.repository }}/api:pr-${{ github.event.number }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  build-worker:
    needs: [lint-backend, test-backend, security-scan]
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - name: Build & push worker image
        uses: docker/build-push-action@v5
        with:
          context: backend
          file: backend/docker/Dockerfile.worker
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/worker:${{ github.sha }}
            ghcr.io/${{ github.repository }}/worker:pr-${{ github.event.number }}

  build-frontend:
    needs: [lint-frontend, test-frontend, security-scan]
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - name: Build & push frontend image
        uses: docker/build-push-action@v5
        with:
          context: frontend
          file: frontend/Dockerfile
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/frontend:${{ github.sha }}
            ghcr.io/${{ github.repository }}/frontend:pr-${{ github.event.number }}
```

### CD Pipeline (`cd.yml`)

```yaml
name: CD

on:
  push:
    branches: [main]

concurrency:
  group: cd-${{ github.ref }}
  cancel-in-progress: false  # Never cancel production deployments

jobs:
  # ─── CI (re-run on merge) ───
  ci:
    uses: ./.github/workflows/ci.yml

  # ─── Deploy to Dev ───
  deploy-dev:
    needs: [ci]
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - uses: actions/checkout@v4

      - uses: azure/setup-helm@v3
        with:
          version: '3.14.0'

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/github-actions-dev
          aws-region: eu-west-1

      - name: Deploy to EKS (Dev)
        run: |
          aws eks update-kubeconfig --region eu-west-1 --name merline-dev
          helm upgrade --install merline-api ./charts/merline-api \
            --namespace dev \
            --values ./charts/merline-api/values/dev.yaml \
            --set image.tag=${{ github.sha }} \
            --wait --timeout 10m

  # ─── E2E Tests ───
  e2e-tests:
    needs: [deploy-dev]
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - uses: actions/checkout@v4
      - name: Run E2E tests
        run: |
          cd tests/e2e
          npm ci
          npm run test:e2e -- --base-url https://dev.merline.app
        env:
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}

  # ─── Deploy to Staging ───
  deploy-staging:
    needs: [e2e-tests]
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to EKS (Staging)
        run: |
          aws eks update-kubeconfig --region eu-west-1 --name merline-staging
          helm upgrade --install merline-api ./charts/merline-api \
            --namespace staging \
            --values ./charts/merline-api/values/staging.yaml \
            --set image.tag=${{ github.sha }} \
            --wait --timeout 10m

  # ─── Staging Smoke Tests ───
  staging-smoke:
    needs: [deploy-staging]
    runs-on: ubuntu-latest
    steps:
      - name: Run smoke tests
        run: |
          curl -f --retry 5 --retry-delay 10 https://staging.merline.app/health
          curl -f --retry 5 --retry-delay 10 https://staging.merline.app/api/health

  # ─── Manual Approval Gate ───
  approval:
    needs: [staging-smoke]
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Await approval
        uses: trstringer/manual-approval@v1
        with:
          secret: ${{ secrets.GITHUB_TOKEN }}
          approvers: ${{ vars.PRODUCTION_APPROVERS }}

  # ─── Deploy to Production ───
  deploy-production:
    needs: [approval]
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy Canary (10%)
        run: |
          aws eks update-kubeconfig --region eu-west-1 --name merline-prod
          helm upgrade --install merline-api ./charts/merline-api \
            --namespace production \
            --values ./charts/merline-api/values/prod.yaml \
            --set image.tag=${{ github.sha }} \
            --set canary.enabled=true \
            --set canary.weight=10 \
            --wait --timeout 15m

      - name: Monitor canary (5 minutes)
        run: sleep 300

      - name: Promote to 50%
        run: |
          helm upgrade --install merline-api ./charts/merline-api \
            --namespace production \
            --values ./charts/merline-api/values/prod.yaml \
            --set image.tag=${{ github.sha }} \
            --set canary.weight=50 \
            --wait --timeout 15m

      - name: Monitor canary (5 minutes)
        run: sleep 300

      - name: Promote to 100%
        run: |
          helm upgrade --install merline-api ./charts/merline-api \
            --namespace production \
            --values ./charts/merline-api/values/prod.yaml \
            --set image.tag=${{ github.sha }} \
            --set canary.enabled=false \
            --wait --timeout 15m

  # ─── Post-Deploy Validation ───
  post-deploy:
    needs: [deploy-production]
    runs-on: ubuntu-latest
    steps:
      - name: Smoke test production
        run: |
          curl -f --retry 10 --retry-delay 30 https://merline.app/health
          curl -f --retry 10 --retry-delay 30 https://merline.app/api/health

      - name: Send deployment notification
        uses: slackapi/slack-github-action@v1
        with:
          channel-id: '#deployments'
          slack-message: |
            :rocket: Production deployment complete
            Service: merline-api
            Version: ${{ github.sha }}
            By: ${{ github.actor }}
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

---

## 3. Quality Gates Summary

| Gate | Stage | Tool | Blocking |
|------|-------|------|----------|
| Code formatting | Lint | Laravel Pint / ESLint | Yes |
| Static analysis | Lint | PHPStan (level 8) / TypeScript | Yes |
| Dependency audit | Security | Composer Audit / npm audit | Yes (high+) |
| SAST | Security | Semgrep | Yes (critical) |
| Unit tests | Test | PHPUnit / Jest | Yes (< 80% coverage) |
| Integration tests | Test | PHPUnit (feature) | Yes |
| Container scan | Build | Trivy | Yes (critical/high) |
| E2E tests | Dev deploy | Playwright / Cypress | Yes |
| Load test | Staging | k6 | Warning |
| Manual approval | Prod gate | GitHub Environments | Yes |
| Smoke test | Post-deploy | cURL checks | Yes |

---

## 4. Deployment Strategies

### Rolling Update (Default)

```yaml
# Standard Kubernetes rolling update
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 1      # Never kill more than 1 pod at a time
    maxSurge: 1            # Add 1 extra pod during deploy
```

**When:** Normal feature deployments, non-breaking changes.

### Blue-Green (Database Migrations)

```yaml
# Two parallel environments, switch traffic at once
apiVersion: v1
kind: Service
metadata:
  name: merline-api
spec:
  selector:
    app: merline-api
    version: blue  # Switch between blue/green

# Blue = current prod, Green = new version
# Deploy green, run migrations, test, switch selector
```

**When:** Breaking schema changes, major version upgrades.

### Canary (Production Deployments)

```
Phase 1: Canary (10% traffic)
  ┌──────────────────────────────────────────────┐
  │  Old version (90%)   │   New version (10%)   │
  │  ┌──┐ ┌──┐ ┌──┐     │   ┌──┐                │
  │  │p1│ │p2│ │p3│     │   │p4│                │
  │  └──┘ └──┘ └──┘     │   └──┘                │
  └──────────────────────────────────────────────┘
  Monitor: error rate, latency, HTTP 5xx

Phase 2: 50% traffic
  ┌──────────────────────────────────────────────┐
  │  Old (50%)          │   New (50%)            │
  │  ┌──┐ ┌──┐          │   ┌──┐ ┌──┐           │
  │  │p1│ │p2│          │   │p3│ │p4│           │
  │  └──┘ └──┘          │   └──┘ └──┘           │
  └──────────────────────────────────────────────┘
  Monitor: + business metrics

Phase 3: 100% rollout
  All pods on new version
```

**When:** Every production deployment.

---

## 5. Rollback Automation

### Automatic Rollback Triggers

```yaml
# Prometheus alert → GitHub Actions webhook → rollback
prometheusRule:
  name: canary-rollback-trigger
  rules:
    - alert: CanaryErrorRateSpike
      expr: |
        (
          rate(http_requests_total{version="canary", status=~"5.."}[5m])
          /
          rate(http_requests_total{version="canary"}[5m])
        ) > 0.001  # 0.1% error rate
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Canary error rate exceeded 0.1%"
        runbook_url: "https://wiki.merline.app/runbooks/canary-rollback"

    - alert: CanaryLatencySpike
      expr: |
        histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{version="canary"}[5m]))
        > 2.0  # p95 > 2 seconds
      for: 2m
      labels:
        severity: critical
```

### Rollback Workflow

```yaml
name: Rollback
on:
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [dev, staging, production]
        required: true
      service:
        type: choice
        options: [api, worker, frontend]
        required: true
      revision:
        description: 'Revision number (from helm history)'
        required: false

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - name: Rollback Helm release
        run: |
          aws eks update-kubeconfig --region eu-west-1 --name merline-${{ inputs.environment }}
          if [ -n "${{ inputs.revision }}" ]; then
            helm rollback merline-${{ inputs.service }} ${{ inputs.revision }} --namespace ${{ inputs.environment }} --wait --timeout 10m
          else
            helm rollback merline-${{ inputs.service }} --namespace ${{ inputs.environment }} --wait --timeout 10m
          fi

      - name: Verify rollback
        run: |
          curl -f --retry 10 --retry-delay 10 https://${{ inputs.environment }}.merline.app/health
```

### Rollback Procedure

```bash
# Manual rollback commands
# 1. Check deployment history
helm history merline-api -n production

# 2. Rollback to previous revision
helm rollback merline-api 42 -n production --wait --timeout 10m

# 3. Verify health
curl -f https://merline.app/health

# 4. Announce in #incidents channel
```

---

## 6. Environment Promotion Workflow

```
                          PR
                          │
                          ▼
                    ╔════════════╗
                    ║   CI       ║
                    ║ (quality   ║ ← Lint, test, security, build
                    ║  gates)    ║
                    ╚════════════╝
                          │ pass
                          ▼
               ╔═══════════════════╗
               ║   Deploy to Dev   ║ ← Auto on merge to main
               ║   (auto)          ║
               ╚═══════════════════╝
                          │
                          ▼
               ╔═══════════════════╗
               ║   E2E Tests       ║ ← Automated integration tests
               ╚═══════════════════╝
                          │ pass
                          ▼
               ╔═══════════════════╗
               ║   Deploy to       ║ ← Auto on E2E pass
               ║   Staging         ║
               ╚═══════════════════╝
                          │
                          ▼
               ╔═══════════════════╗
               ║   Smoke + Load    ║ ← Automated smoke tests
               ║   Tests           ║
               ╚═══════════════════╝
                          │ pass
                          ▼
               ╔═══════════════════╗
               ║   Approval Gate   ║ ← Manual (Release Manager)
               ╚═══════════════════╝
                          │ approved
                          ▼
               ╔═══════════════════╗
               ║   Deploy to       ║ ← Canary 10% → 50% → 100%
               ║   Production      ║
               ╚═══════════════════╝
                          │
                          ▼
               ╔═══════════════════╗
               ║   Post-Deploy     ║ ← Smoke tests, notifications
               ║   Validation      ║
               ╚═══════════════════╝
```

---

## 7. Approval Gates for Production

| Gate | Type | Approver | Condition |
|------|------|----------|-----------|
| Code review | Required | ≥ 1 engineer | PR approved |
| CI quality gates | Automated | — | All tests passing, coverage ≥ 80% |
| Security scan | Automated | — | No critical/high vulnerabilities |
| E2E tests | Automated | — | All E2E scenarios passing |
| Staging smoke | Automated | — | Health checks passing |
| Manual approval | Human | Release Manager | Changelog reviewed, rollback plan ready |
| Post-deploy verify | Automated | — | Production smoke tests passing |

### Release Checklist

```
□ PR approved by ≥ 1 engineer
□ CI pipeline passed (all quality gates)
□ Changelog updated and reviewed
□ Migration runbook prepared (if applicable)
□ Rollback plan confirmed
□ Release manager notified
□ Stakeholders informed (if user-facing change)
□ Monitoring dashboards checked (baseline metrics)
□ Deploy window confirmed (feature freeze rules)
```

---

## 8. Artifact Management

### Artifact Storage

| Artifact | Location | Retention |
|----------|----------|-----------|
| Docker images | ghcr.io | 30 days (untagged), indefinite (tagged) |
| Helm charts | ghcr.io (OCI) | Indefinite |
| Test reports | GitHub Actions artifacts | 90 days |
| Code coverage | Codecov | Indefinite |
| Build logs | GitHub Actions | 90 days |
| Vulnerability reports | GitHub Security | Indefinite |
| Terraform plans | S3 (merline-terraform-state) | Indefinite |

### Artifact Signing

```yaml
# Docker Content Trust (optional)
- name: Sign Docker image with Cosign
  run: |
    cosign sign --key env://COSIGN_PRIVATE_KEY \
      ghcr.io/${{ github.repository }}/api:${{ github.sha }}

- name: Verify attestation
  run: |
    cosign verify --key env://COSIGN_PUBLIC_KEY \
      ghcr.io/${{ github.repository }}/api:${{ github.sha }}
```

---

## 9. Release Versioning

### Semantic Versioning

```
v{major}.{minor}.{patch}-{prerelease}+{build}

Examples:
v1.0.0                  # First production release
v1.2.0                  # Feature release
v1.2.1                  # Bugfix release
v1.3.0-rc.1             # Release candidate
v2.0.0                  # Breaking change
```

### Release Workflow

```yaml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate release notes
        uses: release-drafter/release-drafter@v5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Tag Docker images with release version
        run: |
          VERSION=${GITHUB_REF#refs/tags/}
          docker tag ghcr.io/merline/api:main ghcr.io/merline/api:$VERSION
          docker push ghcr.io/merline/api:$VERSION
```

---

## 10. Terraform CI/CD

### Plan on PR

```yaml
name: Terraform Plan
on:
  pull_request:
    paths:
      - 'terraform/**'

jobs:
  plan:
    runs-on: ubuntu-latest
    environment: ${{ github.base_ref == 'main' && 'production' || 'dev' }}
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.8.0

      - name: Terraform Init
        run: terraform init -backend-config=environments/${{ github.base_ref }}/backend.hcl
        working-directory: terraform

      - name: Terraform Plan
        run: terraform plan -out=tfplan
        working-directory: terraform

      - name: Post plan to PR
        uses: terraform-plan-summary@v2
        with:
          plan-file: terraform/tfplan
```

### Apply on Merge

```yaml
name: Terraform Apply
on:
  push:
    branches: [main]
    paths:
      - 'terraform/**'

jobs:
  apply:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init & Apply
        run: |
          terraform init -backend-config=environments/prod/backend.hcl
          terraform apply -auto-approve
        working-directory: terraform
```
