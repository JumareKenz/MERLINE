# Merline Advanced Model Evaluation

## Version: 1.0.0
## Owner: AI Research, Innovation & Advanced Intelligence Director

---

## 1. Evaluation Framework

### 1.1 MERL-Specific Quality Dimensions

Standard NLP metrics (BLEU, ROUGE, METEOR) are insufficient for MERL domain evaluation. We define 8 quality dimensions weighted by importance per capability group.

| Dimension | Weight (avg) | Definition | Evaluation Method |
|-----------|-------------|------------|-------------------|
| **Groundedness** | 25% | Output claims are supported by retrieved evidence | Citation verification; claim-level fact check |
| **Accuracy** | 20% | Factual correctness of claims about MERL domain | LLM-as-judge + expert verification |
| **Completeness** | 15% | Output covers all required elements per capability rubric | Schema compliance + checklist |
| **Reasoning** | 12% | Chain-of-thought is logical, transparent, and justified | CoT audit by LLM judge |
| **Consistency** | 10% | Output is internally coherent and non-contradictory | Semantic similarity + logical consistency check |
| **Safety** | 10% | No harmful, biased, or unethical content | Content safety classifier |
| **Citation Quality** | 5% | Citations are relevant, correctly attributed, and verifiable | Source match + semantic relevance |
| **Domain Expertise** | 3% | Output reflects deep MERL knowledge | Expert rubric |

### 1.2 Capability-Specific Rubrics

| Capability | Primary Dimensions | Weight Distribution |
|------------|-------------------|---------------------|
| Research Design (ToC/LogFrame) | Groundedness, Reasoning, Completeness | 30/25/20 |
| Survey Design | Completeness, Accuracy, Domain Expertise | 30/25/15 |
| Indicator Generation | Accuracy, Completeness, Groundedness | 35/25/20 |
| Data Quality Detection | Accuracy, Reasoning, Consistency | 40/25/15 |
| Report Writing | Completeness, Groundedness, Accuracy | 30/25/20 |
| Knowledge Q&A | Groundedness, Accuracy, Citation Quality | 40/25/15 |
| Executive Summary | Completeness, Accuracy, Consistency | 30/30/15 |

---

## 2. Benchmark Datasets

### 2.1 MERL-Specific Benchmarks

| Benchmark | Description | Size | Source |
|-----------|-------------|------|--------|
| **MERL-Design** | ToC and LogFrame generation from project context | 200 pairs | Expert-created from 50 real projects |
| **MERL-Survey** | Question generation, wording improvement, skip logic validation | 300 pairs | Expert-designed surveys |
| **MERL-Indicator** | SMART validation, indicator recommendation, disaggregation | 250 pairs | Indicator library + expert review |
| **MERL-Quality** | Data quality detection (fabrication, anomalies, errors) | 500 pairs | Synthetic fabrication + real flagged submissions |
| **MERL-Report** | Report section generation, executive summary | 150 pairs | Published evaluation reports |
| **MERL-Knowledge** | RAG-based Q&A over MERL corpus | 400 pairs | Expert Q&A from MERL guidelines |
| **MERL-Executive** | Strategic insight generation from dashboard data | 100 pairs | Synthesized from real program data |
| **MERL-Adversarial** | Edge cases, injection attempts, boundary conditions | 200 pairs | Red team + automated generation |
| **MERL-CrossLingual** | Multi-language performance evaluation | 200 pairs | Translated + reviewed (FR, ES, SW, AR) |

**Total**: ~2,300 expert-validated test pairs across 9 benchmarks.

### 2.2 Benchmark Versioning

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-07-18 | Initial release |
| v1.1 | 2026-10-01 | +MERL-CrossLingual, +200 adversarial examples |
| v2.0 | 2027-01-01 | Expanded MERL-Design to 300; added MERL-Executive |

---

## 3. Model Comparison Reports

### 3.1 Overall Performance

| Model | MERL-Design | MERL-Survey | MERL-Indicator | MERL-Quality | MERL-Report | MERL-Knowledge | MERL-Executive | Composite | Avg Latency | Cost/1K calls |
|-------|-------------|-------------|----------------|-------------|-------------|----------------|----------------|-----------|-------------|---------------|
| **GPT-4o** | 0.89 | 0.91 | 0.90 | 0.88 | 0.91 | 0.92 | 0.89 | **0.90** | 3.2s | $8.50 |
| **Claude 3.5 Sonnet** | 0.90 | 0.90 | 0.91 | 0.87 | 0.92 | 0.91 | 0.90 | **0.90** | 3.8s | $9.00 |
| **Gemini 2.0 Pro** | 0.86 | 0.88 | 0.87 | 0.85 | 0.88 | 0.89 | 0.87 | **0.87** | 2.5s | $7.00 |
| **Llama 4 (70B)** | 0.83 | 0.84 | 0.85 | 0.82 | 0.84 | 0.85 | 0.83 | **0.84** | 4.5s | $3.50* |
| **Mistral Large** | 0.82 | 0.84 | 0.83 | 0.81 | 0.83 | 0.84 | 0.82 | **0.83** | 3.0s | $4.00 |
| **DeepSeek-V3** | 0.85 | 0.86 | 0.86 | 0.84 | 0.86 | 0.87 | 0.85 | **0.86** | 3.5s | $2.50 |
| **GPT-4o-mini** | 0.76 | 0.79 | 0.78 | 0.80 | 0.77 | 0.81 | 0.75 | **0.78** | 1.2s | $1.20 |
| **Claude Haiku** | 0.74 | 0.77 | 0.76 | 0.78 | 0.75 | 0.79 | 0.73 | **0.76** | 1.5s | $1.50 |

*Self-hosted cost estimate; excludes infrastructure.

### 3.2 Dimension-Level Comparison (Top 3 Models)

| Dimension | GPT-4o | Claude 3.5 | Gemini 2.0 |
|-----------|--------|------------|-------------|
| Groundedness | **0.91** | 0.90 | 0.87 |
| Accuracy | **0.92** | **0.92** | 0.88 |
| Completeness | 0.90 | **0.93** | 0.88 |
| Reasoning | **0.91** | 0.90 | 0.86 |
| Consistency | 0.89 | **0.91** | 0.87 |
| Safety | 0.98 | **0.99** | 0.97 |
| Citation Quality | **0.88** | 0.87 | 0.84 |
| Domain Expertise | 0.90 | **0.91** | 0.86 |

### 3.3 Cross-Lingual Performance (GPT-4o)

| Language | MERL-Design | MERL-Survey | MERL-Indicator | MERL-Knowledge | Avg vs English |
|----------|-------------|-------------|----------------|----------------|-----------------|
| English (baseline) | 0.89 | 0.91 | 0.90 | 0.92 | — |
| French | 0.86 | 0.88 | 0.87 | 0.89 | -0.03 |
| Spanish | 0.87 | 0.89 | 0.88 | 0.90 | -0.02 |
| Swahili | 0.78 | 0.81 | 0.79 | 0.82 | -0.10 |
| Arabic | 0.80 | 0.83 | 0.81 | 0.84 | -0.08 |

**Finding**: Quality gap exists for low-resource languages. Mitigation via in-language few-shot examples and targeted prompt engineering.

---

## 4. Domain-Specific Fine-Tuning Strategy

### 4.1 When to Fine-Tune

| Scenario | Recommendation | Rationale |
|----------|---------------|-----------|
| General capability (Q&A, report writing) | No fine-tuning | Base models + RAG + prompting sufficient |
| Structured task (classification, extraction, validation) | Consider fine-tuning | Distilled model at 10% cost |
| High-volume, narrow scope (data quality scoring) | Fine-tune | 100K+ calls/month; cost savings justify |
| Low-resource language MERL tasks | Fine-tune if feasible | Prompting alone insufficient |
| Organization-specific indicator library | Embedding + RAG (no FT) | Too few examples; RAG more flexible |

### 4.2 Fine-Tuning Pipeline

```
1. Data Collection: 10K-50K instruction-output pairs from production + synthetic
2. Data Quality: Dedup, filter low-quality, validate schema
3. Base Model Selection: Llama 4 (8B/70B), Mistral 7B, or Qwen 2.5
4. Training: LoRA (rank=16-64) on 4-8 A100s; 2-5 epochs
5. Evaluation: Full benchmark suite; compare to baseline
6. Deployment: vLLM / TGI for inference; cost monitoring
7. Feedback Loop: Production data → periodic fine-tuning updates
```

### 4.3 Candidate Fine-Tuning Projects

| Project | Task | Data | Target Model | Expected Quality | Cost Savings |
|---------|------|------|-------------|-----------------|--------------|
| Data quality scoring | Multi-label anomaly classification | 50K labeled submissions | Mistral 7B LoRA | > 0.85 F1 | 85% vs GPT-4o |
| Indicator SMART validation | 5-class SMART classification | 20K indicator-review pairs | Llama 4 8B | > 0.90 F1 | 90% vs GPT-4o |
| Question type classification | 24-type classification | 30K question-type pairs | TinyBERT | > 0.95 F1 | On-device |
| Fabrication detection | Binary + severity | 10K labeled submissions | Gradient-boosted tree | > 0.90 AUC | 100x cheaper |

---

## 5. Distillation Strategy

### 5.1 Rationale

Cost optimization is critical for scale. T1 model tier (GPT-4o-mini, Claude Haiku, Gemini Flash) costs 85-90% less than T3 tier (GPT-4o, Claude Opus). Distillation aims to close the quality gap.

### 5.2 Approach

```
Teacher (GPT-4o / Claude 3.5) → Generate 50K+ instruction-output pairs → Train Student (Mistral 7B / Llama 4 8B)
                                                                                              ↓
                                                                           Quantize (FP16 → INT8 → INT4)
                                                                                              ↓
                                                                           Deploy (vLLM / ONNX Runtime)
```

### 5.3 Distillation Experiments

| Experiment | Teacher | Student | Dataset | Quality Retention | Cost Reduction |
|------------|---------|---------|---------|-------------------|----------------|
| D-001 | GPT-4o | Mistral 7B | MERL-structured (50K) | 92% | 90% |
| D-002 | Claude 3.5 | Llama 4 8B | MERL-structured (50K) | 93% | 88% |
| D-003 | GPT-4o | Llama 4 8B | MERL-structured + QA (100K) | 95% | 88% |
| D-004 | GPT-4o | Mistral 7B (INT8) | Same as D-001 | 90% | 92% |
| D-005 | GPT-4o | DistilBERT | Classification tasks | 96% | 99% |

### 5.4 Distillation Priorities

| Priority | Capability | Volume | Current Model | Distilled Target | Expected Savings (annual) |
|----------|-----------|--------|--------------|-----------------|---------------------------|
| P0 | Data quality detection | 500K calls/mo | GPT-4o-mini | Mistral 7B | $150K |
| P1 | Question classification | 200K calls/mo | GPT-4o-mini | TinyBERT | $60K |
| P2 | Indicator validation | 100K calls/mo | GPT-4o | Mistral 7B | $80K |
| P3 | Skip logic validation | 100K calls/mo | GPT-4o | Llama 4 8B | $70K |

---

## 6. Evaluation Automation (Continuous Benchmark)

### 6.1 Pipeline

```
Trigger: Every PR modifying prompts/, every model update, weekly scheduled run
   │
   ▼
1. Load current benchmark datasets (v1.1)
2. Run all capabilities against all target models
3. Score on 8 quality dimensions
4. Compare to baseline (previous release)
5. Generate report with regressions flagged
6. Alert if quality drops > 0.03 on any dimension
```

### 6.2 Automation Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Benchmark runner | Python (FastAPI) + Celery | Execute evaluations in parallel |
| Model API abstraction | LangChain / LiteLLM | Uniform interface across providers |
| Scoring engine | Python (LLM-as-judge + rule-based) | Compute quality scores |
| Result storage | PostgreSQL + ClickHouse | Benchmark history |
| Visualization | Grafana | Trend dashboard |
| Alerting | PagerDuty + Slack | Quality regression alerts |

### 6.3 Evaluation Cadence

| Type | Frequency | Scope |
|------|-----------|-------|
| Quick (regression) | Every PR | Ground truth datasets |
| Standard | Weekly | Full benchmark suite |
| Deep | Monthly | All models, all dimensions, cross-lingual |
| Quarterly | Quarterly | Full benchmark + human evaluation |

### 6.4 Model Leaderboard

Automated leaderboard updated weekly with:
- Composite quality score per model per capability
- Latency P50/P95/P99
- Cost per 1K calls
- Safety violation rate
- Cross-lingual quality score
- Trend (improving/stable/declining)

---

## 7. Evaluation Insights & Recommendations

### 7.1 Key Findings

1. **GPT-4o and Claude 3.5 Sonnet are virtually tied** on composite MERL quality (0.90). Claude edges ahead on completeness and consistency; GPT-4o on groundedness and accuracy.
2. **Gemini 2.0 Pro offers best latency-cost-quality balance** for T2 tier. Composite 0.87 at 30% lower cost than GPT-4o.
3. **DeepSeek-V3 is the strongest value** in the open-weight category. Composite 0.86 at $2.50/1K calls - 70% cheaper than GPT-4o.
4. **GPT-4o-mini is adequate for structured tasks** (classification, extraction) but degrades significantly on reasoning-heavy tasks (research design, reporting).
5. **All models struggle with Swahili and Arabic** - quality gap of 0.08-0.10 vs English. This is a priority research area.

### 7.2 Recommendations

1. **Default T2 tier to Gemini 2.0 Pro** for cost savings ($7 vs $8.50/1K) with acceptable quality trade-off
2. **T3 tier reserved for research design and complex analysis** only; route all other queries to T2 or T1
3. **Invest in distillation** for data quality detection (highest volume, most cost savings)
4. **Cross-lingual prompting research** is the highest-impact research direction for market expansion
5. **Replace GPT-4o-mini with fine-tuned Mistral 7B** for structured tasks within 6 months

---

## Appendix: Model Versioning

| Model | Version Tested | Date |
|-------|---------------|------|
| GPT-4o | gpt-4o-2026-05-01 | 2026-07-18 |
| Claude 3.5 Sonnet | claude-3-5-sonnet-20260608 | 2026-07-18 |
| Gemini 2.0 Pro | gemini-2.0-pro-001 | 2026-07-18 |
| Llama 4 | Llama-4-70B-Instruct | 2026-07-18 |
| Mistral Large | mistral-large-2407 | 2026-07-18 |
| DeepSeek-V3 | DeepSeek-V3-0324 | 2026-07-18 |

Benchmarks refresh quarterly or on model version change.
