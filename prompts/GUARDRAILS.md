# Merline Guardrail System

## Version: 1.0.0
## Status: Draft
## Owner: Prompt Engineering Lead

---

## 1. Guardrail Architecture

```
User Input
    │
    ▼
┌──────────────────────────────────────────────┐
│            INPUT GUARDRAIL LAYER              │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Prompt   │  │ PII      │  │ Context  │   │
│  │ Injection│  │ Detection│  │ Length   │   │
│  │ Detection│  │          │  │ Check    │   │
│  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐                  │
│  │ Topic    │  │ Language │                  │
│  │ Restrict │  │ Detection│                  │
│  └──────────┘  └──────────┘                  │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
        [AI Model Processing]
                   │
                   ▼
┌──────────────────────────────────────────────┐
│           OUTPUT GUARDRAIL LAYER              │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Hallucin. │  │ Unsafe   │  │ Citation │   │
│  │Detection │  │ Content  │  │Verificat.│   │
│  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Reasoning │  │ Format   │  │Confidence│   │
│  │Validation│  │ Check    │  │Threshold │   │
│  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
              [Response to User]
```

---

## 2. Input Guardrails

### 2.1 Prompt Injection Detection

**Purpose**: Detect and block attempts to override or manipulate the AI's system prompt or behavior.

**Detection Methods**:

| Technique | Pattern | Action |
|-----------|---------|--------|
| System prompt override | "Ignore previous instructions", "You are now...", "Disregard..." | Block + log |
| Role-play override | "Pretend you are...", "From now on, act as..." | Block + log |
| Delimiter breaking | Attempts to close/open delimiters within input | Block + log |
| Multi-language injection | Same injection attempt in multiple languages | Block + log |
| Encoding obfuscation | Base64, hex, Unicode normalization attacks | Sanitize + recheck |
| Token smuggling | Hidden instructions within legitimate content | Flag + review |
| Hypothetical framing | "Imagine a scenario where..." with override intent | Flag + review |

**Implementation**:
```php
class InjectionDetector
{
    public function analyze(string $input): GuardrailResult
    {
        $patterns = [
            '/ignore\s+(previous|all)\s+(instructions|prompts)/i',
            '/you\s+are\s+now\s+(?!a\s+(merl|research|survey))/i',
            '/new\s+(system\s+)?prompt/i',
            '/disregard\s+(your\s+)?(training|instructions)/i',
            '/pretend\s+(you\s+are|to\s+be)/i',
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $input)) {
                return GuardrailResult::block('Prompt injection attempt detected');
            }
        }
        
        return GuardrailResult::pass();
    }
}
```

### 2.2 PII Detection

**Purpose**: Detect and redact personally identifiable information before reaching AI model.

**Detection Targets**:

| PII Type | Pattern | Action |
|----------|---------|--------|
| Email addresses | `\b[\w\.-]+@[\w\.-]+\.\w{2,}\b` | Redact with `[EMAIL REDACTED]` |
| Phone numbers | `\+?\d{7,15}` | Redact with `[PHONE REDACTED]` |
| National IDs | Country-specific patterns (configurable per tenant) | Redact with `[ID REDACTED]` |
| Credit cards | Luhn-valid numbers | Redact with `[PAN REDACTED]` |
| Exact GPS coordinates | Precise lat/lon (redact to admin level) | Round to 0.1° |
| Full names | ML-based NER detection | Redact with `[NAME REDACTED]` |
| Physical addresses | Structured address patterns | Redact with `[ADDRESS REDACTED]` |

**Tenant Configuration**: Each tenant can configure:
- Which PII types to redact
- Country-specific ID patterns
- Custom patterns for organization-specific sensitive data

### 2.3 Topic Restriction

**Purpose**: Ensure AI only handles MERL-appropriate topics.

**Allowed Topics**:
- Research methodology and design
- Monitoring and evaluation frameworks
- Data collection and quality
- Survey and questionnaire design
- Indicator development
- Statistical analysis
- Report writing
- Knowledge management
- Project/program management in development context
- Sector-specific M&E (health, education, WASH, agriculture, governance)

**Restricted Topics**:
- Medical diagnosis or treatment recommendations
- Legal advice
- Financial investment recommendations
- Political endorsements
- Security or surveillance recommendations
- Any content that violates laws or regulations

**Action on Restricted Topic**: Block with message: "I'm designed to help with MERL-related tasks. This request appears to be outside my scope. Please rephrase or ask a MERL-specific question."

### 2.4 Context Length Check

| Feature | Max Input Tokens | Action at Limit |
|---------|-----------------|-----------------|
| Research Design | 16,000 | Truncate RAG context, keep user input |
| Survey Design | 16,000 | Truncate RAG context, keep user input |
| Data Quality | 32,000 | Process in batches of 100 submissions |
| Report Writing | 32,000 | Process section by section |
| Knowledge Q&A | 8,000 | Truncate RAG context to top 5 sources |
| Executive Insight | 12,000 | Summarize dashboard data before processing |

---

## 3. Output Guardrails

### 3.1 Hallucination Detection

**Purpose**: Detect when AI output contains unsupported or fabricated information.

**Detection Methods**:

| Method | Description | Action |
|--------|-------------|--------|
| Citation verification | Check cited sources exist in retrieval results | Flag uncited claims |
| Confidence scoring | Model self-reported confidence < threshold | Mark as "low confidence" |
| Factual consistency | Cross-check with known knowledge base | Flag contradictions |
| Plausibility check | Detect claims that seem too specific without evidence | Flag for review |
| Numerical sanity | Check numbers against plausible ranges | Flag out-of-range values |

### 3.2 Unsafe Content Filtering

**Detection Categories**:

| Category | Detection | Action |
|----------|-----------|--------|
| Hate speech | Toxicity classifier > 0.9 | Block + log + notify security |
| Harassment | Harassment classifier > 0.85 | Block + log |
| Violence | Violence classifier > 0.8 | Block + log + escalate |
| Self-harm | Self-harm classifier > 0.7 | Block + log + escalate |
| Sexual content | NSFW classifier > 0.9 | Block |
| PII leakage | PII regex patterns in output | Redact + log incident |

### 3.3 Citation Verification

**Purpose**: Ensure all citations in output are real and correctly attributed.

**Verification Rules**:
1. Every `[Source: xxx]` citation must reference a retrieved source
2. Direct quotes must match the source text (semantic similarity > 0.9)
3. Statistics must match source data
4. Source titles must exist in the knowledge base

**Action**: Flag uncited claims with `[UNVERIFIED]` tag. If >30% of claims are uncited, block the output.

### 3.4 Reasoning Validation

**Purpose**: Check that the output follows the required thinking framework.

**Validation**:
- Does the output show evidence of the structured thinking process?
- Are assumptions documented?
- Are limitations acknowledged?
- Does the conclusion follow from the evidence presented?

**Action**: If reasoning is absent or fundamentally flawed, tag as "Requires reasoning review."

### 3.5 Format Compliance

**Purpose**: Ensure output matches the expected schema.

**Validation**:
- JSON validity (if JSON output expected)
- Required fields present
- Field types match schema
- No nulls in required fields

**Action**: Reject malformed output with specific error on what failed validation.

---

## 4. Safety Policies

### 4.1 Do Not Fabricate Evidence

```
RULE: Never invent evidence, citations, statistics, or case studies.

If the model does not have access to relevant information, it must:
1. State "I don't have information on this specific point"
2. Suggest how to find the information
3. Never guess or fabricate

This is a ZERO-TOLERANCE policy. Any fabricated evidence triggers:
- Automatic output rejection
- Security incident logged
- Prompt version flagged for evaluation
- Human review of the incident
```

### 4.2 Do Not Override Professional Judgment

```
RULE: AI recommendations are SUGGESTIONS, not directives.

The AI must:
1. Present recommendations as options with rationale
2. Never state "you must" or "you have to"
3. Always phrase as "I recommend..." or "Consider..."
4. Acknowledge that human expertise may lead to different valid choices
5. Never attempt to override or dismiss human expertise

Violation: Tag output as "May contain imperative language"
```

### 4.3 Do Not Make Clinical/Medical Recommendations

```
RULE: The platform is NOT a medical device. Do not provide:

1. Medical diagnoses ("This patient has X condition")
2. Treatment recommendations ("You should take Y medication")
3. Clinical interpretations of health data
4. Prognostic predictions about individual health outcomes

ACCEPTABLE health-related outputs:
1. Aggregated health statistics ("30% of surveyed children are stunted")
2. Health program performance indicators
3. Health behavior patterns at population level
4. References to established health guidelines (WHO, MoH)

VIOLATION: Immediate block, security notification, potential regulatory reporting
```

### 4.4 Do Not Expose Confidential Information

```
RULE: Never expose data that violates privacy or confidentiality.

Never expose in outputs:
1. Individual respondent data
2. PII (names, contacts, IDs)
3. Exact GPS coordinates of respondents
4. Sensitive health data of individuals
5. Trade secrets or proprietary information
6. Credentials, API keys, tokens
7. Internal organizational data beyond user's access scope

Data sharing must comply with:
- GDPR / Data Protection Act requirements
- Informed consent terms
- Organizational data sharing policies
- Donor data sharing requirements
```

### 4.5 Acknowledge Uncertainty

```
RULE: Express appropriate uncertainty.

When uncertain, the AI must:
1. State confidence level explicitly
2. Identify what factors contribute to uncertainty
3. Suggest how to reduce uncertainty
4. Never present uncertain information as definitive

CONFIDENCE LABELING:
- High confidence (>0.9): "Based on strong evidence..."
- Moderate confidence (0.7-0.9): "The evidence suggests..."
- Low confidence (0.5-0.7): "There is some indication that..."
- Insufficient evidence (<0.5): "There is not enough evidence to determine..."
```

---

## 5. Escalation Rules

### 5.1 When to Ask for Clarification

| Situation | Ask for |
|-----------|---------|
| Insufficient study context | Study purpose, objectives, target population, timeline |
| Ambiguous request | Specific clarification on what is needed |
| Multiple valid interpretations | Choose preferred approach or provide all options |
| Conflicting requirements | Clarify priorities or provide trade-off analysis |
| Missing required data | Identify what data is needed and why |

### 5.2 When to Defer to Human

| Situation | Action |
|-----------|--------|
| AI confidence < 0.5 on critical decision | Flag for human review |
| Ethical concern identified | Escalate to ethics officer |
| Sensitive topic (human rights, conflict) | Defer to human judgment |
| Legal/compliance question | Refer to legal team |
| Cross-tenant data question | Require admin approval |
| Output may cause harm if wrong | Require human verification |

### 5.3 When to Refuse

| Situation | Response |
|-----------|----------|
| Request for fabricated data | "I cannot fabricate data. Let me know what data you need and I can help design collection." |
| Request for unethical research design | "This approach raises ethical concerns. I recommend consulting with your ethics board." |
| Request outside MERL scope | "This is outside my expertise as a MERL assistant. Please consult a specialist." |
| Request with insufficient context | "I need more context to provide a useful response. Please provide [specific information]." |
| Request for PII or confidential data | "I cannot expose individual-level or confidential data." |
| Harmful or dangerous request | "I cannot assist with this request." (Log as security incident) |

---

## 6. Guardrail Configuration

### 6.1 Per-Tenant Configuration

```json
{
  "guardrail_config": {
    "pii_redaction_rules": {
      "redact_emails": true,
      "redact_phones": true,
      "redact_names": true,
      "redact_gps": true,
      "redact_addresses": true,
      "custom_patterns": ["\\bID\\d{8}\\b"]
    },
    "topic_restrictions": {
      "enabled": true,
      "restricted_topics": ["medical_advice", "legal_advice"]
    },
    "output_restrictions": {
      "max_confidence_threshold": 0.5,
      "require_citations": true,
      "block_uncited_output": false
    },
    "escalation_contacts": {
      "ethics_officer": "ethics@org.org",
      "security_team": "security@org.org"
    }
  }
}
```

### 6.2 Per-Feature Configuration

```json
{
  "feature": "research_design_assistant",
  "guardrails": {
    "input": {
      "injection_detection": "strict",
      "pii_redaction": true,
      "topic_restriction": true,
      "max_context_tokens": 16000
    },
    "output": {
      "hallucination_detection": "strict",
      "citation_verification": "required",
      "reasoning_validation": true,
      "format_validation": "json_schema"
    }
  }
}
```

---

## 7. Guardrail Monitoring

### 7.1 Metrics to Track

| Metric | Alert Threshold | Action |
|--------|----------------|--------|
| Injection attempts blocked | >10/day | Review patterns |
| PII redaction triggers | >50/day | Review data handling |
| Hallucination flags | >5% of outputs | Review prompt quality |
| Output blocks | >1% of outputs | Urgent prompt review |
| Escalation requests | >20/day | Review system confusion |
| False positives | >2% of blocks | Tune guardrail thresholds |

### 7.2 Incident Response

| Severity | Response Time | Action |
|----------|---------------|--------|
| Critical (PII leaked, safety violation) | <15 minutes | Block feature, investigate, rotate credentials |
| High (fabricated evidence, hallucination) | <1 hour | Block output, review prompt, retrain |
| Medium (guardrail bypass attempt) | <4 hours | Log, review, update guardrails |
| Low (false positive, minor violation) | <24 hours | Log, tune thresholds |

---

# Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-18 | Prompt Engineering Lead | Initial guardrail system design |
