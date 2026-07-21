# MERL Standards Reference

## 1. SMART Indicator Criteria

Every indicator in the platform MUST satisfy the SMART criteria. These are non-negotiable for any approved indicator.

| Criterion | Description | Checklist Questions |
|-----------|-------------|---------------------|
| **S**pecific | Clearly defines what is being measured, who is being measured, and where | Is the indicator unambiguous? Does it avoid vague terms? Does it specify the target population? |
| **M**easurable | Quantifiable or qualifiable with a clear data source | Can this be counted, observed, or assessed? Is there a reliable method to measure it? |
| **A**chievable | Realistic given available resources, time, and capacity | Can data be collected with current budget/staff/time? Is the target feasible? |
| **R**elevant | Directly linked to the objective, outcome, or decision it supports | Does this indicator measure something meaningful for the program/study? Does it inform a decision? |
| **T**ime-bound | Has a clear timeframe for measurement | Is frequency specified? Are baseline and target dates defined? |

### SMART Failure Examples

| Failure | Example | Fix |
|---------|---------|-----|
| Not specific | "Improved health" | "Percentage of children under 5 with complete vaccination coverage" |
| Not measurable | "Community empowerment" | "Percentage of community members who can name ≥3 rights" (or qualitative assessment with defined criteria) |
| Not achievable | "100% of households have access to clean water within 6 months" | Adjust to realistic target (e.g., 60%) or timeline |
| Not relevant | Tracking mobile phone ownership for a nutrition program | Remove or reclassify as context data |
| Not time-bound | "Reduced poverty" | "Poverty rate reduced from 45% to 35% by December 2026" |

---

## 2. OECD DAC Evaluation Criteria

The platform must support all six OECD DAC criteria for evaluation. These are the international standard for development evaluation.

### 2.1 Relevance

**Definition:** The extent to which the intervention's objectives and design respond to beneficiaries' needs, global/national priorities, and partners' policies.

**Key Questions:**
- Is the intervention addressing the right needs?
- Are the objectives aligned with national and international priorities?
- Has the design been adapted to the context?
- Were target groups appropriately identified?

**Evidence Sources:** Needs assessments, stakeholder consultations, policy documents, theory of change.

### 2.2 Coherence

**Definition:** The compatibility of the intervention with other interventions in a country, sector, or institution.

**Key Questions:**
- Does the intervention complement or duplicate other work?
- Is it consistent with international standards and norms?
- Are there synergies with other interventions?

**Evidence Sources:** Stakeholder mapping, intervention inventory, coordination meeting minutes.

### 2.3 Effectiveness

**Definition:** The extent to which the intervention achieved its objectives and results.

**Key Questions:**
- Did the intervention achieve its intended outputs and outcomes?
- What factors contributed to or hindered achievement?
- Were there any unintended effects (positive or negative)?

**Evidence Sources:** Indicator data, outcome monitoring, beneficiary feedback, quality assessments.

### 2.4 Efficiency

**Definition:** The extent to which the intervention delivered results in an economical and timely manner.

**Key Questions:**
- Were resources used optimally?
- Could results have been achieved with fewer resources?
- Was the timeline appropriate?
- What was the cost-effectiveness?

**Evidence Sources:** Budget vs. expenditure, cost analysis, time tracking, value-for-money analysis.

### 2.5 Impact

**Definition:** The extent to which the intervention generated significant positive or negative, intended or unintended, higher-level effects.

**Key Questions:**
- What real difference has the intervention made?
- Are changes attributable to the intervention?
- Were there any negative consequences?
- Are changes sustainable?

**Evidence Sources:** Impact evaluation, longitudinal data, comparison groups, qualitative inquiry.

### 2.6 Sustainability

**Definition:** The extent to which the benefits of the intervention are likely to continue after donor funding ceases.

**Key Questions:**
- Will results continue after project ends?
- Are local systems and capacity in place to maintain benefits?
- Are there financial, institutional, and social mechanisms for continuation?

**Evidence Sources:** Exit strategy, capacity assessment, stakeholder commitment, financial projections.

---

## 3. Sampling Methodology Decision Tree

### Quantitative Sampling

```
Is a complete sampling frame available?
├── YES ──→ Can probability sampling be used?
│           ├── YES ──→ Population homogeneous?
│           │           ├── YES ──→ Simple Random Sampling (SRS)
│           │           └── NO ───→ Important subgroups to compare?
│           │                      ├── YES ──→ Stratified Random Sampling
│           │                      └── NO ───→ Systematic Sampling
│           └── NO ───→ Population widely dispersed?
│                       ├── YES ──→ Multi-stage Cluster Sampling
│                       │           └── Units within clusters homogeneous?
│                       │               ├── YES ──→ Equal cluster size → PPS Sampling
│                       │               └── NO ───→ Design effect adjustment needed
│                       └── NO ───→ Consider census or revisit frame availability
└── NO ────→ Can a sampling frame be constructed within budget?
             ├── YES ──→ Construct frame, then probability sampling
             └── NO ───→ Is the research question descriptive or analytical?
                         ├── Descriptive → Consider Quota Sampling (non-probability)
                         └── Analytical → Consider Purposive Sampling
                                          └── For hard-to-reach populations → Snowball Sampling
```

### Qualitative Sampling

```
What is the research purpose?
├── Theory building / exploration → Theoretical Sampling
│                                    (select cases based on emerging theory)
├── Rich, detailed understanding → Purposive Sampling
│   ├── Maximum variation (wide range of experiences)
│   ├── Extreme/deviant case (unusual outcomes)
│   ├── Typical case (illustrates typical experience)
│   ├── Critical case (if it happens here, it happens everywhere)
│   ├── Criterion-based (all cases meeting criteria)
│   └── Snowball (participants refer others)
├── Practical constraints dominate → Convenience Sampling
│                                    (clearly label limitations)
└── Hard-to-reach / hidden populations → Respondent-Driven Sampling (RDS)
```

### Sample Size Determination

#### For Descriptive Studies (Proportion)

```
n = (Z² × p × (1-p)) / e²

Where:
  Z = Z-score for confidence level (1.96 for 95%)
  p = estimated proportion (0.5 if unknown)
  e = margin of error (0.05 = ±5%)

With finite population correction:
  n_adj = n / (1 + (n-1)/N)
  
  Where N = population size
```

#### For Cluster Designs

```
n_eff = n × DEFF

Where:
  DEFF = 1 + (m-1) × ICC
  m = average cluster size
  ICC = intra-cluster correlation coefficient (typically 0.01-0.05 for health, 0.1-0.3 for education)
```

#### For Hypothesis Testing

```
n = f(α, β, effect_size, design)

Common defaults:
  α (Type I error) = 0.05
  β (Type II error) = 0.20 (power = 0.80)
  Two-tailed test unless justified
```

### Sampling Rules

| Rule | Description |
|------|-------------|
| Non-response adjustment | Oversample by expected non-response rate: n_final = n / (1 - expected_nonresponse) |
| Minimum cell size | For subgroup analysis, each stratum cell should have n ≥ 30 (Central Limit Theorem) |
| Design effect reporting | Always report DEFF and ICC for cluster designs |
| Sampling weight calculation | Weight = 1 / selection_probability, then post-stratify if needed |
| Finite population correction | Apply when sample > 10% of population |
| Randomization validation | Verify with balance tests on known covariates |

---

## 4. Data Quality Assurance Framework

### 4.1 Quality Dimensions

| Dimension | Definition | Assessment Method |
|-----------|-------------|-------------------|
| Completeness | All required data points are present | % of missing values; per-question, per-submission, per-enumerator |
| Accuracy | Data reflects the true value | Back-checks, validation against known values, double-entry verification |
| Consistency | Values across questions/records are logically coherent | Cross-field validation, temporal sequencing, logical rules |
| Validity | Data conforms to defined format, range, and type | Type checks, range checks, pattern validation |
| Timeliness | Data collected within required timeframe | Collection date vs. required period, submission lag analysis |
| Reliability | Same measurement yields same result on repetition | Test-retest, inter-rater reliability, enumerator consistency |
| Uniqueness | No duplicate records | Fingerprinting, deduplication algorithms |
| Representativeness | Sample reflects target population | Comparison to population parameters, non-response bias analysis |

### 4.2 Quality Assurance Levels

| Level | Scope | Frequency | Responsibility |
|-------|-------|-----------|----------------|
| L1 - Field | Per submission, real-time | Each submission | Automated system |
| L2 - Supervisory | Per enumerator, daily | Daily | Field Supervisor |
| L3 - Central | Full dataset, periodic | Weekly during collection | Data Manager |
| L4 - Audit | Full study, independent | At study closure | QA Officer |

### 4.3 Quality Thresholds

| Metric | Acceptable | Warning | Critical |
|--------|------------|---------|----------|
| Completeness (required questions) | ≥98% | 95-98% | <95% |
| GPS within study area | ≥95% | 90-95% | <90% |
| Duration within expected range | ≥90% | 80-90% | <80% |
| Duplicate submissions | 0% | <1% | ≥1% |
| Outlier rate | <2% | 2-5% | >5% |
| Enumerator variance (by key indicators) | Not significant | p<0.05 | p<0.01 |
| Back-check agreement rate | ≥95% | 90-95% | <90% |

### 4.4 Common Data Quality Issues and Detection

| Issue | Detection Method | Severity |
|-------|-----------------|----------|
| Fabricated data | Duration anomaly, GPS anomaly, pattern analysis (Benford's Law) | Critical |
| Straight-lining | Same response pattern across questions | High |
| Duplicate submissions | Fingerprint matching, GPS+time proximity | Critical |
| Out-of-range values | Range validation rules | Medium |
| Illogical combinations | Cross-field validation (e.g., male + pregnant) | High |
| GPS drift | Implausible speed between points | Low |
| Missing data patterns | Missingness analysis (MCAR/MAR/MNAR) | Varies |
| Enumerator bias | Mixed-effects model with enumerator random effect | High |
| Interviewer cheating | Audio audit, GPS track verification | Critical |

---

## 5. Research Ethics Framework

### 5.1 Core Ethical Principles

| Principle | Description | Implementation |
|-----------|-------------|----------------|
| Respect for persons | Autonomy of individuals; protection of those with diminished autonomy | Informed consent, right to withdraw, special protections for vulnerable groups |
| Beneficence | Maximize benefits, minimize harms | Risk assessment, benefit analysis, data security |
| Justice | Fair distribution of burdens and benefits | Equitable participant selection, inclusion criteria |
| Non-maleficence | Do no harm | Harm assessment, referral pathways, distress protocols |

### 5.2 Informed Consent Requirements

| Element | Required | Details |
|---------|----------|---------|
| Information disclosure | Yes | Purpose, procedures, risks, benefits, confidentiality, voluntary participation, right to withdraw |
| Comprehension | Yes | Language appropriate, literacy-appropriate, opportunity to ask questions |
| Voluntariness | Yes | No coercion, no undue inducement, adequate time to decide |
| Documentation | Yes | Written consent preferred; verbal consent (witnessed) for low literacy |
| Assent | Conditional | Child participants: parental consent + child assent (age-appropriate) |
| Community consent | Conditional | For community-based research: gatekeeper consent + individual consent |
| Re-consent | Conditional | If protocol changes or new risks identified |
| Withdrawal | Yes | Participant can withdraw at any time without penalty; data handling after withdrawal must be specified |

### 5.3 Vulnerable Groups

| Group | Additional Protections |
|-------|----------------------|
| Children (<18) | Parental/guardian consent + child assent; child protection protocol |
| Pregnant women | Risk assessment for mother and fetus |
| Prisoners | Independent advocate; no undue inducement |
| Persons with mental disabilities | Capacity assessment; legal guardian consent |
| Refugees / displaced persons | Trauma-informed approaches; no impact on services |
| Ethnic minorities | Cultural sensitivity; community engagement |
| People living with HIV / stigmatized groups | Enhanced confidentiality; referral pathways |

### 5.4 Confidentiality and Privacy

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| Data encryption | AES-256 at rest, TLS 1.3 in transit | All PII encrypted |
| De-identification | Remove direct identifiers; use study IDs | Separate identifying data from response data |
| Data access | Role-based, minimum necessary | Granular permissions |
| Data sharing | Consent-specific | Only share with explicit consent |
| Data retention | Specified in consent; regulatory minimum (5-7 years) | Automated purging |
| Breach notification | Within 72 hours (per GDPR) | Incident response plan |

### 5.5 Ethics Review

| Step | Description |
|------|-------------|
| Institutional Review Board (IRB) / Ethics Committee | Independent review of research protocol |
| Expedited review | For minimal risk studies |
| Full board review | For more than minimal risk |
| Exempt status | Certain types may be exempt (check local regulations) |
| Continuing review | For studies lasting >1 year |

### 5.6 Ethical Violations

| Violation | Response |
|-----------|----------|
| No informed consent | Halt data collection; review and remediate; potential data exclusion |
| Breach of confidentiality | Incident response; notification; impact assessment |
| Fabrication / falsification | Investigation; retraction; personnel action |
| Harm to participant | Immediate care; reporting; protocol change |
| Conflict of interest | Disclosure; recusal; independent oversight |

---

## 6. Donor Compliance Requirements

### 6.1 USAID (ADS 201)

| Requirement | Description |
|-------------|-------------|
| Results Framework | Required; links strategic objectives to intermediate results |
| Standard Indicators | PEF (Performance Indicator Framework), F Indicators, Custom Indicators |
| PMP (Performance Management Plan) | Required; defines indicators, data sources, frequency, and responsibilities |
| Evaluation | Required for all projects >$10M; independent evaluation every 5 years |
| Data Quality Assessment (DQA) | Required for all reported indicators; validity, reliability, timeliness, precision, integrity |
| CLA (Collaborating, Learning, Adapting) | Evidence-based adaptive management |
| Gender | Required integration; gender analysis; indicator disaggregation |
| Environmental Compliance | IEE (Initial Environmental Examination) for all activities |
| Reporting | Annual PPR (Performance Progress Report); quarterly if required |
| Open Data | Data must be publicly accessible (USAID Development Data Library) |

### 6.2 European Union (EU)

| Requirement | Description |
|-------------|-------------|
| Logical Framework | Required; intervention logic with OVI (Objectively Verifiable Indicators) |
| ROM (Results-Oriented Monitoring) | Systematic monitoring system |
| Evaluation | Required at mid-term and final; independent |
| RBM | Results-Based Management approach mandatory |
| Gender | Gender analysis and gender-sensitive indicators required |
| Human Rights | Human Rights-Based Approach (HRBA) integration |
| Environmental | Strategic Environmental Assessment (SEA) if applicable |
| Reporting | Annual and final reports; specific donor templates |

### 6.3 United Nations (UN Agencies)

| Requirement | Description |
|-------------|-------------|
| Results Framework | Required; aligned with UNSDCF (UN Sustainable Development Cooperation Framework) |
| Theory of Change | Increasingly required in programming |
| Indicators | Standard UN indicators + program-specific |
| Evaluation | Required every 5-7 years for programs; independent |
| HACT (Harmonized Approach to Cash Transfers) | Micro-assessment, programmatic visits, audits |
| Gender | UN-SWAP (System-wide Action Plan) gender equality standards |
| Human Rights | Mainstreaming required |
| Reporting | Standard UN reporting templates |

### 6.4 World Bank

| Requirement | Description |
|-------------|-------------|
| Results Framework | Required; PDO (Project Development Objective) level indicators |
| PforR (Program for Results) | Results-based disbursement |
| IEG (Independent Evaluation Group) | Independent evaluation |
| M&E Capacity Assessment | Required for implementing agencies |
| Safeguards | Environmental and social safeguards (now ESS framework) |
| Reporting | Implementation Status and Results (ISR) reports |
| Impact Evaluation | Required for selected projects; must be methodologically rigorous |

### 6.5 FCDO (formerly DFID)

| Requirement | Description |
|-------------|-------------|
| Theory of Change | Required; detailed causal pathways |
| LogFrame | Required with indicators, means of verification, risks |
| Business Case | Required before funding |
| Annual Review | Required yearly; independent |
| Project Completion Report | Required at end |
| VfM (Value for Money) | Economy, Efficiency, Effectiveness, Equity, Cost-effectiveness |
| Gender | Gender analysis and transformative approaches |
| Active Learning | Learning questions; adaptive management |

### 6.6 Global Fund

| Requirement | Description |
|-------------|-------------|
| Performance Framework | Required; linked to grant funding |
| Modular Framework | Standardized module-indicator mapping |
| PU/DR (Progress Update / Disbursement Request) | Semi-annual reporting |
| LFA (Local Fund Agent) | Independent verification |
| Data Quality | Data Quality Audits and Data Quality Reviews required |
| RSSH | Resilient and Sustainable Systems for Health integration |

---

## 7. Sustainable Development Goals (SDGs) Framework

| Element | Description |
|---------|-------------|
| 17 Goals | 169 targets, 231 unique indicators |
| Tier classification | Tier I (methodology exists, data regularly produced), Tier II (methodology exists, data not regularly produced), Tier III (no internationally established methodology) |
| Data disaggregation | Required: income, gender, age, race, ethnicity, migratory status, disability, geographic location |
| Principle | Leave No One Behind (LNOB) |
| Reporting | Voluntary National Reviews (VNRs) |
| Platform alignment | Map project indicators to SDG indicators; auto-tag disaggregation requirements |

---

## 8. Validation Rules and Constraints

### 8.1 By Question Type

| Type | Validation Rules |
|------|------------------|
| SINGLE_SELECT | Value must be in option list; cannot be null if required |
| MULTIPLE_SELECT | All values must be in option list; max/min selections enforced |
| DROPDOWN | Same as SINGLE_SELECT |
| TEXT_SHORT | maxLength ≤ 255; regex if pattern required (email, phone, national ID) |
| TEXT_LONG | maxLength ≤ 10000; minLength if required |
| NUMERIC_INT | Whole number only; minValue ≤ value ≤ maxValue |
| NUMERIC_DECIMAL | decimalPlaces max; precision check; min ≤ value ≤ max |
| PERCENTAGE | 0 ≤ value ≤ 100; up to 2 decimal places |
| DATE | ISO 8601 (YYYY-MM-DD); must be within study period; date logic (end ≥ start) |
| TIME | HH:MM:SS in 24-hour format |
| DATETIME | ISO 8601 combined; cannot be in future if collecting past events |
| GPS | Valid lat (-90 to 90), lon (-180 to 180); accuracy ≤ threshold; altitude valid; within geofence |
| PHOTO | File format (JPEG, PNG); max size (e.g., 10MB); min resolution; metadata preserved |
| VIDEO | Format (MP4); max size (e.g., 100MB); duration limits |
| AUDIO | Format (MP3, WAV, M4A); max size; duration limits |
| SIGNATURE | Required format (PNG); capture timestamp |
| BARCODE | Valid barcode/QR format; checksum validation |
| RANKING | All options ranked exactly once; no ties |
| LIKERT | Value in defined scale; single dimension per item |
| SLIDER | min ≤ value ≤ max; step size respected |
| MATRIX | All sub-questions answered per defined type |

### 8.2 Cross-field Validation Rules

| Rule Type | Example | Implementation |
|-----------|---------|----------------|
| Consistency | Age and date of birth must be consistent | computed_age ±1 year of reported age |
| Logical dependency | If sex = male, skip pregnancy questions | Skip logic |
| Temporal ordering | Date of event must precede date of interview | date_event < date_interview |
| Geographic | Region selected must match GPS coordinate | Lookup table of region bounds |
| Mathematical | Sub-totals must sum to total | Calculated field validation |
| Completeness chain | If Q5 = Yes, Q5a, Q5b, Q5c required | Conditional requirement |

### 8.3 System-level Validation

| Rule | Description |
|------|-------------|
| Idempotency | submissionId must be unique; duplicate is rejected, not re-processed |
| Immutability | Submitted submissions cannot be modified; only voided |
| Version compliance | Submission formVersion must match published questionnaire version |
| Integrity | Media files must match SHA-256 hash |
| Temporal integrity | completedAt ≥ startedAt; submission cannot predate questionnaire publish date |

---

## 9. Standard Report Structures

### 9.1 Technical Report

```
1. Executive Summary
2. Introduction
   2.1 Background
   2.2 Study Objectives
   2.3 Research Questions
3. Methodology
   3.1 Study Design
   3.2 Study Area/Population
   3.3 Sampling Strategy
   3.4 Data Collection Methods
   3.5 Data Quality Assurance
   3.6 Data Analysis Methods
   3.7 Ethical Considerations
   3.8 Limitations
4. Findings
   4.1 Respondent Characteristics
   4.2 [Finding by Objective/Theme]
   4.3 [Additional Findings]
5. Discussion
6. Conclusions
7. Recommendations
8. References
Annexes:
   A. Data Collection Instruments
   B. Indicator Definitions
   C. Detailed Tables
   D. Ethical Approval
   E. Terms of Reference
```

### 9.2 Evaluation Report (per UNEG/OECD DAC)

```
1. Executive Summary
2. Introduction and Background
3. Evaluation Purpose and Scope
4. Methodology (with limitations)
5. Findings by OECD DAC Criteria
   5.1 Relevance
   5.2 Coherence
   5.3 Effectiveness
   5.4 Efficiency
   5.5 Impact
   5.6 Sustainability
6. Cross-cutting Issues (Gender, Human Rights, Environment)
7. Conclusions
8. Lessons Learned
9. Recommendations (with management response)
Annexes
```

### 9.3 Donor Report (USAID PPR template)

```
1. Executive Summary
2. Program Context and Status
3. Progress by Intermediate Result
   3.1 IR1: [Title]
   3.2 IR2: [Title]
4. Performance Indicator Tracking Table (PITT)
5. Challenges and Lessons Learned
6. Management and Administration
7. Financial Summary
8. Plans for Next Quarter
Annexes
```

### 9.4 Policy Brief

```
1. Key Message (1-2 sentences)
2. The Problem (250 words)
3. Key Findings (500 words, bullet points + evidence)
4. Implications (250 words)
5. Recommendations (3-5, actionable)
6. References and Further Reading
7. About the Study (box)
```

---

## 10. Cross-cutting Standards Rules

| Standard | Rule |
|----------|------|
| Reproducibility | All analysis must be scriptable and auditable |
| Transparency | All methodological decisions must be documented with rationale |
| Inclusivity | Studies must consider gender, equity, and human rights |
| Do no harm | Participant welfare always takes precedence over data collection |
| Data sovereignty | Data belongs to the country/population; sharing agreements required |
| Local capacity | Involve local researchers; build local M&E capacity |
| Value for money | Cost-effectiveness always considered in methodology choice |
