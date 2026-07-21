# Merline Prompt Evaluation Framework

## Version: 1.0.0
## Status: Draft
## Owner: Prompt Engineering Lead

---

## 1. Evaluation Philosophy

Every prompt is a hypothesis: "This prompt produces high-quality outputs." Evaluation is the experiment that validates or refutes that hypothesis.

### 1.1 Evaluation Principles

| Principle | Description |
|-----------|-------------|
| **Evaluate Everything** | Every prompt version must be evaluated before deployment |
| **Automate First** | Automated evaluation runs on every PR; human evaluation for validation |
| **Ground Truth Matters** | Maintain golden datasets of expected inputs and outputs |
| **Measure What Matters** | Focus on dimensions that affect user outcomes |
| **Continuous Monitoring** | Quality monitoring in production catches drift and regressions |
| **Cost-Benefit Aware** | Evaluation itself has cost; sample strategically |

### 1.2 Evaluation Dimensions

| Dimension | Weight | Definition | Evaluation Method |
|-----------|--------|------------|-------------------|
| Accuracy | 25% | Output is factually correct | LLM-as-judge + exact match |
| Groundedness | 20% | Output is supported by evidence | Citation verification + RAG audit |
| Completeness | 15% | Output covers all requirements | Schema validation + checklist |
| Consistency | 10% | Output is internally coherent | Semantic similarity + logic check |
| Reasoning | 10% | Output demonstrates sound reasoning | Chain-of-thought audit |
| Safety | 10% | Output violates no policies | Content safety classifier |
| Citation Quality | 5% | Citations are accurate and relevant | Source verification |
| Domain Expertise | 5% | Output reflects MERL knowledge | Expert rubric |
| **Composite** | **100%** | Weighted average | **Pass threshold: 0.80** |

---

## 2. Evaluation Dataset Design

### 2.1 Dataset Types

| Type | Description | Size Target | Refresh Frequency |
|------|-------------|-------------|-------------------|
| **Ground Truth** | Expert-validated input-output pairs | 50-100 per capability | Quarterly |
| **Regression** | Historical production inputs | 200-500 per capability | Updated monthly |
| **Adversarial** | Edge cases, injection attempts, boundary conditions | 20-50 per capability | Updated per release |
| **Human Eval** | Samples set aside for expert review | 20-50 per capability | Per evaluation run |
| **Production** | Sampled from real usage | 1% of traffic | Continuous |

### 2.2 Dataset Schema

Stored in `evaluation_datasets` and `evaluation_examples` tables (see AI-ANALYTICS-SCHEMA.md).

### 2.3 Ground Truth Dataset Examples

**For Theory of Change Generation (workflow-toc-generation)**:

| # | Input Context | Expected Output | Evaluation Criteria |
|---|---------------|-----------------|---------------------|
| 1 | Health program in rural Kenya, CHW training, mobile clinics | ToC with causal pathways, assumptions, evidence citations | All levels present, coherent logic, SMART indicators |
| 2 | Education program in urban Bangladesh, teacher training, parent engagement | ToC with context analysis, stakeholder engagement noted | Assumptions documented, gender considered |
| 3 | WASH program in rural Zambia, boreholes, CLTS, hygiene promotion | ToC with behavior change pathway, infrastructure pathway | External factors identified |

**For Data Quality Detection (workflow-data-quality-detection)**:

| # | Input Submission Data | Expected Flags | Evaluation Criteria |
|---|----------------------|----------------|---------------------|
| 1 | Duration: 120s (median: 600s), GPS: same for all 20 submissions | Critical flags: speeding + GPS duplicate | Both issues detected with evidence |
| 2 | All responses "Agree" or "Strongly Agree" for 50 consecutive Likert questions | Warning flag: straight-lining | Detected, severity appropriate |
| 3 | Normal duration, varied responses, GPS within geofence | No flags | Correctly passes |

---

## 3. Automated Evaluation

### 3.1 LLM-as-Judge

The evaluation prompts defined in EVALUATION-PROMPTS.md are used as the LLM judge system.

**Pipeline**:

```
Input + AI Output
        │
        ▼
LLM-as-Judge (evaluator model: strong model like GPT-4o or Claude 3.5 Opus)
        │
        ├── Accuracy Evaluation
        ├── Groundedness Evaluation
        ├── Completeness Evaluation
        ├── Consistency Evaluation
        ├── Reasoning Evaluation
        ├── Safety Evaluation
        ├── Citation Quality Evaluation
        └── Domain Expertise Evaluation
        │
        ▼
Structured JSON scores + evidence
```

### 3.2 Semantic Similarity

Used for evaluating consistency and regression test passes.

**Method**: Compare output embedding to expected output embedding using cosine similarity.

| Score | Interpretation |
|-------|----------------|
| > 0.95 | Nearly identical |
| 0.85 - 0.95 | Very similar (acceptable) |
| 0.70 - 0.85 | Somewhat similar (review) |
| < 0.70 | Different (investigate) |

### 3.3 Exact Match

Used for structured outputs where exact values are expected.

| Metric | Application |
|--------|-------------|
| Exact match rate | Indicator code validation, schema field presence |
| Field presence | All required JSON fields present |
| Type match | All fields have correct types |
| Value range | Numeric values within expected ranges |

### 3.4 Custom Metrics

| Metric | Calculation | Application |
|--------|-------------|-------------|
| Token efficiency | `(output_tokens / input_tokens)` | Cost optimization |
| Citation density | `(citation_count / claim_count)` | Groundedness |
| Confidence calibration | `(avg_confidence - actual_accuracy)` | Model self-awareness |
| Readability | Flesch-Kincaid grade level | Audience appropriateness |
| Response time | Time from request to first token | User experience |

---

## 4. Human Evaluation

### 4.1 Rating Scale

| Score | Label | Description |
|-------|-------|-------------|
| 5 | Excellent | Perfect — accurate, complete, useful, well-structured |
| 4 | Good | Minor improvements needed |
| 3 | Adequate | Useable but has notable issues |
| 2 | Poor | Significant issues, needs major revision |
| 1 | Unacceptable | Cannot use — incorrect, missing, or harmful |

### 4.2 Expert Review Process

1. **Select sample**: 20-50 outputs per prompt version
2. **Assign reviewers**: 2-3 MERL experts (inter-rater reliability check)
3. **Review**: Each expert scores independently on all 8 dimensions
4. **Consolidate**: Average scores; flag items with >1 point disagreement for discussion
5. **Calculate IRR**: Cohen's Kappa (target > 0.7)
6. **Report**: Dimension scores, pass/fail, recommendations

### 4.3 Inter-Rater Reliability

| Kappa Value | Interpretation |
|-------------|----------------|
| > 0.8 | Strong agreement — evaluation is reliable |
| 0.6 - 0.8 | Moderate agreement — acceptable |
| 0.4 - 0.6 | Weak agreement — clarify rubric, retrain reviewers |
| < 0.4 | Poor agreement — redesign evaluation process |

---

## 5. A/B Testing

### 5.1 A/B Test Design

| Element | Configuration |
|---------|---------------|
| **Test unit** | Prompt version (A = current, B = candidate) |
| **Traffic split** | 50/50 for tests; canary (5/95) for risky changes |
| **Sample size** | Minimum 100 requests per variant |
| **Duration** | Minimum 7 days (to capture weekly cycles) |
| **Metrics** | Quality score, latency, cost, user rating, correction rate |

### 5.2 Decision Criteria

| Result | Action |
|--------|--------|
| B > A on all metrics (p < 0.05) | Deploy B |
| B > A on primary metric, neutral on others | Deploy B |
| B ≈ A (no significant difference) | Deploy B (if cheaper or simpler) |
| B < A on any metric (p < 0.05) | Reject B, investigate |
| B < A on safety (any difference) | Immediately reject B |

---

## 6. Regression Testing

### 6.1 Process

```
1. Before deploying any prompt change:
   a. Run all regression tests on CURRENT version (baseline)
   b. Run all regression tests on CANDIDATE version
   c. Compare results

2. Pass criteria:
   - No regression on any Ground Truth dataset (0% pass rate drop)
   - < 5% pass rate drop on Regression dataset
   - No new safety violations
   - No new hallucination flags

3. Fail action:
   - Block deployment
   - Flag specific regressions to Prompt Engineering Lead
   - Investigate root cause
```

### 6.2 Regression Test Automation

```php
// In CI/CD pipeline
class RegressionTestSuite
{
    public function run(PromptVersion $candidate, PromptVersion $baseline): TestResult
    {
        $datasets = EvaluationDataset::where('dataset_type', 'regression')->get();
        $results = [];
        
        foreach ($datasets as $dataset) {
            foreach ($dataset->examples as $example) {
                // Run with candidate
                $candidateOutput = $this->runPrompt($candidate, $example->input);
                // Run with baseline
                $baselineOutput = $this->runPrompt($baseline, $example->input);
                // Compare
                $pass = $this->compare($candidateOutput, $baselineOutput, $example);
                $results[] = [
                    'example_id' => $example->id,
                    'baseline_pass' => $pass,
                    'candidate_pass' => $pass,
                ];
            }
        }
        
        return new TestResult($results);
    }
}
```

---

## 7. Quality Scorecards

### 7.1 Per-Prompt Scorecard

```
Prompt: workflow-toc-generation
Version: 1.2.0
Evaluation Date: 2026-07-18
Evaluator: GPT-4o (LLM-as-judge) + 3 human reviewers

SCORES:
┌─────────────────────┬──────────┬──────────┬──────────┐
│ Dimension           │ Auto     │ Human    │ Combined │
├─────────────────────┼──────────┼──────────┼──────────┤
│ Accuracy            │ 0.92     │ 0.90     │ 0.91     │
│ Groundedness        │ 0.88     │ 0.85     │ 0.87     │
│ Completeness        │ 0.95     │ 0.92     │ 0.94     │
│ Consistency         │ 0.90     │ 0.88     │ 0.89     │
│ Reasoning           │ 0.87     │ 0.90     │ 0.88     │
│ Safety              │ 1.00     │ 1.00     │ 1.00     │
│ Citation Quality    │ 0.85     │ 0.82     │ 0.84     │
│ Domain Expertise    │ 0.91     │ 0.93     │ 0.92     │
├─────────────────────┼──────────┼──────────┼──────────┤
│ COMPOSITE           │ 0.91     │ 0.90     │ 0.91     │
└─────────────────────┴──────────┴──────────┴──────────┘

TEST DATASET: 50 ground truth examples
PASS RATE: 92% (46/50)
REGRESSION: +2% vs version 1.1.0

LIMITATIONS IDENTIFIED:
- Suggests complex ToC structures for very simple interventions
- Could improve evidence citation specificity

RECOMMENDATIONS:
- Add few-shot example for simple interventions
- Strengthen citation specificity instruction

DECISION: APPROVED (passes threshold of 0.80)
```

### 7.2 Scorecard Evolution Tracking

| Version | Date | Composite | Pass Rate | Regression | Notes |
|---------|------|-----------|-----------|------------|-------|
| 1.0.0 | 2026-07-18 | 0.85 | 84% | Baseline | Initial |
| 1.1.0 | 2026-08-01 | 0.88 | 88% | +4% | Added more constraints |
| 1.2.0 | 2026-08-15 | 0.91 | 92% | +3% | Improved few-shot examples |

---

## 8. Continuous Monitoring

### 8.1 Drift Detection

| Signal | Detection Method | Action Threshold |
|--------|------------------|-----------------|
| Quality score drift | Rolling 7-day average quality score | Drop > 0.05 from baseline |
| Pass rate regression | Daily automated evaluation | Drop > 5% from baseline |
| User rating decline | 7-day average user rating | Drop > 0.5 from baseline |
| Correction rate increase | % of outputs requiring correction | Increase > 10% from baseline |
| Cost anomaly | Tokens per request 7-day average | Increase > 20% from baseline |
| Latency increase | P95 latency 7-day average | Increase > 30% from baseline |
| Error rate increase | % of requests with errors | Increase > 2% from baseline |

### 8.2 Quality Trends Dashboard

The Prompt Engineering Lead monitors:

```
Quality Trends — Last 30 Days
┌────────────────────────────────────────────────────────┐
│ Prompt: workflow-toc-generation                        │
│                                                        │
│ Quality Score: 0.91 ──── Stable ▁▂▃▄▅▆▇█ Trend: →     │
│ Pass Rate:     92%  ──── Stable ▁▂▃▄▅▆▇█ Trend: →     │
│ Avg Cost:      $0.04 ──── Increasing ▁▂▃▄▅▆▇█ Trend: ↗│
│ Latency P95:   4.2s ──── Stable ▁▂▃▄▅▆▇█ Trend: →     │
│ Error Rate:    1.2% ──── Low ▁▂▃▄▅▆▇█ Trend: →        │
│ User Rating:   4.2/5 ──── Stable ▁▂▃▄▅▆▇█ Trend: →     │
│ Correction R:  8%   ──── Stable ▁▂▃▄▅▆▇█ Trend: →     │
└────────────────────────────────────────────────────────┘
```

### 8.3 Alerting

| Alert | Trigger | Channel | Response |
|-------|---------|---------|----------|
| Quality dip | Score < 0.75 for > 1 hour | Slack + Email | Investigate; potential rollback |
| Cost spike | Daily cost > 2x budget | Slack | Review usage patterns |
| Error surge | Error rate > 5% | PagerDuty | Emergency: switch to fallback model |
| Safety incident | Safety eval score < 0.5 | PagerDuty + Email | Block feature, investigate immediately |

---

## 9. Evaluation Governance

| Role | Responsibility |
|------|----------------|
| Prompt Engineering Lead | Owns evaluation framework, reviews all results |
| AI Systems Architect | Reviews evaluation methodology, approves major changes |
| QA Lead | Runs human evaluations, manages dataset curation |
| Domain Expert (MERL) | Validates ground truth datasets, provides expert ratings |
| DevOps Lead | Implements automated evaluation in CI/CD pipeline |
| Product Manager | Prioritizes evaluation improvements based on user impact |

---

# Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-18 | Prompt Engineering Lead | Initial evaluation framework design |
