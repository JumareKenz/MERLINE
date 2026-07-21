# Merline AI Research Portfolio

## Version: 1.0.0
## Owner: AI Research, Innovation & Advanced Intelligence Director

---

## 1. Active Research Areas

### 1.1 Multi-Agent Orchestration

**Hypothesis**: A Supervisor + Specialist agent architecture with learned routing and parallel execution will outperform monolithic LLM calls on MERL-specific quality dimensions by 15%+ while reducing cost by 30%.

**Experiments**:
| Experiment | Design | Success Criteria |
|------------|--------|------------------|
| E-001: Dynamic vs static routing | A/B test: rule-based intent classification vs fine-tuned classifier | Routing accuracy > 95%, latency reduction > 20% |
| E-002: Parallel dispatch | Compare sequential vs parallel specialist execution | Multi-agent task latency reduction > 40% |
| E-003: Agent conflict resolution | Compare weighted voting vs supervisor override for disagreeing agents | User preference for voting output > 60% |
| E-004: Context compression | Ablate context window management strategies (sliding window, priority-based, summary) | Quality preservation > 95% with 40% token reduction |

**Status**: E-001 in design; E-002/E-003 in exploration.

### 1.2 RAG Quality Optimization

**Hypothesis**: Hybrid search with cross-encoder re-ranking and adaptive chunking will achieve 90%+ citation recall for MERL knowledge base queries.

**Experiments**:
| Experiment | Design | Success Criteria |
|------------|--------|------------------|
| E-005: Chunk strategy comparison | Compare semantic, fixed-size, and section-based chunking across 5 MERL document types | Optimal chunk strategy per type identified |
| E-006: Reranker model selection | Compare BGE-reranker-v2, Cohere rerank, and cross-encoder finetuned on MERL queries | 0.05 MAP improvement over baseline |
| E-007: Multi-hop retrieval | Compare single-shot vs decomposed multi-step retrieval on complex MERL queries | Answer accuracy +15% for 3+ hop queries |
| E-008: Adaptive chunking | Learn chunk boundaries from user feedback on retrieval quality | +0.03 precision over fixed chunking |

**Status**: E-005 baseline complete; E-006 in progress.

### 1.3 Hallucination Detection in MERL Domain

**Hypothesis**: Domain-specific hallucination detection (combining citation verification, self-consistency, and factual entailment) will achieve 95%+ detection rate vs 80% for general methods.

**Experiments**:
| Experiment | Design | Success Criteria |
|------------|--------|------------------|
| E-009: MERL hallucination taxonomy | Annotate 500 AI outputs for hallucination types (fabrication, contradiction, misattribution, out-of-context) | Taxonomy with inter-rater reliability > 0.8 |
| E-010: Detection method comparison | Compare citation verification, self-consistency (N=3,5,7), NLI models, and LLM-as-judge | Best method with F1 > 0.90 |
| E-011: Calibration | Learn confidence thresholds per capability from production feedback | Calibration error < 0.05 |

**Status**: E-009 in annotation; E-010 experimental design complete.

### 1.4 Cross-Lingual MERL NLP

**Hypothesis**: Multilingual LLMs with MERL-domain few-shot examples will achieve acceptable quality (>0.80 quality score) in French, Spanish, Swahili, and Arabic without fine-tuning.

**Experiments**:
| Experiment | Design | Success Criteria |
|------------|--------|------------------|
| E-012: Language quality baseline | Evaluate 4 models (GPT-4o, Claude 3.5, Gemini 2, Llama 4) on translated MERL tasks in 4 languages | At least 2 models score >0.80 in each language |
| E-013: Few-shot translation | Compare zero-shot, English few-shot, and in-language few-shot | +0.05 quality with in-language few-shot |
| E-014: Code-switching handling | Test on naturally code-switched user inputs (e.g., English + Swahili) | Acceptable quality for 80% of code-switched queries |

**Status**: E-012 dataset construction in progress.

### 1.5 Model Distillation for Cost Efficiency

**Hypothesis**: Distilled task-specific models (T1 tier) can achieve 90%+ of GPT-4o quality on structured MERL tasks (classification, extraction, validation) at 10% of the cost.

**Experiments**:
| Experiment | Design | Success Criteria |
|------------|--------|------------------|
| E-015: Task-specific distillation | Fine-tune Llama 3 8B / Mistral 7B on 50K MERL instruction-output pairs | Quality within 5% of GPT-4o on structured tasks |
| E-016: Multi-task distillation | Distill single model for 5+ MERL capabilities (classification, extraction, validation, formatting) | 10% quality drop vs single-task models |
| E-017: On-device distillation | Quantize distilled model (INT8/INT4) for mobile deployment | Quality within 10% of FP16 at 4x size reduction |

**Status**: E-015 dataset collection in planning.

---

## 2. Research Methodology

### 2.1 Controlled Experiments

| Method | When | Procedure |
|--------|------|-----------|
| **A/B test** | Comparing two prompt versions, models, or strategies | Split traffic 50/50; min 100 samples per variant; 7-day duration |
| **Holdout test** | Measuring incremental value of new capability | Roll out to 10% of orgs; compare metrics to control group |
| **Shadow mode** | Validating AI accuracy without user impact | Run candidate in parallel; log outputs; compare to production |
| **Ablation study** | Understanding component contribution | Remove one component at a time; measure quality delta |
| **Adversarial evaluation** | Testing robustness to edge cases | Run curated adversarial dataset; measure failure rate |

### 2.2 Human Evaluation

| Method | When | Procedure |
|--------|------|-----------|
| **Expert review** | High-stakes capabilities (research design, reporting) | 2-3 MERL experts rate on 1-5 scale across 8 quality dimensions |
| **User preference test** | Comparing model/prompt variants | Users shown blind A/B pairs; select preferred; quantify preference |
| **Inter-rater reliability** | All expert evaluations | Track Cohen's Kappa; target > 0.7; retrain if < 0.6 |
| **Field validation** | Real-world accuracy assessment | Field researchers validate AI outputs against ground truth |

### 2.3 Automated Evaluation Pipeline

```
Pull Request → Lint → Evaluate (Ground Truth) → Regression Check → Gate (0.80)
                                                                              ↓
                                                                        Merge? (Yes/No)
```

- **Ground truth**: 200+ expert-validated pairs per capability
- **Regression**: 1000+ production samples per capability
- **LLM-as-judge**: GPT-4o-mini for accuracy, groundedness, completeness, consistency, safety
- **Gate**: Composite quality score ≥ 0.80 required to merge

---

## 3. Publication Strategy

### 3.1 Target Venues

| Venue | Type | Timeline | Topic |
|-------|------|----------|-------|
| **ICLR / NeurIPS** | Academic | 2027 | Multi-agent MERL orchestration |
| **ACL / EMNLP** | Academic | 2027 | Cross-lingual MERL NLP |
| **AIES (AAAI/ACM)** | Academic | 2027 | Responsible AI in development evaluation |
| **The Journal of Development Effectiveness** | Development | 2027 | AI for impact evaluation |
| **Merline Engineering Blog** | Technical | Ongoing | Model evaluation, distillation, RAG optimization |
| **Development-sector conferences (AEA, EES, IDEAS)** | Practitioner | Ongoing | AI in MERL practice |

### 3.2 Publication Pipeline

1. **Research question** identified from active research area
2. **Experiment** designed, executed, analyzed
3. **Results** written as technical report
4. **Internal review** by AI Research Lead + domain expert
5. **External submission** with appropriate venue formatting
6. **Presentation** at conference or publication in journal

**Metrics**: 2 academic publications per year; 6 technical blog posts per year; 4 conference presentations per year (target, Year 2+).

---

## 4. Collaboration Opportunities

### 4.1 Academic Partners

| Institution | Potential Collaboration | Contact Status |
|-------------|------------------------|----------------|
| **University of Oxford** (BSG / OPHI) | Causal inference for multidimensional poverty | Not yet initiated |
| **UC Berkeley** (DIL / CDSS) | Mobile data quality, offline-first ML | Not yet initiated |
| **ETH Zurich** (AI Center) | Multi-agent systems, neuro-symbolic AI | Not yet initiated |
| **University of Nairobi** (ISI) | Cross-lingual NLP for East African languages | Not yet initiated |
| **Carnegie Mellon** (HCI / SCS) | Human-AI interaction in research workflows | Not yet initiated |
| **J-PAL / IPA** | RCT evaluation methodology, field validation | Not yet initiated |

### 4.2 Research Institutions

| Institution | Area | Value |
|-------------|------|-------|
| **Alan Turing Institute** | Responsible AI, evaluation frameworks | Governance methodology |
| **MIT Media Lab** | AI for social impact | Use case validation |
| **UN University (MERIT)** | Development economics, impact evaluation | Domain expertise |
| **World Bank (DEC / IEG)** | Impact evaluation methodology, operational research | Data access, domain validation |

### 4.3 AI Labs

| Lab | Collaboration Model | Priority |
|-----|-------------------|----------|
| **OpenAI** | API access, research previews | High |
| **Anthropic** | API access, safety research | High |
| **Google DeepMind** | Model access, Gemini research | Medium |
| **Meta AI (Llama)** | Open model access, fine-tuning support | Medium |
| **Mistral AI** | Open model access, EU partnership | Medium |
| **Hugging Face** | Model hosting, community | Low |

---

## 5. Open Research Questions

### 5.1 Causal Inference in MERL

| Question | Approach | Challenge |
|----------|----------|-----------|
| Can LLMs reliably suggest causal identification strategies from program context? | Few-shot + structured prompting | Hallucination of invalid strategies |
| Can counterfactual generation improve program planning? | LLM-generated counterfactuals vs human experts | Ground truth for counterfactuals is inherently unobservable |
| Can neuro-symbolic methods combine LLM reasoning with DAG-based causal models? | Hybrid: LLM proposes causal graph, symbolic engine validates | Integration complexity |

### 5.2 Bias in Development Data

| Question | Approach | Challenge |
|----------|----------|-----------|
| What biases exist in MERL training data (geographic, linguistic, methodological)? | Audit of 10K+ annotated outputs | Annotation cost; defining ground truth |
| Does AI amplify existing biases in MERL practice? | Controlled experiment: compare AI outputs to human-only outputs | Separating AI bias from human bias |
| Can debiasing techniques reduce bias without reducing quality? | Apply counterfactual data augmentation, preference tuning | Quality-bias trade-off measurement |

### 5.3 Multilingual NLP for Low-Resource Languages

| Question | Approach | Challenge |
|----------|----------|-----------|
| How well do current LLMs perform on MERL tasks in Swahili, Hausa, Amharic? | Systematic evaluation across 10+ languages | Limited evaluation data |
| Can few-shot prompting match fine-tuning for low-resource MERL NLP? | Compare few-shot vs fine-tuned on 200 examples per language | Fine-tuning hardware cost |
| What is the quality loss for code-switched inputs? | Corpus of naturally code-switched MERL queries | Data collection |

### 5.4 Long-Context Reasoning

| Question | Approach | Challenge |
|----------|----------|-----------|
| How does long-context performance degrade for MERL tasks (50K+ token contexts)? | Systematic evaluation across context lengths | Context quality varies by task |
| Can RAPTOR or similar methods improve long-context reasoning? | Compare raw long-context vs hierarchical summarization | Implementation complexity |

### 5.5 Human-AI Collaboration

| Question | Approach | Challenge |
|----------|----------|-----------|
| What is the optimal level of AI autonomy for different MERL tasks? | User study with graduated autonomy levels | Confounding by user expertise |
| Does AI assistance improve or degrade research quality over time? | Longitudinal study of AI-assisted vs non-assisted researchers | Long time horizon; attribution |

---

## 6. Research Governance

| Process | Frequency | Owner |
|---------|-----------|-------|
| Research hypothesis review | Monthly | AI Research Lead |
| Experiment results review | Bi-weekly | AI Research Lead + AI Systems Architect |
| Publication pipeline review | Quarterly | AI Research Lead + Product Manager |
| Collaboration portfolio review | Quarterly | AI Research Lead + CEO |
| Open research questions prioritization | Semi-annual | AI Research Lead + Product Council |

---

## 7. Research Budget

| Category | Year 1 | Year 2 |
|----------|--------|--------|
| Compute (experimentation) | $150K | $300K |
| Expert annotation | $80K | $120K |
| Academic collaborations | $50K | $100K |
| Conference attendance | $30K | $50K |
| Data acquisition | $20K | $40K |
| **Total** | **$330K** | **$610K** |

---

Research without measurement is speculation. Every line of this portfolio is a hypothesis until validated by evidence.
