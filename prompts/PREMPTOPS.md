# Merline PromptOps

## Version: 1.0.0
## Status: Draft
## Owner: Prompt Engineering Lead

---

## 1. PromptOps Philosophy

**Prompts are software. Treat them accordingly.**

PromptOps applies software engineering practices to prompt management:
- Version control (Git)
- Semantic versioning
- Automated testing (CI)
- Deployment pipelines (CD)
- Monitoring and alerting
- Incident response
- Governance and approval workflows

---

## 2. Prompt Storage

### 2.1 Source of Truth

All prompts are stored as version-controlled markdown files in the `prompts/` directory within the main repository.

```
merline/
├── prompts/          # Source of truth for all prompts
│   ├── agents/       # Agent system prompts
│   ├── workflows/    # Workflow task prompts
│   ├── evaluation/   # Evaluation prompts
│   ├── guardrails/   # Guardrail definitions
│   ├── fewshot/      # Few-shot example libraries
│   │   ...
│   ├── PREMPTOPS.md  # This document
│   └── *.md          # Documentation files
└── README.md
```

### 2.2 Runtime Registry

The runtime prompt registry is stored in the `prompt_versions` PostgreSQL table (see AI-ANALYTICS-SCHEMA.md). Prompts are synced from Git to the database during deployment.

### 2.3 Sync Process

```yaml
# .github/workflows/prompt-sync.yml
name: Prompt Sync
on:
  push:
    paths:
      - 'prompts/**/*.md'
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate prompt structure
        run: ./scripts/validate-prompts.sh
      - name: Build prompt index
        run: ./scripts/build-prompt-index.php
      - name: Deploy to registry
        run: ./scripts/deploy-prompts.php
        env:
          APP_ENV: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
```

---

## 3. Prompt File Structure

### 3.1 Required Structure

Every prompt file must contain:

```yaml
---
prompt_key: unique-identifier
name: Human-readable name
version: 1.0.0
author: Author Name
owner: Owner Name
status: draft | review | shadow | canary | active | deprecated | archived
---
```

### 3.2 Validation Rules

| Rule | Check | Error |
|------|-------|-------|
| Metadata present | YAML frontmatter has all required fields | FAIL |
| Valid version | Version matches semver format | FAIL |
| Valid prompt_key | Follows `{domain}-{purpose}` convention | FAIL |
| Sections present | Contains Identity, Mission, Objective, Constraints, Thinking Framework, Output Requirements, Validation | FAIL |
| No template errors | All `{{variable}}` references have corresponding variable in metadata | FAIL |
| Model specified | `model` field is a supported model name | FAIL |
| Valid status | Status is one of allowed lifecycle states | FAIL |

---

## 4. CI/CD Pipeline

### 4.1 Pipeline Stages

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Lint    │───▶│ Validate │───▶│ Evaluate │───▶│  Build   │───▶│  Deploy  │
│ (struct) │    │ (syntax) │    │ (quality)│    │ (index)  │    │ (db)     │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                         │
                                         ▼
                                   ┌──────────┐
                                   │   Gate   │
                                   │ > 0.80?  │
                                   └──────────┘
```

### 4.2 PR Validation

Triggered on every PR that modifies `prompts/`:

| Stage | Tool | Description |
|-------|------|-------------|
| 1. Lint | Custom script | Check file structure, required sections present |
| 2. Validate | PHP validator | Parse YAML, check template variables, verify dependencies exist |
| 3. Evaluate | LLM-as-judge | Run against evaluation datasets; check pass rate > 85% |
| 4. Regression | Automated suite | Run against regression datasets; no pass rate drop > 5% |
| 5. Gate | Automated | All checks pass → PR approved for review |

### 4.3 PR Review Requirements

| Requirement | Description |
|-------------|-------------|
| Minimum reviewers | 2 (Prompt Engineering Lead + AI Systems Architect) |
| Required checks | All CI checks pass |
| Change documentation | CHANGELOG entry required |
| Breaking changes | `BREAKING CHANGE:` in PR title triggers MAJOR version bump |
| Evaluation results | Attach evaluation scorecard to PR |

### 4.4 Merge to Main

On merge to `main`:
1. Version automatically bumped based on commit messages
2. Prompt synced to staging database
3. Shadow mode activated (14 days)
4. Performance metrics collected

---

## 5. Semantic Versioning

### 5.1 Version Format

```
MAJOR.MINOR.PATCH

MAJOR: Breaking behavior change (output format, thinking framework, constraints)
MINOR: New capability, improved quality, additional examples
PATCH: Fixes, refinements, typo corrections
```

### 5.2 Version Bump Rules

| Change Type | Bump | Example |
|-------------|------|---------|
| Changed required output format | MAJOR | 1.2.0 → 2.0.0 |
| Removed or changed a constraint | MAJOR | 1.2.0 → 2.0.0 |
| Changed thinking framework steps | MAJOR | 1.2.0 → 2.0.0 |
| Added new capability to prompt | MINOR | 1.2.0 → 1.3.0 |
| Added few-shot examples | MINOR | 1.2.0 → 1.3.0 |
| Improved clarity of instructions | PATCH | 1.2.0 → 1.2.1 |
| Fixed typo or formatting | PATCH | 1.2.0 → 1.2.1 |
| Changed evaluation prompt criteria | MINOR | 1.2.0 → 1.3.0 |

### 5.3 Version Tracking

```json
{
  "prompt_key": "workflow-toc-generation",
  "versions": [
    {"version": "1.0.0", "date": "2026-07-18", "status": "deprecated"},
    {"version": "1.1.0", "date": "2026-08-01", "status": "deprecated"},
    {"version": "1.2.0", "date": "2026-08-15", "status": "active"},
    {"version": "2.0.0", "date": "2026-09-01", "status": "canary"}
  ]
}
```

---

## 6. Deployment Strategies

### 6.1 Strategy Options

| Strategy | Traffic | Duration | When to Use |
|----------|---------|----------|-------------|
| **Shadow** | 0% (log only) | 14 days | New prompt version; collect metrics without user impact |
| **Canary** | 5% | 7 days | Riskier changes; validate with real traffic |
| **Gradual** | 25% → 50% → 100% | 3-5 days per step | Moderate risk changes |
| **Full** | 100% | Indefinite | Low-risk patches; urgent fixes |

### 6.2 Deployment Flow

```yaml
deploy:
  prompt_key: workflow-toc-generation
  new_version: 2.0.0
  old_version: 1.2.0
  
  schedule:
    - phase: shadow
      duration: 14 days
      evaluation_frequency: daily
      rollback_trigger: quality_score < 0.70
    
    - phase: canary (5%)
      duration: 7 days
      evaluation_frequency: daily
      rollback_trigger: quality_score < 0.75 OR error_rate > 5%
    
    - phase: gradual_25
      duration: 3 days
      rollback_trigger: quality_score < 0.78
    
    - phase: gradual_50
      duration: 3 days
      rollback_trigger: quality_score < 0.78
    
    - phase: full
      duration: indefinite
      rollback_trigger: quality_score < 0.75 OR safety_incident
```

### 6.3 Rollback Procedure

```yaml
rollback_procedure:
  trigger_conditions:
    - quality_score drops > 0.10 from baseline
    - error_rate > 5% for > 1 hour
    - safety_incident detected
    - user_rating drops > 1.0 from baseline
    - cost increase > 50% without quality improvement
  
  auto_rollback:
    enabled: true
    cooldown: 60 seconds  # Prevent cascading rollbacks
    
  manual_rollback:
    available: always
    authorized_roles: [Prompt Engineering Lead, AI Systems Architect, DevOps Lead]
  
  steps:
    1. Set is_active = false on current version
    2. Set is_active = true on previous active version
    3. Log incident with: prompt_key, version_from, version_to, reason, trigger
    4. Notify: Prompt Engineering Lead, AI Systems Architect
    5. Monitor for 24 hours post-rollback
    6. Create incident report for root cause analysis
```

---

## 7. Monitoring and Alerting

### 7.1 Metrics Collection

All prompts are monitored via `ai_inference_logs` and `ai_token_usage_daily` tables.

### 7.2 Dashboard

A Grafana dashboard tracks:

```
Prompt Performance Dashboard
├── Per-Prompt Metrics
│   ├── Call volume (7d trend)
│   ├── Quality score (7d trend)
│   ├── Average latency (P50, P95, P99)
│   ├── Average cost per call
│   ├── Error rate
│   └── User rating (1-5)
├── Version Comparison
│   ├── Current vs previous version quality
│   ├── Current vs previous version cost
│   └── Current vs previous version latency
├── Cost Tracking
│   ├── Daily cost by prompt
│   ├── Monthly cost by agent
│   └── Cost by tenant
└── Alerts
    ├── Quality degradation
    ├── Cost anomaly
    └── Error surge
```

### 7.3 Alert Rules

| Alert Name | Condition | Severity | Notification |
|------------|-----------|----------|--------------|
| QualityDegradation | quality_score < 0.75 for 1h | Warning | Slack |
| QualityCritical | quality_score < 0.60 for 30m | Critical | PagerDuty + Slack |
| CostAnomaly | daily_cost > 2x 7d average | Warning | Slack |
| CostCritical | daily_cost > 5x budget | Critical | PagerDuty + Slack |
| ErrorSurge | error_rate > 5% for 30m | Warning | Slack |
| ErrorCritical | error_rate > 10% for 15m | Critical | PagerDuty + Slack |
| SafetyIncident | safety_score < 0.5 | Critical | PagerDuty + Slack + Email |
| RollbackTriggered | auto_rollback activated | Critical | PagerDuty + Slack + Email |

---

## 8. Governance and Approval Workflow

### 8.1 Change Types

| Change Type | Examples | Approval Required |
|-------------|----------|-------------------|
| **Patch** | Fix typo, clarify wording, add example | Prompt Engineering Lead |
| **Minor** | Add new capability, improve quality, add few-shot | Prompt Engineering Lead + AI Systems Architect |
| **Major** | Restructure prompt, change output format, change constraints | Prompt Engineering Lead + AI Systems Architect + Product Manager |
| **Emergency** | Fix safety issue, block harmful output | Prompt Engineering Lead (post-hoc review) |

### 8.2 Approval Workflow

```
Developer → Prompt Engineering Lead → AI Systems Architect → Product Manager (major only)
                |
                └── Auto-approve for patches
```

### 8.3 Process Steps

| Step | Who | What |
|------|-----|------|
| 1. Create branch | Developer | Branch from `main`: `chore/prompt-toc-v2` |
| 2. Edit prompt | Developer | Edit markdown file in `prompts/` |
| 3. Commit + push | Developer | Descriptive commit message with change type |
| 4. Open PR | Developer | Include evaluation results, change rationale |
| 5. CI checks | Automated | Lint, validate, evaluate, regression |
| 6. Code review | PEL + AI Architect | Review prompt quality and evaluation |
| 7. Product review | PM (major only) | Approve product impact |
| 8. Merge | PEL | Merge to `main` |
| 9. Deploy | Automated | Shadow → Canary → Full |
| 10. Monitor | PEL | Review metrics for 14 days |

---

## 9. Incident Response

### 9.1 Incident Types

| Type | Example | Response |
|------|---------|----------|
| Safety violation | Output contains harmful content | Immediate rollback + incident investigation |
| Quality degradation | Quality score drops significantly | Rollback + root cause analysis |
| Cost anomaly | Unusual spending spike | Investigate usage patterns |
| Deployment failure | Prompt deploy fails | Fix pipeline issue, retry |
| Prompt injection | Successful injection detected | Rotate prompt, security review |

### 9.2 Incident Response Flow

```
1. Detection (automated or manual)
2. Triage (within 15 minutes for critical)
3. Contain (rollback if necessary)
4. Investigation (root cause analysis)
5. Fix (implement fix)
6. Verification (confirm fix resolves issue)
7. Post-mortem (document lessons learned)
8. Prevention (update monitoring, test, or process)
```

---

## 10. Tooling

### 10.1 CLI Tools

```bash
# Validate prompt structure
php artisan prompt:validate prompts/workflows/toc-generation-v1.md

# Evaluate prompt against datasets
php artisan prompt:evaluate workflow-toc-generation --dataset=ground_truth

# Deploy prompt
php artisan prompt:deploy workflow-toc-generation --version=2.0.0 --strategy=canary

# Rollback prompt
php artisan prompt:rollback workflow-toc-generation

# Compare versions
php artisan prompt:compare workflow-toc-generation --v1=1.2.0 --v2=2.0.0

# List prompt versions
php artisan prompt:list --status=active

# Generate prompt report
php artisan prompt:report workflow-toc-generation
```

### 10.2 CI Scripts

| Script | Purpose |
|--------|---------|
| `scripts/validate-prompts.sh` | Lint and validate all prompt files |
| `scripts/build-prompt-index.php` | Build searchable index of all prompts |
| `scripts/deploy-prompts.php` | Sync prompts from Git to runtime database |
| `scripts/run-evaluation.php` | Run automated evaluation on prompt version |
| `scripts/check-regression.php` | Run regression tests on prompt version |

---

## 11. Roles and Responsibilities

| Role | PromptOps Responsibility |
|------|--------------------------|
| **Prompt Engineering Lead** | Owns prompt quality, approves changes, monitors metrics |
| **AI Systems Architect** | Architecture decisions, model selection, evaluation methodology |
| **Developer** | Writes and edits prompt files |
| **DevOps Lead** | CI/CD pipeline, deployment infrastructure, monitoring |
| **QA Lead** | Human evaluation coordination, dataset curation |
| **Product Manager** | Approves major behavior changes, prioritizes improvements |
| **Security Architect** | Reviews guardrail changes, incident response |

---

# Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-18 | Prompt Engineering Lead | Initial PromptOps pipeline design |
