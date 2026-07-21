# Merline Multi-Agent System Evolution

## Version: 1.0.0
## Owner: AI Research, Innovation & Advanced Intelligence Director

---

## 1. Current State: Specialist Agents with Supervisor Orchestration

### 1.1 Architecture Summary

```
User Request
    │
    ▼
[Supervisor] → Intent Classification → Context Assembly → Agent Dispatch → Response Synthesis → Quality Gate
    │               │                       │                    │                    │                 │
    │          Rule-based               RAG + session        Parallel/sync         Merge +           Confidence
    │          classifier               context              dispatch             deconflict        scoring
```

### 1.2 Current Limitations

| Limitation | Impact | Root Cause |
|------------|--------|------------|
| No agent learning across sessions | Each interaction starts fresh | No persistent agent memory |
| No agent self-correction | Errors propagate to final output | No reflection/verification step |
| Static routing rules | Can't adapt to new user behaviors | Rule-based intent classification |
| No conflict resolution logic | When agents disagree, output is merged without priority | Simple averaging |
| No agent output verification | Supervisor doesn't verify before sending to user | Missing critic agent |
| No agent specialization depth | All agents use same model tier | Uniform model assignment |

---

## 2. Next Generation: Self-Improving Agents (6-12 Months)

### 2.1 Key Additions

| Capability | Description | Technical Approach |
|------------|-------------|-------------------|
| **Reflection** | Agent reviews its own output before finalizing | Structured self-critique prompt |
| **Critique** | Dedicated Critic agent evaluates specialist outputs | LLM-as-judge at agent level |
| **Iterative refinement** | Agent improves output based on critic feedback | Loop: generate → critique → refine (max 3 iterations) |
| **Verification** | Fact-check agent output against RAG sources | Citation verification + consistency check |
| **Confidence calibration** | Agent self-reports calibrated confidence | Train calibration model on production feedback |

### 2.2 Self-Improvement Flow

```
Specialist Agent → Generate Output
    │
    ▼
[Reflection] → Agent self-reviews: "Does this meet quality standards?"
    │
    ├── Yes → [Critic] → Critic agent evaluates: accuracy, completeness, safety
    │         │
    │         ├── Pass → Output delivered
    │         └── Fail → [Refinement] → Agent revises output (up to 3 iterations)
    │                                                      │
    │                                               After 3 iterations: flag for human
    │
    └── No → Agent revises internally (hidden from user)
```

### 2.3 Critic Agent

| Attribute | Design |
|-----------|--------|
| **Model** | Claude 3.5 Sonnet (different provider for diversity) |
| **Role** | Evaluate specialist output on quality dimensions |
| **Feedback** | Specific, actionable: "Indicator IND-003 lacks numerator/denominator definition" |
| **Scope** | All agents except Supervisor (Supervisor reviewed by human) |
| **Latency budget** | <1s per critique |

### 2.4 Agent Memory (Cross-Session)

| Memory Type | Duration | Storage | Content |
|-------------|----------|---------|---------|
| **Episodic** | Session + 24h | Redis (TTL) | Current conversation, agent outputs |
| **Semantic** | Study/project lifetime | PostgreSQL | Approved outputs, user preferences |
| **Procedural** | Permanent | Prompt registry | Learned prompt refinements |
| **Feedback memory** | Rolling 90 days | ClickHouse | User ratings, edit patterns, rejection reasons |

### 2.5 Feedback-Driven Learning

```
User Feedback (thumbs down, edit, reject)
    │
    ▼
Feedback Analysis Service
    ├── Pattern detection: "Users consistently reject indicator suggestions in health sector"
    ├── Prompt adjustment: Update Indicator Agent prompt for health sector
    └── Evaluation: Run regression on health sector test set
        │
        ├── Quality improved → Deploy prompt update
        └── No improvement → Escalate to human review
```

---

## 3. Future State: Autonomous Research Agents (12-24 Months)

### 3.1 Vision

Autonomous agents that execute end-to-end research workflows with human approval at key decision gates.

### 3.2 Agent Evolution Stages

| Stage | Capabilities | Human Role | Timeline |
|-------|-------------|------------|----------|
| **1. Assist** (Current) | Suggest, recommend, draft | Review all outputs | Now |
| **2. Collaborate** (Next) | Propose, iterate, refine with feedback | Review at gates | 6-12mo |
| **3. Execute** (Future) | Plan, execute, verify structured tasks | Approve task plans, review results | 12-18mo |
| **4. Autonomous** (Vision) | End-to-end study design, monitoring, analysis, reporting | Set objectives, approve conclusions | 18-24mo |

### 3.3 Autonomous Workflow Example

```
[Objective Setting]
Human: "Evaluate the impact of our maternal health program in rural Kenya"

[Agent: Research Designer]
1. Literature review: Retrieve 20 relevant studies from knowledge base
2. Methodology design: Propose quasi-experimental (difference-in-differences)
3. ToC generation: Draft theory of change with causal pathways
4. Indicator selection: Recommend 15 indicators from library
→ Human approves methodology

[Agent: Survey Designer]
1. Questionnaire generation: Draft 80 questions across 8 sections
2. Skip logic validation: Verify all paths, no cycles
3. Translation: Generate Swahili and English versions
→ Human approves questionnaire

[Agent: Data Quality]
1. Field monitoring: Real-time anomaly detection during collection
2. Enumerator scoring: Flag low-quality enumerators
3. Fraud detection: Benford's Law, GPS analysis, pattern detection
→ Human reviews flags

[Agent: Analyst]
1. Statistical analysis: Run pre-specified tests, explore patterns
2. Qualitative analysis: Thematic extraction from FGD transcripts
3. Triangulation: Combine quantitative and qualitative findings
→ Human reviews analysis

[Agent: Report Writer]
1. Executive summary generation
2. Findings narrative with data citations
3. Conclusions and recommendations
→ Human edits and approves

[Agent: Publication Writer]
1. Format findings for journal submission
2. Generate policy brief
3. Extract lessons learned for knowledge base
→ Human reviews before submission
```

### 3.4 Research Plan Autonomy Levels

| Level | Description | Decision Authority | Safety Gate |
|-------|-------------|-------------------|-------------|
| L1 | Suggest research plan | Human decides | Always |
| L2 | Propose research plan with rationale | Human approves with edits | Always |
| L3 | Execute approved plan steps autonomously | Human reviews outputs | Per output gate |
| L4 | Adapt plan within defined constraints | Human reviews adaptations | Per adaptation |
| L5 | Full autonomous research | Human reviews conclusions | Per conclusion |

**Phase 2 target**: L2-L3 for structured tasks; **Phase 3 target**: L3-L4 for well-defined studies.

---

## 4. Agent Communication Protocols

### 4.1 Structured Handoff Contract

Every agent-to-agent communication follows this schema:

```json
{
  "handoff_id": "uuid",
  "from_agent": "research_design",
  "to_agent": "survey_design",
  "context_package": {
    "session_id": "uuid",
    "study_config": { "objectives": ["..."], "sector": "health" },
    "rag_context": [
      {"chunk_id": "abc", "text": "...", "source": "...", "score": 0.92}
    ],
    "previous_outputs": {
      "research_design": {
        "toc": { "outcomes": ["..."] },
        "indicators": [{"code": "IND-001", "definition": "..."}]
      }
    },
    "current_task": "generate_questions_for_indicators",
    "constraints": ["max 80 questions", "skip logic required"]
  },
  "metadata": {
    "model": "gpt-4o",
    "prompt_version": "research_design/v3",
    "confidence": 0.91,
    "limitations": ["Sample size not yet determined"],
    "assumptions": ["Rural Kenya context"]
  }
}
```

### 4.2 Shared Context Protocol

- **Global context**: Tenant, user, study/project (unchanged across agents)
- **Session context**: Conversation history, user intent (updated per turn)
- **Agent-specific context**: Outputs from previous agents in chain
- **Priority ordering**: Study data > conversation history > general knowledge

### 4.3 Conflict Resolution

When agents disagree (e.g., two specialists recommend different indicators):

| Method | When | How |
|--------|------|-----|
| **Confidence weighting** | Both agents report confidence | Higher confidence wins |
| **Evidence-based arbitration** | Conflicting claims checked against RAG | Source-supported claim wins |
| **Supervisor override** | No clear winner | Supervisor makes final decision |
| **Present both** | Both equally valid | Present as alternatives with trade-offs |
| **Escalate to human** | High stakes, no resolution | Queue for human review |

---

## 5. Agent Safety at Scale

### 5.1 Safety Layers

| Layer | Mechanism | Scope |
|-------|-----------|-------|
| **Input guardrails** | Injection detection, PII redaction | Per agent |
| **Output guardrails** | Hallucination detection, safety check | Per agent |
| **Critic agent** | Quality evaluation by independent agent | Per output |
| **Supervisor gate** | Confidence threshold, review level decision | Per handoff |
| **Human review** | Required for high-risk decisions | Per decision |
| **Audit trail** | Every agent action logged | All agents |

### 5.2 Agent-Specific Safety Constraints

| Agent | Constraints |
|-------|-------------|
| Research Design | Cannot recommend unethical methodologies |
| Survey Design | Cannot create leading/biased questions |
| Indicator | Cannot fabricate indicator evidence |
| Data Quality | Cannot accuse without multi-evidence support |
| Reporting | Cannot misrepresent data |
| Knowledge | Cannot generate without RAG context |
| Executive | Cannot oversimplify complex situations |

### 5.3 Autonomous Agent Safety

| Safety Property | Implementation |
|-----------------|----------------|
| **Pause on uncertainty** | Confidence < 0.6 → pause, request human input |
| **Maximum autonomy** | Configurable per tenant (L1-L5) |
| **Kill switch** | Human can pause all autonomous agents tenant-wide |
| **Budget limits** | Autonomous agents stopped at daily budget cap |
| **Time limits** | Maximum autonomous execution time per task |
| **Approval gates** | Required gates configurable per study type |
| **Rollback** | Autonomous actions reversible within 24h |

---

## 6. Agent Evaluation

### 6.1 Per-Agent Quality Metrics

| Agent | Primary Metric | Target | Monitoring |
|-------|---------------|--------|------------|
| Research Design | Human acceptance rate | > 70% | Weekly |
| Survey Design | Human acceptance rate | > 75% | Weekly |
| Indicator | SMART compliance | > 90% | Weekly |
| Data Quality | Flag precision | > 0.85 | Weekly |
| Reporting | Edit distance | < 20% changed | Weekly |
| Knowledge | Citation accuracy | > 95% | Weekly |
| Executive | User satisfaction | > 4.0/5 | Weekly |

### 6.2 Agent System Evaluation

| Metric | Measurement | Target |
|--------|-------------|--------|
| End-to-end task success rate | User completes task without switching to manual | > 80% |
| Average agent handoff time | Time from agent A output to agent B start | < 500ms |
| Human intervention rate | % of tasks requiring human at any agent | < 30% |
| Agent loop count | % of tasks requiring > 3 agent iterations | < 5% |
| User satisfaction with agent system | Survey after multi-agent task | > 4.0/5 |

---

## 7. Implementation Roadmap

| Phase | Timeline | Capabilities | Dependencies |
|-------|----------|-------------|-------------|
| **Phase 1** | Now | Current supervisor + 9 specialists | None |
| **Phase 2** | Q3 2026 | Reflection + Critic agent | LLM-as-judge pipeline |
| **Phase 3** | Q4 2026 | Agent memory (semantic), feedback learning | ClickHouse, analytics |
| **Phase 4** | Q1 2027 | Cross-session memory, conflict resolution | Memory storage |
| **Phase 5** | Q2 2027 | Level 2 autonomy (collaborate) | Safety review, human approval | 
| **Phase 6** | H2 2027 | Level 3 autonomy (execute structured tasks) | Safety infrastructure |
| **Phase 7** | 2028 | Level 4 autonomy (adapt within constraints) | Autonomous safety framework |

---

## 8. Open Research Questions

1. **Critic agent reliability**: Does a second LLM reliably detect errors in the first? What is the false positive/negative rate?
2. **Refinement convergence**: How many refinement iterations improve quality before diminishing returns?
3. **Memory effectiveness**: Does cross-session memory improve quality enough to justify complexity?
4. **Autonomous safety**: What safeguards prevent autonomous agents from making irreversible errors?
5. **User trust calibration**: How does agent autonomy level affect user trust and adoption?
