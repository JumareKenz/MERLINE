# Indicator Framework

## 1. Indicator Data Model

### 1.1 Core Indicator Entity

```
Indicator {
  // Identity
  id: UUID [PK]
  code: String(50) [unique per org, required]
  version: Integer [auto, starts at 1]
  
  // Naming
  name: String(300) [required]
  shortName: String(100) [optional, for dashboards]
  definition: Text [required, operational definition]
  purpose: Text [required, why this indicator exists, what decision it supports]
  
  // Typing
  indicatorType: Enum [Quantitative, Qualitative, Proxy, Composite]
  level: Enum [Input, Process, Output, Outcome, Impact]
  subType: Enum [Count, Proportion, Percentage, Rate, Ratio, Mean, Median, Sum, Index, Score, Qualitative_Binary, Qualitative_Categorical, Qualitative_Narrative]
  
  // Measurement
  unit: String(100) [e.g., "Percentage", "Count", "Rate per 1000"]
  unitOfMeasurement: String(100) [what is being counted/measured]
  direction: Enum [Positive, Negative, Neutral]
    Positive = higher value is better
    Negative = lower value is better
    Neutral = direction depends on context
  
  // Calculation
  calculationFormula: Text [conditional, required for calculated indicators]
  isCalculated: Boolean [if true, formula or numerator/denominator required]
  numerator: Text [conditional, for proportional indicators]
  denominator: Text [conditional, for proportional indicators]
  numeratorDefinition: Text [conditional]
  denominatorDefinition: Text [conditional]
  calculationDetails: Text [notes on calculation methodology]
  
  // Composite indicators
  componentIndicatorIds: UUID[] [for composite indicators]
  aggregationMethod: Enum [Weighted_Sum, Average, Geometric_Mean, Min, Max, Custom] [for composite]
  weights: JSON [for weighted composites]
  
  // Frequency & Timing
  frequency: Enum [Annual, SemiAnnual, Quarterly, Monthly, Weekly, Daily, Continuous, OneTime, AdHoc]
  measurementPeriod: String(100) [e.g., "Calendar year", "Fiscal year", "Last 12 months"]
  dataCollectionStartDate: Date [optional]
  dataCollectionEndDate: Date [optional]
  
  // Data Source
  dataSource: Text [required, where data comes from]
  dataSourceType: Enum [Survey, AdminData, Routine_System, Observation, Assessment, Census, Registry, Qualitative_Inquiry, Document_Review]
  sourceName: String(300) [name of the specific source, e.g., "DHS 2024"]
  sourceResponsible: String(200) [who manages this data source]
  collectionMethod: String(200) [survey, register, observation, FGD, KII, etc.]
  
  // Targets & Thresholds
  baselineValue: Decimal
  baselineYear: Integer
  baselineSource: String(300) [reference for baseline]
  baselineRationale: Text [how baseline was determined]
  targetValue: Decimal
  targetYear: Integer
  targetRationale: Text [how target was set]
  thresholdMinimum: Decimal [minimum acceptable value]
  thresholdMaximum: Decimal [maximum acceptable value]
  alertTriggerLow: Decimal [trigger alert if below]
  alertTriggerHigh: Decimal [trigger alert if above]
  
  // Disaggregation
  requiredDisaggregations: Disaggregation[] [required dimensions]
  optionalDisaggregations: Disaggregation[] [optional dimensions]
  
  // Classification
  sector: String[] [Health, Education, WASH, Agriculture, etc.]
  sdgGoals: Integer[] [relevant SDG goals]
  sdgTargets: String[] [relevant SDG targets]
  donorFramework: String[] [e.g., "USAID PEF", "UNICEF", "Global Fund"]
  thematicArea: String[] [e.g., "Maternal Health", "Girls Education"]
  tags: String[] [free tagging for search]
  
  // Roles & Responsibility
  dataOwner: String(200) [who owns the data]
  dataCollector: String(200) [who collects]
  dataReporter: String(200) [who reports]
  dataUser: String(200) [who uses for decisions]
  
  // Quality
  dataQualityChecks: DataQualityCheck[] [QA rules for this indicator]
  accuracyTarget: Decimal [target accuracy %]
  completenessTarget: Decimal [target completeness %]
  timelinessTarget: Decimal [target timeliness %]
  knownLimitations: Text [documented limitations]
  
  // Status
  status: Enum [Draft, Under_Review, Approved, Active, Deprecated, Archived]
  isKeyPerformanceIndicator: Boolean
  isDonorReporting: Boolean
  isStratification: Boolean [is this used as a stratification variable?]
  
  // Relationships
  parentIndicatorId: UUID [for hierarchy]
  organizationId: UUID [FK]
  projectId: UUID [FK, optional]
  studyId: UUID [FK, optional]
  libraryId: UUID [FK, optional, for shared library]
  
  // Metadata
  createdBy: UUID [FK to user]
  reviewedBy: UUID [FK to user]
  approvedBy: UUID [FK to user]
  approvalDate: DateTime
  createdAt: DateTime
  updatedAt: DateTime
  versionNotes: Text [what changed in this version]
}
```

### 1.2 Disaggregation Entity

```
Disaggregation {
  id: UUID [PK]
  indicatorId: UUID [FK]
  dimension: String(100) [e.g., "Sex", "Age Group", "Geographic Region", "Urban/Rural", "Disability Status", "Socioeconomic Quintile"]
  categories: String[] [e.g., ["Male", "Female"]; ["0-11 months", "12-23 months", "24-59 months"]]
  isRequired: Boolean [mandatory disaggregation]
  orderIndex: Integer
}
```

### 1.3 Indicator Value Entity

```
IndicatorValue {
  id: UUID [PK]
  indicatorId: UUID [FK]
  projectId: UUID [FK, optional]
  studyId: UUID [FK, optional]
  
  // Value
  value: Decimal
  valueQualitative: Text [for qualitative indicators]
  valueNumeric: Decimal
  numeratorValue: Decimal [for proportion/percentage]
  denominatorValue: Decimal [for proportion/percentage]
  confidenceIntervalLow: Decimal
  confidenceIntervalHigh: Decimal
  standardError: Decimal
  sampleSize: Integer [for survey-based values]
  
  // Context
  period: String(50) [e.g., "Q1 2025", "Annual 2025"]
  periodStart: Date
  periodEnd: Date
  geographicLevel: Enum [National, Regional, District, Facility, Community]
  geographicCode: String(50)
  
  // Disaggregation
  disaggregationDimension: String(100) [dimension name]
  disaggregationCategory: String(100) [dimension value]
  
  // Status
  isBaseline: Boolean
  isTarget: Boolean
  isActual: Boolean [measured value]
  isEstimated: Boolean
  dataSource: String(300)
  collectionDate: DateTime
  reportedBy: UUID [FK]
  verifiedBy: UUID [FK]
  verificationDate: DateTime
  status: Enum [Draft, Verified, Approved, Superseded]
  
  // Notes
  notes: Text
  createdAt: DateTime
}
```

### 1.4 Indicator Library Entity

```
IndicatorLibrary {
  id: UUID [PK]
  organizationId: UUID [FK]
  name: String(200) [e.g., "Health Sector Indicator Library"]
  description: Text
  version: Integer
  isPublic: Boolean [shared with all orgs]
  sector: String[]
  source: String [e.g., "WHO", "USAID Standard", "Ministry of Health"]
  createdAt: DateTime
  updatedAt: DateTime
}
```

---

## 2. Indicator Types

### 2.1 Quantitative Indicators

**Definition:** Numeric indicators that can be expressed as counts, proportions, percentages, rates, ratios, means, medians, sums, or scores.

| Sub-type | Description | Example | Validation |
|----------|-------------|---------|------------|
| Count | Number of units | "Number of children vaccinated" | Integer ≥ 0 |
| Proportion | Part of a whole | "Proportion of deliveries attended by skilled birth attendant" | 0 to 1, need numerator & denominator |
| Percentage | Proportion × 100 | "% of households with improved water source" | 0 to 100 |
| Rate | Events per population-time | "Under-5 mortality rate per 1,000 live births" | Numerator (deaths), denominator (total) |
| Ratio | One group relative to another | "Gender parity index (girls/boys enrollment)" | Can be >1, needs clear reference |
| Mean | Arithmetic average | "Mean household income" | Calculation from individual values |
| Median | 50th percentile | "Median time to health facility" | Calculation from individual values |
| Sum | Total of all values | "Total health expenditure" | Sum of all reported values |
| Index | Composite of multiple sub-indicators | "Human Development Index" | Component indicators + aggregation rule |

### 2.2 Qualitative Indicators

**Definition:** Indicators assessed through qualitative methods, expressed as narratives, typologies, or categorical assessments.

| Sub-type | Description | Example |
|----------|-------------|---------|
| Qualitative Binary | Present/absent assessment | "Does the facility have a functioning infection control protocol? (Yes/No/Partially)" |
| Qualitative Categorical | Ordered or unordered categories | "Community satisfaction level: Very satisfied / Satisfied / Neutral / Dissatisfied / Very dissatisfied" |
| Qualitative Narrative | Descriptive assessment | "Describe changes in community health seeking behavior since program start" |
| Rubric-based | Multi-dimensional scoring with defined criteria | "Health facility readiness score: 1-5 based on infrastructure, equipment, staffing, protocols" |

**Qualitative Indicator Rules:**
- Must have a clear assessment rubric or protocol
- Must specify who makes the assessment (qualifications, training)
- Must address inter-rater reliability
- Should include supporting evidence (quotes, observations)

### 2.3 Proxy Indicators

**Definition:** Indirect measures used when direct measurement is not feasible, too expensive, or too intrusive.

| Situation | Direct Indicator | Proxy Indicator |
|-----------|-----------------|----------------|
| Income hard to measure | "Household income" | "Housing quality index", "Asset ownership score" |
| Health behavior difficult to observe | "Handwashing after toilet" | "Soap present near toilet" |
| Empowerment difficult to quantify | "Women's decision-making power" | "Women's participation in household financial decisions" |

**Proxy Indicator Rules:**
- The proxy relationship must be empirically validated
- Limitations of the proxy must be explicitly documented
- Validation studies or literature must be cited
- Monitor the proxy's predictive validity over time

### 2.4 Composite Indicators

**Definition:** Multiple indicators combined into a single index using a defined aggregation method.

| Example | Components | Method |
|---------|------------|--------|
| Wealth Index | Asset ownership, housing characteristics, utilities | Principal Component Analysis (PCA) |
| Women's Empowerment Index | Decision-making, mobility, economic participation | Equal-weighted average of normalized scores |
| Health Facility Readiness Score | Infrastructure, equipment, staffing, guidelines, training | Composite of domain scores |
| Human Development Index (HDI) | Life expectancy, education, GNI per capita | Geometric mean of normalized indices |

**Composite Indicator Design Rules:**
1. **Theoretical framework** must justify component selection
2. **Normalization** method must be specified (min-max, z-score, distance to reference)
3. **Weighting** must be justified (equal, expert, PCA, budget allocation)
4. **Imputation** rules for missing components must be defined
5. **Sensitivity analysis** must test robustness to alternative specifications
6. **Correlation** between components should be assessed
7. **Validation** against external benchmarks if available

---

## 3. Indicator Calculation Rules

### 3.1 Simple Count
```
Value = COUNT(units meeting criteria)

Constraints:
- All units counted must meet the same criteria
- Count period must be specified
- Double counting must be prevented
```

### 3.2 Proportion
```
Value = Numerator / Denominator

Where:
  Numerator = COUNT(units meeting numerator criteria)
  Denominator = COUNT(units in denominator population)

Constraints:
  Denominator > 0
  Numerator ≤ Denominator
  0 ≤ Value ≤ 1
```

### 3.3 Percentage
```
Value = (Numerator / Denominator) × 100

Same constraints as Proportion.
0 ≤ Value ≤ 100
```

### 3.4 Rate
```
Value = (Number of Events / Population-Time) × K

Where:
  Population-Time = Sum of time contributed by each at-risk individual
  K = base multiplier (1000, 10000, 100000)

Example: Under-5 Mortality Rate = (Deaths / Live Births) × 1000
```

### 3.5 Mean
```
Value = SUM(all values) / COUNT(values)

Constraints:
  COUNT(values) ≥ 1
  Values must be numeric
  Outlier handling method specified (trim, winsorize, or include)
```

### 3.6 Median
```
Value = Middle value when sorted ASC

For even N:
  Value = (value[N/2] + value[N/2+1]) / 2

Constraints:
  COUNT(values) ≥ 1
  Must be sorted before calculation
```

### 3.7 Weighted Indicator (for composite)
```
Value = SUM(w_i × normalized_i) / SUM(w_i)

Where:
  w_i = weight for component i
  normalized_i = normalized value of component i

If weights sum to 1:
  Value = SUM(w_i × normalized_i)
```

---

## 4. Disaggregation Framework

### 4.1 Standard Disaggregation Dimensions

| Dimension | Standard Categories | Applicability | Data Source Requirement |
|-----------|-------------------|---------------|------------------------|
| Sex | Male, Female | All person-level indicators | Must ask sex in questionnaire; no "Other" unless justified |
| Age Group | Varies by indicator (0-11m, 12-23m, 24-59m; 15-24, 25-49; etc.) | Health, education, employment | Birth date or exact age; Standardized age groupings per WHO/UN |
| Geographic Region | Admin level 1, 2, 3 (varies by country) | All indicators | GPS or admin unit code in questionnaire |
| Urban/Rural | Urban, Rural | Most indicators | Standard national definition |
| Wealth Quintile | Q1 (poorest) through Q5 (wealthiest) | Household indicators | Asset index construction required |
| Education Level | None, Primary, Secondary, Tertiary | Person indicators | Standardized education classification |
| Disability Status | Yes, No (by Washington Group questions) | Person indicators | Washington Group Short Set required |
| Ethnicity | Varies by country | Context-dependent | Community-defined categories |
| HIV Status | Positive, Negative, Unknown | Health indicators | Ethical handling; consent required |
| Migrant/Refugee Status | Host, Refugee, IDP, Migrant | Humanitarian indicators | Registration status |

### 4.2 Disaggregation Rules

| Rule | Description |
|------|-------------|
| Required vs Optional | Each indicator specifies which disaggregations are mandatory vs optional |
| Minimum Cell Size | Do not report disaggregated values if cell n < 30 (or as specified per study) |
| Suppression | Suppress cells where n < minimum; label as (*) with note |
| Sample Size Validation | Disaggregation analysis must account for sample size and design effects |
| Planning Phase | Disaggregations must be specified during study design, not post-hoc |
| Consistency | Same disaggregation definitions across Baseline/Midline/Endline |
| Missing Categories | Do not collapse categories unless justified (never combine Male + Female into "All") |
| Cross-disaggregation | Cross-tabulation (e.g., Sex × Age × Region) requires proportional sample allocation |

### 4.3 Disaggregation Decision Tree

```
Is the indicator reported at person level?
├── YES → Required: Sex (unless sex-specific e.g., maternal mortality)
│         Highly recommended: Age Group, Geographic Region, Education
│         If equity focus: Wealth Quintile, Disability Status
└── NO → Is the indicator at household level?
    ├── YES → Required: Geographic Region, Urban/Rural
    │         Recommended: Wealth Quintile, Household Head Characteristics
    └── NO → Is the indicator at facility level?
            ├── YES → Required: Facility Type, Geographic Region
            │         Recommended: Ownership (Public/Private/NGO), Urban/Rural
            └── NO → Context-specific disaggregation
```

---

## 5. Baselines and Targets

### 5.1 Baseline Rules

| Rule | Description |
|------|-------------|
| Definition | Baseline is the value of the indicator before intervention starts (or at a defined reference point) |
| Timing | Should be measured before or at the start of the intervention |
| Source | Must be documented: primary data collection, existing survey, admin data, or literature |
| Quality | Baseline data must meet same quality standards as any study data |
| Missing Baseline | If no baseline, document why; consider reconstructing from recall or secondary data |
| Multiple Baselines | For phased programs, each phase may have its own baseline |
| Baseline Review | If baseline is unexpectedly high/low, review and document; do not manipulate |

### 5.2 Target Rules

| Rule | Description |
|------|-------------|
| Definition | Target is the desired value of the indicator at a specified future point |
| Evidence-based | Targets should be based on: past trends, comparable programs, national targets, or modeling |
| Ambitious but Realistic | Target should stretch but be achievable |
| Timeline | Must specify target year or period |
| Staging | May have annual milestones leading to final target |
| Revision | Targets may be revised if assumptions change; must be documented |
| No Target | If no target, indicator becomes tracking-only (specify as "monitoring indicator") |

### 5.3 Target Setting Methods

| Method | Description | Best For |
|--------|-------------|----------|
| Historical trend | Extrapolate from past data | Programs with long track record |
| Comparison programs | Benchmark against similar programs | New programs in established sector |
| National targets | Align with national/SDG targets | Government-aligned programs |
| Statistical modeling | Project based on inputs and assumptions | Theory-driven targets |
| Stakeholder consensus | Participatory target setting | Community-based programs |
| Feasibility assessment | What is achievable given resources | Implementation-focused targets |

### 5.4 Baseline/Target Management

| Situation | Action |
|-----------|--------|
| Baseline overshot (already at target at baseline) | Adjust target upward; document that baseline is above original target |
| Target unrealistic mid-program | Formal revision request with justification; do not adjust data |
| Post-intervention: target missed | Analyze why; document as lesson learned; do not change original target |
| Multiple data sources for same indicator | Establish data source hierarchy; specify which is primary |

---

## 6. Indicator Relationship Model

### 6.1 Hierarchy

```
Project-level Indicators (aggregate, cross-cutting)
    │
    ├── Study-level Indicators (specific to a study)
    │       │
    │       └── Question-level Mappings (which questions measure this)
    │
    └── Indicator Hierarchy (parent-child relationships)
            │
            ├── Parent → Child
            ├── Goal → Outcome → Output → Process
            └── Composite → Component indicators
```

### 6.2 Indicator Relationships

| Relationship Type | Description | Cardinality |
|------------------|-------------|-------------|
| Measures | Indicator measures a ToC outcome/output | M:N |
| Maps to LogFrame | Indicator appears in LogFrame cell | M:N |
| Maps to SDG | Indicator contributes to SDG target | M:N |
| Has Question | Questionnaire question measures this indicator | 1:N |
| Component of | Indicator is component of composite | N:1 |
| Parent of | Indicator is higher level in hierarchy | 1:N |
| Cross-references | Related but distinct indicator | M:N |
| Replaces | New indicator replaces old (versioning) | 1:1 |
| Derives from | Indicator calculated from other indicators | N:1 |
| Contradicts | Indicators that may conflict in interpretation | M:N |

### 6.3 Cross-Reference Rules

- Cross-references must specify relationship type (complementary, overlapping, contradictory)
- Overlapping indicators should have guidance on which to use when
- Contradictory indicators should note possible reasons for discrepancy
- Cross-references are stored as directed links with type label

---

## 7. Indicator Library Concept

### 7.1 Library Structure

```
Indicator Library
├── Sector-specific Libraries (Health, Education, WASH, etc.)
├── Donor-specific Libraries (USAID Standard, Global Fund, etc.)
├── Organization Libraries (internal, reusable)
├── Public Libraries (shared across all platform orgs)
└── Global Standard Libraries (SDG, WHO, World Bank)
```

### 7.2 Library Features

| Feature | Description |
|---------|-------------|
| Import | Copy indicator from library to project/study (creates new instance, preserves link) |
| Sync | Updates from library source can propagate to linked instances (optional) |
| Versioning | Each library version tracked; breaking changes create new version |
| Review | Library indicators go through peer review process before publication |
| Search | Full-text search across all libraries with filters (sector, level, donor, SDG) |
| Attribution | Each indicator credits original source (org, donor, standard body) |
| Customization | Users can adapt library indicators (must document changes) |

### 7.3 Library Adoption Workflow

```
1. Search/browse library for relevant indicator
2. Review indicator metadata (definition, disaggregations, source, quality)
3. Import to project/study
4. Customize if needed (frequency, targets, disaggregations)
5. Map to questionnaire question(s)
6. Document any changes from library version
7. Collect data and generate indicator value
8. Report value (with source attribution)
```

### 7.4 Benefits of Reusable Library

| Benefit | Description |
|---------|-------------|
| Consistency | Same indicator used across studies → comparable results |
| Efficiency | No need to design indicators from scratch each time |
| Quality | Library indicators have been peer-reviewed |
| Benchmarking | Compare against other studies using same indicator |
| Donor Compliance | Pre-loaded donor standard indicators ensure compliance |
| SDG Alignment | Easy mapping to national/global reporting |
| Learning | Accumulate knowledge about indicator performance across contexts |

---

## 8. Indicator Quality Assurance Checklist

| Criterion | Question | Pass/Fail |
|-----------|----------|-----------|
| Specific | Is the indicator precisely defined? Can two people interpret it the same way? | |
| Measurable | Can data be collected reliably? Is there a known data source? | |
| Achievable | Is data collection within budget and capacity? | |
| Relevant | Does this indicator inform a decision? Is it linked to an objective? | |
| Time-bound | Is there a clear frequency and timeframe? | |
| Attribution | Can change be attributed to the intervention? | |
| Disaggregation | Are required disaggregations specified? | |
| Baseline | Is baseline available or planned? | |
| Target | Is target set with rationale? | |
| Quality | Are data quality checks defined? | |
| Ethics | Does data collection raise ethical concerns? | |
| Donor | Does this meet donor requirements? | |
| Owner | Is data owner and responsible party identified? | |

**Gate:** An indicator with ≤5 failures must be redesigned. With 6-10 failures, return to design. At >10 failures, reconsider whether an indicator is needed at all.

---

## 9. Indicator Naming Conventions

| Convention | Rule | Example |
|------------|------|---------|
| Start with object | What/who is being measured | "Children under 5..." |
| Use active verb | Clear measurement action | "...vaccinated with..." |
| Avoid abbreviations | Unless universally known | "...DPT3..." (acceptable for vaccine) |
| Time reference | If time-bound | "...in last 12 months" |
| Geography | If geographic-specific | "...in project districts" |
| Consistent tense | Use past tense for actual | "Proportion of deliveries attended by skilled birth attendant" |

### Examples of Good vs Poor Names

| Poor Name | Good Name |
|-----------|-----------|
| "Health status" | "Proportion of children under 5 who are stunted (height-for-age < -2 SD)" |
| "Program success" | "Percentage of project outcomes achieved by end of Year 3" |
| "Maternal mortality" | "Maternal mortality ratio per 100,000 live births" |
| "Community participation" | "Percentage of target communities holding quarterly review meetings" |
