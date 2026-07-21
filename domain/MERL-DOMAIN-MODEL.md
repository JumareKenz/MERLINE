# MERL Domain Model

## Domain Overview

The Merline platform operates across five core domains: **Study Management**, **Field Operations**, **Data & Analytics**, **Knowledge & Learning**, and **Governance & Compliance**. This document defines every major business entity, their attributes, relationships, lifecycle states, and business rules.

---

## 1. Organization / Workspace

### Description
Top-level tenant entity. Represents an NGO, government agency, research institute, consulting firm, or donor organization.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| name | String(200) | Yes | Legal or operating name |
| shortName | String(50) | No | Acronym or abbreviation |
| orgType | Enum | Yes | NGO, Government, Academic, Private Sector, Multilateral, Donor |
| country | String(100) | Yes | Primary country of registration |
| region | String(100) | No | Operational region |
| website | URL | No | Official website |
| logo | Media | No | Organization logo |
| taxId | String(50) | No | Tax registration / charity number |
| donorId | String(50) | No | Donor registration identifier |
| settings | JSON | Yes | Feature flags, localization, defaults |
| isActive | Boolean | Yes | Soft-delete flag |
| createdAt | DateTime | Yes | |
| updatedAt | DateTime | Yes | |

### Relationships
- **Has many** Users (membership with roles)
- **Has many** Projects / Programmes
- **Has many** Indicator Libraries (shared)
- **Has many** Template Libraries (questionnaires, reports)
- **Has many** Teams
- **Belongs to** Parent Organization (optional, for hierarchies)

### Business Rules
- An organization must have at least one admin user (the creator).
- Organization name must be unique within the platform.
- An organization can be a child of another (e.g., country office under HQ).
- Deactivation cascades to projects, studies, and users (soft-block).
- Donor compliance frameworks are configured at organization level.

### Lifecycle States
`Active` → `Suspended` → `Archived` | `Active` → `Merged`

---

## 2. User / Role

### Description
Platform user with role-based access. Users may belong to multiple organizations with different roles.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | |
| email | String(255) | Yes | Login identifier; must be unique |
| passwordHash | String(255) | Yes | bcrypt/argon2 |
| firstName | String(100) | Yes | |
| lastName | String(100) | Yes | |
| phone | String(30) | No | |
| title | String(100) | No | Job title |
| department | String(100) | No | |
| locale | String(10) | Yes | Language preference (e.g., en, fr, es) |
| timezone | String(50) | Yes | |
| avatar | Media | No | |
| emailVerified | Boolean | Yes | |
| phoneVerified | Boolean | No | |
| twoFactorEnabled | Boolean | Yes | |
| lastLoginAt | DateTime | No | |
| isActive | Boolean | Yes | |
| createdAt | DateTime | Yes | |
| updatedAt | DateTime | Yes | |

### Role Model (RBAC)

| Role | Scope | Description |
|------|-------|-------------|
| SystemAdmin | Global | Platform super-admin |
| OrgAdmin | Organization | Full org control |
| ResearchDirector | Organization | Oversees all studies |
| PrincipalInvestigator | Project | Leads a study/project |
| ResearchAssociate | Project | Supports study execution |
| DataManager | Project | Data cleaning, analysis |
| FieldSupervisor | Study | Manages field teams |
| Enumerator | Study | Collects data |
| QualityAssurance | Organization | Reviews methodologies |
| EthicsOfficer | Organization | Ethics compliance |
| DonorViewer | Study | Read-only donor access |
| Guest | Study | Limited read access |

### Relationships
- **Belongs to** many Organizations (via membership)
- **Has many** Assignments (to studies, questionnaires, field tasks)
- **Has many** Submissions (as enumerator)
- **Has many** AI Interactions (audit trail)

### Business Rules
- Email must be unique across the platform.
- A user must have at least one role in an organization.
- Enumerators cannot access study design; researchers cannot submit data.
- Roles are hierarchical: higher roles can impersonate lower for QA review.
- All user actions are audit-logged.

### Lifecycle States
`Invited` → `Active` → `Suspended` → `Deactivated`

---

## 3. Project / Programme

### Description
A funded initiative containing one or more studies. Maps to donor-funded programmes, research projects, or evaluation contracts.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | |
| code | String(50) | Yes | Short project code (e.g., P-2024-001) |
| name | String(300) | Yes | Full project name |
| description | Text | No | |
| donor | String(200) | No | Primary donor/funder |
| grantReference | String(100) | No | Donor grant/contract number |
| budget | Decimal(15,2) | No | Total budget |
| currency | String(3) | No | ISO 4217 |
| startDate | Date | Yes | |
| endDate | Date | Yes | |
| status | Enum | Yes | See lifecycle |
| country | String(100) | Yes | Primary country |
| sector | String(100) | No | Health, Education, WASH, etc. |
| tags | String[] | No | |
| isActive | Boolean | Yes | |
| createdAt | DateTime | Yes | |
| updatedAt | DateTime | Yes | |

### Relationships
- **Belongs to** Organization
- **Has many** Studies
- **Has many** Indicators (project-level, cross-cutting)
- **Has many** Logical Frameworks
- **Has many** Theories of Change
- **Has many** Reports
- **Has many** Team Members (ProjectTeam join entity)
- **Has many** Knowledge Items

### Business Rules
- A project must have at least one study.
- Project code must be unique per organization.
- End date must be after start date.
- Budget tracking requires currency specification.
- A project can be linked to a donor framework (USAID, EU, etc.).

### Lifecycle States
`Draft` → `Active` → `Implementation` → `Closing` → `Closed` → `Archived`

---

## 4. Study

### Description
The central unit of research activity. A study is a structured investigation following a defined methodology.

### Types

| Type | Code | Description |
|------|------|-------------|
| Baseline Study | BASELINE | Initial measurement before intervention |
| Midline Study | MIDLINE | Mid-point measurement during intervention |
| Endline Study | ENDLINE | Final measurement after intervention |
| Needs Assessment | NEEDS | Assesses needs of a population |
| Situation Analysis | SITUATION | Comprehensive situational understanding |
| KAP Study | KAP | Knowledge, Attitudes, Practices |
| Household Survey | HOUSEHOLD | Population-based household data |
| Facility Assessment | FACILITY | Health/education facility capacity |
| Market Assessment | MARKET | Market systems analysis |
| Impact Evaluation | IMPACT | Attribution of outcomes to intervention |
| Rapid Assessment | RAPID | Quick-turnaround evidence gathering |
| Process Evaluation | PROCESS | Implementation fidelity assessment |
| Outcome Evaluation | OUTCOME | Evaluation of program outcomes |
| Performance Evaluation | PERFORMANCE | Performance against targets |
| Implementation Research | IR | How interventions work in real world |
| Operational Research | OR | Operational efficiency research |
| Action Research | ACTION | Participatory iterative research |
| Longitudinal Study | LONGITUDINAL | Repeated measures over time |
| Cross-sectional Study | CROSS | Single point in time |
| Experimental | EXPERIMENT | RCT, lab experiment |
| Quasi-experimental | QUASI | Non-randomized comparison |
| Case Study | CASE | In-depth single/multiple case |
| Mixed Methods | MIXED | Combines quantitative and qualitative |

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | |
| code | String(50) | Yes | Study code (e.g., BSL-2024-001) |
| title | String(500) | Yes | Full study title |
| acronym | String(30) | No | Short reference |
| studyType | Enum | Yes | From types table above |
| purpose | Text | Yes | Why the study exists |
| objectives | Text[] | Yes | Specific objectives |
| researchQuestions | Text[] | Yes | Key questions |
| hypotheses | Text[] | No | Formal hypotheses (if quantitative) |
| methodology | Text | Yes | Overall methodology description |
| population | Text | Yes | Target population description |
| sampleSize | Integer | No | Planned sample size |
| samplingMethod | Enum | No | See sampling types |
| location | GeoJSON | No | Study area geometry |
| startDate | Date | Yes | Field start |
| endDate | Date | Yes | Field end |
| status | Enum | Yes | See lifecycle |
| isActive | Boolean | Yes | |
| createdAt | DateTime | Yes | |
| updatedAt | DateTime | Yes | |

### Relationships
- **Belongs to** Project
- **Has many** Theory of Change versions
- **Has many** Logical Framework versions
- **Has many** Indicators (study-level)
- **Has one** Sampling Plan
- **Has many** Questionnaires
- **Has many** Submissions / Responses
- **Has many** Qualitative Data Items
- **Has many** Team Assignments
- **Has many** Reports
- **Has many** AI Insights
- **Has many** Knowledge Items
- **Has many** Audit Events

### Business Rules
- A study must belong to a project (except standalone studies).
- Baseline and Endline studies for the same project must share core indicators.
- Study codes must be unique per organization.
- Each study must have at least one objective and one research question.
- Methodology section must reference the study type.
- Field dates must be within project dates.

### Lifecycle States
`Concept` → `Design` → `Review` → `Approved` → `Pre-test` → `Field` → `Data_Analysis` → `Reporting` → `Dissemination` → `Closed` → `Archived`

---

## 5. Theory of Change (ToC)

### Description
A comprehensive framework showing how and why a desired change is expected to happen in a particular context.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | |
| version | Integer | Yes | Sequential version number |
| title | String(500) | Yes | |
| description | Text | Yes | Narrative of the change process |
| assumptions | Text[] | No | Key assumptions underlying the theory |
| contextAnalysis | Text | No | Situational context |
| isCurrent | Boolean | Yes | Active version flag |
| createdAt | DateTime | Yes | |
| updatedAt | DateTime | Yes | |

### ToC Components (child entities)

| Component | Description | Relationships |
|-----------|-------------|---------------|
| Impact | Long-term systemic change | Has many Outcomes |
| Outcome | Medium-term changes | Belongs to Impact; Has many Outputs |
| Output | Direct results of activities | Belongs to Outcome; Has many Activities |
| Activity | Actions undertaken | Belongs to Output |
| Input | Resources required | Belongs to Activity |
| Assumption | Condition for causality | Links any two levels |
| Rationale | Evidence basis for link | Links any two levels |

### Relationships
- **Belongs to** Project OR Study
- **Maps to** Indicators (outcomes/outputs link to indicators)
- **Has many** ToC Versions

### Business Rules
- A ToC must have at least one impact statement and one pathway.
- Each causal link must have an explicit rationale or evidence citation.
- Assumptions must be documented for each causal connection.
- ToC should be developed with stakeholder participation.
- Versioning: changes must create a new version; old versions remain accessible.

---

## 6. Logical Framework (LogFrame)

### Description
A structured matrix summarising the project/study design, indicators, means of verification, and assumptions.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | |
| version | Integer | Yes | |
| title | String(500) | Yes | |
| isCurrent | Boolean | Yes | |
| createdAt | DateTime | Yes | |
| updatedAt | DateTime | Yes | |

### LogFrame Structure

| Level | Narrative Summary | Indicators | Means of Verification | Assumptions |
|-------|-------------------|------------|----------------------|-------------|
| Goal | Higher-level objective | Impact indicators | Data sources | For goal-outcome link |
| Purpose | Why the project exists | Outcome indicators | Survey, reports | For purpose-output link |
| Outputs | Direct deliverables | Output indicators | Program records | For output-activity link |
| Activities | Actions performed | Process indicators | Activity reports | For activity-input link |

### Relationships
- **Belongs to** Project OR Study
- **Has many** Indicator mappings (each cell references indicators)
- **Has many** Versions

### Business Rules
- Every LogFrame level must have at least one indicator.
- Means of verification must reference a real data source.
- Assumptions must be testable.
- LogFrame must be consistent with Theory of Change.
- Vertical logic (if-then) must be coherent across levels.

---

## 7. Indicator

### Description
A variable that measures change or tracks progress toward a result. The most critical entity in the platform.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | |
| code | String(50) | Yes | Unique code (e.g., IND-001) |
| name | String(300) | Yes | Short descriptive name |
| definition | Text | Yes | Precise operational definition |
| indicatorType | Enum | Yes | Quantitative, Qualitative, Proxy, Composite |
 | level | Enum | Yes | Impact, Outcome, Output, Process, Input |
 | unit | String(100) | No | Unit of measurement (%, count, ratio, score) |
| calculationFormula | Text | Conditional | Formula for derived indicators |
| numerator | Text | Conditional | Numerator definition |
| denominator | Text | Conditional | Denominator definition |
| unitOfMeasurement | String(100) | Yes | What is being counted |
| direction | Enum | Yes | Positive (increase good), Negative (decrease good), Neutral |
| frequency | Enum | Yes | Annual, Semi-annual, Quarterly, Monthly, Weekly, Daily, Continuous |
| dataSource | Text | Yes | Where data comes from |
| collectionMethod | String(200) | Yes | Survey, Admin data, Observation, etc. |
| disaggregations | JSON | No | Required disaggregation dimensions |
| baselineValue | Decimal | No | Baseline measurement |
| baselineYear | Integer | No | Year of baseline |
| targetValue | Decimal | No | Target value |
| targetYear | Integer | No | Year of target |
| thresholdMinimum | Decimal | No | Minimum acceptable value |
| thresholdMaximum | Decimal | No | Maximum acceptable value |
| isKeyPerformanceIndicator | Boolean | No | KPI flag |
| isDonorReporting | Boolean | No | Required by donor |
| dataQualityChecks | JSON | No | Quality rules for this indicator |
| responsibleParty | String(200) | No | Who collects/reports |
| dataLimitations | Text | No | Known data limitations |
| isActive | Boolean | Yes | |
| createdAt | DateTime | Yes | |
| updatedAt | DateTime | Yes | |

### Relationships
- **Belongs to** Project OR Study OR Both
- **Belongs to** Indicator Library (shared)
- **Maps to** ToC component(s)
- **Maps to** LogFrame cell(s)
- **Has many** Indicator Values (time-series measurements)
- **Has many** Questionnaire Questions (questions that measure it)
- **Has many** Disaggregation Values
- **Has many** Child Indicators (hierarchy)
- **Has many** Cross-references (related indicators)

### Business Rules
- Every indicator must have a name, definition, and data source.
- Calculation indicators must have a formula or numerator/denominator.
- Composite indicators must reference component indicators.
- Disaggregations must be defined at design, not after collection.
- Baseline must be before target, or baseline can be null if not yet measured.
- Indicator code must be unique within an organization.
- KPIs must have baselines and targets.
- An indicator cannot exist without a purpose (must link to objective/question).

### Lifecycle States
`Draft` → `Under_Review` → `Approved` → `Active` → `Deprecated` → `Archived`

---

## 8. Questionnaire / Survey

### Description
A structured data collection instrument containing questions, sections, validation rules, and logic.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | |
| code | String(50) | Yes | Survey code |
| title | String(500) | Yes | |
| description | Text | No | |
| surveyType | Enum | Yes | Household, Facility, KAP, FGD guide, KII guide, Observation, etc. |
| mode | Enum | Yes | CAPI, PAPI, CATI, CAWI, Mixed |
| language | String(10) | Yes | Primary language (ISO 639-1) |
| estimatedDuration | Integer | No | Minutes |
| version | Integer | Yes | |
| isCurrent | Boolean | Yes | |
| isPreTested | Boolean | No | |
| approvalStatus | Enum | Yes | See lifecycle |
| createdAt | DateTime | Yes | |
| updatedAt | DateTime | Yes | |

### Relationships
- **Belongs to** Study
- **Has many** Sections (ordered)
- **Has many** Questions
- **Has many** Validation Rules
- **Has many** Skip Logic Rules
- **Has many** Translations
- **Has many** Assignments (to enumerators/teams)
- **Has many** Submissions
- **Has many** Versions

### Business Rules
- A questionnaire must have at least one section and one question.
- Every question must map to at least one indicator or research question.
- CAPI questionnaires must support offline data collection.
- Paper questionnaires (PAPI) must have a corresponding data entry template.
- Translations must maintain the same question IDs across languages.
- Question order within sections determines display order.
- Skip logic must not create infinite loops.
- Pre-testing is mandatory before field deployment (gate).
- Each version must be immutable once used for data collection.

### Lifecycle States
`Draft` → `Peer_Review` → `Pre-test` → `Approved` → `Published` → `Field_Active` → `Closed` → `Archived`

---

## 9. Question

### Description
A single data point in a questionnaire. Supports multiple types with type-specific validation.

### Types

| Type | Code | Description |
|------|------|-------------|
| Single Select | SINGLE_SELECT | One choice from options |
| Multiple Select | MULTIPLE_SELECT | Multiple choices from options |
| Dropdown | DROPDOWN | Compact single select |
| Text (Short) | TEXT_SHORT | Short text (≤255 chars) |
| Text (Long) | TEXT_LONG | Paragraph text |
| Numeric Integer | NUMERIC_INT | Whole number |
| Numeric Decimal | NUMERIC_DECIMAL | Decimal number |
| Percentage | PERCENTAGE | 0-100 |
| Date | DATE | Calendar date |
| Time | TIME | Time of day |
| DateTime | DATETIME | Date and time |
| GPS | GPS | Latitude/Longitude/Altitude/Accuracy |
| Photo | PHOTO | Single photograph |
| Video | VIDEO | Video recording |
| Audio | AUDIO | Audio recording |
| Signature | SIGNATURE | Signature capture |
| Barcode | BARCODE | Barcode/QR scan |
| Ranking | RANKING | Ordered ranking of options |
| Likert Scale | LIKERT | Agreement scale |
| Slider | SLIDER | Continuous scale |
| Matrix | MATRIX | Grid of questions |
| Note | NOTE | Display-only text (no data) |
| Calculated | CALCULATED | Auto-computed from other questions |
| Composite | COMPOSITE | Multi-field compound question |

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | |
| code | String(50) | Yes | Question code (e.g., Q01) |
| text | Text | Yes | Question text in primary language |
| helpText | Text | No | Guidance for enumerator |
| questionType | Enum | Yes | From types table |
| isRequired | Boolean | Yes | |
| isPersonalData | Boolean | No | Triggers PII handling |
| isSensitive | Boolean | No | Triggers special ethics |
| options | JSON | Conditional | For choice-based questions |
| validationRules | JSON | No | Type-specific validation |
| attachmentTypes | Enum[] | No | For media questions |
| minValue | Decimal | No | Numeric minimum |
| maxValue | Decimal | No | Numeric maximum |
| minLength | Integer | No | Text minimum |
| maxLength | Integer | No | Text maximum |
| decimalPlaces | Integer | No | Decimal precision |
| gpsAccuracy | Decimal | No | Required GPS accuracy (m) |
| imageResolution | String | No | Required image quality |
| orderIndex | Integer | Yes | Display order |
| indentLevel | Integer | No | Visual hierarchy |
| createdAt | DateTime | Yes | |
| updatedAt | DateTime | Yes | |

### Relationships
- **Belongs to** Section
- **Belongs to** Questionnaire
- **Maps to** Indicator(s)
- **Has many** Options (choice list)
- **Has many** Skip Logic Rules (as source)
- **Has many** Skip Logic Rules (as target)
- **Has many** Validation Rules
- **Has many** Translations
- **Has many** Responses (values collected)

### Business Rules
- Question code must be unique within a questionnaire.
- Required questions must have validation to prevent null submission.
- GPS questions must capture accuracy and altitude.
- Media questions must capture file hash and metadata.
- Skip logic: target questions must appear after source in flow.
- PII-flagged questions must be encrypted at rest.
- Likert scale options must be balanced (equal positive/negative).
- Ranking questions require at least three options.
- Calculated questions reference other questions by code.

---

## 10. Section

### Description
A logical grouping of questions within a questionnaire.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | |
| code | String(50) | Yes | e.g., SEC-A |
| title | String(300) | Yes | |
| description | Text | No | Section instructions |
| orderIndex | Integer | Yes | |
| repeatable | Boolean | No | Allows repeating group |
| repeatLabel | String | No | Label for each repeat |
| maxRepetitions | Integer | No | |
| isActive | Boolean | Yes | |

### Relationships
- **Belongs to** Questionnaire
- **Has many** Questions (ordered)
- **Has many** Sub-sections (nesting)

---

## 11. Response / Submission

### Description
A completed questionnaire instance collected from a respondent or observation unit.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | |
| submissionId | String(100) | Yes | Client-generated ID for sync |
| status | Enum | Yes | Draft, Submitted, Approved, Rejected |
| respondentId | String(100) | No | External respondent identifier |
| location | GeoJSON | No | Submission GPS point |
| deviceId | String(200) | No | Collecting device identifier |
| appVersion | String(20) | No | Collector app version |
| formVersion | Integer | Yes | Questionnaire version used |
| startedAt | DateTime | Yes | When collection started |
| completedAt | DateTime | Yes | When collection ended |
| duration | Integer | No | Calculated seconds |
| isSynced | Boolean | Yes | Server sync status |
| syncedAt | DateTime | No | |
| validationStatus | Enum | Yes | Pending, Passed, Warning, Failed |
| flaggedForReview | Boolean | Yes | |
| notes | Text | No | Supervisor/enumerator notes |
| isTest | Boolean | No | Flag for test submissions |
| createdAt | DateTime | Yes | |
| updatedAt | DateTime | Yes | |

### Response Values (child entity)

| Attribute | Type | Description |
|-----------|------|-------------|
| id | UUID | Primary key |
| submissionId | UUID | Parent submission |
| questionCode | String(50) | References question |
| value | JSON | The collected value (type-coerced) |
| mediaUrl | String | For media types |
| mediaHash | String | SHA-256 of media file |
| mediaMetadata | JSON | EXIF, GPS, size, etc. |
| calculated | Boolean | Whether auto-computed |
| flagged | Boolean | QA flag |
| flagReason | String | Reason for flagging |

### Relationships
- **Belongs to** Questionnaire (versioned)
- **Belongs to** Study
- **Belongs to** Assignment (enumerator task)
- **Belongs to** Sample Unit (if applicable)
- **Has many** Response Values
- **Has many** Audit Events
- **Has many** QA Reviews

### Business Rules
- Each submission must have a unique submissionId (client-generated, idempotency key).
- Duration must be ≥1 second; suspicious durations are flagged.
- GPS must be within study area (geofence validation).
- Consecutive submissions from same enumerator with identical duration pattern → flag.
- All media files must pass integrity hash check.
- PII response values must be encrypted at rest and masked in exports.
- Submission cannot be deleted after approval; only voided (audit trail).

### Lifecycle States
`Draft` → `Submitted` → `QA_Review` → `Approved` | `Rejected` → `Resubmitted` → `QA_Review`

---

## 12. Enumerator / Field Team

### Description
Field personnel who collect data. May be organized into teams with supervisors.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | Links to User entity |
| enumeratorCode | String(50) | Yes | Field identifier |
| supervisorId | UUID | No | Link to supervisor User |
| teamId | UUID | No | Team membership |
| deviceId | String(200) | No | Assigned device |
| deviceModel | String(100) | No | |
| languageSkills | String[] | No | Languages spoken |
| trainingDate | Date | No | Last training date |
| trainingPassed | Boolean | No | |
| isActive | Boolean | Yes | |
| locationTracking | Boolean | No | GPS tracking on/off |
| createdAt | DateTime | Yes | |
| updatedAt | DateTime | Yes | |

### Team (child entity)

| Attribute | Type | Description |
|-----------|------|-------------|
| id | UUID | |
| name | String(200) | Team name |
| supervisorId | UUID | Team supervisor |
| region | String(200) | Operational area |
| vehicleId | String(50) | Assigned vehicle |

### Relationships
- **Has one** User (profile)
- **Belongs to** Team
- **Has many** Assignments (questionnaires to collect)
- **Has many** Submissions
- **Has many** Performance Metrics

### Business Rules
- An enumerator must complete training before field deployment.
- Each enumerator should have a managed device with collector app installed.
- Enumerator-to-supervisor ratio should not exceed 1:8 (industry standard).
- Enumerator performance metrics are tracked: submission rate, data quality score, timeliness.

---

## 13. Assignment

### Description
A task given to an enumerator or team to collect specific questionnaires from specific locations/respondents.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | |
| questionnaireId | UUID | Yes | What to collect |
| enumeratorId | UUID | Yes | Who collects |
| targetCount | Integer | Yes | Number expected |
| completedCount | Integer | Yes | Number submitted |
| location | GeoJSON | No | Assigned area |
| dueDate | Date | Yes | |
| status | Enum | Yes | Pending, In_Progress, Completed, Overdue |
| notes | String | No | |
| createdAt | DateTime | Yes | |

### Relationships
- **Belongs to** Questionnaire
- **Belongs to** Enumerator
- **Belongs to** Study
- **Has many** Submissions

### Business Rules
- An assignment cannot exceed the study sample allocation for that area.
- If due date passes and completion < target, status becomes Overdue.
- Completed assignments can be reassigned for quality re-collection.

---

## 14. Sample / Population

### Description
The sampling design for a study, including population definition, sampling frame, sample size calculation, and selection method.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | |
| targetPopulation | Text | Yes | Inclusion/exclusion criteria |
| samplingFrame | Text | Yes | Source of sampling units |
| samplingMethod | Enum | Yes | From sampling types |
| sampleSize | Integer | Yes | Planned sample |
| achievedSample | Integer | No | Actual collected |
| confidenceLevel | Decimal | Yes | Typically 0.95 |
| marginOfError | Decimal | Yes | Typically 0.05 |
| designEffect | Decimal | Conditional | For cluster designs |
| powerLevel | Decimal | Conditional | For hypothesis testing |
| stratificationVariables | JSON | No | Strata definitions |
| clusterDefinition | Text | No | Cluster description |
| clusterCount | Integer | No | Number of clusters |
| samplingWeights | JSON | No | Weight variable definitions |
| selectionProbability | Decimal | No | For PPS designs |
| replacementStrategy | Text | No | How to handle non-response |
| isWeighted | Boolean | Yes | |
| createdAt | DateTime | Yes | |
| updatedAt | DateTime | Yes | |

### Sampling Unit (child entity)

| Attribute | Type | Description |
|-----------|------|-------------|
| id | UUID | |
| unitId | String(100) | External identifier |
| strataCode | String(50) | Stratum assignment |
| clusterCode | String(50) | Cluster assignment |
| selectionWeight | Decimal | Sampling weight |
| status | Enum | Selected, Contacted, Participated, Refused, Not_Found |
| replacementUnitId | UUID | Linked replacement |
| gps | GeoJSON | GPS coordinate |

### Relationships
- **Belongs to** Study
- **Has many** Sampling Units (selected units)
- **Has many** Submissions (linked via respondent/sample unit)

### Business Rules
- Sampling method must be justified in the study methodology.
- Sample size calculation must show all parameters used.
- Design effect must be specified for cluster designs.
- Non-response rate must be estimated and accounted for in sample size.
- Sampling weights documentation must be reproducible.
- Replacement units must follow pre-defined protocol (no ad-hoc substitution).

---

## 15. Qualitative Data

### Description
Non-numeric data collected through interviews, focus groups, observations, or document review.

### Entity Hierarchy

| Entity | Description | Attributes |
|--------|-------------|------------|
| QualitativeSession | A data collection event (FGD, KII, etc.) | id, studyId, sessionType, date, location, duration, facilitatorId, noteTakerId, participantCount, language, consentObtained, transcriptStatus |
| Transcript | Verbatim or summarized record | id, sessionId, language, format, wordCount, transcriberId, reviewedById, verificationStatus |
| Code | Thematic code applied to text | id, code, definition, parentCodeId, codeType (deductive/inductive), color |
| CodedSegment | Application of code to transcript segment | id, transcriptId, codeId, startPosition, endPosition, segmentText, coderId, timestamp, confidenceScore |
| Theme | Higher-level analytical abstraction | id, name, definition, parentThemeId, generatedBy (human/AI), isReviewed |
| Memo | Analytical memo/reflection | id, title, content, authorId, linkedTo (session/theme/code), isPrivate, createdAt |

### Relationships
- **Belongs to** Study
- **Has many** Transcripts
- **Has many** Codes (codebook)
- **Has many** Themes
- **Has many** Memos

### Business Rules
- All qualitative sessions require informed consent documentation.
- Transcripts must be verified by a second reviewer for accuracy.
- Deductive codes should be defined before coding begins (from conceptual framework).
- Inductive codes must be grounded in data (emergent).
- Intercoder reliability should be measured (Cohen's Kappa, % agreement).
- At least 10% of transcripts should be double-coded for quality.
- Audit trail must track code creation, modification, and application.

---

## 16. Dashboard / Report

### Description
Structured outputs for data visualization, stakeholder communication, and decision-making.

### Dashboard Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | |
| title | String(300) | Yes | |
| dashboardType | Enum | Yes | Operational, Analytical, Executive, Donor |
| layout | JSON | Yes | Grid/widget configuration |
| isPublic | Boolean | No | Public sharing |
| refreshInterval | Integer | No | Minutes for auto-refresh |
| createdAt | DateTime | Yes | |
| updatedAt | DateTime | Yes | |

### Dashboard Widget (child entity)

| Attribute | Type | Description |
|-----------|------|-------------|
| id | UUID | |
| widgetType | Enum | Chart, Table, Indicator, Map, Text, KPI |
| title | String(200) | |
| dataSource | JSON | Data configuration |
| visualizationConfig | JSON | Chart type, colors, etc. |
| size | JSON | Width/height in grid |
| position | JSON | Grid coordinates |

### Report Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | |
| title | String(500) | Yes | |
| reportType | Enum | Yes | Technical, Executive, Donor, Policy Brief, Research Brief, Evaluation Report |
| status | Enum | Yes | Draft, Under_Review, Approved, Published |
| templateId | UUID | No | Report template used |
| generatedBy | Enum | Yes | Human, AI-assisted, Auto-generated |
| language | String(10) | Yes | |
| isPublic | Boolean | No | |
| publishedAt | DateTime | No | |
| createdAt | DateTime | Yes | |

### Report Section (child entity)

| Attribute | Type | Description |
|-----------|------|-------------|
| id | UUID | |
| title | String(300) | |
| content | RichText | Report body |
| orderIndex | Integer | |
| includesIndicatorIds | UUID[] | Referenced indicators |
| includesChartIds | UUID[] | Embedded visualizations |

### Relationships
- **Belongs to** Project OR Study
- **Has many** Widgets (dashboard)
- **Has many** Sections (report)
- **References** Indicators
- **References** Knowledge Items

### Business Rules
- Reports must follow organization-approved templates.
- Donor reports must comply with specific donor formats.
- Data in reports must be traceable to source indicators.
- Executive summaries must be ≤2 pages.
- Charts must include source, period, and methodology notes.

---

## 17. AI Insight / Recommendation

### Description
Intelligence generated by the AI layer to support research decisions.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | |
| insightType | Enum | Yes | Recommendation, Flag, Suggestion, Alert, Summary, Prediction |
| category | Enum | Yes | Methodology, Data_Quality, Analysis, Reporting, Ethics, Sampling, Design |
| title | String(300) | Yes | |
| content | Text | Yes | The insight/recommendation |
| evidence | Text | Yes | Basis for the insight |
| confidenceScore | Decimal | Yes | 0-1 scale |
| methodologicalJustification | Text | Yes | Why methodologically sound |
| assumptions | Text[] | Yes | Assumptions underlying the insight |
| limitations | Text[] | Yes | Known limitations |
| risks | Text[] | Yes | Identified risks |
| alternativeApproaches | Text[] | Yes | Other valid approaches |
| relevantStandards | String[] | Yes | MERL standards referenced |
| suggestedNextSteps | Text[] | Yes | Recommended actions |
| status | Enum | Yes | Pending, Accepted, Rejected, Implemented |
| reviewedByUserId | UUID | No | Human reviewer |
| reviewedAt | DateTime | No | |
| sourceEntityType | String | Yes | What entity triggered this (Questionnaire, Indicator, etc.) |
| sourceEntityId | UUID | Yes | The specific entity |
| modelVersion | String(50) | Yes | AI model version |
| createdAt | DateTime | Yes | |

### Relationships
- **Belongs to** Study OR Project
- **Belongs to** Source Entity (polymorphic)
- **Has many** Follow-up Actions
- **Has many** Audit Events

### Business Rules
- Every AI insight must include evidence and methodological justification.
- Never present AI insights as definitive; always note confidence and limitations.
- All AI recommendations must be reviewed by a human before action.
- Rejected insights must capture the reason for rejection.
- Confidence <0.5 insights are surfaced as suggestions, not recommendations.
- Insights must be traceable to the specific AI model version.

---

## 18. Knowledge / Lesson Learned

### Description
Captured institutional knowledge from research activities.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | |
| knowledgeType | Enum | Yes | Lesson_Learned, Best_Practice, Challenge, Recommendation, Case_Study, Experience |
| title | String(500) | Yes | |
| content | Text | Yes | Detailed description |
| context | Text | Yes | When/where/why it occurred |
| category | String(100) | Yes | Methodology, Field_Operations, Data_Quality, Ethics, etc. |
| tags | String[] | Yes | Searchable keywords |
| isVerified | Boolean | Yes | QA-verified |
| isActionable | Boolean | Yes | Can be applied elsewhere |
| applicability | Text | No | Conditions for reuse |
| relatedStandards | String[] | No | |
| sourceStudyId | UUID | Yes | Originating study |
| submittedByUserId | UUID | Yes | Who captured it |
| reviewedByUserId | UUID | No | QA reviewer |
| status | Enum | Yes | Draft, Under_Review, Approved, Archived |
| createdAt | DateTime | Yes | |
| updatedAt | DateTime | Yes | |

### Relationships
- **Belongs to** Study
- **Belongs to** Project
- **Can reference** Indicators, Questionnaires, Reports
- **Has many** Related Knowledge Items (links)

### Business Rules
- Lessons learned must be evidence-based, not anecdotal.
- Each lesson must include context—without context, knowledge is not reusable.
- At least one reviewer must verify the lesson before approval.
- Lessons should be tagged for findability.
- Applicability conditions must be stated so others know when to use.
- Knowledge items should be reviewed periodically for relevance.

---

## 19. Audit Event

### Description
Immutable record of every significant action in the platform for governance, accountability, and reproducibility.

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | |
| eventType | Enum | Yes | Create, Read, Update, Delete, Approve, Reject, Submit, Export, Share, Login |
| entityType | String(100) | Yes | Affected entity class |
| entityId | UUID | Yes | Affected entity ID |
| userId | UUID | Yes | Acting user |
| userRole | String(50) | Yes | Role at time of action |
| organizationId | UUID | Yes | |
| projectId | UUID | No | |
| studyId | UUID | No | |
| changes | JSON | No | Before/after values (for updates) |
| metadata | JSON | No | IP, user agent, device, location |
| ipAddress | String(45) | Yes | |
| userAgent | String(500) | No | |
| deviceId | String(200) | No | |
| geoLocation | GeoJSON | No | |
| isSystemAction | Boolean | Yes | System vs. user |
| checksum | String(64) | Yes | SHA-256 of record for integrity |
| timestamp | DateTime | Yes | |


### Relationships
- **Polymorphic** to any entity type

### Business Rules
- Audit events are append-only; never delete or modify.
- All state-changing operations on core entities must be logged.
- Data export/download must be logged with record count.
- User authentication events (login, logout, failed login) are required.
- Audit logs must be retained per regulatory requirements (minimum 5 years, typically 7).
- Checksum enables tamper detection; periodic integrity verification recommended.
- PII access must be specifically audited (who accessed what data).

---

## 20. Cross-cutting Entities

### 20.1 Consent Record

| Attribute | Type | Description |
|-----------|------|-------------|
| id | UUID | |
| respondentId | String(100) | |
| studyId | UUID | |
| consentType | Enum | Informed, Parental, Community, Gatekeeper |
| consentGiven | Boolean | |
| consentDate | DateTime | |
| consentMethod | Enum | Written_signature, Verbal_witnessed, Digital |
| witnessId | String(100) | |
| documentUrl | String | Scanned consent form |
| withdrawalDate | DateTime | If consent withdrawn |
| withdrawalReason | Text | |

### 20.2 Data Quality Check Result

| Attribute | Type | Description |
|-----------|------|-------------|
| id | UUID | |
| submissionId | UUID | |
| checkType | Enum | Completeness, Consistency, Range, GPS, Duration, Duplicate, Outlier, Straightlining |
| status | Enum | Pass, Warn, Fail |
| score | Decimal | 0-100 quality score |
| details | JSON | |
| automated | Boolean | |
| reviewedById | UUID | |
| reviewedAt | DateTime | |

### 20.3 Notification

| Attribute | Type | Description |
|-----------|------|-------------|
| id | UUID | |
| userId | UUID | |
| type | Enum | Alert, Reminder, Approval, Rejection, Flag, System |
| title | String(200) | |
| body | Text | |
| isRead | Boolean | |
| channel | Enum | In_app, Email, SMS, Push |
| sentAt | DateTime | |
| readAt | DateTime | |

---

## Entity Relationship Summary

```
Organization
└── Project
    ├── Study
    │   ├── TheoryOfChange (multiple versions)
    │   ├── LogicalFramework
    │   ├── SamplingPlan
    │   │   └── SamplingUnit
    │   ├── Questionnaire
    │   │   ├── Section
    │   │   │   └── Question
    │   │   ├── Question
    │   │   ├── Translation
    │   │   └── Submission
    │   │       └── ResponseValue
    │   ├── QualitativeSession
    │   │   ├── Transcript
    │   │   │   └── CodedSegment
    │   │   ├── Code
    │   │   ├── Theme
    │   │   └── Memo
    │   ├── Indicator (study-level)
    │   ├── AIInsight
    │   ├── KnowledgeItem
    │   ├── Dashboard
    │   └── Report
    ├── Indicator (project-level)
    └── Team
        └── Enumerator
            └── Assignment
                └── Submission

Organization
├── User (membership with roles)
└── IndicatorLibrary
    └── Indicator (shared)

Cross-cutting:
AuditEvent → any entity
ConsentRecord → Submission
DataQualityCheckResult → Submission
Notification → User
```

---

## Key Constraints Summary

| Constraint | Description |
|------------|-------------|
| Immutability | Submissions, audit events, and published questionnaire versions are immutable |
| Idempotency | Submissions use client-generated submissionId for safe retry |
| Encryption | PII data encrypted at rest; media integrity via SHA-256 |
| Temporal | Every entity has createdAt/updatedAt; submissions have startedAt/completedAt |
| Versioning | Questionnaires, ToC, LogFrame, Reports support versioned iteration |
| Soft-delete | All core entities use isActive/isArchived, not hard delete |
| Audit | Every state change is logged with full context |
| Compliance | Donor framework requirements enforced at Project level |
| Ethics | Consent required before data collection; withdrawal must be respected |
