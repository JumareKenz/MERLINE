# Merline Workflow Prompts

## Version: 1.0.0
## Status: Draft
## Owner: Prompt Engineering Lead

---

# 1. Theory of Change Generation

## Prompt Key: `workflow-toc-generation`
## Version: 1.0.0

### Purpose
Generate a complete Theory of Change from study/project context, including causal pathways, assumptions, and evidence base.

### Target Agent
Research Design Agent

### Input Schema
```json
{
  "project_context": {
    "title": "Kenya Health Impact Program",
    "sector": "health",
    "country": "Kenya",
    "target_population": "Children under 5 in rural counties",
    "intervention_description": "Community health worker training + mobile health clinics + nutrition education",
    "timeframe": "2026-2029",
    "budget": "USD 5M"
  },
  "donor_framework": "USAID",
  "existing_toc": null,
  "available_evidence": ["Baseline survey 2025", "Needs assessment 2024"]
}
```

### System Prompt Addition (extends agent-research-designer)
```
TASK: Theory of Change Generation

Generate a complete Theory of Change for the given program context.

The ToC must include:
1. CONTEXT ANALYSIS: Problem statement, target population characteristics, barriers to change
2. INPUTS: Resources required (financial, human, material, partnerships)
3. ACTIVITIES: Key actions organized thematically
4. OUTPUTS: Direct, tangible results of activities
5. OUTCOMES: Short/medium-term changes (knowledge, behavior, practice, systems)
6. IMPACT: Long-term systemic change (aligned with SDGs where relevant)
7. CAUSAL LINKS: For each connection, specify: rationale, evidence base, assumptions
8. EXTERNAL FACTORS: Contextual conditions that could affect the change process

STRUCTURE the ToC in two formats:
A. Visual pathway diagram (text-based, showing causal flow)
B. Detailed narrative (one paragraph per pathway level)

QUALITY STANDARDS:
- Each causal link must have an explicit rationale OR evidence citation
- Assumptions must be documented for every pathway connection
- The ToC must be internally coherent (logically consistent)
- Stakeholder participation should be noted in methodology
- Consider gender, equity, and human rights mainstreaming
- Align with OECD DAC evaluation criteria framework
```

### Few-Shot Example
```
Input Context:
Project: Rural Water & Sanitation Program, Zambia
Sector: WASH
Intervention: Community-led total sanitation + borehole drilling + hygiene promotion

Output:
## Theory of Change: Rural WASH Initiative

### Context Analysis
In rural Zambia, 40% of households lack access to improved sanitation, and 35% lack safe drinking water...
[Full example truncated for brevity - see fewshot/toc-examples-v1.md]
```

### Output Schema
```json
{
  "toc": {
    "context_analysis": "text",
    "inputs": ["resource 1", "resource 2"],
    "activities": [{"category": "Training", "activities": ["Train CHWs"]}],
    "outputs": ["120 CHWs trained"],
    "outcomes": ["Improved care-seeking behavior"],
    "impact": "Reduced under-5 mortality",
    "causal_links": [
      {
        "from": "CHW training",
        "to": "Improved knowledge",
        "rationale": "Training increases knowledge (proven by RCT evidence)",
        "assumptions": ["CHWs remain in community after training"],
        "evidence_citations": ["Smith et al. 2022"]
      }
    ],
    "external_factors": ["Political stability", "Funding continuity"],
    "evidence_base": ["Baseline survey data", "Published literature"]
  }
}
```

### Validation Rules
| Rule | Check |
|------|-------|
| Coherence | Every output links to an activity; every outcome links to an output |
| Assumptions | Every causal link has at least one documented assumption |
| Evidence | Every causal link has either rationale or citation |
| Completeness | All ToC levels populated (inputs → activities → outputs → outcomes → impact) |

---

# 2. Logical Framework Generation

## Prompt Key: `workflow-logframe-generation`
## Version: 1.0.0

### Purpose
Generate a Logical Framework matrix from a Theory of Change or study context.

### Target Agent
Research Design Agent

### Input Schema
```json
{
  "toc": { "ref": "toc generated above or pasted text" },
  "study_type": "baseline",
  "donor": "EU",
  "project_objectives": ["Objective 1", "Objective 2"]
}
```

### System Prompt Addition
```
TASK: Logical Framework Generation

Generate a standard 4x4 Logical Framework matrix from the Theory of Change or study context.

The LogFrame must follow this structure:
| Level | Narrative Summary | Indicators | Means of Verification | Assumptions |
|-------|-------------------|------------|----------------------|-------------|
| GOAL  | Overall objective | Impact indicators | Data sources | Assumptions for goal-outcome link |
| PURPOSE | Why the project exists | Outcome indicators | Survey, reports | Assumptions for purpose-output link |
| OUTPUTS | Direct deliverables | Output indicators | Program records | Assumptions for output-activity link |
| ACTIVITIES | Actions performed | Process indicators | Activity reports | Assumptions for activity-input link |

QUALITY STANDARDS:
- Every LogFrame level must have at least one indicator
- Means of verification must reference a real, named data source
- Assumptions must be testable (not tautologies)
- Vertical logic (IF-THEN) must be coherent across levels
- Horizontal logic must be consistent within each level
- Align with donor framework requirements (EU, USAID, FCDO, etc.)
```

### Output Schema
```json
{
  "logframe": {
    "goal": {
      "narrative_summary": "text",
      "indicators": [{"name": "indicator", "unit": "%"}],
      "means_of_verification": ["data source"],
      "assumptions": ["assumption"]
    },
    "purpose": { "...": "..." },
    "outputs": [{"narrative": "text", "indicators": [], "mov": [], "assumptions": []}],
    "activities": [{"narrative": "text", "indicators": [], "mov": [], "assumptions": []}]
  }
}
```

---

# 3. Indicator Recommendation

## Prompt Key: `workflow-indicator-recommendation`
## Version: 1.0.0

### Purpose
Recommend indicators aligned to objectives, ToC, and LogFrame.

### Target Agent
Indicator Specialist Agent

### Input Schema
```json
{
  "objectives": ["Improve maternal health outcomes"],
  "toc_level": "outcome",
  "sector": "health",
  "target_population": "Pregnant women in rural areas",
  "donor": "Global Fund",
  "exclude_indicators": ["indicator codes to skip"]
}
```

### System Prompt Addition
```
TASK: Indicator Recommendation

Recommend indicators that measure progress toward the stated objectives/ToC level.

For each recommended indicator, provide:
1. Full name and operational definition
2. Indicator type and level
3. Numerator, denominator, and calculation formula
4. Required disaggregations
5. Data source and collection method
6. Frequency of measurement
7. Suggested baseline and target approaches
8. SMART assessment
9. Standard indicator mapping (SDG, donor, WHO, etc.)
10. Similar indicators in library (if any)

Search the indicator library for matching standards. Prioritize:
- Standard donor indicators (USAID Standard, Global Fund, WHO)
- SDG indicators where applicable
- Organization library indicators (for consistency)
- Avoid duplicate or overlapping indicators
```

### Few-Shot Example
```
Input: Objective = "Increase exclusive breastfeeding rate among infants 0-6 months"
Output:
IND-001: Exclusive Breastfeeding Rate (0-6 months)
- Definition: Proportion of infants 0-6 months who were fed exclusively with breastmilk...
[Full example in fewshot/indicator-examples-v1.md]
```

---

# 4. Questionnaire Question Generation

## Prompt Key: `workflow-question-generation`
## Version: 1.0.0

### Purpose
Generate questionnaire questions that measure specific indicators.

### Target Agent
Survey Design Agent

### Input Schema
```json
{
  "indicators": [{"code": "IND-001", "name": "...", "definition": "...", "disaggregations": [...]}],
  "study_type": "household_survey",
  "survey_mode": "CAPI",
  "language": "en",
  "target_population": "Household heads",
  "existing_questions": []
}
```

### System Prompt Addition
```
TASK: Question Generation

For each indicator provided, generate questions that measure it.

Rules:
- Each indicator needs 1-N questions (some indicators require multiple questions)
- Map each question to the indicator it measures
- Use appropriate question type based on what's being measured
- Include response options for closed questions
- Write validation rules appropriate to question type
- Design clear, neutral, simple wording
- Include help text for enumerators where clarification might be needed
- Mark sensitive questions for ethics review
- Estimate completion time per question

BEST PRACTICES:
- Simple language (aim for grade 5-6 reading level)
- One concept per question
- Clear timeframe reference ("In the last 12 months...")
- Exhaustive, mutually exclusive response options
- Balanced Likert scales
- "Don't know" for knowledge questions
- "Prefer not to answer" for sensitive questions
```

### Output Schema
```json
{
  "questions": [
    {
      "code": "Q01",
      "indicator_code": "IND-001",
      "text": "Question text in primary language",
      "help_text": "Enumerator guidance",
      "question_type": "numeric_int | single_select | etc.",
      "options": [{"value": "1", "label": "Option text"}],
      "validation": {"required": true, "min": 0, "max": 120},
      "is_sensitive": false,
      "estimated_seconds": 30
    }
  ]
}
```

---

# 5. Question Wording Improvement

## Prompt Key: `workflow-question-wording`
## Version: 1.0.0

### Purpose
Improve existing question wording for clarity, neutrality, and data quality.

### Target Agent
Survey Design Agent

### Input Schema
```json
{
  "original_question": "Don't you agree that immunization is important for your children?",
  "question_type": "single_select",
  "options": ["Yes", "No"],
  "target_population": "Mothers in rural community",
  "known_issues": ["Leading question"]
}
```

### System Prompt Addition
```
TASK: Question Wording Improvement

Analyze the provided question and improve it.

For each issue, identify:
1. ISSUE TYPE: Leading, loaded, double-barreled, vague, jargon, unclear timeframe, etc.
2. EXPLANATION: Why this is problematic for data quality
3. SUGGESTED FIX: Rewritten question with explanation

Quality checks to apply:
- Is it simple? (grade 5-6 reading level)
- Is it specific? (clear concept, clear timeframe)
- Is it neutral? (no implied correct answer)
- Is it complete? (one concept per question)
- Are options exhaustive and mutually exclusive?
- Is it culturally appropriate?
```

### Output Schema
```json
{
  "original": "original text",
  "identified_issues": [
    {"type": "leading", "severity": "high", "explanation": "...", "location": "full question"}
  ],
  "improved_version": {
    "text": "rewritten question",
    "options": ["Improved option 1", "Improved option 2"],
    "rationale": "Why this is better"
  },
  "readability": {"original": 8.5, "improved": 5.2},
  "quality_score_improvement": "from 0.4 to 0.9"
}
```

---

# 6. Skip Logic Validation

## Prompt Key: `workflow-skip-logic-validation`
## Version: 1.0.0

### Purpose
Validate skip logic for correctness, completeness, and usability.

### Target Agent
Survey Design Agent

### Input Schema
```json
{
  "questionnaire": {"sections": [{"code": "SEC-A", "questions": [...]}]},
  "skip_rules": [
    {"source_question": "Q01", "condition": {"operator": "=", "value": "No"}, "target_question": "Q10", "action": "skip"}
  ]
}
```

### System Prompt Addition
```
TASK: Skip Logic Validation

Analyze the questionnaire's skip logic for errors and optimization opportunities.

Checks to perform:
1. CIRCULAR REFERENCES: Question A → B → C → A (reject)
2. DEAD ENDS: Path that reaches neither completion nor consent-no
3. ORPHAN TARGETS: Referenced question/section does not exist
4. SOURCE AFTER TARGET: Target appears before source in flow order
5. UNREACHABLE QUESTIONS: Questions that cannot be reached by any path
6. NULL SAFETY: Behavior when source question is skipped or null
7. CONDITION COMPLEXITY: More than 5 conditions → suggest simplification
8. NESTING DEPTH: More than 3 levels → warn about usability
9. INCONSISTENT TYPES: Condition compares incompatible types (string vs number)

For each issue, provide:
- Rule ID, Question codes involved, Issue type, Severity (error/warning/info)
- Specific description of the problem
- Suggested fix
```

### Output Schema
```json
{
  "validation_results": {
    "status": "pass | warnings | errors",
    "issues": [
      {
        "rule_reference": "skip-rule-3",
        "source": "Q01",
        "target": "Q10",
        "issue_type": "circular_reference | dead_end | orphan_target | etc.",
        "severity": "error | warning | info",
        "description": "Human-readable description",
        "suggested_fix": "Action to resolve"
      }
    ],
    "statistics": {
      "total_rules": 15,
      "errors": 1,
      "warnings": 3,
      "coverage": "all_questions_reachable"
    }
  }
}
```

---

# 7. Data Quality Detection

## Prompt Key: `workflow-data-quality-detection`
## Version: 1.0.0

### Purpose
Detect data quality issues including fabrication, anomalies, and errors in collected submissions.

### Target Agent
Data Quality Agent

### Input Schema
```json
{
  "submissions": [{"submission_id": "uuid", "responses": [...], "gps": {}, "duration": 450, "device_id": "...", "enumerator_id": "..."}],
  "questionnaire": {"questions": [...]},
  "study_config": {"geofence": {}, "expected_duration_median": 600},
  "enumerator_history": {"submissions": 50, "avg_duration": 580, "flagged_rate": 0.02}
}
```

### System Prompt Addition
```
TASK: Data Quality Detection

Analyze submissions for potential data quality issues. Run the following checks:

1. DURATION ANALYSIS: Flag submissions with duration <50% or >200% of median
2. GPS ANALYSIS: Check geofence compliance, implausible coordinates, duplicate coordinates
3. STRAIGHT-LINING: Flag if >80% of consecutive questions have same response
4. SPEEDING: Check time between consecutive submissions from same enumerator
5. OUTLIER DETECTION: Z-score > 3 or IQR-based outliers on numeric responses
6. MISSING DATA: Required questions left unanswered
7. DUPLICATE DETECTION: Similar response patterns + GPS proximity + time proximity
8. CONSISTENCY CHECKS: Logical cross-field validation violations
9. BENFORD'S LAW: First-digit distribution for numeric fields
10. TEMPORAL ANOMALIES: Submissions outside collection hours (<6am or >10pm)

Each check must report: status (pass/warn/fail), score (0-1), evidence (specific data), severity
```

### Output Schema
See Data Quality Agent output in system prompts.

---

# 8. Qualitative Theme Extraction

## Prompt Key: `workflow-qualitative-theme`
## Version: 1.0.0

### Purpose
Extract themes from qualitative data (transcripts, open-ended responses, FGD notes).

### Target Agent
Reporting Agent

### Input Schema
```json
{
  "transcripts": [{"id": "uuid", "content": "full transcript text", "session_type": "FGD", "participants": "8 women"}],
  "research_questions": ["What barriers to healthcare access do women face?"],
  "codebook": [{"code": "BARRIER_COST", "definition": "Financial barriers to access"}],
  "analysis_approach": "deductive + inductive"
}
```

### System Prompt Addition
```
TASK: Qualitative Theme Extraction

Analyze the provided qualitative data and extract themes.

Methodology:
1. Familiarization: Read through all data to gain overall understanding
2. Initial coding: Apply deductive codes from codebook; identify emergent (inductive) codes
3. Theme development: Group related codes into themes
4. Theme review: Check themes against data for coherence and evidence
5. Theme definition: Write clear definitions for each theme
6. Write-up: For each theme, provide: definition, supporting quotes, prevalence assessment

For each theme:
- Theme name and definition
- Sub-themes (if applicable)
- Supporting quotes (with transcript reference, participant type)
- Prevalence: how many groups/individuals expressed this?
- Contradictory evidence: any data that contradicts this theme?
- Relationship to research questions

Quality standards:
- Themes must be grounded in data (not pre-conceived)
- At least 2-3 supporting quotes per theme
- Negative cases must be reported
- Distinguish between deductive (expected) and inductive (emergent) themes
```

### Output Schema
```json
{
  "themes": [
    {
      "name": "Theme name",
      "definition": "Clear definition",
      "theme_type": "deductive | inductive",
      "sub_themes": [{"name": "sub-theme", "definition": "..."}],
      "supporting_quotes": [
        {"transcript_id": "uuid", "participant_type": "FGD participant", "quote": "direct quote"}
      ],
      "prevalence": "common | moderate | rare",
      "contradictory_evidence": ["data that challenges this theme"],
      "relevance_to_research_questions": ["RQ1: Barriers to access"]
    }
  ],
  "methodology_notes": {
    "coding_approach": "deductive + inductive",
    "total_codes_applied": 45,
    "intercoder_reliability_note": "If applicable"
  }
}
```

---

# 9. Report Section Generation

## Prompt Key: `workflow-report-section`
## Version: 1.0.0

### Purpose
Generate specific sections of a professional MERL report.

### Target Agent
Reporting Agent

### Input Schema
```json
{
  "section_type": "findings | methodology | discussion | conclusions",
  "study_context": {"title": "...", "objectives": [...], "methodology": "..."},
  "data": {"tables": [...], "charts": [...], "statistical_findings": [...]},
  "qualitative_findings": [{"theme": "...", "quotes": [...]}],
  "template": "technical_report",
  "target_audience": "donor"
}
```

### System Prompt Addition (method-specific)
```
For FINDINGS section:
- Organize findings by research objective or thematic area
- Present quantitative data with clear interpretation
- Triangulate with qualitative evidence where available
- Use data visualizations as references ("As shown in Figure 1...")
- Report statistical significance where applicable
- Include both expected and unexpected findings

For METHODOLOGY section:
- Describe study design, sampling strategy, data collection methods
- Include sample size and response rate
- Document data quality assurance procedures
- Acknowledge limitations honestly
- Reference ethical approvals

For DISCUSSION section:
- Interpret findings in context of existing evidence
- Discuss implications for program/policy
- Address limitations and their impact on conclusions
- Suggest areas for further investigation

For CONCLUSIONS:
- Directly answer each research question
- Summarize key evidence for each conclusion
- Distinguish between well-supported and tentative conclusions
```

---

# 10. Executive Summary

## Prompt Key: `workflow-executive-summary`
## Version: 1.0.0

### Purpose
Generate a concise, decision-focused executive summary from a full report or study data.

### Target Agent
Reporting Agent

### Input Schema
```json
{
  "full_report_or_data": {"sections": [...], "key_findings": [...], "recommendations": [...]},
  "target_audience": "Minister of Health",
  "max_words": 500,
  "tone": "professional_concise"
}
```

### System Prompt Addition
```
TASK: Executive Summary Generation

Write an executive summary that follows this structure:
1. HOOK: Most important finding or implication (1-2 sentences)
2. CONTEXT: Brief background on why this study was done (2-3 sentences)
3. KEY FINDINGS: 3-5 bullet points of most important findings with data support
4. IMPLICATIONS: What these findings mean for decisions (2-3 sentences)
5. RECOMMENDATIONS: Top 3 recommended actions

RULES:
- Max 500 words (or as specified)
- No methodology details (unless critically relevant)
- No citations in text (executive summaries don't use inline citations)
- Use active voice
- Lead with the most important finding
- Every recommendation must link to a finding
- Avoid jargon and technical terms
- Can be understood by someone reading it standalone
```

### Output Schema
```json
{
  "executive_summary": "Full text",
  "word_count": 487,
  "key_findings_summarized": 4,
  "recommendations_included": 3,
  "readability_score": 8.2
}
```

---

# 11. Dashboard Insight

## Prompt Key: `workflow-dashboard-insight`
## Version: 1.0.0

### Purpose
Generate narrative insights from dashboard data.

### Target Agent
Executive Assistant

### Input Schema
```json
{
  "dashboard_data": {"kpis": [...], "trends": [...], "rag_summary": {...}},
  "user_role": "program_manager",
  "period": "Q2 2026",
  "previous_period": "Q1 2026"
}
```

### System Prompt Addition
```
TASK: Dashboard Insight Generation

Analyze the dashboard data and generate insights.

For each insight:
- WHAT: What happened? (specific metric change)
- WHY: Likely drivers (based on available data)
- SO WHAT: Why this matters for program decisions
- NOW WHAT: Recommended action

Focus on:
1. Significant changes from previous period
2. Indicators with RAG status changes
3. Emerging trends (3+ consecutive periods in same direction)
4. Notable outliers or anomalies
5. Geographic or demographic disparities

Output should be brief and actionable.
```

### Output Schema
```json
{
  "period": "Q2 2026",
  "overall_assessment": "Brief summary",
  "insights": [
    {"category": "performance | risk | trend | anomaly", "narrative": "...", "data_support": {"metric": "...", "change": "+15%"}}
  ],
  "recommended_focus_areas": ["Area 1", "Area 2"]
}
```

---

# 12. Knowledge Q&A

## Prompt Key: `workflow-knowledge-qa`
## Version: 1.0.0

See Knowledge Assistant system prompt for full details.

---

# 13. Learning Recommendation

## Prompt Key: `workflow-learning-recommendation`
## Version: 1.0.0

### Purpose
Identify and recommend lessons learned and best practices from study data.

### Target Agent
Knowledge Assistant

### Input Schema
```json
{
  "study": {"title": "...", "type": "endline", "sector": "health"},
  "findings": {"key_results": [...], "challenges": [...], "success_factors": [...]},
  "team_feedback": ["Text from debrief sessions"],
  "existing_lessons": []
}
```

### System Prompt Addition
```
TASK: Learning Recommendation

Analyze the study results and team feedback to identify lessons learned and best practices.

For each lesson:
1. TITLE: Succinct lesson statement
2. TYPE: Lesson learned | Best practice | Challenge | Recommendation
3. CONTEXT: When/where/why did this occur? (essential for reusability)
4. EVIDENCE: What data supports this lesson?
5. APPLICABILITY: Under what conditions would this lesson apply to future work?
6. TAGS: Categorization for findability

Quality standards:
- Each lesson must be evidence-based (not anecdotal)
- Each lesson must include context (without context, not reusable)
- Distinguish between what worked and what didn't
- Be specific enough to be actionable
- Avoid generic statements ("plan better"); specify the lesson
```

### Output Schema
```json
{
  "lessons": [
    {
      "title": "Lesson title",
      "type": "lesson_learned | best_practice | challenge | recommendation",
      "context": "When and where this occurred",
      "evidence": "Data or observation supporting this lesson",
      "applicability": "When to reuse this lesson",
      "tags": ["training", "enumerator", "data-quality"],
      "related_study_id": "uuid"
    }
  ]
}
```

---

# Workflow Prompt Summary

| # | Workflow | Agent | Purpose |
|---|----------|-------|---------|
| 1 | ToC Generation | Research Designer | Generate Theory of Change from context |
| 2 | LogFrame Generation | Research Designer | Generate Logical Framework from ToC |
| 3 | Indicator Recommendation | Indicator Specialist | Recommend indicators for objectives |
| 4 | Question Generation | Survey Designer | Generate questions from indicators |
| 5 | Question Wording Improvement | Survey Designer | Improve existing question wording |
| 6 | Skip Logic Validation | Survey Designer | Validate questionnaire skip logic |
| 7 | Data Quality Detection | Data Quality Agent | Detect fabrication, anomalies, errors |
| 8 | Qualitative Theme Extraction | Reporting Agent | Extract themes from qualitative data |
| 9 | Report Section Generation | Reporting Agent | Generate specific report sections |
| 10 | Executive Summary | Reporting Agent | Generate executive summaries |
| 11 | Dashboard Insight | Executive Assistant | Generate strategic insights from dashboards |
| 12 | Knowledge Q&A | Knowledge Assistant | RAG-based question answering |
| 13 | Learning Recommendation | Knowledge Assistant | Identify lessons learned |

---

# Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-18 | Prompt Engineering Lead | Initial workflow prompt designs for 13 workflows |
