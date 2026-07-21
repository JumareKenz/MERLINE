# AI Quality Evaluation Framework

## 1. Overview

The Quality Evaluator is an automated scoring system that assesses every AI output before it reaches the user. It provides confidence scores, citation verification, and determines the appropriate human review level.

---

## 2. Quality Dimensions

| Dimension | Weight | Description | Evaluation Method |
|-----------|--------|-------------|-------------------|
| **Accuracy** | 30% | Information is factually correct | Citation verification, self-consistency |
| **Relevance** | 20% | Output addresses user query | Semantic similarity to query |
| **Completeness** | 15% | Output covers all required aspects | Schema compliance + rubric |
| **Clarity** | 10% | Output is understandable and well-structured | Readability score + structure check |
| **Safety** | 15% | No harmful, biased, or inappropriate content | Content safety classifier |
| **Conciseness** | 10% | Output is appropriately sized, not verbose | Token count vs expected range |

---

## 3. Scoring Methodology

### 3.1 Capability-Specific Scoring

Each capability has a tailored scoring rubric:

```
CAPABILITY: indicator_generation
SCORING RUBRIC:
  - SMART compliance (40%): measurable, specific, time-bound, relevant
  - Disaggregation completeness (20%): gender, age, location where relevant
  - Citation quality (20%): sources properly referenced
  - Language quality (20%): clear, unambiguous, appropriate for target audience

THRESHOLD:
  - score >= 0.85: Auto-accept
  - 0.70 <= score < 0.85: Flag for review
  - score < 0.70: Require human review
  - score < 0.40: Block (discard, suggest retry)
```

### 3.2 Scoring Methods

| Method | Description | When Used |
|--------|-------------|-----------|
| **LLM-as-judge** | Another LLM evaluates output against criteria | Accuracy, relevance, quality rubrics |
| **Rule-based** | Hard rules: schema validation, token limits, citation format | Format validation, completeness |
| **Classifier** | Specialized model: safety, bias, sentiment | Safety check |
| **Semantic similarity** | Cosine similarity between output and expected | Relevance to query |
| **Self-consistency** | Multiple generations, measure agreement | Hallucination detection |
| **Edit distance** | Compare to previous accepted outputs | Regression detection |

### 3.3 LLM-as-Judge Configuration

```json
{
  "capability": "questionnaire_design",
  "judge_model": "gpt-4o-mini",
  "prompt": "Evaluate the following questionnaire design on: 1) Question relevance to study objectives 2) Skip logic correctness 3) Validation rule appropriateness 4) Language clarity. Score each 1-5 and provide overall score.",
  "temperature": 0.0,
  "max_tokens": 500
}
```

---

## 4. Confidence Scoring

### 4.1 Components

| Component | Source | Range |
|-----------|--------|-------|
| Model confidence | Token log probabilities | 0.0 - 1.0 |
| Self-consistency | Agreement across N generations | 0.0 - 1.0 |
| RAG relevance | Similarity between query and retrieved chunks | 0.0 - 1.0 |
| Citation strength | Number and quality of citations | 0.0 - 1.0 |
| Historical accuracy | Past acceptance rate for similar queries | 0.0 - 1.0 |

### 4.2 Overall Confidence

```
confidence = w1 * model_conf + w2 * consistency + w3 * rag_rel + w4 * citation + w5 * historical
```

Default weights: w1=0.25, w2=0.25, w3=0.20, w4=0.20, w5=0.10

---

## 5. Review Level Determination

### 5.1 Decision Matrix

| Quality Score | Confidence | Capability Risk | Review Level |
|--------------|------------|-----------------|--------------|
| ≥0.85 | ≥0.9 | Low | Auto-accept |
| ≥0.85 | ≥0.7 | Medium | Auto-accept with flag |
| 0.70-0.84 | Any | Any | Flag for review |
| <0.70 | Any | High | Human review required |
| <0.40 | Any | Any | Blocked |

### 5.2 Review Actions

| Action | UX | Backend |
|--------|-----|---------|
| **Auto-accept** | Output shown immediately | Logged as auto-accepted |
| **Auto-accept with flag** | Output shown with "AI-generated, verify" badge | Logged as flagged |
| **Flag for review** | Output shown with "pending review" queue | Added to review dashboard |
| **Human review** | Output shown with "verify required" prompt | Added to mandatory review |
| **Blocked** | "Could not generate. Please retry or contact support." | Logged, alert if frequent |

---

## 6. Feedback Collection

### 6.1 Explicit Feedback

| Mechanism | Implementation |
|-----------|---------------|
| Thumbs up/down | Inline on every AI output |
| Rating (1-5 stars) | After task completion |
| Rejection reason | Categorical: inaccurate, irrelevant, unsafe, unclear, other |
| Free-text comment | Optional text field |

### 6.2 Implicit Signals

| Signal | How Measured |
|--------|-------------|
| Time spent reviewing | Duration from output display to next action |
| Edit actions | User modifies AI output before accepting |
| Regeneration requests | User clicks "try again" |
| Copy/paste | User copies AI output elsewhere |
| Scroll depth | How much of the output user viewed |
| Abandonment | User leaves without interacting with output |

### 6.3 Metrics Tracked

| Metric | Aggregation | Update |
|--------|-------------|--------|
| Satisfaction rate | Thumbs up / (thumbs up + down) | Real-time |
| Edit rate | Edited outputs / total outputs | Real-time |
| Acceptance rate | Accepted outputs / total outputs | Real-time |
| Regeneration rate | Retries / total requests | Real-time |
| Average rating | 1-5 average | Daily |
| Top rejection reasons | Category distribution | Weekly |

---

## 7. Continuous Improvement

```
Feedback Data → Analysis → Identify Patterns
    ↓                            ↓
Update Test Suite ← Prompt Refinement ← Identify Prompt Gaps
    ↓
Run Eval Suite → Metrics Improve? → Ship / Iterate
```

### 7.1 Quality Review Cadence

| Review | Frequency | Scope |
|--------|-----------|-------|
| Automated monitoring | Real-time | All metrics, anomaly alerts |
| Weekly quality review | Weekly | Per-capability metrics, top failures |
| Monthly deep dive | Monthly | Root cause analysis, benchmark updates |
| Quarterly strategic | Quarterly | Model selection review, new capability eval |

### 7.2 Intervention Triggers

| Trigger | Action |
|---------|--------|
| Satisfaction drops >10% in 24h | Rollback to previous prompt version |
| Edit rate >30% for 7 days | Prompt redesign |
| Blocked rate >5% | Tune guardrails |
| Latency P95 >2× target | Model downgrade or infrastructure scale |
| Cost per capability >2× budget | Model downgrade or usage limits |
