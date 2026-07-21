# Merline AI Governance Evolution

## Version: 1.0.0
## Owner: AI Research, Innovation & Advanced Intelligence Director

---

## 1. Governance Philosophy

AI governance at Merline is not a compliance burden — it is the foundation of user trust. Every AI capability must be explainable, auditable, and controllable.

**Principle**: Trust is earned through transparency, verified through audit, and maintained through continuous improvement.

---

## 2. Current State Assessment

### 2.1 Governance Capabilities Already in Place

| Capability | Implementation | Maturity |
|------------|---------------|----------|
| **Input guardrails** | PII redaction, injection detection, content policy check | Production |
| **Output guardrails** | Safety check, PII leak detection, hallucination detection, format validation | Production |
| **Human review** | 5-level review matrix (auto-accept → block); per-capability review requirements | Production |
| **Audit logging** | Every inference logged with full context; 90-day retention | Production |
| **Model routing** | Cost-optimized with security constraints | Production |
| **Prompt versioning** | Semantic versioning; shadow/canary/full deployment | Production |
| **Tenant isolation** | Schema-per-tenant; RLS on vector store | Production |
| **PII filtering** | Multi-method (regex + NER) pre-AI | Production |

### 2.2 Current Gaps

| Gap | Risk | Priority |
|-----|------|----------|
| No automated bias detection | Fairness risk | High |
| No fairness monitoring | Equity risk | High |
| No explainability dashboards | Transparency gap | Medium |
| No AI ethics board | Governance gap | Medium |
| No external audit | Credibility gap | Medium |
| No model cards | Transparency gap | Low |
| No continuous risk assessment | Proactive governance gap | Medium |
| No responsible AI metrics | Accountability gap | Medium |

---

## 3. Next Phase: Automated Bias Detection, Fairness, Explainability (6-12 Months)

### 3.1 Automated Bias Detection

| Capability | Description | Technical Approach |
|------------|-------------|-------------------|
| **Demographic bias scan** | Detect systematic quality differences across demographic groups | Stratified quality scoring by group membership (if available) |
| **Language bias detection** | Quality differences across languages | Cross-lingual quality benchmark, monthly |
| **Geographic bias detection** | Quality differences across regions | Stratified quality scoring by geography |
| **Methodological bias detection** | Systematic preference for specific methodologies | Method distribution analysis vs expected distribution |
| **Data source bias** | Over-reliance on specific sources | Source diversity scoring for RAG responses |

**Implementation**: Automated bias report generated monthly. Flagged if any group shows > 0.05 quality score difference.

### 3.2 Fairness Monitoring

| Metric | Definition | Alert Threshold |
|--------|------------|-----------------|
| **Quality parity** | Max quality score difference between groups | > 0.05 |
| **Acceptance parity** | Max acceptance rate difference between groups | > 0.10 |
| **Error rate parity** | Max error rate difference between groups | > 0.02 |
| **Satisfaction parity** | Max satisfaction difference between groups | > 0.5 (1-5 scale) |

**Remediation triggers**:
- Threshold breached → Investigation → Root cause analysis
- Root cause identified → Model/prompt adjustment → Re-evaluation
- No root cause → Enhanced monitoring + manual review

### 3.3 Explainability Dashboards

| Dashboard | Audience | Content |
|-----------|----------|---------|
| **AI Decision Explorer** | Researchers | For any AI output: show reasoning chain, key evidence, confidence decomposition |
| **Model Behavior Dashboard** | AI team | Per-model quality metrics, bias reports, outlier analysis |
| **Tenant AI Governance Dashboard** | Org admin | Feature usage, quality trends, guardrail activity, cost |
| **Safety & Compliance Dashboard** | Security team | Guardrail triggers, PII incidents, injection attempts, review queue |

### 3.4 Model Cards

Every model in production has a model card:

```yaml
model_name: gpt-4o
provider: OpenAI
version: gpt-4o-2026-05-01
tier: T2 (Reasoning)

intended_use: Research design, survey design, indicator generation, report writing
out_of_scope: Medical diagnosis, legal advice, financial decisions

evaluation:
  composite_score: 0.90 (MERL benchmarks v1.1)
  accuracy: 0.92
  groundedness: 0.91
  safety: 0.98

known_limitations:
  - Degrades on low-resource languages (Swahili: -0.10)
  - May suggest overly complex designs for simple interventions
  - Can hallucinate citations without RAG grounding

risk_assessment:
  fairness: Pass (no significant bias detected)
  safety: Pass (99.8% safe output rate)
  robustness: Moderate (struggles with highly adversarial inputs)

deployment:
  strategy: Multi-provider fallback
  fallback: Claude 3.5 Sonnet → Llama 4 (self-hosted)
  status: Active
```

### 3.5 Faithfulness & Factuality Scoring

Per-output factuality check:
- **Claim extraction**: Decompose output into atomic claims
- **Claim verification**: Each claim checked against RAG sources
- **Scoring**: % of claims supported by evidence
- **Threshold**: < 80% supported claims → flag for review

---

## 4. Future Phase: AI Ethics Board, External Audit, Compliance Automation (12-24 Months)

### 4.1 AI Ethics Board

| Element | Design |
|---------|--------|
| **Members** | AI Research Lead, Security Architect, Privacy Officer, External Ethics Advisor, Customer Representative |
| **Meetings** | Quarterly (regular) + On-demand (incidents) |
| **Scope** | High-risk AI features, fairness incidents, governance policy changes |
| **Authority** | Can block deployment of any AI feature |
| **Charter** | Published on trust portal |

### 4.2 External AI Audit

| Audit Type | Frequency | Standard | Auditor |
|------------|-----------|----------|---------|
| **SOC 2 (Type II)** | Annual | SOC 2 Security + Availability + Confidentiality | Licensed CPA firm |
| **AI Ethics Audit** | Bi-annual | Responsible AI Institute / NIST AI RMF | External AI ethics auditor |
| **Bias Audit** | Annual | EEOC / NIST fairness metrics | External auditor |
| **Privacy Impact Assessment** | Annual | GDPR / DPA | Privacy professional |

### 4.3 Regulatory Compliance Automation

| Regulation | Automation | Implementation |
|------------|-----------|----------------|
| **EU AI Act** | Risk classification, documentation, conformity assessment | Automated risk level calculator; AI system documentation generator |
| **GDPR / DPDP Act** | Consent tracking, data portability, right to erasure | Automated consent management; data subject request workflow |
| **IRB / Ethics compliance** | Protocol review workflow, consent documentation | Integrated IRB workflow; consent document AI extraction |
| **Donor compliance (USAID ADS 201, EU RBM)** | Indicator reporting formats, DQA documentation | Automated report generation with donor templates |

### 4.4 Compliance Automation Architecture

```
Regulatory Requirements → Compliance Engine → Automated Checks
                              ↓
                     Non-compliance detected?
                              ↓
                   ├── Yes → Alert compliance team + block feature
                   └── No → Log compliance
```

---

## 5. Continuous AI Risk Assessment

### 5.1 Risk Categories

| Category | Examples | Assessment Frequency |
|----------|----------|---------------------|
| **Fairness** | Demographic bias, geographic bias | Monthly |
| **Safety** | Harmful content, PII leakage, injection success | Real-time + weekly |
| **Reliability** | Quality degradation, hallucination spikes | Real-time + daily |
| **Transparency** | Unexplainable decisions, hidden model updates | Per deployment |
| **Accountability** | Unclear ownership, absent audit trail | Quarterly |
| **Robustness** | Adversarial vulnerability, edge case failures | Per capability update |

### 5.2 Risk Scoring

```
Risk Score = Likelihood × Impact

Likelihood (1-5):
  1: Rare (once per year or less)
  2: Unlikely (once per quarter)
  3: Possible (once per month)
  4: Likely (once per week)
  5: Almost certain (daily)

Impact (1-5):
  1: Negligible (no user impact)
  2: Minor (single user inconvenience)
  3: Moderate (multiple users affected, workaround available)
  4: Major (systematic issue, regulatory concern)
  5: Critical (safety incident, data breach, regulatory fine)

Risk Level:
  1-6: Low → Accept; monitor
  7-12: Medium → Mitigate; monitor
  13-19: High → Active mitigation required
  20-25: Critical → Immediate action required
```

### 5.3 Risk Register

| Risk ID | Description | Likelihood | Impact | Risk Level | Mitigation | Owner |
|---------|-------------|-----------|--------|------------|------------|-------|
| R-001 | PII leakage in AI output | 2 | 5 | 10 (Medium) | PII redaction, output guardrails, audit logging | Security |
| R-002 | Demographic bias in recommendations | 3 | 3 | 9 (Medium) | Bias detection, fairness monitoring, diverse evaluation data | AI Research |
| R-003 | Hallucination leading to incorrect decisions | 3 | 4 | 12 (Medium) | Citation verification, human review, confidence scoring | AI Research |
| R-004 | Model provider data breach | 1 | 5 | 5 (Low) | Multi-provider strategy, local model option, data minimization | Security |
| R-005 | Cross-tenant data leakage via RAG | 1 | 5 | 5 (Low) | Tenant isolation, RLS, schema-per-tenant | Security |
| R-006 | Successful prompt injection | 3 | 4 | 12 (Medium) | Multi-layer defense, injection detection, output guardrails | Security |
| R-007 | Cost exhaustion attack | 4 | 3 | 12 (Medium) | Per-tenant budgets, rate limits, anomaly detection | DevOps |
| R-008 | Agent autonomy exceeds human control | 2 | 4 | 8 (Medium) | Autonomy levels, kill switch, approval gates | AI Research |

---

## 6. Responsible AI Metrics & Reporting

### 6.1 Public Trust Report (Quarterly)

A publicly accessible report covering:

| Metric | Description | Target |
|--------|-------------|--------|
| AI output count | Total AI outputs generated | Trend |
| Satisfaction rate | Thumbs up / (up + down) | > 85% |
| Human review rate | % of outputs requiring human review | < 30% |
| Edit rate | % of AI outputs edited before acceptance | < 25% |
| Safety incident rate | % of outputs triggering safety guardrails | < 0.1% |
| PII leakage incidents | Count of PII leaked in outputs | 0 |
| Bias incidents | Count of bias-related incidents | 0 |
| Average quality score | Composite across all capabilities | > 0.85 |
| Guardrail accuracy | % of guardrail decisions correct | > 99% |
| Time to human review | Average time for flagged outputs | < 24h |

### 6.2 Automated Governance Report

Generated monthly for the AI governance team:

```
TOP RISKS THIS MONTH:
1. Quality score for T1 Swahili queries: 0.76 (target: 0.80)
   → Action: Prioritize cross-lingual prompt research
   
2. Satisfaction rate for Data Quality Agent: 78% (target: 85%)
   → Action: Review false positives; adjust flagging thresholds

3. Bias scan: No significant demographic bias detected
   → Continue monitoring

COMPLIANCE STATUS:
  - SOC 2: In scope (external audit scheduled Q1 2027)
  - GDPR: Compliant (no incidents)
  - IRB: Active (3 studies under IRB review)
  
MODEL STATUS:
  - All models passing quality gate
  - GPT-4o-mini quality degradation detected: -0.02 (investigating)
```

---

## 7. Governance Evolution Roadmap

| Phase | Timeline | Capabilities | Dependencies |
|-------|----------|-------------|--------------|
| **Phase 0** (Current) | Now | Guardrails, human review, audit logging, model routing, prompt versioning | None |
| **Phase 1** | Q3-Q4 2026 | Automated bias detection, fairness monitoring, explainability dashboards | Analytics pipeline, CI/CD |
| **Phase 2** | Q1-Q2 2027 | Model cards, faithfulness scoring, AI ethics board formation | Phase 1 complete |
| **Phase 3** | Q3-Q4 2027 | External audit readiness, regulatory compliance automation | Phase 2 complete, auditor engagement |
| **Phase 4** | H1 2028 | Continuous risk assessment, responsible AI dashboards | All earlier phases |
| **Phase 5** | H2 2028 | Public trust report, automated compliance, full governance automation | Mature governance infrastructure |

---

## 8. Success Criteria

| Milestone | Target |
|-----------|--------|
| Zero PII leakage incidents in production | Ongoing |
| Safety incident rate < 0.1% of all AI outputs | Ongoing |
| Bias detection coverage: 100% of capabilities | Phase 1 |
| Fairness monitoring: all demographic groups within 0.05 quality score | Phase 1 |
| External AI audit completed without findings | Phase 3 |
| AI ethics board operational with published charter | Phase 2 |
| Regulatory compliance automated for EU AI Act, GDPR, IRB | Phase 3 |
| Public trust report published quarterly | Phase 5 |

---

## 9. Open Questions

1. **Bias detection without demographic data**: How to detect bias when user demographic data is unavailable (privacy by design)?
2. **Explainability for non-experts**: How to make AI reasoning transparent to field researchers without ML training?
3. **Automated compliance vs human judgment**: When should compliance automation overrule human decisions?
4. **Third-party AI audit standards**: What standards exist for AI audit in the development sector?
5. **Governance at speed**: How to maintain governance rigor without slowing AI iteration velocity?

---

**Governance is not the enemy of innovation. It is the foundation that makes innovation trustworthy.**
