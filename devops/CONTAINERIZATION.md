# Merline Containerization Strategy

## 1. Base Image Selection

| Service | Base Image | Size | Rationale |
|---------|-----------|------|-----------|
| Laravel (API) | `dunglas/frankenphp:8.3-alpine` | ~120MB | FrankenPHP combines PHP-FPM + Caddy. Alpine keeps size minimal. |
| Laravel (Queue Workers) | `dunglas/frankenphp:8.3-alpine` | ~120MB | Same base, different entrypoint. |
| Laravel (Cron/Scheduler) | `dunglas/frankenphp:8.3-alpine` | ~120MB | Same base. |
| Next.js (Frontend) | `node:20-alpine` → `nginx:alpine` | ~50MB | Multi-stage: build with Node, serve with Nginx. |
| Python (AI services) | `python:3.12-slim` | ~150MB | Slim variant. GPU variant when needed. |
| Flutter (Build only) | `cirrusci/flutter:stable` | ~2GB | Build only. Artifact deployed differently. |

### Image Security Scanning

```yaml
name: Container Security Scan
on:
  push:
    branches: [main]
  pull_request:
    paths:
      - 'Dockerfile*'
      - 'docker-compose*.yml'

jobs:
  trivy-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t merline-api:${{ github.sha }} -f Dockerfile .

      - name: Scan with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: merline-api:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          ignore-unfixed: true

      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Fail if critical vulnerabilities
        run: |
          trivy image --severity CRITICAL --exit-code 1 merline-api:${{ github.sha }}
```

---

## 2. Dockerfile Designs

### Laravel API (FrankenPHP)

```dockerfile
# syntax=docker/dockerfile:1
# Multi-stage build

# Stage 1: Dependencies
FROM dunglas/frankenphp:8.3-alpine AS vendor

# Install PHP extensions
RUN install-php-extensions \
    pdo_pgsql \
    pgsql \
    redis \
    opcache \
    pcntl \
    bcmath \
    gd \
    zip \
    exif \
    intl

# Install system dependencies
RUN apk add --no-cache \
    git \
    unzip \
    curl \
    postgresql-client \
    supervisor

# Install Composer
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

# Stage 2: Build
FROM vendor AS build

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --optimize-autoloader --prefer-dist

COPY . .

# Optimize for production
RUN php artisan optimize \
    && php artisan event:cache \
    && php artisan route:cache \
    && php artisan view:cache

# Stage 3: Production
FROM dunglas/frankenphp:8.3-alpine AS production

WORKDIR /app

RUN install-php-extensions \
    pdo_pgsql \
    pgsql \
    redis \
    opcache \
    pcntl \
    bcmath

COPY --from=build /app /app
COPY --from=build /usr/bin/composer /usr/bin/composer

# FrankenPHP configuration
COPY docker/php.ini /usr/local/etc/php/conf.d/merline.ini
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose FrankenPHP port
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```

### php.ini for Production

```ini
; docker/php.ini
opcache.enable=1
opcache.memory_consumption=256
opcache.max_accelerated_files=20000
opcache.revalidate_freq=60
opcache.fast_shutdown=1

memory_limit=512M
max_execution_time=300
max_input_time=60
upload_max_filesize=50M
post_max_size=60M
date.timezone=UTC
```

### Laravel Queue Worker Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
FROM dunglas/frankenphp:8.3-alpine AS vendor

RUN install-php-extensions \
    pdo_pgsql \
    pgsql \
    redis \
    pcntl \
    bcmath

COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

FROM vendor AS build
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --optimize-autoloader --prefer-dist

COPY . .
RUN php artisan optimize --quiet

FROM dunglas/frankenphp:8.3-alpine
WORKDIR /app
RUN install-php-extensions pdo_pgsql pgsql redis pcntl bcmath
COPY --from=build /app /app

# Override entrypoint for queue worker
ENTRYPOINT ["php", "artisan", "horizon"]
```

### Next.js Frontend Dockerfile

```dockerfile
# syntax=docker/dockerfile:1

# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine AS production

COPY --from=build /app/.next /usr/share/nginx/html/.next
COPY --from=build /app/public /usr/share/nginx/html/public
COPY --from=build /app/package.json /usr/share/nginx/html/

# Nginx config for Next.js
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/nextjs-site.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1
```

### Python AI Service Dockerfile

```dockerfile
# syntax=docker/dockerfile:1

FROM python:3.12-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim AS production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=build /usr/local/bin /usr/local/bin

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 3. Multi-Stage Build Patterns

```
Builder Pattern:
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Base     │───▶│ Vendor   │───▶│ Build    │
│ (OS +    │    │ (Composer│    │ (Artifact│
│  Runtime)│    │  + deps) │    │  compile)│
└──────────┘    └──────────┘    └──────────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │ Production    │
                               │ (Minimal      │
                               │  runtime only)│
                               └──────────────┘

Benefits:
- Production images contain only runtime dependencies
- Build tools (Composer, npm, gcc) not included in final image
- Layer caching maximizes build speed
- Smaller attack surface
- Faster image pulls
```

### BuildKit Cache Mounts (for CI speed)

```dockerfile
# Use BuildKit cache mounts for faster CI builds
FROM dunglas/frankenphp:8.3-alpine AS vendor
RUN install-php-extensions pdo_pgsql pgsql redis pcntl bcmath

WORKDIR /app

# Cache Composer downloads
RUN --mount=type=cache,target=/root/.composer/cache \
    --mount=type=bind,source=composer.json,target=composer.json \
    --mount=type=bind,source=composer.lock,target=composer.lock \
    composer install --no-dev --no-interaction --no-progress --optimize-autoloader --prefer-dist

# Cache npm downloads (for Next.js builds)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production
```

---

## 4. Image Tagging and Versioning Strategy

### Tag Schema

```
{service}-{git-sha}-{timestamp}
{service}-{version}
{service}-{environment}-{build-number}

Examples:
api-gateway-a1b2c3d4-20260718T120000Z
api-gateway-v1.2.3
api-gateway-prod-456

Special tags:
latest          → current production deployment
staging         → current staging deployment
{service}-main → latest main branch build
```

### Tagging in CI

```yaml
- name: Build and tag Docker image
  run: |
    GIT_SHA=$(git rev-parse --short HEAD)
    TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
    SERVICE=$(echo "${{ github.workflow }}" | tr '[:upper:]' '[:lower:]')

    docker build -t ghcr.io/${{ github.repository }}/${SERVICE}:${GIT_SHA}-${TIMESTAMP} .
    docker tag ghcr.io/${{ github.repository }}/${SERVICE}:${GIT_SHA}-${TIMESTAMP} \
               ghcr.io/${{ github.repository }}/${SERVICE}:main
    docker push --all-tags ghcr.io/${{ github.repository }}/${SERVICE}
```

---

## 5. Docker Compose for Local Development

```yaml
# docker-compose.yml
version: '3.9'

x-common-variables: &common-variables
  APP_ENV: local
  APP_DEBUG: true
  DB_CONNECTION: pgsql
  DB_HOST: postgres
  DB_PORT: 5432
  DB_DATABASE: merline
  DB_USERNAME: merline
  DB_PASSWORD: merline
  REDIS_HOST: redis
  REDIS_PORT: 6379
  AWS_ENDPOINT: http://minio:9000
  AWS_ACCESS_KEY_ID: minioadmin
  AWS_SECRET_ACCESS_KEY: minioadmin
  AWS_DEFAULT_REGION: eu-west-1
  AWS_BUCKET: merline-local

services:
  # ─── Database ───
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: merline
      POSTGRES_USER: merline
      POSTGRES_PASSWORD: merline
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U merline"]
      interval: 5s
      timeout: 5s
      retries: 5

  # ─── Cache & Queue ───
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # ─── Object Storage ───
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - miniodata:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Create bucket on startup
  createbuckets:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 minioadmin minioadmin;
      mc mb local/merline-local --ignore-existing;
      mc anonymous set public local/merline-local;
      "

  # ─── Mail Capture ───
  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "8025:8025"  # Web UI
      - "1025:1025"  # SMTP

  # ─── Laravel API (FrankenPHP) ───
  api:
    build:
      context: .
      dockerfile: docker/Dockerfile.api
      target: production
    <<: *common-variables
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    ports:
      - "8080:8080"
    volumes:
      - .:/app  # Live code reload for development
    environment:
      <<: *common-variables
      APP_URL: http://localhost:8080

  # ─── Queue Workers ───
  horizon:
    build:
      context: .
      dockerfile: docker/Dockerfile.worker
    <<: *common-variables
    depends_on:
      - api
    volumes:
      - .:/app

  # ─── Scheduler ───
  scheduler:
    build:
      context: .
      dockerfile: docker/Dockerfile.worker
    <<: *common-variables
    depends_on:
      - api
    entrypoint: ["php", "artisan", "schedule:work"]
    volumes:
      - .:/app

  # ─── Next.js Frontend ───
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8080
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next

  # ─── Queue Admin UI ───
  horizon-ui:
    image: yetanotherco/laravel-horizon-ui:latest
    environment:
      HORIZON_HOST: horizon
      HORIZON_PORT: 8081
    ports:
      - "8081:8081"

volumes:
  pgdata:
  redisdata:
  miniodata:
```

---

## 6. Image Registry Strategy

### Decision: GitHub Container Registry (ghcr.io)

| Registry | Pros | Cons |
|----------|------|------|
| **ghcr.io** (GitHub) | Co-located with code. Free for public repos. $0.25/GB/mo for private. Native GitHub Actions auth. | Limited to GitHub ecosystem. |
| ECR (AWS) | Deep AWS integration. IAM-based auth. Lowest latency to EKS. | Requires separate login. Additional costs if cross-account. |
| Docker Hub | Largest ecosystem. Most tooling supports it. | Rate limits (200 pulls/6hr for anonymous). Paid for private repos. |
| GCR/GAR (GCP) | Best if using GKE. | Vendor lock-in. |

**Primary registry**: `ghcr.io/merline/{service}`  
**Pull-through cache**: ECR (regional cache, faster pulls in EKS)

### Authentication

```yaml
# Kubernetes: imagePullSecrets for ghcr.io
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-credentials
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-credentials>

# Workload usage
spec:
  template:
    spec:
      imagePullSecrets:
        - name: ghcr-credentials
```

### Registry Cleanup Policy

| Artifact | Retention | Cleanup Method |
|----------|-----------|----------------|
| `main` builds | 30 days | GitHub Packages retention policy |
| PR builds | 7 days after merge | GitHub Actions - `gh` CLI cleanup |
| Tagged releases | Indefinite | Manual management |
| Stale images | 90 days | Automated `ghcr-cleanup` workflow |

```yaml
name: Cleanup GHCR
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/delete-package-versions@v5
        with:
          package-name: 'merline-api'
          min-versions-to-keep: 10
          delete-only-untagged-versions: true
```

---

## 7. Kubernetes Deployment Manifests (Helm)

### Helm Chart Structure

```
charts/
├── merline-api/
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── values/
│   │   ├── dev.yaml
│   │   ├── staging.yaml
│   │   └── prod.yaml
│   └── templates/
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── ingress.yaml
│       ├── hpa.yaml
│       ├── pdb.yaml
│       ├── serviceaccount.yaml
│       ├── configmap.yaml
│       └── _helpers.tpl
├── merline-frontend/
│   └── ...
├── merline-worker/
│   └── ...
└── infrastructure/
    ├── nginx-ingress/
    ├── cert-manager/
    ├── external-secrets/
    └── monitoring/
```

### Deployment Template (Helm)

```yaml
# charts/merline-api/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "merline-api.fullname" . }}
  labels:
    {{- include "merline-api.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: {{ .Values.rollingUpdate.maxUnavailable }}
      maxSurge: {{ .Values.rollingUpdate.maxSurge }}
  selector:
    matchLabels:
      {{- include "merline-api.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "merline-api.selectorLabels" . | nindent 8 }}
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      imagePullSecrets:
        - name: ghcr-credentials
      serviceAccountName: {{ include "merline-api.serviceAccountName" . }}
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: 8080
              protocol: TCP
          envFrom:
            - configMapRef:
                name: {{ include "merline-api.fullname" . }}
            - secretRef:
                name: {{ .Values.externalSecrets.name }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 5
            failureThreshold: 2
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
```

### Values File (Production)

```yaml
# charts/merline-api/values/prod.yaml
replicaCount: 3

image:
  repository: ghcr.io/merline/api-gateway
  tag: latest
  pullPolicy: Always

rollingUpdate:
  maxUnavailable: 1
  maxSurge: 1

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

ingress:
  enabled: true
  host: api.merline.app
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: 50m

externalSecrets:
  name: merline-api-secrets
  provider: aws
  secretStore: aws-secretsmanager

serviceMonitor:
  enabled: true
  interval: 30s
  path: /metrics
```

---

## 8. Image Vulnerability Policy

| Severity | CI Action | Deployment Block |
|----------|-----------|------------------|
| CRITICAL | Fail build | Block deployment |
| HIGH | Fail build | Block deployment |
| MEDIUM | Warn | Warn (manual review) |
| LOW | Log | No action |

### Trivy Configuration

```yaml
# .trivyignore
# Example: ignore false positives or accepted risks
CVE-2023-XXXXX  # Accepted risk - mitigated by WAF
CVE-2024-XXXXX  # False positive in Alpine
```
