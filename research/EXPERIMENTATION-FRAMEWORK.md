# Merline AI Experimentation Framework

## Version: 1.0.0
## Owner: AI Research, Innovation & Advanced Intelligence Director

---

## 1. Philosophy

Every AI capability is a hypothesis until validated by experiment. This framework defines how Merline formulates, executes, and learns from AI experiments.

**Principle**: Research without measurement is speculation.

---

## 2. Hypothesis Generation Process

### 2.1 Hypothesis Sources

| Source | Description | Cadence |
|--------|-------------|---------|
| **User feedback analysis** | Patterns in rejection reasons, edit behavior, satisfaction drops | Weekly |
| **Quality metric drift** | Automated alerts from evaluation pipeline | Continuous |
| **Model landscape changes** | New model releases, API changes, pricing shifts | Monthly |
| **Academic literature** | New techniques in multi-agent, RAG, evaluation | Monthly |
| **Competitor analysis** | New features from competitors | Monthly |
| **Team ideation** | Structured brainstorming sessions | Bi-weekly |
| **User research** | Interviews, field observations, usability tests | Per research cycle |

### 2.2 Hypothesis Format

Every hypothesis must follow this structure:

```
HYPOTHESIS: [One-sentence statement of expected effect]

INDEPENDENT VARIABLE: [What we change]
DEPENDENT VARIABLE: [What we measure]
TARGET POPULATION: [Which users/requests]
EXPERIMENT TYPE: [A/B test, shadow, ablation, etc.]

RATIONALE: [Why we believe this will work]

SUCCESS CRITERIA:
  - Primary: [Main metric, minimum improvement]
  - Secondary: [Other metrics to monitor]
  - Guardrails: [What must NOT degrade]

SAMPLE SIZE: [Minimum samples for statistical significance]
DURATION: [Expected duration]
RISK: [Low / Medium / High]
```

### 2.3 Hypothesis Examples

```
HYPOTHESIS: Reranking RAG results with cross-encoder will improve answer accuracy by 5% 
for Knowledge Assistant queries.

IV: Reranker (BGE-reranker-v2 vs current Cohere rerank)
DV: Answer accuracy (LLM-as-judge), citation recall
Population: Knowledge Q&A requests (T2 model only)
Type: A/B test (50/50)

RATIONALE: Cross-encoder reranking better captures query-document relevance than 
embedding similarity alone. Recent benchmarks show 3-5% improvement on QA tasks.

SUCCESS:
  - Primary: Answer accuracy ≥ +0.03 (p < 0.05)
  - Secondary: Citation recall ≥ +0.02, Latency increase < 300ms
  - Guardrails: No safety regression

SAMPLE: 500 queries per variant
DURATION: 7 days
RISK: Low (reranker only affects ranking, not generation)
```

---

## 3. Experiment Design Templates

### 3.1 A/B Test Template

| Element | Specification |
|---------|---------------|
| **Unit** | User session |
| **Assignment** | Random (cookie/user_id hash mod 100) |
| **Variants** | Control (current), Treatment (candidate) |
| **Traffic split** | 50/50 (canary: 5/95 for risky changes) |
| **Sample size** | min(500 per variant, power_analysis(N)) |
| **Duration** | min(7 days, enough for weekly cycle) |
| **Primary metric** | Quality score, satisfaction, or acceptance rate |
| **Secondary metrics** | Latency, cost, error rate, safety score |
| **Statistical method** | Two-tailed t-test or Mann-Whitney U |
| **Significance** | p < 0.05 |
| **Practical significance** | Minimum detectable effect: 0.03 quality score |

### 3.2 Shadow Mode Template

| Element | Specification |
|---------|---------------|
| **Purpose** | Validate AI accuracy without user impact |
| **Implementation** | Run candidate in parallel with production; log all outputs |
| **Traffic** | 100% of qualifying requests (or sampled %) |
| **Duration** | 14 days minimum |
| **Analysis** | Compare candidate vs production on: quality score, hallucination rate, citation accuracy |
| **Gate** | Candidate must meet or exceed production on all primary metrics |

### 3.3 Ablation Study Template

| Element | Specification |
|---------|---------------|
| **Purpose** | Understand contribution of each component |
| **Method** | Remove one component at a time; measure quality delta |
| **Components to test** | RAG context, thinking framework, few-shot examples, constraints |
| **Dataset** | Ground truth (200 samples minimum) |
| **Analysis** | Per-component contribution to quality; interaction effects |
| **Output** | Component importance ranking; optimization priorities |

### 3.4 Human Evaluation Template

| Element | Specification |
|---------|---------------|
| **Purpose** | Validate quality on dimensions automated metrics cannot measure |
| **Sample** | 50-100 outputs per variant |
| **Reviewers** | 2-3 MERL experts |
| **Dimensions** | Accuracy, completeness, reasoning, domain expertise, trust |
| **Scale** | 1-5 (see evaluation framework) |
| **Inter-rater reliability** | Cohen's Kappa target > 0.7 |
| **Analysis** | Mean score per dimension; preference between variants |

---

## 4. Statistical Significance Testing

### 4.1 Minimum Sample Size

| Effect Size (quality score) | Power 0.80 | Power 0.90 | Power 0.95 |
|----------------------------|------------|------------|------------|
| 0.01 (small) | 15,700 | 21,000 | 26,000 |
| 0.02 (medium-small) | 3,900 | 5,250 | 6,500 |
| 0.03 (medium) | 1,750 | 2,340 | 2,900 |
| 0.05 (large) | 630 | 850 | 1,050 |
| 0.10 (very large) | 160 | 210 | 270 |

*Based on two-tailed t-test, α = 0.05, estimated SD = 0.15*

### 4.2 Method Selection

| Data Type | Method | Assumption |
|-----------|--------|------------|
| Continuous, normal | Student's t-test | Normality, equal variance |
| Continuous, non-normal | Mann-Whitney U | Independent samples |
| Binary (pass/fail) | Chi-square / Fisher's exact | Independence |
| Ordinal (ratings) | Mann-Whitney U | Independent samples |
| Repeated measures | Paired t-test / Wilcoxon | Paired observations |
| Multiple comparisons | Bonferroni / Holm correction | Family-wise error control |
| Bayesian | Bayes factor | Prior specification |

### 4.3 Decision Rules

| Result | Action |
|--------|--------|
| p < 0.05, effect > MDE | Deploy treatment (or reject if negative) |
| p < 0.05, effect < MDE | Consider deployment (practically insignificant) |
| p ≥ 0.05, effect > MDE | Insufficient power; extend experiment |
| p ≥ 0.05, effect < MDE | No detectable difference; keep control |
| Safety degradation (any p) | Immediately reject |

---

## 5. Experiment Registry and Tracking

### 5.1 Registry Schema

All experiments logged in `experiment_registry` table:

```json
{
  "experiment_id": "E-015",
  "hypothesis": "Distilled Mistral 7B achieves 90%+ of GPT-4o quality on structured MERL tasks",
  "iv": "Student model (Mistral 7B LoRA trained on 50K pairs)",
  "dv": "Quality score, latency, cost per call",
  "population": "Data quality classification requests",
  "type": "Shadow mode",
  "status": "in_progress",
  "start_date": "2026-09-01",
  "end_date": "2026-09-30",
  "sample_size": {"control": 0, "treatment": 5000},
  "primary_metric": "Quality score",
  "min_effect_size": 0.03,
  "significance_threshold": 0.05,
  "owner": "AI Research Scientist",
  "results": null,
  "decision": null,
  "learnings": null
}
```

### 5.2 Dashboard

A Grafana dashboard tracks:
- Active experiments (status, duration, sample size)
- Experiment results (effect size, p-value, decision)
- Cumulative learning across experiments
- Experiment velocity (experiments completed per month)

### 5.3 Experiment Lifecycle

```
Hypothesis Registered → Design Review → Approved
    ↓
Experiment Launched → Data Collection → Analysis Complete
    ↓
Review → Decision (Deploy / Reject / Iterate)
    ↓
Learnings Documented → Registry Updated
```

---

## 6. Learning Documentation Process

### 6.1 Post-Experiment Learning Document

Every experiment produces a structured learning document:

```yaml
experiment_id: E-015
title: Distillation Quality Assessment

hypothesis: Distilled Mistral 7B achieves 90%+ of GPT-4o quality

findings:
  - Quality: 92% retention on structured tasks (supports hypothesis)
  - Latency: 340ms vs 1200ms (72% reduction)
  - Cost: $0.0012 vs $0.0085 per call (86% reduction)
  - Limitations: Degrades 8% on tasks requiring domain reasoning
  
conclusion: SUPPORTED (quality retention above 90% threshold)

decision: Deploy for data quality detection tasks Q4

action_items:
  - Productionize distillation pipeline
  - Extend experiment to survey design tasks
  - Investigate 8% reasoning gap

sharing:
  - Share results with AI team (Slack)
  - Add to model evaluation report
  - Consider blog post on distillation strategy
```

### 6.2 Learning Repository

All experiment learnings stored in:
- **Structured**: `experiment_registry` table (queryable)
- **Narrative**: Research documentation in `research/experiments/` 
- **Shared**: Quarterly research review presentation

### 6.3 Meta-Learning

Quarterly analysis of experiment portfolio:
- Which hypotheses are most often supported? (signal)
- Which experiments fail consistently? (blind spots)
- Which methods yield most reliable results? (methodology optimization)
- Are we testing the right things? (portfolio balancing)

---

## 7. Experiment Prioritization

### 7.1 Scoring

| Dimension | Weight | 1 (Low) | 3 (Medium) | 5 (High) |
|-----------|--------|---------|------------|----------|
| **Potential impact** | 30% | 0.01 quality improvement | 0.03 quality improvement | 0.05+ quality improvement |
| **User value** | 25% | Fewer than 5% of users affected | 5-25% of users affected | > 25% of users affected |
| **Feasibility** | 20% | > 3 months engineering | 1-3 months | < 1 month |
| **Learning value** | 15% | Confirms known information | Tests established approach | Tests novel approach |
| **Cost** | 10% | > $50K experiment cost | $10-50K | < $10K |

### 7.2 Priority Matrix

```
HIGH Impact
    │
    │   Execute First                     Invest
    │   - Distillation validation         - Neuro-symbolic reasoning
    │   - Reranker comparison             - Agent self-improvement
    │   - Prompt compression              - Cross-lingual FT
    │
    │   Quick Wins                        Explore
    │   - Few-shot ablation               - Federated learning
    │   - Confidence calibration          - TinyML feasibility
    │   - Citation quality                - Video behavior coding
    │
LOW  └───────────────────────────────────────
     LOW        Feasibility           HIGH
```

---

## 8. Experiment Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Feature flags | Laravel Pennant / LaunchDarkly | Traffic splitting |
| Experiment tracking | Custom registry (PostgreSQL) | Experiment metadata |
| Metrics pipeline | ClickHouse | Real-time metric collection |
| Statistical analysis | Python (scipy, pingouin) | Significance testing |
| Dashboard | Grafana | Experiment monitoring |
| Learning repository | Git + markdown | Experiment documentation |

---

## 9. Experimentation Ethics

| Principle | Implementation |
|-----------|----------------|
| **Informed consent** | Users informed of experiments in privacy policy |
| **Opt-out** | Users can opt out of experimental features |
| **No harm** | Safety guardrails active during experiments |
| **Equal treatment** | No experiment denies critical functionality |
| **Transparency** | Experiment results shared internally |
| **Privacy** | No PII in experiment data |

---

## 10. Success Metrics for Experimentation Program

| Metric | Current | Target (6 months) | Target (12 months) |
|--------|---------|-------------------|---------------------|
| Experiments completed per month | 0 | 4 | 8 |
| Hypotheses supported rate | — | 50% | 60% |
| Time from hypothesis to decision | — | 4 weeks | 2 weeks |
| Experiment learnings documented | — | 100% | 100% |
| AI quality improvements from experiments | — | +0.02 | +0.05 |

---

**Every experiment is a learning opportunity. Failure is data, not defeat.**
