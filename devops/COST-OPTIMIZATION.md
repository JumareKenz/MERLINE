# Merline Cost Optimization Strategy

## 1. Cost Budget and Targets

### Monthly Budget by Phase

| Category | Phase 1 (0-6mo) | Phase 2 (6-18mo) | Phase 3 (18-36mo) |
|----------|-----------------|-------------------|-------------------|
| Compute (EKS + EC2) | $800 | $3,000 | $8,000 |
| Database (RDS) | $500 | $2,000 | $6,000 |
| Cache (ElastiCache) | $200 | $600 | $1,500 |
| Storage (S3 + EBS) | $150 | $500 | $1,500 |
| Networking (NAT + ALB + Data Transfer) | $200 | $600 | $2,000 |
| AI API costs | $500 | $5,000 | $20,000 |
| Monitoring (Prometheus/Loki/Tempo) | $200 | $400 | $800 |
| CI/CD (GitHub Actions) | $50 | $200 | $500 |
| DNS + CDN (Route53 + CloudFront) | $50 | $150 | $500 |
| **Total** | **~$2,650** | **~$12,450** | **~$40,800** |

### Cost Optimization Targets

| Metric | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|
| Monthly cost target | < $3,000 | < $15,000 | < $50,000 |
| Cost per active user | < $3.00/user | < $1.50/user | < $0.50/user |
| Cost per submission | < $0.01 | < $0.005 | < $0.002 |
| AI cost per token | — | < $0.0001/token | < $0.00005/token |
| Waste reduction (idle resources) | < 10% | < 5% | < 3% |

---

## 2. Compute Cost Management

### Right-Sizing Strategy

```yaml
Right-Sizing Rules:
  - Services with CPU < 20% for 7 days: downsize
  - Services with CPU > 80% for 7 days: upsize
  - Services with Memory < 30% for 7 days: reduce memory
  - Services with Memory > 90% for 7 days: increase memory
  - Review: Monthly automated report (Kubecost)
```

### Spot Instance Strategy

| Node Group | Instance Type | Spot % | Savings vs On-Demand |
|------------|---------------|--------|---------------------|
| Batch (queue workers) | m6i.xlarge | 100% | ~65% |
| GPU (AI inference) | g5.xlarge | 100% | ~60% |
| Services | m6i.large | 0% (Phase 1) → 50% (Phase 2) | — |

```yaml
# Spot Configuration
spotAllocationStrategy: capacity-optimized  # Best for diverse instance pools
spotInstancePools: 4  # Distribute across instance types
spotMaxPrice: "0.15"  # Max price per hour (for g5.xlarge)
```

### Autoscaling Boundaries

```yaml
# Production services — lower bound ensures baseline capacity
api-gateway:
  minReplicas: 2  # Never below 2 (HA)
  maxReplicas: 20

queue-workers:
  minReplicas: 2  # Always keep some workers ready
  maxReplicas: 30

# Dev/staging — scale to zero when possible
api-gateway:
  minReplicas: 1
  maxReplicas: 5
  scaleToZero:
    enabled: true
    schedule: "0 20 * * 1-5"  # Scale to 0 at 8 PM weekdays
    resumeSchedule: "0 7 * * 1-5"  # Resume at 7 AM
```

### Kubernetes Resource Optimization

```bash
# Identify over-provisioned pods (Kubecost)
kubecost report --window 7d --aggregation container \
    --format csv | sort -t, -k4 -n

# Vertical Pod Autoscaler (VPA) in recommendation mode
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-gateway-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  updatePolicy:
    updateMode: "Off"  # Recommendation only
  resourcePolicy:
    containerPolicies:
      - containerName: "*"
        minAllowed:
          cpu: 250m
          memory: 256Mi
        maxAllowed:
          cpu: 2000m
          memory: 2Gi
```

---

## 3. Storage Cost Management

### S3 Lifecycle Policies

```yaml
Buckets:
  merline-media-prod:
    Rules:
      - Id: "media-lifecycle"
        Status: Enabled
        Transitions:
          - Days: 30
            StorageClass: STANDARD_IA
          - Days: 90
            StorageClass: GLACIER_INSTANT_RETRIEVAL
          - Days: 365
            StorageClass: DEEP_ARCHIVE
        Expiration:
          Days: 2555  # 7 years

  merline-backups-prod:
    Rules:
      - Id: "backup-lifecycle"
        Status: Enabled
        Expiration:
          Days: 90
        NoncurrentVersionExpiration:
          NoncurrentDays: 30
```

### Storage Cost Optimization Techniques

| Technique | Savings | Implementation |
|-----------|---------|----------------|
| S3 Intelligent Tiering | 20-40% | Auto-moves between access tiers |
| S3 Lifecycle Policies | 50-70% | Auto-transition cold data to Glacier |
| S3 Object Compression | 30-50% | Compress before upload (media, reports) |
| S3 Request Optimization | 10-20% | Batch operations, multipart upload |
| EBS gp3 (vs gp2) | 20% | Better baseline IOPS at same cost |
| EBS snapshots cleanup | 10-15% | Remove stale snapshots |

```php
<?php
// Compress media before S3 upload
public function uploadMedia(UploadedFile $file): string
{
    $path = $file->getRealPath();

    // Optimize images
    if (str_starts_with($file->getMimeType(), 'image/')) {
        $image = Image::make($path);
        $image->resize(1920, null, function ($c) {
            $c->aspectRatio();
            $c->upsize();
        });
        $image->save($path, 80); // 80% quality
    }

    // Upload compressed
    return Storage::disk('s3')->put(
        $this->getPath($file),
        fopen($path, 'r'),
        ['ContentType' => $file->getMimeType()]
    );
}
```

---

## 4. Network Cost Management

### Data Transfer Optimization

| Strategy | Savings | Implementation |
|----------|---------|----------------|
| CloudFront caching | 50-80% on media transfer | Cache static assets at edge |
| S3 Gateway Endpoint | $0 NAT cost for S3 | S3 traffic stays within AWS network |
| Cross-AZ traffic reduction | 30% | Keep related services in same AZ |
| NAT Gateway minimization | $100/mo per NAT | 3 NAT GWs → optimize to 2 after review |
| Inter-region traffic reduction | 50% | Batch replications during off-peak |
| Gzip/Brotli compression | 70% on text | Enable at ALB/CloudFront level |

### NAT Gateway Optimization

```yaml
# Phase 1: 3 NAT Gateways (one per AZ)
# Cost: ~$108/mo (3 x $36) + $0.045/GB processed

# Phase 2+: Reduce to 2 NAT Gateways
# - AZ-c traffic routes through AZ-a or AZ-b NAT
# - Sacrifice: AZ-c loses NAT if AZ-a and AZ-b both fail
# - Savings: ~$36/mo

# Long-term: Replace NAT with egress-only Internet Gateway (IPv6)
# - Free egress for IPv6 traffic
# - Requires application IPv6 readiness
```

### CDN Cost Optimization

```yaml
CloudFront Optimization:
  Price Class: "Use Only North America and Europe"  # Phase 1
  # Savings: ~30% vs "Use All Edge Locations"
  # Upgrade to global when serving Asia/Africa users

  Cache Behavior:
    /media/photos/*: TTL 24h (browser + edge)
    /media/audio/*: TTL 7d (browser + edge)
    /static/*: TTL 365d (immutable, versioned)

  Origin Shield: Enabled (additional cache layer)
  # Reduces origin load by 60-80%
```

---

## 5. Database Cost Management

### RDS Instance Optimization

| Instance Type | vCPU | RAM | Cost/hr (eu-west-1) | Use Case |
|--------------|------|-----|--------------------|----------|
| db.r6g.large | 2 | 16GB | $0.252 | Phase 1 primary |
| db.r6g.xlarge | 4 | 32GB | $0.504 | Phase 2 primary |
| db.r6g.2xlarge | 8 | 64GB | $1.008 | Phase 3 primary |
| db.r6g.4xlarge | 16 | 128GB | $2.016 | Future scale |

### Reserved Instance / Savings Plan Strategy

```yaml
commitment:
  1-Year All Upfront:  40% discount vs On-Demand
  1-Year Partial:      30% discount
  3-Year All Upfront:  60% discount
  3-Year Partial:      50% discount

  Phase 1:
    - Compute: On-Demand (flexibility > savings at low scale)
    - Database: 1-Year Partial (predictable workload)

  Phase 2:
    - Compute Savings Plan: 1-Year (covers 70% of expected spend)
    - Database: 3-Year All Upfront (RDS stable after Phase 1)

  Phase 3:
    - Compute Savings Plan: 3-Year
    - Reserved Instances for baseline + On-Demand for peak
```

### Database Cost Optimization Techniques

| Technique | Savings | Implementation |
|-----------|---------|----------------|
| Read replica sizing | 30% | Use smaller replicas for analytics |
| Storage autoscaling | Prevent over-provisioning | Enable RDS storage autoscaling |
| Data archiving | 70% on cold data | Move old study data to Parquet in S3 |
| Connection pooling (PgBouncer) | 50% fewer connections | Allows smaller instance |
| Index maintenance | 10-20% query performance | Regular REINDEX (VACUUM) |
| Partition pruning | 40% query perf | Monthly partition management |

### Storage Cost Comparison

```yaml
Data Storage Options:
  RDS gp3 (active):     $0.08/GB/mo + $0.005/provisioned IOPS
  S3 Standard:          $0.023/GB/mo
  S3 Glacier Instant:   $0.004/GB/mo
  S3 Glacier Deep:      $0.001/GB/mo

  Strategy:
    - Active data (< 3 months old): Keep in RDS
    - Warm data (3-12 months): Compressed Parquet in S3 Standard
    - Cold data (> 12 months): Compressed in S3 Glacier
    - Archive data (> 7 years): S3 Glacier Deep Archive
```

---

## 6. AI Inference Cost Management

### AI Cost Per Model (Estimates)

| Model | Input Cost | Output Cost | Best For |
|-------|-----------|-------------|----------|
| GPT-4o | $2.50/M tokens | $10.00/M tokens | Complex analysis, quality high priority |
| Claude 3.5 Sonnet | $3.00/M tokens | $15.00/M tokens | Document analysis, long context |
| Gemini 2.0 Pro | $2.00/M tokens | $8.00/M tokens | Multimodal, vision tasks |
| Mistral Large | $2.00/M tokens | $6.00/M tokens | General purpose, cost-sensitive |
| Llama 3 (self-hosted) | $0.20/M tokens | $0.20/M tokens | Data-sensitive tenants, high volume |

### Model Routing Strategy

```php
<?php
// app/Services/ModelRouter.php

class ModelRouter
{
    public function route(AIRequest $request): ModelRoute
    {
        // Route by capability requirement
        if ($request->requiresVision()) {
            return new ModelRoute('gemini-2.0-pro');
        }

        // Route by cost sensitivity
        if ($request->isCostSensitive() || $request->tenant()->budget < 50) {
            return $this->routeToCheapest($request);
        }

        // Route by latency requirement
        if ($request->requiresLowLatency()) {
            return new ModelRoute('mistral-large');
        }

        // Default: balance cost and quality
        return new ModelRoute('gpt-4o', [
            'fallback' => 'claude-3.5-sonnet',
            'qualifier' => 'Use cheaper model for non-critical requests',
        ]);
    }

    private function routeToCheapest(AIRequest $request): ModelRoute
    {
        // Check if self-hosted Llama is available
        if ($this->isSelfHostedAvailable() && !$request->requiresHighestQuality()) {
            return new ModelRoute('llama-3-70b', ['cost' => 'self_hosted']);
        }

        // Cache small/medium models aggressively
        if ($request->isCacheable()) {
            return new ModelRoute('mistral-large', ['cache_ttl' => 3600]);
        }

        return new ModelRoute('mistral-large');
    }
}
```

### AI Cost Optimization Techniques

| Technique | Savings | Implementation |
|-----------|---------|----------------|
| Response caching | 40-60% | Cache identical prompts (Prompt Registry) |
| Embedding caching | 50-70% | Cache document embeddings (pgvector) |
| Model tier routing | 30-50% | Use cheaper models for non-critical tasks |
| Prompt compression | 20-30% | Truncate/summarize long context |
| Batch inference | 15-25% | Batch similar requests |
| Self-hosting (Phase 2+) | 60-80% | Llama 3 on GPU spot instances |
| Token budget per tenant | Variable | Enforce monthly AI spending limits |

### Token Budget Enforcement

```php
<?php
// app/Services/AITokenBudgetService.php

class AITokenBudgetService
{
    public function checkBudget(Tenant $tenant): bool
    {
        $monthlyUsage = AICost::where('tenant_id', $tenant->id)
            ->where('created_at', '>=', now()->startOfMonth())
            ->sum('cost');

        $budget = $tenant->ai_budget_monthly ?? 100; // Default $100/mo

        if ($monthlyUsage >= $budget) {
            // Degrade gracefully: use free tier (Mistral small) or block
            $tenant->update(['ai_access_level' => 'restricted']);
            Log::warning("Tenant {$tenant->id} exceeded AI budget", [
                'budget' => $budget,
                'spent' => $monthlyUsage,
            ]);
            return false;
        }

        return true;
    }
}
```

---

## 7. Monitoring and Alerting for Cost Anomalies

### Cost Anomaly Detection

```yaml
# Prometheus + Kubecost cost monitoring
rules:
  - alert: DailyCostSpike
    expr: |
      kubecost_cluster_monthly_cost
      > kubecost_cluster_monthly_cost offset 1d * 1.5
    for: 1h
    labels:
      severity: warning
    annotations:
      summary: "Daily cost spike > 50% above baseline"

  - alert: AICostAnomaly
    expr: |
      sum(rate(merline_ai_cost_total[1h])) by (model, tenant)
      > 50.0  # $50/hour from a single model-tenant pair
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "AI cost anomaly: {{ $labels.model }} for {{ $labels.tenant }}"

  - alert: StorageCostGrowth
    expr: |
      aws_s3_bucket_size_bytes{ StorageType = "StandardStorage" }
      > 1e12  # 1TB threshold
    for: 24h
    labels:
      severity: info
    annotations:
      summary: "S3 storage approaching 1TB. Review lifecycle policies."
```

### Kubecost Integration

```yaml
# Kubecost Helm values
kubecost:
  enabled: true
  kubecostToken: ""
  prometheus:
    kube-state-metrics:
      enabled: true
    node-exporter:
      enabled: true
  clusterName: merline-prod
  global:
    azureEnabled: false
    gcpEnabled: false
  networkCosts:
    enabled: true  # Track cross-AZ and cross-region costs
```

### Cost Monitoring Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│ Cost Dashboard (Last 30 days)                                    │
├─────────────────────────────────────────────────────────┬────────┤
│ Total Spend by Service                                    │ $2,650 │
│ ┌───────────────────────────────────────────────────────┐ │        │
│ │ Compute (EKS)    ████████████████░░░░░░░░░░  $800     │ │ 30%   │
│ │ Database (RDS)   ██████████░░░░░░░░░░░░░░░░  $500     │ │ 19%   │
│ │ AI APIs          ██████████░░░░░░░░░░░░░░░░  $500     │ │ 19%   │
│ │ Cache (Redis)    ████░░░░░░░░░░░░░░░░░░░░░░  $200     │ │ 7%    │
│ │ Networking       ████░░░░░░░░░░░░░░░░░░░░░░  $200     │ │ 7%    │
│ │ Storage (S3)     ███░░░░░░░░░░░░░░░░░░░░░░░  $150     │ │ 6%    │
│ │ Monitoring       ████░░░░░░░░░░░░░░░░░░░░░░  $200     │ │ 7%    │
│ │ Other            ░░░░░░░░░░░░░░░░░░░░░░░░░░  $100     │ │ 4%    │
│ └───────────────────────────────────────────────────────┘ │        │
├─────────────────────────────────────────────────────────┴────────┤
│ Efficiency Metrics                                               │
│ Cost per active user: $2.45  ████████░░░░ (target: $3.00)         │
│ Cost per submission:  $0.008 ████████░░░░ (target: $0.01)         │
│ AI cost per token:    $0.0  ████████░░░░ (N/A Phase 1)            │
│ Waste (idle):        4.2%   ████████░░░░ (target: < 10%)           │
│ Reserved Instance coverage: 0%  ░░░░░░░░░░ (target: 70% Phase 2)  │
└──────────────────────────────────────────────────────────────────┘
```

### Cost Review Cadence

| Review Type | Frequency | Participants | Action Items |
|-------------|-----------|-------------|--------------|
| Cost dashboard review | Daily (automated) | DevOps Lead | Alert on anomalies |
| Weekly cost check | Weekly | DevOps Lead | Flag unexpected increases |
| Monthly cost review | Monthly | Engineering + Ops | Review waste, adjust budgets |
| Quarterly optimization | Quarterly | Full team | RI purchase, right-sizing |
| Annual forecast | Annual | Leadership | Budget planning, capacity |

---

## 8. Reserved Instance / Savings Plan Strategy

### AWS Savings Plan Coverage

```yaml
Phase 1 (Months 0-6):
  - No commitment (flexibility > discount at low spend)
  - Estimated monthly spend: $2,650
  - Potential savings: $0

Phase 2 (Months 6-18):
  70% Compute Savings Plan (1-Year Partial Upfront)
  - Coverage: EC2, Fargate, Lambda
  - Discount: ~30%
  - Estimated savings: ~$100/mo

  1-Year RDS Reserved Instance
  - Coverage: Primary + 1 read replica
  - Discount: ~30%
  - Estimated savings: ~$150/mo

Phase 3 (Months 18+):
  90% Compute Savings Plan (3-Year All Upfront)
  - Discount: ~50%
  - Estimated savings: ~$800/mo

  3-Year RDS Reserved Instance
  - Discount: ~50%
  - Estimated savings: ~$600/mo
```

### Reserved Instance Calculator

```bash
# RDS Reserved Instance (1-Year Partial Upfront)
# Instance: db.r6g.large
# Region: eu-west-1
# On-Demand: $0.252/hr = $185/mo
# Reserved (1Y Partial): $0.174/hr = $128/mo
# Savings: $57/mo (31%)

# Compute Savings Plan (1-Year Partial Upfront)
# $10/hr commitment
# On-Demand baseline: $2.90/hr
# Effective discount: 33%
# Upfront: $10/hr × 0.5 × 8760 = $43,800 (50% upfront)
```

---

## 9. Cost Allocation Tags

```yaml
# Required tags on all AWS resources
Tags:
  - Key: Environment
    Value: Production | Staging | Dev
  - Key: Service
    Value: api-gateway | study-service | ai-gateway | ...
  - Key: Tenant
    Value: shared | tenant_abc123 | tenant_def456
  - Key: CostCenter
    Value: engineering | product | infrastructure
  - Key: ResourceOwner
    Value: devops | backend | frontend | ai
  - Key: CreatedBy
    Value: terraform | helm | manual
```

### Kubernetes Cost Allocation

```yaml
# Kubecost labels for cost allocation
labels:
  cost-center: "engineering"
  team: "backend"
  service: "api-gateway"
  environment: "production"
  tenant: "shared"
```

---

## 10. Cost Optimization Schedule

```yaml
schedule:
  daily:
    - Cost anomaly alert check
    - Spot interruption monitoring

  weekly:
    - Kubecost waste report review
    - Idle resource identification
    - S3 storage growth check

  monthly:
    - Full cost review meeting
    - Right-sizing recommendations
    - RI/Savings Plan adjustment
    - Budget vs actual analysis

  quarterly:
    - Infrastructure right-sizing
    - Reserved Instance purchase (if due)
    - AI model cost-effectiveness review
    - Network egress optimization

  annually:
    - Cloud provider cost comparison (AWS vs GCP)
    - Multi-cloud arbitrage opportunities
    - Long-term capacity planning
    - Vendor renegotiation (if applicable)
```
