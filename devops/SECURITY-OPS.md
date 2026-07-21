# Merline Security Operations

## 1. Secrets Management

### Strategy: External Secrets Operator + AWS Secrets Manager

```
┌──────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│  Git Repo    │    │  External Secrets     │    │  AWS Secrets    │
│  (no secrets)│───▶│  Operator (K8s)       │───▶│  Manager        │
└──────────────┘    │                       │    │                 │
                    │  Creates K8s Secrets  │    │ • API keys      │
                    │  from AWS Secrets Mgr │    │ • DB passwords  │
                    └──────────────────────┘    │ • JWT secrets   │
                                                │ • AI API keys   │
                                                │ • Encryption    │
                                                │   keys          │
                                                └─────────────────┘
```

### External Secrets Configuration

```yaml
# SecretStore (connection to AWS Secrets Manager)
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secretsmanager
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: eu-west-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
```

```yaml
# ExternalSecret (declarative secret sync)
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
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: /merline/production/database
        property: password
    - secretKey: REDIS_PASSWORD
      remoteRef:
        key: /merline/production/redis
        property: password
    - secretKey: JWT_SECRET
      remoteRef:
        key: /merline/production/jwt
        property: secret
    - secretKey: OPENAI_API_KEY
      remoteRef:
        key: /merline/production/ai
        property: openai_api_key
    - secretKey: AWS_ACCESS_KEY_ID
      remoteRef:
        key: /merline/production/aws
        property: access_key_id
    - secretKey: AWS_SECRET_ACCESS_KEY
      remoteRef:
        key: /merline/production/aws
        property: secret_access_key
```

### AWS Secrets Manager Structure

```
/merline/{environment}/
├── database/
│   ├── host
│   ├── port
│   ├── username
│   ├── password
│   ├── database
│   └── ssl_mode
├── redis/
│   ├── host
│   ├── port
│   └── password
├── jwt/
│   ├── secret
│   └── ttl
├── ai/
│   ├── openai_api_key
│   ├── anthropic_api_key
│   ├── gemini_api_key
│   └── huggingface_api_key
├── aws/
│   ├── access_key_id
│   └── secret_access_key
├── smtp/
│   ├── host
│   ├── port
│   ├── username
│   └── password
└── encryption/
    └── key
```

### Secret Rotation Policy

| Secret | Rotation | Automation |
|--------|----------|------------|
| Database passwords | Every 90 days | AWS Secrets Manager auto-rotate |
| JWT signing keys | Every 90 days | Manual (coordinated with token refresh) |
| AI API keys | As needed (per provider) | Manual |
| SMTP credentials | Every 180 days | AWS Secrets Manager auto-rotate |
| AWS access keys | Every 90 days | AWS IAM auto-rotate |

---

## 2. Certificate Management

### cert-manager Configuration

```yaml
# ClusterIssuer for Let's Encrypt (public certificates)
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
            hostedZoneID: Z1234567890

# Certificate resource
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: merline-app-tls
  namespace: production
spec:
  secretName: merline-app-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - merline.app
    - "*.merline.app"
  privateKey:
    algorithm: ECDSA
    size: 256
```

### Certificate Renewal Monitoring

```yaml
- alert: CertificateExpiring
  expr: |
    certmanager_certificate_expiration_timestamp_seconds{issuer_group="letsencrypt-prod"}
    - time() < 86400 * 30
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "Certificate {{ $labels.name }} expires in < 30 days"
    description: "Renewal may have failed. Check cert-manager logs."

- alert: CertificateExpired
  expr: |
    certmanager_certificate_expiration_timestamp_seconds < time()
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Certificate {{ $labels.name }} has expired!"
    description: "Immediate action required. Service may be unavailable."
```

### Internal CA for mTLS (Phase 2+)

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca
spec:
  ca:
    secretName: internal-ca-key-pair
```

---

## 3. Container Vulnerability Scanning

### Trivy Operator (Kubernetes-Native)

```yaml
apiVersion: aquasecurity.github.io/v1alpha1
kind: TrivyOperator
metadata:
  name: merline-trivy-operator
spec:
  vulnerabilityScanJobs:
    namespaceSelector:
      matchNames:
        - production
        - staging
        - dev
  scanJob:
    timeout: 5m
    replicas: 2
  metrics:
    vulnerabilityEnabled: true
    configAuditEnabled: true
    rbacAssessmentEnabled: true
    infraAssessmentEnabled: true
```

### Vulnerability Report

```yaml
apiVersion: aquasecurity.github.io/v1alpha1
kind: VulnerabilityReport
metadata:
  name: merline-api-pod-xxx
spec:
  registry:
    url: ghcr.io
    repository: merline/api
    tag: a1b2c3d4
  digest: sha256:...
  scanner:
    name: trivy
    vendor: aquasecurity
  summary:
    criticalCount: 0
    highCount: 1
    mediumCount: 3
    lowCount: 10
  vulnerabilities:
    - vulnerabilityID: CVE-2024-XXXXX
      pkgName: openssl
      severity: HIGH
      installedVersion: 3.1.0
      fixedVersion: 3.1.1
      title: "OpenSSL vulnerability"
      description: "..."
```

### CI Gate on Vulnerabilities

```yaml
- name: Trivy scan (CI gate)
  run: |
    trivy image --severity CRITICAL,HIGH --exit-code 1 \
      ghcr.io/merline/api:${{ github.sha }}
```

---

## 4. Kubernetes Security Policies

### Pod Security Standards

```yaml
# Namespace-level enforcement (enforce)
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: v1.29
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
# Pod Security Context (per workload)
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: api
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
            readOnlyRootFilesystem: true
```

### Network Policies

```yaml
# Default deny all ingress/egress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Allow API gateway ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: merline-api
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: 8080
---
# Allow database access from services
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-db-access
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: postgres  # Sidecar PgBouncer
  ingress:
    - from:
        - podSelector:
            matchExpressions:
              - key: app
                operator: In
                values: [merline-api, merline-worker, merline-scheduler]
      ports:
        - port: 6432
---
# Allow egress to external APIs (AI models)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ai-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: merline-ai-gateway
  egress:
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - port: 443
---
# Deny all other egress (default)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: merline-api
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: pgbouncer
      ports:
        - port: 6432
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - port: 6379
```

### Pod Security Admission (PSA)

```
Level: Restricted
Applies to: All namespaces (production, staging)

Violations:
- ❌ Privileged containers
- ❌ Host network/pid/ipc access
- ❌ Host port mapping
- ❌ Allowed volume types beyond: configmap, secret, emptyDir, pvc
- ❌ runAsUser: root
- ❌ Privilege escalation allowed
- ❌ Capabilities beyond NET_BIND_SERVICE
```

---

## 5. WAF Integration

### AWS WAF Configuration

```yaml
# WAF Web ACL attached to CloudFront distribution
WebACL:
  Name: merline-waf-prod
  DefaultAction:
    Allow: {}
  Rules:
    - Name: AWS-AWSManagedRulesCommonRuleSet
      Priority: 0
      OverrideAction:
        None: {}
      VisibilityConfig:
        SampledRequestsEnabled: true
        CloudWatchMetricsEnabled: true
        MetricName: AWSManagedRulesCommonRuleSet

    - Name: AWS-AWSManagedRulesSQLiRuleSet
      Priority: 1
      OverrideAction:
        None: {}
      VisibilityConfig:
        SampledRequestsEnabled: true

    - Name: AWS-AWSManagedRulesKnownBadInputsRuleSet
      Priority: 2
      OverrideAction:
        None: {}

    - Name: rate-limit-api
      Priority: 100
      Action:
        Block: {}
      Statement:
        RateBasedStatement:
          Limit: 10000
          AggregateKeyType: IP
      VisibilityConfig:
        SampledRequestsEnabled: true

    - Name: rate-limit-auth
      Priority: 101
      Action:
        Block: {}
      Statement:
        RateBasedStatement:
          Limit: 100
          AggregateKeyType: IP
          ScopeDownStatement:
            RegexPatternSetReferenceStatement:
              ARN: <auth-endpoint-regex>
      VisibilityConfig:
        SampledRequestsEnabled: true
```

### WAF Monitoring

```
Metrics:
- BlockedRequests: Count of requests blocked by WAF
- AllowedRequests: Count of requests allowed
- RateBasedRequests: Rate limit triggers

Alerts:
- WAFHighBlockRate: > 1% of traffic blocked (investigate false positives)
- WAFRateLimitHit: Rate limit frequently triggered (check for DDoS or misconfiguration)
```

---

## 6. DDoS Protection

### AWS Shield

```
Shield Standard (Free, included with all AWS accounts):
- Network-layer DDoS protection
- L3/L4 attacks (SYN floods, UDP floods, etc.)
- Automatic detection and mitigation

Shield Advanced ($3,000/mo — Phase 2+):
- Enhanced DDoS protection
- Application-layer DDoS protection
- 24/7 DRT (DDoS Response Team) access
- Cost protection against scaling spikes
```

### DDoS Mitigation Layers

```
Layer 7 (Application):
  ├── WAF rate limiting
  ├── CloudFront edge caching
  ├── API Gateway rate limiting (Redis token bucket)
  └── Application-level throttling

Layer 4 (Transport):
  ├── AWS Shield (Standard / Advanced)
  ├── Security group rules
  ├── NACL rules
  └── ALB connection draining

Layer 3 (Network):
  ├── AWS Shield
  ├── VPC flow logs (monitoring)
  └── BGP routing (via AWS global infrastructure)
```

### Rate Limiting (Application)

```php
<?php
// app/Http/Middleware/ThrottleRequests.php
// Redis-backed rate limiter using Laravel's built-in throttle

// API Gateway: 100 requests/minute per user
Route::middleware('throttle:100,1')->group(function () {
    Route::get('/api/v1/studies', [StudyController::class, 'index']);
});

// Sync endpoint: 500 requests/minute per device
Route::middleware('throttle:500,1')->group(function () {
    Route::post('/api/v1/sync/push', [SyncController::class, 'push']);
});

// Auth endpoint: 10 requests/minute per IP
Route::middleware('throttle:10,1')->post('/api/v1/auth/login', [AuthController::class, 'login']);
```

---

## 7. Runtime Security (Falco)

### Falco Configuration

```yaml
# Falco DaemonSet deployment
apiVersion: helm.fluxcd.io/v1beta1
kind: HelmRelease
metadata:
  name: falco
  namespace: security
spec:
  values:
    driver:
      kind: modern_ebpf
    falco:
      rules:
        # Custom Merline rules
        - rule: Unauthorized Shell in Container
          desc: "Detect shell execution in application containers"
          condition: >
            spawned_process and container
            and not proc.name in (list:merline_allowed_binaries)
            and not user.name in (list:merline_allowed_users)
          output: "Unauthorized shell (user=%user.name, command=%proc.cmdline, container=%container.id)"
          priority: WARNING
          tags: [merline, security]

        - rule: Sensitive File Access
          desc: "Detect access to sensitive files in containers"
          condition: >
            open_read and container
            and fd.name startswith "/app/.env"
          output: "Sensitive file accessed (user=%user.name, file=%fd.name, container=%container.id)"
          priority: CRITICAL
          tags: [merline, security]

      priority: warning
      buffered_outputs: true
      json_output: true
    collectors:
      kubernetes:
        enabled: true
        collectors: [k8s, k8saudit]
    outputs:
      - name: falco-alerts
        type: grpc
        format: json
```

### Falco Alerts → PagerDuty

```yaml
# falco-alertmanager integration
- rule: FalcoSecurityAlert
  expr: falco_events{priority="Critical"} > 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Falco security alert: {{ $labels.rule }} in {{ $labels.container }}"
```

---

## 8. Compliance Scanning

### kube-bench (CIS Benchmark)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: kube-bench-scan
  namespace: security
spec:
  schedule: "0 6 * * 1"  # Every Monday at 6 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: kube-bench
          hostPID: true
          containers:
            - name: kube-bench
              image: aquasec/kube-bench:latest
              command: ["kube-bench", "--json", "--outputfile", "/tmp/kube-bench-results.json"]
              volumeMounts:
                - name: results
                  mountPath: /tmp
          volumes:
            - name: results
              emptyDir: {}
          restartPolicy: Never
```

### kube-hunter (Penetration Testing)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: kube-hunter-scan
  namespace: security
spec:
  schedule: "0 6 * * 1"  # Weekly
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: kube-hunter
              image: aquasec/kube-hunter:latest
              args: ["--pod"]
              env:
                - name: KUBERNETES_SERVICE_HOST
                  value: "kubernetes.default.svc"
          restartPolicy: Never
```

### Compliance Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│ Compliance Dashboard                                            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ CIS Benchmark: 85% (Last scan: 2026-07-18)                     │
│ ├── 1. Control Plane: 92%  ✓                                   │
│ ├── 2. Worker Nodes: 88%   ✓                                   │
│ ├── 3. Policies: 78%       ⚠ Must fix: RBAC, PSP              │
│ └── 4. Logging: 82%        ✓                                   │
│                                                                │
│ Vulnerabilities: 3 high, 12 medium (Last scan: 2026-07-18)     │
│ ├── CVE-2024-XXXX: openssl 3.1.0 → 3.1.1  (HIGH)              │
│ ├── CVE-2024-YYYY: libcurl 8.0 → 8.1       (HIGH)              │
│ └── CVE-2024-ZZZZ: node 20.0 → 20.1        (HIGH)              │
│                                                                │
│ Falco Alerts (Last 7 days): 2                                  │
│ ├── Unauthorized shell (dev namespace): Investigated - FP      │
│ └── Sensitive file access: Blocked - CI pipeline               │
│                                                                │
│ WAF Blocks (Last 7 days): 1,245                                │
│ ├── SQLi attempts: 890                                         │
│ ├── Rate limit: 234                                            │
│ ├── XSS: 89                                                    │
│ └── Known bad inputs: 32                                       │
└────────────────────────────────────────────────────────────────┘
```

---

## 9. Backup and Disaster Recovery Automation

### Velero Backup Configuration

```yaml
# BackupSchedule (daily)
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-cluster-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  template:
    includedNamespaces:
      - production
      - staging
    includedResources:
      - "*"
    excludeResources:
      - events
      - events.events.k8s.io
    ttl: 720h  # 30 days
    storageLocation: aws-backups
    volumeSnapshotLocations:
      - aws-snapshots
    defaultVolumesToRestic: true
---
# Before critical operations (manual trigger)
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: pre-deployment-backup-20260718
  namespace: velero
spec:
  includedNamespaces:
    - production
  ttl: 720h
```

### Database Backup Automation

```yaml
# Database backup cron job (inside EKS)
apiVersion: batch/v1
kind: CronJob
metadata:
  name: db-backup
  namespace: production
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgis/postgis:16-3.4
              env:
                - name: PGHOST
                  valueFrom:
                    secretKeyRef:
                      name: merline-db-secrets
                      key: host
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: merline-db-secrets
                      key: password
                - name: PGUSER
                  value: merline
                - name: PGDATABASE
                  value: merline
              command:
                - /bin/sh
                - -c
                - |
                  # Full database dump (compressed)
                  DATE=$(date +%Y-%m-%d)
                  pg_dump --format=custom --compress=9 \
                    --file=/tmp/merline-full-${DATE}.dump \
                    --no-owner --no-acl merline

                  # Upload to S3
                  aws s3 cp /tmp/merline-full-${DATE}.dump \
                    s3://merline-backups-prod/db/merline-full-${DATE}.dump

                  # Upload WAL archive (continuous)
                  aws s3 sync /var/lib/postgresql/data/pg_wal/ \
                    s3://merline-backups-prod/db/wal/${DATE}/ \
                    --exclude "*" --include "*.wal"
          restartPolicy: Never
```

### Disaster Recovery Runbook

#### DR Scenario: Region Failure

```bash
# 1. Initiate failover to DR region (eu-central-1)
# 2. Promote DR database from replica to primary
aws rds promote-read-replica \
    --db-instance-identifier merline-dr-replica

# 3. Scale up EKS worker nodes in DR cluster
aws eks update-nodegroup-config \
    --cluster-name merline-dr \
    --nodegroup-name services \
    --scaling-config minSize=3,maxSize=10,desiredSize=3

# 4. Update Route53 to point to DR region ALB
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890 \
    --change-batch '{
        "Changes": [{
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "merline.app",
                "Type": "A",
                "AliasTarget": {
                    "HostedZoneId": "DR_ALB_ZONE_ID",
                    "DNSName": "dr-alb.elb.amazonaws.com",
                    "EvaluateTargetHealth": true
                }
            }
        }]
    }'

# 5. Verify health
curl -f https://merline.app/health

# 6. Announce in #incidents channel
```

#### DR Scenario: Data Corruption

```bash
# 1. Identify the corruption window
# 2. Restore database to point before corruption
aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier merline-prod \
    --target-db-instance-identifier merline-prod-restored \
    --restore-time "2026-07-18T11:45:00" \
    --use-latest-restorable-time

# 3. Rename restored instance
aws rds modify-db-instance \
    --db-instance-identifier merline-prod-restored \
    --new-db-instance-identifier merline-prod

# 4. Update application secrets (new endpoint)
# 5. Verify data integrity
# 6. Announce completion
```

### DR Testing Schedule

| Test | Frequency | Scenario | Success Criteria |
|------|-----------|----------|-----------------|
| Database failover | Monthly | Promote replica to primary | RTO < 30 min, RPO < 5 min |
| Restore from backup | Quarterly | Full restore from S3 dump | RTO < 4 hours |
| Region failover | Semi-annual | Switch to DR region | RTO < 1 hour |
| Disaster recovery simulation | Annual | Full DR drill | All runbooks work, team familiar |

---

## 10. Security Incident Response

### Incident Classification

| Level | Definition | Response Time | Examples |
|-------|------------|---------------|----------|
| SEV-1 | Active data breach, unauthorized access | Immediate | Exposed PII, compromised admin account |
| SEV-2 | Vulnerability with active exploitation | < 1 hour | CVE with exploit in the wild |
| SEV-3 | Vulnerability (no exploitation) | < 24 hours | Scan finding, dependency CVE |
| SEV-4 | Policy violation, compliance gap | < 1 week | Missing encryption, weak password policy |

### Incident Response Steps

```
1. DETECT
   └── Alert triggers, user reports, automated scan finds issue

2. CLASSIFY
   └── Determine severity (SEV-1 through SEV-4)

3. CONTAIN
   └── Isolate affected resources, rotate secrets, block IPs

4. ERADICATE
   └── Remove threat, patch vulnerability, rebuild containers

5. RECOVER
   └── Restore from backup if needed, verify integrity

6. ANALYZE
   └── Root cause analysis, timeline reconstruction

7. REMEDIATE
   └── Permanent fixes, process improvements, monitoring additions

8. DOCUMENT
   └── Incident report, post-mortem, runbook updates
```

### Key Security Contacts

| Role | Contact | Backup |
|------|---------|--------|
| Security Lead | security@merline.app | devops@merline.app |
| DevOps Lead | devops@merline.app | engineering@merline.app |
| Legal/Compliance | legal@merline.app | ceo@merline.app |
| SOC2 Auditor (Phase 2) | audit@merline.app | — |

---

## 11. Compliance Targets

| Framework | Target | Timeline | Key Requirements |
|-----------|--------|----------|-----------------|
| SOC 2 Type II | Phase 2 (Month 12-18) | Security, Availability, Confidentiality |
| ISO 27001 | Phase 3 (Month 18-36) | ISMS, risk management, continuous improvement |
| GDPR | Day 1 | Data sovereignty, right to deletion, breach notification |
| HIPAA | As required | BAAs, PHI encryption, access controls |
| FedRAMP | As required | Government clients, enhanced controls |
