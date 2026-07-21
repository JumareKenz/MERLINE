# Guardrails & Safety Architecture

## 1. Overview

The Guardrail Service sits at the entry and exit of every AI inference pipeline, ensuring that inputs and outputs meet safety, privacy, and quality standards before reaching users.

---

## 2. Architecture

```
                    Input Guardrails                      Output Guardrails
User → [1] PII Redaction → [2] Injection Detection → LLM → [3] Safety Check → [4] Hallucination Check → User
                    [1a] Content Policy Check              [5] PII Leak Check
                                                           [6] Format Validation
```

### 2.1 Deployment

- **Service**: Python FastAPI (independent microservice)
- **Scaling**: Horizontally scalable, stateless
- **Latency budget**: <200ms per guardrail (input + output total <500ms)
- **Fallback**: If guardrail service unavailable → block all AI requests (fail-closed)

---

## 3. Input Guardrails

### 3.1 PII Redaction

| PII Type | Detection Method | Action |
|----------|-----------------|--------|
| Email addresses | Regex | Redact → `<EMAIL>` |
| Phone numbers | Regex (per region) | Redact → `<PHONE>` |
| National ID / Passport | Regex (per country) | Redact → `<ID>` |
| IP Addresses | Regex | Redact → `<IP>` |
| Credit Card Numbers | Luhn + Regex | Redact → `<CC>` |
| GPS Coordinates | Pattern match | Redact → `<GPS>` |
| Names (contextual) | NER model | Redact → `<NAME>` |
| Free-text health info | Clinical NER | Redact → `<HEALTH_INFO>` |

### 3.2 Injection Detection

| Attack Type | Detection | Action |
|------------|-----------|--------|
| Prompt injection | LLM classifier (T1 model) | Block request |
| Jailbreak attempts | Pattern matching + classifier | Block request |
| System prompt extraction | Heuristic (unusual length, template patterns) | Block request |
| Unicode / encoding attacks | Normalization check | Normalize or block |
| Role-playing manipulation | LLM classifier | Block request |

### 3.3 Content Policy Check

| Category | Check | Threshold |
|----------|-------|-----------|
| Hate speech | Classifier | Block ≥0.8 confidence |
| Violence | Classifier | Block ≥0.8 confidence |
| Sexual content | Classifier | Block ≥0.9 (research context may allow) |
| Harassment | Classifier | Block ≥0.8 confidence |
| Self-harm | Classifier | Block ≥0.7 confidence |
| Illegal activity | Classifier | Block ≥0.7 confidence |

---

## 4. Output Guardrails

### 4.1 Safety Check

Same categories as input guardrails, applied to LLM output.

### 4.2 PII Leak Check

- Scan LLM output for any PII patterns
- If PII found → regenerate without PII or block output
- Log incident for security review

### 4.3 Hallucination Detection

| Method | Description | Threshold |
|--------|-------------|-----------|
| **Citation verification** | Check each cited chunk_id exists and claim matches source text | All must pass |
| **Self-consistency** | Generate 3 answers (low temp), check agreement | >80% agreement |
| **Factual recall** | Ask verification questions about output claims | >70% correct |
| **Confidence calibration** | Model log probabilities for key tokens | >0.5 avg probability |

### 4.4 Format Validation

| Check | Description |
|-------|-------------|
| JSON schema validation | Output matches expected schema (if structured) |
| Token limit | Output within configured max_tokens |
| Language match | Output language matches requested language |
| Instruction adherence | Contains required sections, avoids forbidden content |

---

## 5. Tenant-Specific Policies

### 5.1 Policy Configuration

```json
{
  "tenant_id": "uuid",
  "guardrails": {
    "pii_redaction": {
      "enabled": true,
      "modes": {
        "strict": ["EMAIL", "PHONE", "ID", "CC", "GPS", "NAME"],
        "standard": ["EMAIL", "PHONE", "ID"],
        "minimal": ["EMAIL"]
      },
      "current_mode": "standard"
    },
    "content_policy": {
      "additional_blocked_categories": [],
      "allowed_categories_during_research": ["sexual_content"]
    },
    "retention": {
      "log_inputs": true,
      "log_outputs": true,
      "retention_days": 90
    }
  }
}
```

### 5.2 Mode Selection by Use Case

| Use Case | PII Mode | Content Policy |
|----------|----------|---------------|
| Research design | Standard | Full |
| Questionnaire design | Minimal | Full (allow research topics) |
| Data collection | Strict | Full |
| Analysis (anonymized) | Minimal | Full |
| Knowledge Q&A | Standard | Full |
| Report drafting | Minimal | Full |
| Qualitative coding | Standard | Full |

---

## 6. Audit & Logging

### 6.1 Guardrail Event Log

```json
{
  "id": "uuid",
  "timestamp": "2026-03-20T14:30:00Z",
  "type": "input_guardrail" | "output_guardrail",
  "guardrail_name": "pii_redaction" | "injection_detection",
  "action": "block" | "redact" | "allow" | "flag",
  "reason": "PII detected: EMAIL",
  "original_content_hash": "sha256",
  "redacted_content_hash": "sha256 (if applicable)",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "session_id": "uuid",
  "inference_id": "uuid"
}
```

### 6.2 Review Workflow

- Guardrail blocks → logged + user sees "Request cannot be processed"
- Guardrail flags (low confidence blocks) → queued for human review
- Weekly guardrail report: trends, false positive rate, false negative review
- Monthly: guardrail tuning based on review outcomes

---

## 7. Data Retention & Privacy

| Policy | Implementation |
|--------|---------------|
| Input retention | Retained for audit: 90 days (configurable per tenant) |
| Output retention | Retained for quality improvement: 90 days |
| PII in logs | Never stored — redacted before logging |
| User consent | AI processing covered by platform ToS |
| Model training | User data NOT used for model training (unless explicitly opted in) |
| Deletion | Tenant deletion cascades to all guardrail logs |
