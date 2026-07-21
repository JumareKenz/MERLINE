# Merline AI Security Architecture

## Document Control

| Version | Date | Author | Status |
|---------|------|--------|--------|
| 1.0 | 2026-07-18 | Security Architect | Final |

---

## 1. AI Threat Landscape

### 1.1 AI-Specific Threats

| Threat | Risk Level | Description | Affected Components |
|--------|------------|-------------|---------------------|
| Prompt injection (direct) | Critical | User crafts input to override system prompt | AI Gateway, RAG Service |
| Prompt injection (indirect) | Critical | Malicious content in RAG context triggers prompt override | RAG Service, Vector Store |
| Training data extraction | High | Model outputs reveal training data or PII | AI Gateway, External Models |
| Membership inference | High | Attacker determines if specific data was in training set | AI Gateway, External Models |
| Model inversion | Medium | Reconstruct training data from model outputs | External Models |
| Jailbreak attempts | High | Bypass model safety constraints | AI Gateway |
| Context poisoning | Medium | Inject malicious content into conversation context | AI Gateway, RAG Service |
| Bias exploitation | Medium | Manipulate model toward biased outputs | AI Gateway, Prompt Registry |
| Denial of wallet | High | Cost exhaustion via excessive AI queries | AI Gateway |
| Model denial of service | Medium | Overload AI provider rate limits | AI Gateway, External Models |
| Data exfiltration via AI | Critical | Encode sensitive data in model inputs | AI Gateway, PII Filter |
| Supply chain (model) | Medium | Compromised model weights | Self-hosted Models |
| Output hallucination | Medium | Model generates false information affecting decisions | All AI features |
| Sensitive data in prompts | Critical | PII sent to external AI providers | PII Filter, AI Gateway |
| Prompt leakage | Medium | Attacker extracts prompt template via probing | AI Gateway |

### 1.2 AI Safety Principles

1. **Human-in-the-loop**: Every AI-generated action requires human review before irreversible changes
2. **Data minimization**: Never send more data to AI models than necessary for the task
3. **Least privilege for prompts**: Prompts have minimum context needed for accurate response
4. **Isolation by tenant**: No cross-tenant data leakage in AI contexts
5. **Audit everything**: All AI interactions logged, traceable, and reviewable
6. **Fail safe**: AI failures default to safe state (reject, not allow)
7. **Version control**: Every prompt and model version is controlled and deployable
8. **Progressive rollout**: AI features are released with feature flags, gradual percentage rollouts

---

## 2. AI Gateway Security Architecture

### 2.1 AI Gateway Request Flow

```
┌─────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Client  │────▶│  AI Gateway   │────▶│  PII Filter   │────▶│  Guardrail   │
│  (App)   │     │  (Laravel)    │     │  Service      │     │  Service     │
└─────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                 │
                                                                 ▼
                                                          ┌──────────────┐
                                                          │  Prompt       │
                                                          │  Assembly     │
                                                          └──────┬───────┘
                                                                 │
                                                                 ▼
                                                          ┌──────────────┐
                                                          │  Model Router │
                                                          └──────┬───────┘
                                                                 │
                    ┌──────────┬──────────┬──────────┬───────────┤
                    ▼          ▼          ▼          ▼           ▼
              ┌─────────┐┌─────────┐┌─────────┐┌─────────┐┌──────────┐
              │ GPT-4o  ││ Claude  ││ Gemini  ││ Llama 3 ││ Mistral  │
              │         ││ 3.5     ││ 2       ││ (local) ││          │
              └─────────┘└─────────┘└─────────┘└─────────┘└──────────┘
                    │
                    ▼
              ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
              │  Output       │────▶│  Guardrail   │────▶│  Response    │
              │  Validator    │     │  (Output)    │     │  → Client    │
              └──────────────┘     └──────────────┘     └──────────────┘
```

### 2.2 Input Security Layer

**PII/Data Filtering:**

| Filter | Description | Implementation |
|--------|-------------|----------------|
| PII redaction | Detect and redact PII before sending to AI model | Regex patterns + ML-based NER |
| Credit card/PAN | Detect and mask payment card numbers | Luhn check + regex |
| API keys/tokens | Detect and redact credential patterns | Regex pattern matching |
| Email/phone redaction | Remove contact information | Regex patterns |
| National ID redaction | Country-specific ID number patterns | Configurable per tenant |
| Custom patterns | Organization-defined sensitive patterns | Tenant configuration |

**Input Validation:**

| Check | Description | Action |
|-------|-------------|--------|
| Max input length | Configurable per model/feature | Truncate or reject |
| Character set validation | Reject control characters, encoding attacks | Reject with error |
| Injection pattern check | Known prompt injection patterns | Flag + reject or sanitize |
| Repetitive content check | Detect token waste attacks | Rate limit |
| Language detection | Ensure input language matches allowed list | Warning or reject |

### 2.3 Output Security Layer

**Output Validation:**

| Check | Description | Action |
|-------|-------------|--------|
| Content policy violation | Hate, harassment, violence, self-harm | Block, log, alert |
| PII leakage | Model output contains PII | Redact + log incident |
| Hallucination detection | Fact-check against knowledge base | Flag with confidence score |
| Prompt injection confirmation | Model output indicates injection success | Block + alert security team |
| Output format validation | Ensure response matches expected schema | Reject malformed output |
| Confidence threshold | Reject low-confidence outputs | Return "uncertain" response |
| Source citation check | Ensure claims cite actual RAG sources | Flag uncited claims |

**Content Safety Classification:**

```
Input/Output → Safety Classifier
  ├── Safe → Allow (confidence > 0.95)
  ├── Low Risk → Allow with flag (confidence 0.80-0.95)
  ├── Medium Risk → Review required (confidence 0.50-0.80)
  └── High Risk → Block (confidence < 0.50)
```

### 2.4 Cost and Rate Controls

| Control | Implementation | Purpose |
|---------|---------------|---------|
| Per-tenant daily budget | Configurable cost cap | Prevent cost exhaustion |
| Per-user rate limit | Requests per minute/hour/day | Prevent abuse |
| Per-feature budget | Allocate budget per AI feature | Cost allocation |
| Model routing cost optimization | Select cheapest capable model | Cost efficiency |
| Token limits per request | Max input + output tokens | Cost predictability |
| Concurrent request limit | Max parallel AI requests per tenant | Provider rate limit safety |
| Cost anomaly detection | Alert on >2x normal spending | Fraud detection |
| Spending notifications | 80%, 90%, 100% of budget | User awareness |

---

## 3. Prompt Security

### 3.1 Prompt Injection Prevention

**Architecture:**

```
User Input
  │
  ├── 1. Input Sanitization Layer
  │     ├── Strip control characters
  │     ├── Normalize Unicode
  │     ├── Remove injection markers (delimiters)
  │     └── PII redaction
  │
  ├── 2. System Prompt Protection
  │     ├── System prompt appended AFTER user input
  │     ├── Delimiter enforcement with error detection
  │     ├── System prompt integrity check (SHA-256)
  │     └── Structured prompt template (not concatenation)
  │
  ├── 3. Injection Pattern Detection
  │     ├── Known injection pattern database
  │     ├── Prompt probing detection
  │     ├── Multi-language injection (English + local language)
  │     └── Role-play/override attempt detection
  │
  └── 4. Defense-in-depth
        ├── Output validation (reverse-check)
        ├── Human review for high-risk actions
        ├── Rate limiting on prompt variations
        └── Model-specific protections
```

**System Prompt Integrity:**

```php
class PromptAssemblyService
{
    public function assemble(Prompt $prompt, Context $context): array
    {
        // Load system prompt from Prompt Registry (immutable, versioned)
        $systemPrompt = $this->registry->getActive($prompt->key);

        // Verify system prompt integrity
        $checksum = hash('sha256', $systemPrompt->content);
        if ($checksum !== $systemPrompt->checksum) {
            throw new PromptTamperedException('System prompt integrity check failed');
        }

        // Sanitize user input
        $userInput = $this->sanitizer->sanitize($context->userInput);

        // Assemble with strict delimiters
        return [
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt->content],
                ['role' => 'user', 'content' => PromptSecurity::wrapInput($userInput)],
            ],
            'security' => [
                'system_prompt_version' => $systemPrompt->version,
                'sanitization_applied' => $this->sanitizer->getAppliedRules(),
            ],
        ];
    }
}
```

### 3.2 Prompt Registry Security

| Control | Description |
|---------|-------------|
| Version control | Every prompt change creates new version |
| Deployment approval | Prompt deployment requires approval workflow |
| A/B testing | Canary prompts tested before full rollout |
| Access control | Only Prompt Engineering Lead + AI Architect can modify prompts |
| Integrity checks | SHA-256 checksum stored with prompt |
| Audit trail | All prompt changes logged (who, what, when) |
| Rollback capability | Previous version instantly available |
| Tenant isolation | Different prompts per tenant type |
| Model-specific prompts | Each model gets optimized prompt |

---

## 4. RAG Security

### 4.1 RAG Data Flow

```
Document → Chunking → Embedding → pgvector
  │                              │
  │                              └── Access control at ingestion
  │                                  (tenant-scoped documents only)
  │
User Query → PII Filter → Query Embedding → Vector Search
                                                  │
                                            ┌─────┴──────┐
                                            │  Access     │
                                            │  Filter     │
                                            └─────┬──────┘
                                                  │
                                            ┌─────┴──────┐
                                            │  Context    │
                                            │  Assembly   │
                                            └─────┬──────┘
                                                  │
                                            ┌─────┴──────┐
                                            │  To AI      │
                                            │  Model      │
                                            └────────────┘
```

### 4.2 RAG Access Controls

| Control | Implementation |
|---------|---------------|
| Tenant isolation | Vector search scoped to requesting tenant's organization_id |
| Document-level access | RAG results filtered by user's document read permissions |
| Context size limit | Max tokens in RAG context (control cost + leakage) |
| Source filtering | Exclude sources with lower trust score |
| Data separation | Different vector index per tenant (or schema-based) |
| Expiration | Embeddings have TTL after source document deletion |
| PII in embeddings | Never embed PII content; strip before chunking |

### 4.3 Context Poisoning Prevention

| Threat | Mitigation |
|--------|------------|
| Malicious document in RAG | Source trust scoring, quarantine new sources |
| Adversarial chunk content | Content sanitization before embedding |
| Context window overflow | Strict context length limits |
| Outdated/incorrect context | Versioned documents, freshness scoring |
| Cross-tenant context leak | Tenant-scoped vector search enforcement |

---

## 5. AI Audit Logging

### 5.1 Logged AI Events

| Event | Data Captured | Retention |
|-------|---------------|-----------|
| AI request received | User, tenant, feature, prompt key, model | 90 days |
| PII filter action | Filtered data type, action (redact/block) | 90 days |
| Guardrail trigger | Rule triggered, input/output content | 90 days |
| Model selection | Selected model, rationale (cost, capability) | 90 days |
| Model response | Response content (truncated if long), token count | 90 days |
| Cost per request | Tokens in/out, model cost, total cost | 90 days |
| Latency per request | Wall time, model time, queue time | 90 days |
| Hallucination flagged | Content flagged, confidence, source citation check | 90 days |
| Human review request | Content requiring review, reviewer, decision | 1 year |
| Prompt version used | Prompt key, version, checksum | 90 days |
| Safety classification | Safety score, classification, action taken | 90 days |
| Error/failure | Error type, model, retry count | 90 days |

### 5.2 Audit Event Schema

```json
{
  "id": "uuid-v7",
  "organization_id": "uuid",
  "user_id": "uuid",
  "event_type": "ai_request",
  "feature": "research_design_assistant",
  "prompt_key": "study-design-v3",
  "prompt_version": 3,
  "model": "gpt-4o",
  "model_version": "gpt-4o-2026-05-01",
  "tokens_in": 1250,
  "tokens_out": 380,
  "cost_usd": 0.0084,
  "latency_ms": 2340,
  "safety_classification": "safe",
  "guardrails_triggered": [],
  "pii_redacted": false,
  "human_review_required": false,
  "rag_sources_count": 3,
  "rag_source_ids": ["doc-uuid-1", "doc-uuid-2", "doc-uuid-3"],
  "created_at": "2026-07-18T14:30:00Z"
}
```

---

## 6. Guardrail Architecture

### 6.1 Guardrail Service

```
┌────────────────────────────────────────────────────────────┐
│                    Guardrail Service                         │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐│
│  │  Input Guardrails │  │  Output Guardrails│  │  Behavioral  │
│  │                   │  │                   │  │  Guardrails  ││
│  ├─────────────────┤  ├─────────────────┤  ├──────────────┤│
│  │ • PII detection  │  │ • Content safety │  │ • Rate limit ││
│  │ • Toxicity check │  │ • Hallucination  │  │ • Budget     ││
│  │ • Injection      │  │ • PII leakage    │  │ • Concurrent ││
│  │   detection      │  │ • Format check   │  │ • Error rate ││
│  │ • Context safety │  │ • Citation check │  │ • Latency    ││
│  │ • Language check │  │ • Confidence     │  └──────────────┘│
│  └─────────────────┘  └─────────────────┘                    │
└────────────────────────────────────────────────────────────┘
```

### 6.2 Guardrail Rules

| Rule | Type | Threshold | Action |
|------|------|-----------|--------|
| PII in input | Input | Any PII detected | Redact and proceed (with log) |
| Toxic language | Input | Score > 0.8 | Block, log, notify user |
| Injection attempt | Input | Score > 0.7 | Block, log incident, alert security |
| Context contains PII | Input (RAG) | Any PII detected | Exclude from context |
| PII in output | Output | Any PII detected | Redact and log |
| Hateful content | Output | Score > 0.9 | Block, log, alert admin |
| Hallucination risk | Output | Confidence < 0.6 | Mark as "low confidence" |
| Source citation | Output | Claims without citation | Flag as "unverified" |
| Budget exceeded | Behavioral | > 90% of daily budget | Warn user |
| Cost anomaly | Behavioral | > 2x normal spending | Alert admin, limit model |
| Rate exceeded | Behavioral | > 100 req/min/user | Throttle, 429 response |

### 6.3 Jailbreak Detection

| Technique | Detection Method |
|-----------|-----------------|
| DAN (Do Anything Now) | Pattern matching on known jailbreak prefixes |
| Character encoding obfuscation | Unicode normalization, base64 detection |
| Role-play scenarios | Detect "pretend you're..." with override intent |
| Multi-language injection | Cross-language prompt override attempts |
| Token smuggling | Detect encoding attempts in input |
| Context manipulation | Detect attempts to reset/ignore context |
| Repetitive refusal bypass | Detect iterated similar requests |
| Hypothetical framing | Detect "imagine/pretend/hypothetical" override attempts |

---

## 7. Human Review Workflow

### 7.1 Review Triggers

| Trigger | Feature | Reviewer |
|---------|---------|----------|
| AI recommendation for study design | Research Design Assistant | Researcher/PrincipalInvestigator |
| AI-generated report content | Report Writer | Researcher/ProgramManager |
| Data quality flag (AI-detected) | Data Quality Engine | DataManager/FieldSupervisor |
| AI insight (confidence < 0.7) | Insight Engine | Researcher |
| PII detected in AI interaction | All features | Security/Privacy team |
| Guardrail violation (medium risk) | All features | Security team |
| AI translation of questionnaire | AI Translation | Bilingual reviewer |
| Photo analysis result | Photo Analysis | Researcher/DataManager |

### 7.2 Review Flow

```
AI generates output
  │
  ├── Confidence >= 0.9 && Safe classification
  │     └── Auto-accept (logged)
  │
  ├── Confidence 0.7-0.9 && Safe classification
  │     └── Auto-accept with flag ("AI-generated, verify before use")
  │
  ├── Confidence < 0.7 || Medium risk classification
  │     ├── Notification sent to reviewer
  │     ├── Content queued in review dashboard
  │     ├── Reviewer: accept, reject, or modify
  │     ├── Decision logged
  │     └── On reject: reason captured + AI model logged for improvement
  │
  └── High risk classification || Guardrail violation
        ├── Immediate block
        ├── Security team notified
        ├── User notified (generic: "Content cannot be generated")
        └── Incident investigation
```

---

## 8. Model Access Control

### 8.1 Model Authorization

| Model | Default Access | Approval Required | Use Case |
|-------|---------------|-------------------|----------|
| GPT-4o | All researchers | No | Complex analysis, report generation |
| Claude 3.5 | All researchers | No | Document processing, long-form content |
| Gemini 2 | All users | No | Multimodal, translation |
| Llama 3 (local) | Data-sensitive orgs | OrgAdmin | Sensitive data processing |
| Mistral | Cost-sensitive orgs | OrgAdmin | High-volume, cost-critical tasks |
| Custom fine-tuned | Per org | SystemAdmin | Organization-specific models |

### 8.2 Model Routing Logic

```php
class ModelRouter
{
    public function select(FeatureRequest $request): Model
    {
        $candidates = $this->getCapableModels($request);

        // Apply tenant restrictions
        $candidates = $this->filterByTenantAllowlist($candidates);

        // Apply budget constraints
        $candidates = $this->filterByBudget($candidates);

        // Apply latency requirements
        $candidates = $this->filterByLatency($candidates, $request->latencyTolerance);

        // Apply data sensitivity (local model if sensitive)
        if ($request->containsSensitiveData) {
            $candidates = $this->filterLocalOnly($candidates);
        }

        // Select by cost (lowest capable)
        return $this->selectCheapest($candidates);
    }

    private function filterLocalOnly(array $candidates): array
    {
        return array_filter($candidates, fn($m) => $m->isLocalDeployment);
    }
}
```

---

## 9. Sensitive Data Classification for AI

| Data Category | Allow in AI Prompt? | Allow in RAG Context? | Action |
|---------------|---------------------|----------------------|--------|
| Aggregated statistics | Yes | Yes | No filtering needed |
| Indicator definitions | Yes | Yes | No filtering needed |
| Questionnaire structure | Yes | Yes | No filtering needed |
| Non-PII response data | Conditional | Yes | Feature-dependent |
| GPS coordinates (precise) | No | No | Redact to region level |
| PII (names, emails) | No | No | Strip before AI processing |
| Health data | No | No | Block, notify security |
| Consent information | No | No | Never send to external AI |
| Media with identifiable people | No | No | Block, route to local model only |
| AI conversations | Yes (current only) | — | Scoped to current session |
| Audit logs | No | No | Never |
| API keys/secrets | No | No | PII filter strips automatically |

---

## 10. Incident Response for AI

| Incident | Detection | Response | Escalation |
|----------|-----------|----------|------------|
| PII sent to external model | PII filter alert + audit | Block feature, review logs, notify DPO | Security team |
| Prompt injection success | Output guardrail trigger | Block model, rotate prompt, incident investigation | Security + AI teams |
| Model provider breach | Provider notification | Switch to fallback model, revoke API keys | Security + DevOps |
| Cost anomaly | Budget alert | Limit model access, investigate usage | Finance + Security |
| Hallucination causing harm | User report + audit | Retract published output, fix prompt, re-evaluate | QA + AI teams |
| Jailbreak attempt detected | Injection detector alert | Block user, log evidence, review | Security team |
| Training data extraction | Model output analysis | Remove data, notify affected parties | Security + DPO |
| Model provider outage | Health check failure | Failover to backup model | DevOps |

---

## 11. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PII filtering location | Before AI Gateway | Prevents PII from ever reaching model provider |
| Guardrail architecture | Dedicated service (not in-process) | Separates security concerns, independently scalable, replaceable |
| Model preference | External first, local for sensitive | External models are more capable; local is fallback for sensitive data |
| Prompt injection defense | Multi-layer (sanitization + detection + output validation) | Single layer is insufficient for sophisticated attacks |
| AI audit retention | 90 days (standard), 1 year (flagged) | Balances operational needs with data minimization |
| Human review | Required for high-impact AI actions | Research decisions require human judgment |
| Model routing | Cost-optimized with security constraints | Balances capability, cost, and data protection |
