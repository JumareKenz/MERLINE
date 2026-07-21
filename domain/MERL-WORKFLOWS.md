# MERL Workflows

## Workflow Catalogue

This document defines all core MERL workflows that the platform must support. Each workflow specifies triggers, actors, steps, decision points, expected outputs, quality checks, and common failure modes.

---

## 1. Full Study Lifecycle

### Overview
The end-to-end journey of a study from initial concept through to learning and archiving.

### Workflow Map

```
Concept → Design → Review → Approval → Pre-test → Field Setup
→ Data Collection → Data Quality → Analysis → Reporting
→ Dissemination → Learning → Archive
```

### Phase 1: Concept (1–2 weeks)

| Element | Description |
|---------|-------------|
| **Trigger** | Research need identified (donor requirement, program decision, knowledge gap) |
| **Actors** | Research Director, Principal Investigator |
| **Steps** | 1. Identify research problem<br>2. Conduct literature / evidence scan<br>3. Define study purpose and rationale<br>4. Draft concept note (1-3 pages)<br>5. Estimate budget and timeline<br>6. Submit for internal clearance |
| **Decision Points** | Go/No-go decision based on: scientific merit, ethical soundness, budget feasibility, timeline realism |
| **Expected Output** | Approved concept note |
| **Quality Checks** | Does the study fill a genuine evidence gap? Is the rationale compelling? Is the budget realistic? |
| **Common Failures** | Vague purpose, unfundable budget, unrealistic timeline, insufficient evidence of need |

### Phase 2: Design (2–6 weeks)

| Element | Description |
|---------|-------------|
| **Trigger** | Approved concept note |
| **Actors** | Principal Investigator, Research Associate, Statistician, MERL Specialist |
| **Steps** | 1. Develop detailed methodology<br>2. Build Theory of Change / LogFrame<br>3. Define indicators<br>4. Design sampling strategy<br>5. Develop data collection instruments<br>6. Draft analysis plan<br>7. Develop data quality plan<br>8. Prepare ethics application<br>9. Stakeholder consultation |
| **Decision Points** | Methodology sign-off; sampling strategy approval; instrument design freeze |
| **Expected Output** | Full study protocol: IRB-ready, donor-compliant, methodologically sound |
| **Quality Checks** | Is methodology appropriate for objectives? Are indicators SMART? Is sample size justified? Are instruments pre-tested? Is ethics protocol complete? |
| **Common Failures** | Mismatch between objectives and methodology, insufficient sample size, poor indicator definitions, missing ethics review, inadequate stakeholder input |

### Phase 3: Review (1–2 weeks)

| Element | Description |
|---------|-------------|
| **Trigger** | Draft protocol complete |
| **Actors** | Principal Investigator, Quality Assurance Officer, Ethics Officer, Peer Reviewers, Donor (if required) |
| **Steps** | 1. Internal technical review<br>2. Ethics committee review<br>3. Donor review (if required)<br>4. Address feedback<br>5. Final sign-off |
| **Decision Points** | Approval, conditional approval (revisions required), or rejection |
| **Expected Output** | Signed-off study protocol |
| **Quality Checks** | Scientific validity, methodological soundness, ethical compliance, donor alignment |
| **Common Failures** | Incomplete ethics review, unresolved reviewer comments, rushed review, missing donor approvals |

### Phase 4: Pre-test / Pilot (1–3 weeks)

| Element | Description |
|---------|-------------|
| **Trigger** | Approved protocol |
| **Actors** | Research Associate, Field Supervisor, Enumerators |
| **Steps** | 1. Train field team on instruments<br>2. Pilot questionnaires (n=10-30)<br>3. Collect pilot data<br>4. Debrief and document issues<br>5. Revise instruments and protocols<br>6. Finalize data collection tools |
| **Decision Points** | Instrument readiness (pass/fail based on pilot findings); enumerator certification |
| **Expected Output** | Pre-tested, revised instruments; trained, certified field team |
| **Quality Checks** | Question comprehension, flow, timing, skip logic correctness, translation accuracy, data quality indicators from pilot |
| **Common Failures** | Inadequate pilot sample, ignoring pilot findings, insufficient enumerator training, translation errors not caught |

### Phase 5: Field Setup (1–2 weeks)

| Element | Description |
|---------|-------------|
| **Trigger** | Instruments finalized |
| **Actors** | Field Supervisor, Data Manager, Logistics Officer |
| **Steps** | 1. Deploy questionnaires to collector app<br>2. Set up assignments<br>3. Configure devices<br>4. Establish data quality monitoring dashboard<br>5. Confirm logistics (transport, accommodation, permits) |
| **Expected Output** | Ready field operation: devices loaded, teams assigned, logistics confirmed |
| **Common Failures** | Device failures, incomplete questionnaire deployment, missing permits, logistics breakdown |

### Phase 6: Data Collection (varies: 2–12 weeks)

| Element | Description |
|---------|-------------|
| **Trigger** | Field setup complete |
| **Actors** | Enumerators, Field Supervisors, Data Manager |
| **Steps** | 1. Deploy enumerators to assigned areas<br>2. Daily data collection<br>3. Daily syncing (if CAPI)<br>4. Daily QA checks<br>5. Real-time feedback to enumerators<br>6. Replacement protocol for non-response<br>7. Weekly progress reviews |
| **Decision Points** | Sample completion; data quality thresholds; stop/revisit decisions |
| **Expected Output** | Complete dataset meeting quality standards |
| **Quality Checks** | Daily completeness, GPS accuracy, duration anomalies, straight-lining, missing data patterns, enumerator performance |
| **Common Failures** | Low response rate, enumerator fraud, data quality issues, security incidents, weather/access problems |

### Phase 7: Data Quality (1–3 weeks)

| Element | Description |
|---------|-------------|
| **Trigger** | Data collection complete |
| **Actors** | Data Manager, Quality Assurance Officer |
| **Steps** | 1. Automated quality checks<br>2. Manual review of flagged submissions<br>3. Outlier analysis<br>4. Consistency checks<br>5. Back-checks (re-contact subsample)<br>6. Clean dataset finalization |
| **Decision Points** | Dataset ready for analysis (pass/conditional pass/fail) |
| **Expected Output** | Clean, documented, analysis-ready dataset |
| **Quality Checks** | Completeness, accuracy, consistency, validity, timeliness, reliability |
| **Common Failures** | Unresolved data quality issues, undocumented cleaning decisions, back-check failures, missing data handling not documented |

### Phase 8: Analysis (2–6 weeks)

| Element | Description |
|---------|-------------|
| **Trigger** | Clean dataset |
| **Actors** | Data Analyst, Statistician, Principal Investigator |
| **Steps** | 1. Descriptive analysis<br>2. Inferential analysis (per analysis plan)<br>3. Subgroup/disaggregation analysis<br>4. Qualitative analysis (coding, theming)<br>5. Triangulation (quant + qual)<br>6. Draft findings |
| **Decision Points** | Findings review; additional analysis needed vs. sufficient |
| **Expected Output** | Validated findings with statistical/qualitative support |
| **Quality Checks** | Statistical assumptions verified, triangulation completed, findings traceable to data |
| **Common Failures** | p-hacking, cherry-picking findings, ignoring null results, inadequate qualitative analysis, untested assumptions |

### Phase 9: Reporting (2–6 weeks)

| Element | Description |
|---------|-------------|
| **Trigger** | Validated findings |
| **Actors** | Principal Investigator, Research Associate, Communications Officer |
| **Steps** | 1. Outline report structure<br>2. Draft sections<br>3. Create visualizations<br>4. Review and revise<br>5. Internal QA review<br>6. Donor/dissemination draft<br>7. Finalize and publish |
| **Decision Points** | Report approval; publication decision |
| **Expected Output** | Published report(s): technical report, executive summary, policy brief |
| **Quality Checks** | Peer review, findings match evidence, recommendations grounded, donor format compliance |
| **Common Failures** | Overclaiming, weak recommendations, poor data viz, missing limitations, donor format non-compliance |

### Phase 10: Dissemination (2–4 weeks)

| Element | Description |
|---------|-------------|
| **Trigger** | Published report |
| **Actors** | Communications Officer, Principal Investigator, Stakeholders |
| **Steps** | 1. Stakeholder dissemination workshop<br>2. Policy brief circulation<br>3. Academic publication (if applicable)<br>4. Data sharing (deposit in repository)<br>5. Media/communication |
| **Expected Output** | Evidence used in decision-making |
| **Common Failures** | No dissemination budget, stakeholder fatigue, non-responsive audiences |

### Phase 11: Learning & Archive (ongoing)

| Element | Description |
|---------|-------------|
| **Trigger** | Dissemination complete |
| **Actors** | Research Director, Knowledge Manager, All team members |
| **Steps** | 1. Capture lessons learned<br>2. Document best practices<br>3. Archive study materials<br>4. Update indicator library<br>5. Close project in system |
| **Expected Output** | Captured institutional knowledge |
| **Common Failures** | Skipped, no time/budget, knowledge lost when team disperses |

---

## 2. Indicator Development Workflow

### Trigger
Study design phase OR project design phase OR need for new measurement.

### Actors
Principal Investigator, MERL Specialist, Subject Matter Expert, Quality Assurance Officer

### Steps

| Step | Description | Responsible |
|------|-------------|-------------|
| 1 | Define what needs to be measured (from objective, ToC, LogFrame) | PI, MERL Specialist |
| 2 | Draft indicator name and definition | MERL Specialist |
| 3 | Determine indicator type (quantitative/qualitative/proxy/composite) | MERL Specialist |
| 4 | Specify calculation formula (numerator, denominator, unit) | Statistician |
| 5 | Define disaggregation dimensions | MERL Specialist |
| 6 | Identify data source and collection method | MERL Specialist, Data Manager |
| 7 | Set frequency of measurement | PI |
| 8 | Establish baseline and target values | PI, MERL Specialist |
| 9 | Define quality thresholds | Data Manager |
| 10 | Peer review indicator specifications | QA Officer, SME |
| 11 | Final approval | Research Director |

### Decision Points
- Is the indicator SMART? (Gate)
- Is the indicator redundant with existing indicators? (Check library)
- Is the data source feasible and sustainable?
- Are baselines realistic?

### Expected Output
Approved, documented indicator with full metadata (code, name, definition, type, calculation, frequency, disaggregations, baseline, target, data source).

### Quality Checks

| Check | Description |
|-------|-------------|
| SMART | Specific, Measurable, Achievable, Relevant, Time-bound |
| Purpose | Does this indicator support a decision? |
| Feasibility | Can data be collected with available resources? |
| Quality | Is the data source reliable? |
| Uniqueness | No overlap with existing indicators |
| Donor alignment | Compliance with donor reporting requirements |

### Common Failure Modes
- Indicator measures activity, not result (process vs. outcome confusion)
- Definition is vague or ambiguous
- Numerator and denominator not specified
- No disaggregation planning
- Baseline infeasible or missing
- Too many indicators (indicator creep)
- Indicators not linked to questions/instruments
- Data source not identified

---

## 3. Questionnaire Design and Review Workflow

### Trigger
Study design phase, instrument development needed.

### Actors
Principal Investigator, Research Associate, Subject Matter Expert, Enumerator (for pre-test), QA Officer, Ethics Officer

### Steps

| Step | Description | Responsible |
|------|-------------|-------------|
| 1 | Map questions to indicators and research questions | PI, Research Associate |
| 2 | Draft question pool (over-generate) | Research Associate |
| 3 | Review and select questions (reduce to essentials) | PI, SME |
| 4 | Organize into sections (logical flow) | Research Associate |
| 5 | Define question types and validation rules | Research Associate |
| 6 | Add skip logic and conditional patterns | Research Associate |
| 7 | Program questionnaire (CAPI) or format (PAPI) | Data Manager, Research Associate |
| 8 | Internal review (methodology + ethics) | PI, QA Officer, Ethics Officer |
| 9 | Translate (if multi-language) | Translator, SME review |
| 10 | Pre-test / pilot | Field team |
| 11 | Revise based on pilot | Research Associate |
| 12 | Final approval and publish | Research Director |

### Decision Points
- Does each question map to an indicator or research question? If no → delete.
- Is the questionnaire length acceptable? (Respondent burden check)
- Is skip logic correct and complete? (Test all paths)
- Are translations accurate? (Back-translation check)
- Does the pre-test show acceptable question performance?

### Expected Output
Approved, versioned questionnaire with all questions validated, skip logic verified, translations complete.

### Quality Checks

| Check | Description |
|-------|-------------|
| Indicator mapping | Every question linked to ≥1 indicator or research question |
| Clarity | Questions unambiguous, simple language |
| Flow | Logical order, sensitive questions placed later |
| Length | Within acceptable respondent burden |
| Validation | All validation rules correct for type |
| Logic | Skip logic complete, no infinite loops |
| Ethics | Sensitive questions handled appropriately, consent questions present |
| Cultural appropriateness | Questions acceptable in local context |

### Common Failure Modes
- Too many questions (respondent fatigue)
- Double-barreled questions (asks two things at once)
- Leading questions (biases response)
- Ambiguous wording (different interpretations)
- Missing response options
- Inconsistent scale direction (higher = better vs lower = better)
- Poor translation quality
- Skip logic errors (dead ends, loops)
- No pre-testing
- Sensitive questions placed at start (should be later, after rapport)

---

## 4. Field Data Collection Workflow

### Trigger
Questionnaire published, field team trained, logistics confirmed.

### Actors
Research Director → Data Manager → Field Supervisor → Enumerator → Respondent

### Steps

```
Administration Phase (HQ/Office)
├── 1. Sample allocation to teams/areas
├── 2. Create assignments (enumerator, area, target count, due date)
├── 3. Configure collector app (questionnaire, assignments, reference data)
├── 4. Deploy devices to enumerators
└── 5. Activate real-time monitoring dashboard

Field Phase
├── 6. Enumerator receives assignment
├── 7. Travel to assigned area
├── 8. Identify and approach respondent / household
├── 9. Obtain informed consent │
├── 10. Conduct interview / observation
├── 11. Submit completed questionnaire (sync)
├── 12. Repeat 8-11 for target count
└── 13. Return device / debrief

Quality Phase (Concurrent)
├── 14. Server receives submission
├── 15. Automated quality checks run
├── 16. Flags generated (if issues)
├── 17. Supervisor reviews flags
├── 18. Feedback to enumerator (if needed)
├── 19. Remedial action (revisit, correct, discard)
└── 20. Daily progress report generated
```

### Decision Points
- Consent obtained? → Continue | No consent → Thank and move on
- Quality check passed? → Approve | Warning → Review | Fail → Reject and reassign
- Target met? → Complete assignment | Not met → Continue / extend
- Security concern? → Stop and withdraw

### Expected Output
- Complete set of approved submissions meeting sample targets
- Quality-cleaned dataset
- Enumerator performance metrics
- Field progress reports

### Quality Checks (Real-time)

| Check | Threshold | Action |
|-------|-----------|--------|
| Duration too short | <50% of median | Flag for potential falsification |
| Duration too long | >3x of median | Flag for possible issues |
| GPS outside study area | >100m buffer | Flag for verification |
| GPS identical for multiple submissions | Exact match | Flag for falsification |
| Straight-lining | Same answer ≥80% of questions | Flag for review |
| Missing data rate | >10% required questions | Flag for re-contact |
| Duplicate respondent | Same respondent ID or GPS+capture time | Auto-reject |
| Media file corrupted | Hash mismatch | Request resubmission |

### Common Failure Modes
- Enumerator falsification (fabricated interviews)
- Non-response bias (certain groups not reached)
- Inaccessible sample points (weather, security, terrain)
- Device failure / data loss
- Poor GPS signal in indoor/remote areas
- Respondent fatigue with long instrument
- Security incidents (field team safety)
- Data sync failures in low-connectivity areas

---

## 5. Data Quality Review and Cleaning Workflow

### Trigger
Submissions arriving (real-time) OR data collection complete (batch).

### Actors
Data Manager, Quality Assurance Officer, Field Supervisor

### Steps

| Step | Description | Responsible |
|------|-------------|-------------|
| 1 | Run automated quality checks on all submissions | System |
| 2 | Auto-pass submissions meeting all thresholds | System |
| 3 | Flag submissions with warnings for human review | System |
| 4 | Flag submissions with critical failures for rejection | System |
| 5 | Review flagged submissions | Data Manager, QA Officer |
| 6 | Categorize each flag: valid data, true error, or suspicious | Data Manager |
| 7 | For valid flags: approve and document | Data Manager |
| 8 | For true errors: correct if possible, otherwise instruct re-collection | Data Manager |
| 9 | For suspicious flags: refer to supervisor for back-check | Field Supervisor |
| 10 | Back-check: re-contact respondent or revisit location | Supervisor / Enumerator |
| 11 | Resolve each case: approve, reject, or impute | Data Manager |
| 12 | Document all cleaning decisions (audit trail) | Data Manager |
| 13 | Generate data quality report | Data Manager |
| 14 | Finalize clean dataset | Data Manager |

### Decision Points
- Automated flag → Accept, Review, or Reject?
- Enumerator pattern found → Retrain, Replace, or Dismiss?
- Systematic issue (e.g., question misunderstood) → Revise instrument, Retrain, or Discard data?
- Missing data → Impute, or leave missing (if MCAR/MAR)?

### Expected Output
- Clean, documented, analysis-ready dataset
- Data quality report (completeness, accuracy, consistency)
- Cleaning log (every decision documented)
- Flagged item resolution summary

### Quality Checks (On Dataset)

| Check | Description | Method |
|-------|-------------|--------|
| Completeness | All required questions answered | Count missing values |
| Range validity | Values within acceptable range | Min/max check per question |
| Consistency | Logical relationships hold (e.g., age > birth year) | Cross-field validation |
| Outlier detection | Extreme values | Z-score, IQR, domain-specific |
| Duplicate detection | No duplicate submissions | Submission ID, fingerprinting |
| GPS validity | Points plausible | Geofence, speed between points |
| Temporal logic | All dates in sequence | Chronological ordering |
| Enumerator bias | No systematic enumerator effects | ANOVA, random effects model |

### Common Failure Modes
- Over-cleaning (removing valid data points)
- Under-cleaning (retaining bad data)
- Cleaning decisions not documented (non-reproducible)
- Back-check not conducted due to time/budget
- Missing data pattern not investigated (ignoring non-response bias)
- Quality rules too strict → excessive rejection rate
- Quality rules too loose → poor data quality

---

## 6. Analysis and Reporting Workflow

### Trigger
Clean dataset finalized.

### Actors
Data Analyst, Statistician, Principal Investigator, Research Associate, QA Officer, Communications Officer

### Steps

| Phase | Step | Description |
|-------|------|-------------|
| **Analysis Plan** | 1 | Review approved analysis plan |
| | 2 | Verify statistical assumptions (normality, heteroskedasticity, etc.) |
| | 3 | Run descriptive statistics (frequencies, means, distributions) |
| | 4 | Run inferential statistics (per analysis plan) |
| | 5 | Conduct subgroup / disaggregation analysis |
| | 6 | Compute indicator values (numerator/denominator calculations) |
| | 7 | Conduct qualitative coding and thematic analysis |
| | 8 | Triangulate quantitative + qualitative findings |
| | 9 | Document all analysis steps (reproducibility) |
| **Draft Findings** | 10 | Draft key findings with evidence tables |
| | 11 | Create data visualizations |
| | 12 | Draft conclusions |
| | 13 | Develop recommendations |
| **Reporting** | 14 | Structure report per template |
| | 15 | Write executive summary |
| | 16 | Write full report |
| | 17 | Internal peer review |
| | 18 | Incorporate feedback |
| | 19 | Donor review (if applicable) |
| | 20 | Finalize and publish |
| **Dissemination** | 21 | Prepare dissemination products (briefs, slides, infographics) |
| | 22 | Stakeholder workshop |
| | 23 | Publish and archive |

### Decision Points
- Are findings statistically significant? (p-value / effect size / confidence interval)
- Are findings practically significant? (not just statistically)
- Are recommendations supported by evidence? (not speculative)
- Do conclusions address the research objectives?

### Expected Output
- Clean analysis scripts/output (reproducible)
- Statistical findings with appropriate measures
- Qualitative themes with supporting quotes
- Triangulated evidence matrix
- Published report
- Dissemination products

### Quality Checks

| Check | Description |
|-------|-------------|
| Reproducibility | Analysis script produces same output |
| Assumptions | Statistical assumptions verified and reported |
| Multiple testing | Corrections applied where appropriate |
| Missing data treatment | Documented and justified |
| Limitations | Honest reporting of study limitations |
| Recommendations evidence-grounded | Each recommendation supported by finding |
| Visual integrity | Charts not misleading (axis scales, truncation) |

### Common Failure Modes
- p-hacking (running many tests until significant)
- Cherry-picking (reporting only positive findings)
- Ignoring non-response bias
- Inflated significance (no correction for multiple testing)
- Confusing correlation with causation
- Over-interpretation of qualitative data
- Weak, unsupported recommendations
- Data visualization distortions
- Missing limitations section

---

## 7. Knowledge Capture Workflow

### Trigger
Study closure OR significant event OR identified best practice.

### Actors
All team members, Knowledge Manager, QA Officer

### Steps

| Step | Description | Responsible |
|------|-------------|-------------|
| 1 | Identify knowledge worth capturing (lesson, best practice, challenge) | Any team member |
| 2 | Draft knowledge item (title, content, context, category) | Originator |
| 3 | Add tags for findability | Originator |
| 4 | Link to study, indicators, and relevant entities | Originator |
| 5 | Submit for review | Originator |
| 6 | QA review (verify evidence base, remove anecdotal content) | QA Officer / Knowledge Manager |
| 7 | Approve or return for revision | Knowledge Manager |
| 8 | Publish to knowledge library | Knowledge Manager |
| 9 | Notify relevant stakeholders | System |
| 10 | Periodic review for relevance (annual) | Knowledge Manager |

### Decision Points
- Is this knowledge generalizable beyond the specific study?
- Is it evidence-based (not just opinion)?
- Does it include context for reuse?
- Is it actionable?

### Expected Output
- Published, tagged, searchable knowledge items
- Linked to source study and relevant entities
- Notified stakeholders

### Quality Checks

| Check | Description |
|-------|-------------|
| Evidence-based | Claims supported by study findings |
| Context | Sufficient context for applicability judgment |
| Actionability | Can someone act on this? |
| Tagging | Adequate for findability |
| Links | Connected to relevant entities |
| Review | Independent verification of claims |

### Common Failure Modes
- Not done (no time, no budget, no incentive)
- Too generic (not useful for future work)
- Anecdotal (not evidence-based)
- Missing context (can't judge if applicable to new situation)
- Poor tagging (can't find when needed)
- No ownership (who maintains the knowledge base?)

---

## Workflow Integration Map

```
                  ┌──────────────────────────┐
                  │   Study Lifecycle         │
                  │   (Overall Orchestrator)  │
                  └──────────┬───────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
│ Indicator Dev    │ │Questionnaire │ │ Field Collection  │
│ Workflow         │ │Design        │ │ Workflow         │
│ (Defines WHAT    │ │(Defines HOW  │ │ (Executes        │
│  to measure)     │ │  to measure) │ │  measurement)    │
└────────┬────────┘ └──────┬───────┘ └────────┬─────────┘
         │                 │                   │
         └─────────────────┼───────────────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │ Data Quality      │
                  │ Review Workflow   │
                  │ (Validates WHAT   │
                  │  was measured)    │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │ Analysis &        │
                  │ Reporting Workflow│
                  │ (Interprets WHAT  │
                  │  was measured)    │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │ Knowledge Capture │
                  │ Workflow          │
                  │ (Learns from WHAT │
                  │  was measured)    │
                  └──────────────────┘
```

---

## Cross-cutting Workflow Rules

| Rule | Description |
|------|-------------|
| Sequential gate | Each workflow phase must be approved before next begins |
| QA at every gate | Quality check is mandatory before phase transition |
| Version control | All workflow artifacts are versioned |
| Audit trail | Every workflow action is logged with actor, timestamp, and change |
| Reversible | Workflows support rollback to previous phase (with audit) |
| Notification | Key stakeholders notified at each phase transition |
| Deadline tracking | Each phase has deadline; system alerts on overdue |
| Stakeholder consultation | Required at design, pre-test, and dissemination phases |
