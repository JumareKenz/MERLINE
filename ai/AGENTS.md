# Multi-Agent Architecture & Orchestration

## 1. Overview

Merline uses a **Supervisor + Specialist** agent architecture. The Supervisor routes requests to the appropriate Specialist agent(s), synthesizes their output, and ensures quality before returning to the user.

---

## 2. Agent Catalog

### 2.1 Agent Definitions

| Agent | ID | Purpose | Capability Group |
|-------|-----|---------|-----------------|
| **Supervisor** | supervisor | Orchestrate, route, synthesize, quality gate | Orchestration |
| **Research Design** | research_design | ToC, LogFrame, methodology, sampling | Research Design |
| **Survey Design** | survey_design | Questions, skip logic, validation, sections | Survey Design |
| **Indicator** | indicator | SMART validation, suggestions, disaggregation | Survey Design |
| **Data Quality** | data_quality | Anomaly detection, fraud detection, scoring | Data Collection |
| **Reporting** | reporting | Narrative, executive summary, recommendations | Reporting |
| **Knowledge** | knowledge | Q&A, document retrieval, lesson surfacing | Knowledge |
| **Qualitative** | qualitative | Theme extraction, sentiment, codebooks | Analysis |
| **Executive** | executive | Portfolio summaries, trends, risk alerts | Decision Support |
| **Translation** | translation | Multi-language translation of content | Cross-cutting |

### 2.2 Agent Specifications

Each agent is defined by:

```json
{
  "id": "survey_design",
  "name": "Survey Design Agent",
  "description": "Assists with questionnaire design, question suggestions, skip logic, validation rules",
  "capabilities": [
    "suggest_questions",
    "suggest_skip_logic",
    "suggest_validation",
    "improve_wording",
    "translate_questions"
  ],
  "primary_model": "gpt-4o",
  "tools": [
    "retrieve_questionnaire_templates",
    "retrieve_indicator_library",
    "retrieve_merl_guidelines"
  ],
  "prompt_version": "survey_design/v3",
  "input_schema": "studies_json_schema",
  "output_schema": "questionnaire_json_schema",
  "human_review_required": "always",
  "latency_sla_ms": 5000
}
```

---

## 3. Supervisor Agent

### 3.1 Orchestration Flow

```
User Request
    │
    ▼
[Supervisor: Intent Classification]
    ├── Intent: "design questionnaire"
    │     → Specialist: survey_design
    │     → Supporting: indicator, translation
    ├── Intent: "analyze findings"
    │     → Specialist: reporting, qualitative
    │     → Supporting: knowledge
    ├── Intent: "check data quality"
    │     → Specialist: data_quality
    │     → Supporting: none
    └── Intent: "answer question"
          → Specialist: knowledge
          → Supporting: none
    │
    ▼
[Supervisor: Context Assembly]
    ├── Gather study config, project data
    ├── Fetch conversation history
    ├── Build RAG context (relevant docs)
    └── Compile context package
    │
    ▼
[Supervisor: Dispatch]
    ├── Primary specialist (required)
    └── Supporting specialists (parallel where possible)
    │
    ▼
[Supervisor: Synthesis]
    ├── Merge outputs from multiple agents
    ├── Deconflict contradictions
    ├── Rank/prioritize suggestions
    └── Format for user
    │
    ▼
[Supervisor: Quality Gate]
    ├── Check confidence scores
    ├── Validate citations
    ├── Check against guardrails
    └── Determine review level (auto/flag/review/block)
    │
    ▼
Return to User
```

### 3.2 Intent Classification Model

```json
{
  "input": "I need help designing a survey about maternal health in rural Kenya",
  "output": {
    "primary_intent": "survey_design",
    "secondary_intents": ["indicator_suggestion"],
    "entities": {
      "sector": "Health",
      "topic": "maternal health",
      "location": "Kenya",
      "context": "rural"
    },
    "urgency": "normal",
    "complexity": "medium"
  }
}
```

---

## 4. Specialist Agents

### 4.1 Research Design Agent

```
Input: Study objectives, sector, country, donor requirements
Process:
  1. Retrieve similar study designs (RAG)
  2. Retrieve MERL framework guidelines
  3. Generate ToC draft (theory of change)
  4. Generate LogFrame (results framework)
  5. Suggest methodology (qual/quant/mixed)
  6. Suggest sampling strategy
Output: Study design proposal with rationale
Human Review: Always required before use
```

### 4.2 Survey Design Agent

```
Input: Study context, sections needed, question types
Process:
  1. Retrieve relevant questionnaire templates (RAG)
  2. Generate question drafts per section
  3. Add skip logic, validation rules
  4. Suggest translations for target languages
  5. Score question quality (SMART, clarity, bias check)
Output: Questionnaire JSON structure
Human Review: Always required
```

### 4.3 Indicator Agent

```
Input: Outcome/objective statement, sector
Process:
  1. Parse SMART criteria against statement
  2. Check indicator library for matches
  3. Suggest new indicators if none found
  4. Recommend disaggregation dimensions
  5. Define numerator/denominator for quantitative
Output: Indicator suggestions with SMART scores
Human Review: Always required
```

### 4.4 Data Quality Agent

```
Input: Submitted data batch, questionnaire, location data
Process:
  1. Check completeness (required fields)
  2. Check GPS: distance from expected location, speed between surveys
  3. Check timing: minimum duration, straight-lining
  4. Check logic: skip pattern violations, contradictory answers
  5. Score each submission (0-100)
  6. Flag suspicious submissions for human review
Output: Quality scores, flags, evidence
Human Review: Flagged submissions require investigation
```

### 4.5 Reporting Agent

```
Input: Study data, analysis results, report template
Process:
  1. Retrieve past reports for style reference
  2. Generate executive summary from findings
  3. Draft methodology section from study config
  4. Generate findings narrative from data
  5. Draft recommendations linked to findings
  6. Suggest visualizations
Output: Draft report sections
Human Review: Always required
```

### 4.6 Knowledge Assistant

```
Input: User question, conversation history
Process:
  1. Rewrite query for retrieval
  2. Hybrid search across all knowledge sources
  3. Re-rank and compress context
  4. Generate answer with citations
  5. Suggest follow-up questions
Output: Answer with citations
Human Review: Optional (confidence-based auto-review)
```

### 4.7 Qualitative Analysis Agent

```
Input: Transcripts, open-ended responses, existing codebook
Process:
  1. Suggest initial codebook from research questions
  2. Apply thematic analysis (codes to themes)
  3. Extract representative quotes per theme
  4. Sentiment analysis per respondent/theme
  5. Compare against previous studies for meta-themes
Output: Themes, codes, quotes, sentiment
Human Review: Always required
```

### 4.8 Executive Assistant

```
Input: Portfolio of studies/projects, dashboard context
Process:
  1. Aggregate findings across studies
  2. Identify trends and patterns
  3. Flag risks and anomalies
  4. Generate portfolio summary narrative
  5. Suggest strategic recommendations
Output: Executive summary with trend alerts
Human Review: Review before sharing
```

---

## 5. Agent Communication

### 5.1 Context Package

```json
{
  "session_id": "uuid",
  "parent_id": "uuid_or_null",
  "user_id": "uuid",
  "tenant_id": "uuid",
  "intent": "survey_design",
  "input": "Design maternal health survey for Kenya",
  "context": {
    "study": {"id": "uuid", "name": "...", "sector": "Health", "country": "Kenya"},
    "project": {"id": "uuid", "name": "..."},
    "conversation": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
  },
  "rag_context": [
    {"chunk_id": "abc", "text": "...", "source": "...", "score": 0.92}
  ],
  "previous_agent_outputs": {},
  "current_agent": "survey_design",
  "output": {"draft_questions": ["..."]},
  "confidence": 0.85,
  "limitations": ["Requires human review of skip logic"]
}
```

### 5.2 Handoff Protocol

```
Agent A calls Agent B:
  1. Supervisor determines Agent B needed
  2. Context package cloned with current agent = "B"
  3. Agent B processes within its context window
  4. Agent B returns updated context package with output
  5. Supervisor merges into final response
```

### 5.3 Parallel Execution

When multiple supporting agents are needed:

```
Supervisor dispatches:
  ├── Agent A (primary) receives full context
  ├── Agent B (support) receives relevant subset
  └── Agent C (support) receives relevant subset

All execute in parallel.

Supervisor collects outputs, merges, final.
```

---

## 6. Tool Use

### 6.1 Available Tools

| Tool | Description | Used By |
|------|-------------|---------|
| `retrieve_knowledge` | Hybrid search across knowledge base | All agents |
| `get_study_config` | Fetch study design configuration | research, survey, indicator |
| `get_questionnaire` | Load existing questionnaire | survey, quality |
| `get_indicator_library` | Search indicator library | indicator |
| `get_submission_data` | Load collected data | quality, reporting |
| `get_analysis_results` | Load analysis output | reporting, executive |
| `get_lesson_library` | Search lessons learned | knowledge, research |
| `get_conversation_history` | Past exchanges in session | all (via supervisor) |
| `translate_text` | Translate content | survey, translation |
| `validate_json_schema` | Validate output structure | all (post-processing) |

### 6.2 Tool Execution

- Tools executed by Laravel backend (not by agent directly)
- Agent specifies tool + parameters in structured output
- Supervisor executes tool, injects result back into context
- Tool execution is logged and audited

---

## 7. Agent Memory

### 7.1 Session Memory (Short-term)

- Duration: Active session + 24h
- Stores: Conversation history, agent outputs, context
- Storage: Redis (TTL: 24h)
- Max messages: 20 (sliding window)

### 7.2 Project Memory (Long-term)

- Duration: Lifetime of study/project
- Stores: Previous AI interactions, user edits, approved outputs
- Storage: PostgreSQL (ai_interactions table)
- Used for: Context in future sessions, improvement analytics

### 7.3 Agent Learning

- User edits/rejections stored as feedback
- Periodic analysis identifies improvement patterns
- Prompt versions updated based on feedback
- No automatic fine-tuning (Phase 2 consideration)
