# Merline Prompt Engineering Architecture

## Version: 1.0.0
## Status: Draft
## Owner: Prompt Engineering Lead

---

## 1. Prompt Engineering Philosophy

### 1.1 Core Principles

| Principle | Description |
|-----------|-------------|
| **Prompt is Software** | Every prompt is a production system with architecture, version, lifecycle, evaluation, and ownership |
| **Prompt for Thinking, Not Answers** | Prompts guide reasoning, planning, verification, and refinement — never blind generation |
| **Retrieve First, Reason Second, Generate Last** | RAG-before-generation grounds every output in evidence |
| **Composable Design** | Base prompts + capability extensions + task-specific instructions |
| **Evaluate Before Deploy** | No prompt reaches production without passing evaluation gates |
| **Human-in-the-Loop** | AI recommends; humans decide. Every irreversible action requires human review |

### 1.2 Prompt Engineering Quality Gates

Every prompt must pass these gates before approval:

| Gate | Question |
|------|----------|
| Reasoning | Does it improve reasoning over raw model capability? |
| Hallucination | Does it reduce hallucination through grounding and constraints? |
| Planning | Does it encourage planning before generation? |
| Maintainability | Can another engineer understand and modify it? |
| Versionability | Is it version-controlled with change tracking? |
| Evaluability | Can its quality be measured objectively? |
| Evolvability | Can it be improved without breaking existing behavior? |

---

## 2. Prompt Template System

### 2.1 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PROMPT REGISTRY                                  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │                    PROMPT HIERARCHY                        │       │
│  │                                                            │       │
│  │  Base Prompts (identity, mission, principles)              │       │
│  │      └── Domain Prompts (MERL-specific knowledge)          │       │
│  │           └── Capability Prompts (agent-specific skills)   │       │
│  │                └── Task Prompts (specific workflow steps)  │       │
│  │                                                            │       │
│  │  Cross-cutting: Guardrails, Evaluation Prompts             │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                       │
│  Version Control  │  A/B Testing  │  Shadow Mode  │  Canary Deploy   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Storage

Prompts are stored in two forms:
1. **Source of Truth**: Version-controlled markdown files in `prompts/` directory
2. **Runtime Registry**: `prompt_versions` table in PostgreSQL (populated from source)

### 2.3 Template Engine (Laravel Blade-style)

```php
// Prompt template with variable interpolation
system_prompt: "prompts/agents/research-designer-v1.md"
user_prompt_template: "
Study Context:
- Title: {{study_title}}
- Type: {{study_type}}
- Objectives: {{objectives}}
- Sector: {{sector}}

Based on the above context, generate a Theory of Change.
"
variables: ['study_title', 'study_type', 'objectives', 'sector']
```

---

## 3. Prompt Structure Standard

Every prompt MUST follow this structure:

### 3.1 Standard Sections

| # | Section | Required | Description |
|---|---------|----------|-------------|
| 1 | **Identity** | Yes | Who the agent is (role, expertise, persona) |
| 2 | **Mission** | Yes | Why the agent exists (purpose, north star) |
| 3 | **Context** | Yes | Relevant background (task framing, user situation) |
| 4 | **Objective** | Yes | What the agent must accomplish (specific, measurable) |
| 5 | **Constraints** | Yes | Boundaries (what NOT to do, scope limits) |
| 6 | **Thinking Framework** | Yes | Step-by-step reasoning process (must think before output) |
| 7 | **Workflow** | Conditional | Sequence of operations (for multi-step tasks) |
| 8 | **Quality Standards** | Yes | Criteria the output must meet |
| 9 | **Output Requirements** | Yes | Format, structure, schema of the response |
| 10 | **Validation** | Yes | Self-check steps before finalizing |
| 11 | **Failure Conditions** | Yes | When to stop, ask for help, or refuse |
| 12 | **Success Criteria** | Yes | How to know the task is complete |
| 13 | **Version** | Yes | Semantic version identifier |
| 14 | **Dependencies** | Yes | Other prompts, models, or data sources required |

### 3.2 Metadata Header

Every prompt file begins with a YAML frontmatter block:

```yaml
---
prompt_key: research-designer-toc-v2
name: Theory of Change Generator
version: 2.1.0
author: Prompt Engineering Lead
owner: AI Systems Architect
status: active
model: gpt-4o
dependencies:
  - base/agent-identity-v1
  - domain/merl-standards-v1
evaluation_score: 0.92
known_limitations:
  - May suggest overly complex ToC for simple interventions
  - Requires valid study context; degrades with minimal inputs
last_evaluated: 2026-07-18
tags: [toc, research-design, theory-of-change]
---
```

---

## 4. Prompt Composition Model

### 4.1 Composition Layers

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1: Base Prompt                                       │
│  ├── Identity (who the AI is)                               │
│  ├── Mission (purpose)                                      │
│  ├── Core Principles (do no harm, evidence-based)           │
│  └── Output Rules (format, citation, confidence)             │
├──────────────────────────────────────────────────────────────┤
│  Layer 2: Domain Prompt (MERL)                              │
│  ├── MERL Standards & Terminology                           │
│  ├── OECD DAC Criteria                                      │
│  ├── SMART Indicator Rules                                  │
│  ├── Research Ethics Principles                             │
│  └── Donor Compliance Frameworks                            │
├──────────────────────────────────────────────────────────────┤
│  Layer 3: Capability Prompt (Agent-Specific)                │
│  ├── Agent-specific expertise (e.g., survey methodology)    │
│  ├── Task-specific knowledge (e.g., question wording)       │
│  └── Output structure for capability                        │
├──────────────────────────────────────────────────────────────┤
│  Layer 4: Task Prompt (Workflow-Specific)                    │
│  ├── Specific input schema                                  │
│  ├── Few-shot examples                                      │
│  ├── Output schema                                          │
│  └── Task-specific constraints                              │
├──────────────────────────────────────────────────────────────┤
│  Layer 5: Guardrails (Cross-cutting)                        │
│  ├── Input guardrails (sanitization)                        │
│  ├── Output guardrails (validation)                         │
│  ├── Safety policies                                        │
│  └── Escalation rules                                       │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Composition at Runtime

The Prompt Assembly Service composes these layers dynamically:

```php
class PromptAssemblyService
{
    public function compose(string $promptKey, array $context): array
    {
        $prompt = $this->registry->getActive($promptKey);
        
        $messages = [
            // Layer 1: Base Identity
            ['role' => 'system', 'content' => $this->loadBase()],
            // Layer 2: Domain Knowledge
            ['role' => 'system', 'content' => $this->loadDomain($context)],
            // Layer 3: Capability
            ['role' => 'system', 'content' => $prompt->systemPrompt],
            // Layer 4: Task with variables
            ['role' => 'user', 'content' => $this->interpolate($prompt->userTemplate, $context)],
        ];
        
        return [
            'messages' => $this->applyGuardrails($messages, $context),
            'model' => $prompt->model,
            'parameters' => $prompt->parameters,
        ];
    }
}
```

---

## 5. Prompt Versioning and Lifecycle

### 5.1 Versioning Scheme

| Format | Example | Description |
|--------|---------|-------------|
| `MAJOR.MINOR.PATCH` | `2.1.0` | MAJOR: breaking behavior change; MINOR: new capability; PATCH: fix/refinement |

### 5.2 Lifecycle States

```
Draft → Review → Shadow → Canary → Active → Deprecated → Archived
                    ↑         ↑
                    └── Rollback ──┘
```

| State | Description |
|-------|-------------|
| **Draft** | In development, not deployed |
| **Review** | Under peer review by Prompt Engineering Lead |
| **Shadow** | Running in parallel with active version (logged, not served) |
| **Canary** | 5% of traffic for evaluation |
| **Active** | Serving 100% of matching traffic |
| **Deprecated** | Replaced but still available for rollback (14-day window) |
| **Archived** | No longer deployable; preserved for audit |

### 5.3 Database Schema

The `prompt_versions` table (defined in `AI-ANALYTICS-SCHEMA.md`) stores every version with:
- `prompt_key` — unique identifier for the prompt
- `version` — semantic version integer
- `system_prompt` — the full system prompt text
- `user_prompt_template` — template with `{{variable}}` placeholders
- `parameters` — model parameters (temperature, top_p, max_tokens)
- `variables` — list of expected template variables
- `is_active` — currently serving flag
- `deployment_target` — JSON filter (tenant, study_type, model)
- `performance_metrics` — JSON of evaluation results
- `change_notes` — human-readable changelog
- `created_by` — user who deployed

---

## 6. Prompt Evaluation and Testing Framework

### 6.1 Automated Evaluations

| Evaluation Type | Tool | Frequency |
|-----------------|------|-----------|
| Accuracy | LLM-as-judge | On every PR |
| Groundedness | Citation verification | On every PR |
| Completeness | Schema validation | On every PR |
| Consistency | Semantic similarity | On every PR |
| Reasoning | Chain-of-thought audit | Daily batch |
| Safety | Content safety classifier | Real-time |
| Latency | Token count + response time | Real-time |
| Cost | Token usage tracking | Real-time |

### 6.2 Evaluation Datasets

Stored in `evaluation_datasets` table (see `AI-ANALYTICS-SCHEMA.md`):
- **Ground Truth**: Input-output pairs validated by MERL experts
- **Regression**: Historical inputs that must produce consistent outputs
- **Adversarial**: Edge cases, injection attempts, boundary conditions
- **Human Evaluation**: Expert-rated outputs for quality benchmarking

### 6.3 Human Evaluation Process

1. Expert reviewers evaluate outputs on 1-5 scale for: accuracy, clarity, completeness, usefulness
2. Inter-rater reliability measured via Cohen's Kappa (target: >0.7)
3. Low-scoring outputs trigger root cause analysis
4. Results fed back into prompt refinement

---

## 7. PromptOps (CI/CD for Prompts)

### 7.1 Pipeline

```
Developer edits prompt markdown
        │
        ▼
PR Created → CI Validation
        │
        ├── Lint (structure check: all required sections present)
        ├── Validate (template variables match expected)
        ├── Evaluate (run against evaluation datasets)
        │       └── Gate: pass rate > 85%
        └── Build (generate database version)
        │
        ▼
Review → Approve
        │
        ▼
Deploy
        ├── Shadow Mode (14-day evaluation)
        ├── Canary (5% traffic, 7-day monitoring)
        └── Full Rollout (100% traffic)
```

### 7.2 Rollback Procedure

```yaml
rollback:
  trigger: performance_metrics.pass_rate drops > 10% OR error_rate spikes > 5%
  action: 
    1. Set is_active=false on current version
    2. Set is_active=true on previous version
    3. Log incident with prompt_key, version_from, version_to, reason
    4. Notify Prompt Engineering Lead
    5. Monitor for 24 hours
  auto_rollback: true
```

### 7.3 Deployment Strategies

| Strategy | Traffic % | Duration | Purpose |
|----------|-----------|----------|---------|
| Shadow | 0% (log only) | 14 days | Collect metrics without user impact |
| Canary | 5% | 7 days | Validate with real traffic |
| Gradual | 25% → 50% → 100% | 3 days per step | Risk mitigation |
| Full | 100% | Indefinite | Standard deployment |

---

## 8. Prompt Library Organization

### 8.1 Directory Structure

```
prompts/
├── base/                           # Base identity prompts
│   ├── agent-identity-v1.md        # Core agent persona
│   └── merl-principles-v1.md       # MERL domain principles
├── agents/                         # Agent system prompts
│   ├── research-designer-v1.md     # Research Design Agent
│   ├── survey-designer-v1.md       # Survey Design Agent
│   ├── indicator-specialist-v1.md  # Indicator Agent
│   ├── data-quality-auditor-v1.md  # Data Quality Agent
│   ├── report-writer-v1.md         # Reporting Agent
│   ├── knowledge-assistant-v1.md   # Knowledge Assistant
│   └── executive-assistant-v1.md   # Executive Assistant
├── workflows/                      # Task-specific prompts
│   ├── toc-generation-v1.md        # Theory of Change
│   ├── logframe-generation-v1.md   # Logical Framework
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
├── evaluation/                     # Evaluation prompts
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
│   ├── indicator-examples-v1.md
│   ├── question-examples-v1.md
│   └── report-examples-v1.md
└── ARCHITECTURE.md                 # This document
```

### 8.2 Naming Convention

| Component | Format | Example |
|-----------|--------|---------|
| Agent prompts | `{role}-v{major}.md` | `research-designer-v1.md` |
| Workflow prompts | `{workflow}-v{major}.md` | `toc-generation-v1.md` |
| Evaluation prompts | `{criterion}-eval-v{major}.md` | `accuracy-eval-v1.md` |
| Guardrails | `{type}-guardrails-v{major}.md` | `input-guardrails-v1.md` |
| Few-shot | `{domain}-examples-v{major}.md` | `toc-examples-v1.md` |

### 8.3 Tag Taxonomy

| Tag Category | Examples |
|--------------|----------|
| Agent | `research-designer`, `survey-designer`, `indicator-specialist`, `data-quality`, `report-writer`, `knowledge-assistant`, `executive-assistant` |
| Capability | `toc-generation`, `logframe`, `indicator`, `questionnaire`, `quality-check`, `report`, `insight`, `qa`, `recommendation` |
| Domain | `health`, `education`, `wash`, `agriculture`, `governance` |
| Workflow | `design`, `data-collection`, `analysis`, `reporting`, `learning` |
| Model | `gpt-4o`, `claude-3.5`, `gemini-2`, `llama-3` |

---

## 9. Prompt Collaboration Architecture

### 9.1 Agent-to-Agent Handoff

When one AI agent needs to pass context to another:

```
Agent A completes task
    │
    ├── Output validated (self-check + evaluation)
    ├── Context packaged (structured JSON with evidence)
    ├── Handoff to Agent B
    │       ├── Context: Agent A's output + confidence scores
    │       ├── Citations: evidence sources used
    │       └── Constraints: unresolved issues, assumptions
    └── Agent B processes with full traceability
```

### 9.2 Context Sharing Contract

Every agent output intended for another agent includes:

```json
{
  "output": { "...": "..." },
  "metadata": {
    "agent": "research-designer",
    "prompt_version": "2.1.0",
    "model": "gpt-4o",
    "confidence": 0.92,
    "citations": [
      { "source": "indicator-library", "id": "uuid", "relevance": "high" }
    ],
    "assumptions": ["Target population is rural farming communities"],
    "limitations": ["Sample size not yet determined"],
    "unresolved_issues": ["No baseline data available"]
  }
}
```

---

## 10. Document Ownership

| Section | Owner |
|---------|-------|
| Prompt Architecture | Prompt Engineering Lead |
| Composition Model | Prompt Engineering Lead |
| Versioning & Lifecycle | Prompt Engineering Lead + AI Systems Architect |
| Evaluation Framework | Prompt Engineering Lead + QA Lead |
| PromptOps | Prompt Engineering Lead + DevOps Lead |
| Library Organization | Prompt Engineering Lead |

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-18 | Prompt Engineering Lead | Initial architecture document |
