# Merline Prompt Library

## Version: 1.0.0
## Status: Draft
## Owner: Prompt Engineering Lead

---

## 1. Library Organization

### 1.1 Directory Structure

```
prompts/
├── base/                           # Base/shared prompts
│   ├── agent-identity-v1.md        # Identity, mission, principles
│   └── merl-principles-v1.md       # MERL domain knowledge
├── agents/                         # Agent system prompts (7 agents)
│   ├── research-designer-v1.md
│   ├── survey-designer-v1.md
│   ├── indicator-specialist-v1.md
│   ├── data-quality-auditor-v1.md
│   ├── report-writer-v1.md
│   ├── knowledge-assistant-v1.md
│   └── executive-assistant-v1.md
├── workflows/                      # Task prompts (13 workflows)
│   ├── toc-generation-v1.md
│   ├── logframe-generation-v1.md
│   ├── indicator-recommendation-v1.md
│   ├── question-generation-v1.md
│   ├── question-wording-v1.md
│   ├── skip-logic-validation-v1.md
│   ├── data-quality-detection-v1.md
│   ├── qualitative-theme-v1.md
│   ├── report-section-v1.md
│   ├── executive-summary-v1.md
│   ├── dashboard-insight-v1.md
│   ├── knowledge-qa-v1.md
│   └── learning-recommendation-v1.md
├── evaluation/                     # Evaluation prompts (8 evaluators)
│   ├── accuracy-eval-v1.md
│   ├── groundedness-eval-v1.md
│   ├── completeness-eval-v1.md
│   ├── consistency-eval-v1.md
│   ├── reasoning-eval-v1.md
│   ├── safety-eval-v1.md
│   ├── citation-quality-eval-v1.md
│   └── domain-expertise-eval-v1.md
├── guardrails/                     # Guardrail prompts
│   ├── input-guardrails-v1.md
│   ├── output-guardrails-v1.md
│   └── safety-policies-v1.md
├── fewshot/                        # Few-shot example libraries
│   ├── toc-examples-v1.md
│   ├── logframe-examples-v1.md
│   ├── indicator-examples-v1.md
│   ├── question-examples-v1.md
│   ├── wording-examples-v1.md
│   └── report-examples-v1.md
├── ARCHITECTURE.md
├── SYSTEM-PROMPTS.md
├── WORKFLOW-PROMPTS.md
├── EVALUATION-PROMPTS.md
├── GUARDRAILS.md
├── PROMPT-LIBRARY.md
├── EVALUATION-FRAMEWORK.md
└── PREMPTOPS.md
```

**Total: 36 prompt files** (7 agents + 13 workflows + 8 evaluations + 3 guardrails + 6 few-shot + 1 base + 8 documentation)

---

## 2. Naming Convention and Metadata Schema

### 2.1 File Naming Convention

```
{domain}-{purpose}-v{major}.md

Where:
- domain: agent category (base, agents, workflows, evaluation, guardrails, fewshot)
- purpose: specific functional purpose
- v{major}: major version number (minor/patch tracked in file metadata)
```

### 2.2 Metadata Schema (YAML Frontmatter)

Every prompt file MUST begin with:

```yaml
---
prompt_key: "{unique-identifier}"
name: "Human-readable name"
version: "semver (e.g., 1.2.0)"
author: "Creator name"
owner: "Current responsible person/team"
status: "draft | review | shadow | canary | active | deprecated | archived"
model: "primary model (e.g., gpt-4o, claude-3.5)"
dependencies:
  - "prompt-key-v1"
  - "prompt-key-v2"
evaluation_score: 0.92
known_limitations:
  - "Limitation description"
last_evaluated: "2026-07-18"
tags:
  - "tag1"
  - "tag2"
deployment:
  target: "all | tenant-specific"
  strategy: "shadow | canary | full"
  rollout_percentage: 100
---
```

---

## 3. Prompt Hierarchy

```
Level 0: Base (shared identity, principles)
    └── Level 1: Agent (system prompts for 7 agents)
        └── Level 2: Workflow (task-specific prompts)
            └── Level 3: Task (specific input/output schemas)

Cross-cutting:
    - Evaluation prompts (evaluate any level)
    - Guardrails (apply to all levels)
    - Few-shot examples (shared across workflows)
```

### 3.1 Dependencies Between Prompts

| Prompt | Depends On | Type |
|--------|------------|------|
| workflow-toc-generation | agent-research-designer, base-agent-identity, domain-merl-standards | extends |
| workflow-logframe-generation | agent-research-designer, workflow-toc-generation | extends + depends |
| workflow-indicator-recommendation | agent-indicator-specialist, domain-merl-standards, domain-indicator-framework | extends |
| workflow-question-generation | agent-survey-designer, workflow-indicator-recommendation | extends + depends |
| workflow-question-wording | agent-survey-designer | extends |
| workflow-skip-logic-validation | agent-survey-designer | extends |
| workflow-data-quality-detection | agent-data-quality | extends |
| workflow-qualitative-theme | agent-report-writer | extends |
| workflow-report-section | agent-report-writer | extends |
| workflow-executive-summary | agent-report-writer | extends |
| workflow-dashboard-insight | agent-executive-assistant | extends |
| workflow-knowledge-qa | agent-knowledge-assistant | extends |
| workflow-learning-recommendation | agent-knowledge-assistant | extends |

---

## 4. Version History Tracking

### 4.1 Version History by Prompt

| Prompt Key | Version | Date | Author | Change Summary | Status |
|------------|---------|------|--------|----------------|--------|
| agent-research-designer | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| agent-survey-designer | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| agent-indicator-specialist | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| agent-data-quality | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| agent-report-writer | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| agent-knowledge-assistant | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| agent-executive-assistant | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| workflow-toc-generation | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| workflow-logframe-generation | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| workflow-indicator-recommendation | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| workflow-question-generation | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| workflow-question-wording | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| workflow-skip-logic-validation | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| workflow-data-quality-detection | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| workflow-qualitative-theme | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| workflow-report-section | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| workflow-executive-summary | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| workflow-dashboard-insight | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| workflow-knowledge-qa | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| workflow-learning-recommendation | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| eval-accuracy | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| eval-groundedness | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| eval-completeness | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| eval-consistency | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| eval-reasoning | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| eval-safety | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| eval-citation-quality | 1.0.0 | 2026-07-18 | PEL | Initial version | active |
| eval-domain-expertise | 1.0.0 | 2026-07-18 | PEL | Initial version | active |

---

## 5. Testing Status

| Prompt Key | Unit Test | Regression Test | Adversarial Test | Human Eval | Status |
|------------|-----------|-----------------|------------------|------------|--------|
| agent-research-designer | Pending | Pending | Pending | Pending | Not tested |
| agent-survey-designer | Pending | Pending | Pending | Pending | Not tested |
| agent-indicator-specialist | Pending | Pending | Pending | Pending | Not tested |
| agent-data-quality | Pending | Pending | Pending | Pending | Not tested |
| agent-report-writer | Pending | Pending | Pending | Pending | Not tested |
| agent-knowledge-assistant | Pending | Pending | Pending | Pending | Not tested |
| agent-executive-assistant | Pending | Pending | Pending | Pending | Not tested |
| workflow-toc-generation | Pending | Pending | Pending | Pending | Not tested |
| workflow-logframe-generation | Pending | Pending | Pending | Pending | Not tested |
| workflow-indicator-recommendation | Pending | Pending | Pending | Pending | Not tested |
| workflow-question-generation | Pending | Pending | Pending | Pending | Not tested |
| workflow-question-wording | Pending | Pending | Pending | Pending | Not tested |
| workflow-skip-logic-validation | Pending | Pending | Pending | Pending | Not tested |
| workflow-data-quality-detection | Pending | Pending | Pending | Pending | Not tested |
| workflow-qualitative-theme | Pending | Pending | Pending | Pending | Not tested |
| workflow-report-section | Pending | Pending | Pending | Pending | Not tested |
| workflow-executive-summary | Pending | Pending | Pending | Pending | Not tested |
| workflow-dashboard-insight | Pending | Pending | Pending | Pending | Not tested |
| workflow-knowledge-qa | Pending | Pending | Pending | Pending | Not tested |
| workflow-learning-recommendation | Pending | Pending | Pending | Pending | Not tested |

---

## 6. Known Limitations

| Prompt Key | Known Limitations |
|------------|-------------------|
| agent-research-designer | May suggest overly complex designs for simple studies; requires complete context |
| agent-survey-designer | May generate more questions than needed; best used with indicator constraints |
| agent-indicator-specialist | May recommend standard indicators not validated for local context |
| agent-data-quality | Batch analysis better than single-submission; limited by data availability |
| agent-report-writer | Long reports may hit token limits; generate section by section |
| agent-knowledge-assistant | Quality depends entirely on RAG retrieval quality |
| agent-executive-assistant | Requires good dashboard data; limited with sparse data |
| workflow-toc-generation | May not capture all local contextual factors |
| workflow-indicator-recommendation | Library coverage depends on org's indicator library |
| workflow-question-generation | Generated questions need human review for cultural appropriateness |
| workflow-question-wording | Some improvements may change question intent — human verify |
| workflow-skip-logic-validation | Cannot test runtime behavior; only static analysis |
| workflow-data-quality-detection | Flag accuracy depends on data quantity; more data = better detection |
| workflow-qualitative-theme | May miss very subtle themes; should complement human analysis |

---

## 7. Usage Metrics Tracking

The system tracks per prompt (in `ai_inference_logs` and `ai_token_usage_daily`):

| Metric | Source | Purpose |
|--------|--------|---------|
| Call count | `ai_inference_logs` | Usage volume |
| Input tokens | `ai_inference_logs` | Cost tracking |
| Output tokens | `ai_inference_logs` | Cost tracking |
| Total cost | `ai_token_usage_daily` | Budget monitoring |
| Avg latency | `ai_inference_logs` | Performance |
| Quality score | `evaluation_runs` | Quality monitoring |
| Error rate | `ai_inference_logs` | Reliability |
| User rating | `ai_inference_logs.user_rating` | User satisfaction |
| Correction rate | Manual tracking | Accuracy improvement |

---

# Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-18 | Prompt Engineering Lead | Initial prompt library catalog |
