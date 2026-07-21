# Prompt Registry & Management System

## 1. Overview

The Prompt Registry is a version-controlled, centrally managed system for all AI prompts across Merline. It enables prompt engineering iteration, A/B testing, deployment safety, and observability.

---

## 2. Registry Model

### 2.1 Data Model

```json
{
  "id": "prompt_001",
  "name": "questionnaire_design_assist",
  "version": 3,
  "capability": "questionnaire_design",
  "tenant_id": null,            // null = global, UUID = tenant-specific
  "status": "active",           // draft, active, canary, deprecated
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "You are a MERL survey design expert..."
    },
    {
      "role": "user",
      "content": "Help me design questions for {{study_context}}..."
    }
  ],
  "config": {
    "temperature": 0.3,
    "max_tokens": 2048,
    "top_p": 0.95,
    "frequency_penalty": 0.0,
    "presence_penalty": 0.0,
    "stop_sequences": null
  },
  "metadata": {
    "author": "user_abc",
    "description": "Assists users in designing survey questions",
    "changelog": "v3: Added skip logic suggestions; v2: Improved multi-language handling",
    "eval_metric": "questionnaire_quality_score",
    "tags": ["survey", "questionnaire", "design"]
  },
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-03-20T14:30:00Z"
}
```

### 2.2 Prompt Components

| Component | Description | Versioned |
|-----------|-------------|-----------|
| **System prompt** | Role, persona, constraints, output format | Yes |
| **User prompt template** | Input variables, instructions | Yes |
| **Few-shot examples** | In-context examples (dynamic or static) | Yes |
| **RAG context template** | How retrieved chunks are formatted | Yes |
| **Output format spec** | JSON schema / markdown template | Yes |
| **Safety instructions** | Guardrails, content policy, PII avoidance | No (global) |

### 2.3 Template Variables

Variables use `{{variable_name}}` syntax, resolved at inference time:

| Variable | Source | Example |
|----------|--------|---------|
| `{{study_context}}` | Study config | Study name, type, sector, country |
| `{{user_prompt}}` | User input | "Design 5 outcome indicators" |
| `{{rag_context}}` | Retrieved chunks | Top-10 relevant document chunks |
| `{{conversation_history}}` | Session context | Last 6 exchanges |
| `{{user_role}}` | User profile | "Field Coordinator" |
| `{{tenant_custom_prompt}}` | Tenant config | Organization-specific instructions |
| `{{date}}` | Current date | "2026-03-20" |
| `{{language}}` | Detected/preferred | "French" |

---

## 3. Versioning & Deployment

### 3.1 Version Lifecycle

```
Draft (author edits)
    │
    ├──→ Review (peer/QA review)
    │         │
    │         ├──→ Approved → Canary
    │         └──→ Rejected → Draft (revise)
    │
    Canary (5% traffic, 1-7 days, monitored)
    │
    ├──→ Metrics improved → Active (100% traffic)
    ├──→ Metrics neutral → Active (100%, optional rollback)
    └──→ Metrics degraded → Rollback to previous Active
```

### 3.2 Version Identification

| Method | Format | Example |
|--------|--------|---------|
| Sequential | v1, v2, v3... | v3 |
| Timestamp | YYYYMMDD_HHMM | 20260320_1430 |
| Hash | 8-char git-like | a3f2c9d1 |

### 3.3 Multi-Tenant Overrides

- **Global prompts**: Apply to all tenants (MERL best practices)
- **Tenant overrides**: Full prompt replacement for specific tenant
- **Prompt merging**: Tenant-specific instructions appended to global prompt
- **Resolution**: Tenant override > Global active

---

## 4. A/B Testing Framework

### 4.1 Test Configuration

```json
{
  "id": "ab_test_001",
  "prompt_name": "report_drafting",
  "variants": [
    {
      "variant": "A (control)",
      "prompt_version": 2,
      "traffic": 50
    },
    {
      "variant": "B (structured)",
      "prompt_version": 3,
      "traffic": 50
    }
  ],
  "metrics": [
    "user_satisfaction",
    "edit_distance",
    "completion_rate",
    "hallucination_rate"
  ],
  "duration_days": 7,
  "status": "running"
}
```

### 4.2 Evaluation Metrics

| Metric | Collection Method | Target |
|--------|------------------|--------|
| User satisfaction (thumbs up/down) | Inline feedback | >85% |
| Edit distance (how much user changed) | Diff calculation | <20% |
| Completion rate (user completed task) | Task tracking | >70% |
| Hallucination rate (citation mismatch) | Automated check | <5% |
| Response time | Latency tracking | P95 < target |
| Cost per inference | Cost tracking | < $threshold |

---

## 5. Prompt Engineering Guidelines

### 5.1 Structure Template

```
# Role & Persona
You are a [role] with expertise in [domain].

# Task
Your task is to [specific task].

# Context
[Relevant study/project context]

# Constraints
- [Constraint 1: e.g., "Use simple language, avoid jargon"]
- [Constraint 2: e.g., "Provide exactly 3 options"]
- [Constraint 3: e.g., "Cite sources using [N] format"]

# Output Format
[Clear format specification - JSON schema or markdown template]

# Instructions
1. [Step 1]
2. [Step 2]
3. [Step 3]
```

### 5.2 Guidelines by Capability

| Capability | Temperature | Examples | Best Practice |
|-----------|-------------|----------|---------------|
| Classification | 0.0 | 3-5 per class | Few-shot with edge cases |
| Extraction | 0.0 | 3-5 | Strict JSON schema |
| Validation | 0.1 | 2-3 | Show valid + invalid examples |
| Generation | 0.3-0.5 | 1-2 per variant | Provide structure, allow creativity |
| Analysis | 0.2 | 2-3 | Chain-of-thought (step-by-step) |
| Q&A | 0.3 | 0-2 | Ground in context, cite sources |
| Translation | 0.1 | 3-5 | Preserve formatting, handle idioms |

### 5.3 Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Over-constraining output | Creative tasks need flexibility | Use guidelines not rigid rules |
| Conflicting instructions | Confuses model | Single source of truth per section |
| Excessive few-shot examples | Wastes tokens, may confuse | Quality > quantity (max 5) |
| Not testing edge cases | Fails in production | Include boundary examples in eval set |
| No output validation | Inconsistent formatting | Always specify + validate output format |
| Ignoring language context | Poor multilingual performance | Include language-specific instructions |

---

## 6. Prompt Evaluation

### 6.1 Automated Test Suite

Each prompt has a regression test suite:

```python
# Example test case
{
  "prompt_name": "indicator_suggestions",
  "test_cases": [
    {
      "input": {
        "outcome": "Improved maternal health",
        "sector": "Health",
        "country": "Kenya"
      },
      "expected": {
        "at_least_one_smart": true,
        "contains_disaggregation": ["gender", "age"],
        "no_harmful_content": true,
        "max_indicators": 5,
        "all_cited": true
      }
    }
  ]
}
```

### 6.2 Quality Scoring

| Score | Meaning | Action |
|-------|---------|--------|
| 4.5-5.0 | Excellent | Ship |
| 4.0-4.4 | Good | Ship, monitor |
| 3.0-3.9 | Adequate | Improve before broad deployment |
| <3.0 | Poor | Do not deploy |

### 6.3 Continuous Improvement

```
Collect User Feedback → Identify Prompt Weaknesses
    → Draft Revised Prompt → Run Eval Suite
    → Canary Deploy → Monitor Metrics
    → Full Deploy or Rollback
```
