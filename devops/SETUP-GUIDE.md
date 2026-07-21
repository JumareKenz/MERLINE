# Merline DevOps Setup Guide

## 1. Prerequisites

### Required Tools

| Tool | Version | Purpose | Install |
|------|---------|---------|---------|
| Docker Desktop | Latest | Local containers | [Docker Desktop](https://www.docker.com/products/docker-desktop) |
| kubectl | ≥ 1.29 | Kubernetes CLI | `choco install kubernetes-cli` |
| Helm | ≥ 3.14 | K8s package manager | `choco install kubernetes-helm` |
| Terraform | ≥ 1.8 | Infrastructure as Code | `choco install terraform` |
| AWS CLI | ≥ 2.0 | AWS interaction | `choco install awscli` |
| GitHub CLI | ≥ 2.0 | GitHub interaction | `choco install gh` |
| Node.js | ≥ 20 | Frontend build | `choco install nodejs` |
| PHP | ≥ 8.3 | Backend | `choco install php` |
| Composer | ≥ 2.7 | PHP dependencies | `choco install composer` |
| Flutter SDK | ≥ 3.22 | Mobile build | [Flutter Install](https://docs.flutter.dev/get-started/install) |
| pnpm | ≥ 9 | Node package manager | `npm install -g pnpm` |

### Cloud Provider Account

```bash
# 1. Create AWS account (if not exists)
# 2. Create IAM user for programmatic access
aws configure
# AWS Access Key ID: [your-key]
# AWS Secret Access Key: [your-secret]
# Default region: eu-west-1
# Default output format: json

# 3. Verify access
aws sts get-caller-identity
```

### GitHub Repository Setup

```bash
# 1. Clone the repository
git clone https://github.com/merline/merline.git
cd merline

# 2. Set up GitHub CLI authentication
gh auth login

# 3. Configure environment
cp .env.example .env
```

---

## 2. Local Development Environment Setup

### Step 1: Start Infrastructure Services

```bash
# Start all Docker Compose services
docker compose up -d

# Verify all services are healthy
docker compose ps

# Expected output:
# NAME                STATUS              PORTS
# postgres            Up (healthy)        0.0.0.0:5432->5432/tcp
# redis               Up (healthy)        0.0.0.0:6379->6379/tcp
# minio               Up (healthy)        0.0.0.0:9000-9001->9000-9001/tcp
# mailhog             Up                 0.0.0.0:1025->1025/tcp, 0.0.0.0:8025->8025/tcp
```

### Step 2: Install Backend Dependencies

```bash
# Install PHP dependencies
docker compose exec api composer install

# Run database migrations
docker compose exec api php artisan migrate

# Seed development data
docker compose exec api php artisan db:seed

# Generate application key
docker compose exec api php artisan key:generate
```

### Step 3: Install Frontend Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install npm dependencies
pnpm install

# Copy environment file
cp .env.example .env.local

# Start frontend dev server
pnpm dev

# Access: http://localhost:3000
```

### Step 4: Verify Everything Works

```bash
# Test API health
curl http://localhost:8080/health
# Expected: {"status":"ok","timestamp":"..."}

# Test API (authenticated)
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@merline.local","password":"password"}'
# Expected: {"token":"...","user":{...}}

# Test Frontend
curl http://localhost:3000
# Expected: HTML response (200 OK)
```

### Step 5: Mobile Development (Optional)

```bash
# Ensure Flutter SDK is installed
flutter doctor

# Navigate to mobile directory
cd mobile

# Get Flutter dependencies
flutter pub get

# Run on device/emulator
flutter run

# For API access from mobile device:
# Option 1: Use ngrok
ngrok http 8080
# Update API_URL in Flutter app to ngrok URL

# Option 2: Use Tailscale
# Install Tailscale on both machines
# Access via Tailscale IP
```

---

## 3. First Deployment to Development Environment

### Step 1: One-Time Infrastructure Setup

```bash
# Navigate to Terraform directory
cd terraform

# Initialize Terraform (with S3 backend)
terraform init -backend-config=environments/dev/backend.hcl

# Review deployment plan
terraform plan -out=tfplan

# Apply infrastructure
terraform apply tfplan
```

### Step 2: Configure kubectl

```bash
# Update kubeconfig for dev cluster
aws eks update-kubeconfig --region eu-west-1 --name merline-dev

# Verify access
kubectl get nodes
kubectl get pods -n dev
```

### Step 3: Set Up External Secrets

```bash
# 1. Create secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name /merline/dev/database \
  --secret-string '{"host":"localhost","port":5432,"username":"merline","password":"merline"}'

aws secretsmanager create-secret \
  --name /merline/dev/jwt \
  --secret-string '{"secret":"dev-secret-key-change-in-production"}'

# 2. Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets --create-namespace
```

### Step 4: Deploy Application

```bash
# Install Merline API
helm upgrade --install merline-api ./charts/merline-api \
  --namespace dev \
  --values ./charts/merline-api/values/dev.yaml \
  --set image.tag=latest \
  --wait --timeout 10m

# Verify deployment
kubectl get pods -n dev
kubectl get svc -n dev
kubectl get ingress -n dev

# Watch rollout
kubectl rollout status deployment/merline-api -n dev
```

### Step 5: Run Database Migrations

```bash
# Run migrations (adjust pod name)
kubectl exec -n dev deployment/merline-api \
  -- php artisan migrate --force

# Seed development data
kubectl exec -n dev deployment/merline-api \
  -- php artisan db:seed --force
```

### Step 6: Verify Deployment

```bash
# Get ingress URL
kubectl get ingress -n dev

# Test health endpoint
curl -f https://dev.merline.app/health

# Test API
curl https://dev.merline.app/api/v1/studies
```

---

## 4. How to Add a New Service

### Step 1: Create the Service

```bash
# Create service directory
mkdir -p services/my-new-service

# Create Dockerfile
touch services/my-new-service/Dockerfile

# Create Helm chart
helm create charts/my-new-service
```

### Step 2: Add CI Pipeline

```yaml
# .github/workflows/ci-my-new-service.yml
name: CI - MyNewService

on:
  pull_request:
    paths:
      - 'services/my-new-service/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lint
        run: cd services/my-new-service && npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test
        run: cd services/my-new-service && npm test

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          context: services/my-new-service
          push: true
          tags: ghcr.io/merline/my-new-service:${{ github.sha }}
```

### Step 3: Add CD Pipeline

```yaml
# .github/workflows/cd-my-new-service.yml
name: CD - MyNewService

on:
  push:
    branches: [main]
    paths:
      - 'services/my-new-service/**'

jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Dev
        run: |
          helm upgrade --install my-new-service ./charts/my-new-service \
            --namespace dev \
            --set image.tag=${{ github.sha }}
```

### Step 4: Register the Service

```yaml
# Register in the service registry
# charts/merline-api/values/prod.yaml
serviceEndpoints:
  my-new-service: http://my-new-service.production.svc.cluster.local:8080
```

### Step 5: Add Monitoring

```yaml
# prometheus-rules.yaml
- alert: MyNewServiceDown
  expr: up{job="my-new-service"} == 0
  for: 1m
  labels:
    severity: critical
```

---

## 5. How to Configure Environments

### Adding a New Environment

```yaml
# 1. Create Terraform directory
terraform/environments/new-env/
├── main.tf
├── variables.tf
└── terraform.tfvars

# 2. Create Kubernetes namespace
kubectl create namespace new-env

# 3. Create environment values file
charts/merline-api/values/
└── new-env.yaml

# 4. Create Secrets Manager namespace
aws secretsmanager create-secret \
  --name /merline/new-env/database

# 5. Add to GitHub Environments
# Settings → Environments → New Environment → "new-env"
# Add required reviewers for approval gates
```

### Configuration Reference

| Setting | Local | Dev | Staging | Prod |
|---------|-------|-----|---------|------|
| `APP_ENV` | local | dev | staging | production |
| `APP_DEBUG` | true | true | false | false |
| `APP_URL` | http://localhost | https://dev.merline.app | https://staging.merline.app | https://merline.app |
| `DB_HOST` | localhost | pgbouncer.dev | pgbouncer.staging | pgbouncer.production |
| `REDIS_HOST` | localhost | redis.dev | redis.staging | redis.production |
| `AWS_BUCKET` | merline-local | merline-media-dev | merline-media-staging | merline-media-prod |
| `MAIL_MAILER` | log | log | ses | ses |
| `FILESYSTEM_DISK` | local | s3 | s3 | s3 |

---

## 6. Troubleshooting Common Issues

### Local Development

| Issue | Cause | Solution |
|-------|-------|----------|
| Port already in use | Local service on port 5432/6379 | Stop local services, or change ports in docker-compose.yml |
| Docker out of disk space | Docker cache bloat | `docker system prune -a` |
| Permission denied | File ownership mismatch | `docker compose down && docker compose up -d` |
| Composer out of memory | PHP memory limit | `docker compose exec api php -d memory_limit=-1 composer install` |
| npm peer dependency conflict | Version mismatch | `pnpm install --force` |
| API returns 500 | Missing .env or key | `docker compose exec api php artisan key:generate` |

### Kubernetes

| Issue | Cause | Solution |
|-------|-------|----------|
| Pods stuck in Pending | Insufficient resources | Check node capacity: `kubectl describe node` |
| Pods in CrashLoopBackOff | Application error | Check logs: `kubectl logs <pod>` |
| ImagePullBackOff | Invalid image/credentials | Verify image tag: `kubectl describe pod <pod>` |
| OOMKilled | Memory limit too low | Increase resources in values.yaml |
| DNS resolution failure | CoreDNS not ready | `kubectl rollout status -n kube-system deployment/coredns` |
| Certificate error | cert-manager issue | `kubectl describe certificate -n <namespace>` |

### CI/CD

| Issue | Cause | Solution |
|-------|-------|----------|
| GitHub Actions runner offline | Self-hosted runner issue | Restart runner: `sudo systemctl restart actions-runner` |
| Docker build fails | Network timeout | Retry build, check Docker Hub rate limits |
| Helm deploy fails | Invalid values | `helm template --debug` to verify rendered manifest |
| Trivy scan fails | CVE in base image | Update base image version or add to .trivyignore |
| E2E tests flaky | Timing-dependent tests | Increase retries, check test isolation |

### Database

| Issue | Cause | Solution |
|-------|-------|----------|
| Too many connections | Connection leak | `SELECT pg_terminate_backend(pid) FROM pg_stat_activity` |
| Slow queries | Missing index | Check `pg_stat_statements`, add index |
| Replication lag | High write volume | Scale up writer, reduce analytics load |
| Migration timeout | Large table lock | Use `CREATE INDEX CONCURRENTLY`, batch updates |

### Common Commands

```bash
# Check all pods status
kubectl get pods --all-namespaces

# Stream logs from all service pods
kubectl logs -n production -l app=merline-api --tail=100 -f

# Port-forward to access service locally
kubectl port-forward -n production service/merline-api 8080:8080

# Execute command in pod
kubectl exec -n production deployment/merline-api \
  -- php artisan cache:clear

# Check deployment history
helm history merline-api -n production

# Check resource usage
kubectl top pods -n production
kubectl top nodes

# Check events
kubectl get events -n production --sort-by='.lastTimestamp'

# Deep dive into pod issue
kubectl describe pod <pod-name> -n production

# Restart deployment (after config change)
kubectl rollout restart deployment/merline-api -n production
```

---

## 7. Quick Reference Cards

### Daily Operations

```bash
# Deploy latest to dev
git push origin main

# Promote staging to production
# 1. Wait for staging smoke tests to pass
# 2. Approve in GitHub Actions
# 3. Monitor canary rollout

# View production logs
kubectl logs -n production -l app=merline-api --tail=100 -f

# Restart all queue workers
kubectl rollout restart deployment/merline-worker -n production

# Flush Redis cache
kubectl exec -n production deployment/merline-api \
  -- php artisan cache:clear
```

### Incident Response

```bash
# 1. Acknowledge alert
# 2. Check if service is actually down
curl -f https://merline.app/health

# 3. Check recent deployments
helm history merline-api -n production

# 4. Rollback if needed
helm rollback merline-api 1 -n production --wait

# 5. Check logs
kubectl logs -n production -l app=merline-api --tail=500 --since=1h

# 6. Escalate if needed
# #incidents channel
```

### Reference URLs

| Resource | URL |
|----------|-----|
| Production | https://merline.app |
| Staging | https://staging.merline.app |
| Dev | https://dev.merline.app |
| Grafana (Prod) | https://grafana.merline.app |
| Kibana (if ELK) | https://logs.merline.app |
| PagerDuty | https://merline.pagerduty.com |
| AWS Console | https://console.aws.amazon.com |
| GitHub | https://github.com/merline/merline |
| Documentation | https://wiki.merline.app |
| Runbooks | https://wiki.merline.app/runbooks |
