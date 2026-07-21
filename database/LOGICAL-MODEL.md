# Merline Logical Data Model

## Overview

This document defines the complete logical data model for the Merline MERL platform. It covers all entities, attributes, relationships, cardinalities, constraints, and lifecycle states across 12 domain modules. The model synthesizes inputs from Product (CPA), Architecture (PSA), and the MERL Domain Expert.

**Total entities**: 72 (core domain) + 12 (system/infrastructure) = 84
**MVP subset**: 48 entities (tables critical for Phase 1)

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **UUIDv7** for all primary keys | Time-ordered, globally unique, offline-generation safe. Aligns with PSA ADR-004. |
| **Schema-per-tenant** isolation | Every tenant gets dedicated schema. Global `public` schema for cross-tenant entities. |
| **Soft deletes** everywhere | `deleted_at` timestamp on all domain entities. Hard delete only via lifecycle cron jobs. |
| **Polymorphic relationships** limited | Used only where genuinely polymorphic (AuditEvent, Media). Avoided elsewhere for query clarity. |
| **JSONB for flexible attributes** | Survey question options, validation rules, widget configs, disaggregation specs — where schema is truly dynamic. |
| **Versioning via immutable rows** | Key entities (Questionnaire, Indicator, ToC, Report) create new version rows rather than updating in place. |
| **Enum types via domain tables** | Reusable lookup tables for study types, indicator levels, question types, etc. |
| **PII encryption at application level** | Sensitive columns identified with `is_personal_data` flag; encrypted at rest via Laravel casts. |
| **Audit via triggers + app layer** | All state changes captured in `audit_events` table. Append-only, checksum-verified. |

---

## Domain Module 1: Organization & Access

### Entity: organizations
The top-level tenant. Each organization is fully isolated in its own database schema.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | Primary key |
| name | VARCHAR(300) | NO | — | Legal or operating name |
| slug | VARCHAR(100) | NO | — | URL-friendly identifier, unique |
| short_name | VARCHAR(50) | YES | NULL | Acronym or abbreviation |
| org_type | organization_type | NO | — | NGO, Government, Academic, Private, Multilateral, Donor |
| country | VARCHAR(100) | NO | — | Primary country of registration |
| region | VARCHAR(100) | YES | NULL | Operational region |
| website | VARCHAR(500) | YES | NULL | Official URL |
| logo_url | VARCHAR(500) | YES | NULL | Media reference |
| tax_id | VARCHAR(50) | YES | NULL | Tax registration |
| donor_id | VARCHAR(50) | YES | NULL | Donor registry ID |
| settings | JSONB | NO | '{}' | Feature flags, localization, defaults |
| donor_compliance | JSONB | YES | NULL | Donor framework config (USAID, EU, UN, etc.) |
| is_active | BOOLEAN | NO | TRUE | Soft-delete flag |
| parent_org_id | UUIDv7 | YES | NULL | Self-referential hierarchy |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**Uniques**: UK_org_slug (slug), UK_org_name (name, deleted_at)
**Indexes**: IX_org_type (org_type), IX_org_country (country)
**FK**: parent_org_id → organizations(id) ON DELETE SET NULL

**Lifecycle**: Active → Suspended → Archived | Active → Merged

---

### Entity: users
Platform users. Stored in `public` schema. Membership in organizations via `organization_user` pivot.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | Primary key |
| email | VARCHAR(255) | NO | — | Login identifier, unique |
| password_hash | VARCHAR(255) | NO | — | bcrypt/argon2id hash |
| first_name | VARCHAR(100) | NO | — | |
| last_name | VARCHAR(100) | NO | — | |
| phone | VARCHAR(30) | YES | NULL | |
| title | VARCHAR(100) | YES | NULL | Job title |
| department | VARCHAR(100) | YES | NULL | |
| locale | VARCHAR(10) | NO | 'en' | Language preference |
| timezone | VARCHAR(50) | NO | 'UTC' | |
| avatar_url | VARCHAR(500) | YES | NULL | |
| email_verified_at | TIMESTAMPTZ | YES | NULL | |
| phone_verified_at | TIMESTAMPTZ | YES | NULL | |
| two_factor_enabled | BOOLEAN | NO | FALSE | |
| last_login_at | TIMESTAMPTZ | YES | NULL | |
| is_active | BOOLEAN | NO | TRUE | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**Uniques**: UK_user_email (email)
**Indexes**: IX_user_name (first_name, last_name), IX_user_locale (locale)

**Lifecycle**: Invited → Active → Suspended → Deactivated

---

### Entity: organization_user
Many-to-many relationship between users and organizations. Carries role and status.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | Primary key |
| organization_id | UUIDv7 | NO | — | FK to organizations |
| user_id | UUIDv7 | NO | — | FK to users |
| role | user_role | NO | — | Org-specific role |
| status | membership_status | NO | 'active' | Active, Suspended, Invited |
| invited_by | UUIDv7 | YES | NULL | Who sent invitation |
| invited_at | TIMESTAMPTZ | YES | NULL | |
| joined_at | TIMESTAMPTZ | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**Uniques**: UK_org_user (organization_id, user_id, deleted_at)
**FK**: organization_id → organizations(id) ON DELETE CASCADE
**FK**: user_id → users(id) ON DELETE CASCADE

---

### Entity: roles
Predefined roles with scoped permissions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| name | VARCHAR(100) | NO | — | 'SystemAdmin', 'OrgAdmin', 'Researcher', etc. |
| scope | role_scope | NO | — | 'global', 'organization', 'project', 'study' |
| description | TEXT | YES | NULL | |
| is_system | BOOLEAN | NO | FALSE | System-managed (not deletable) |
| permissions | JSONB | NO | '[]' | Array of permission strings |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**Uniques**: UK_role_name (name)

---

### Entity: permissions
Individual permission definitions used in role-based access control.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| name | VARCHAR(150) | NO | — | 'study.create', 'submission.view', etc. |
| group | VARCHAR(100) | NO | — | 'studies', 'submissions', 'indicators', etc. |
| description | TEXT | YES | NULL | |

**Uniques**: UK_perm_name (name)

---

### Entity: teams
Field teams within an organization. Used to organize enumerators.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| organization_id | UUIDv7 | NO | — | |
| name | VARCHAR(200) | NO | — | |
| description | TEXT | YES | NULL | |
| supervisor_id | UUIDv7 | YES | NULL | FK to users |
| region | VARCHAR(200) | YES | NULL | Operational area |
| is_active | BOOLEAN | NO | TRUE | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**FK**: organization_id → organizations(id) ON DELETE CASCADE
**FK**: supervisor_id → users(id) ON DELETE SET NULL

---

### Entity: team_members
Membership of users in teams.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| team_id | UUIDv7 | NO | — | |
| user_id | UUIDv7 | NO | — | |
| role_in_team | VARCHAR(50) | NO | 'member' | 'supervisor', 'lead', 'member' |
| joined_at | TIMESTAMPTZ | NO | NOW() | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**Uniques**: UK_team_member (team_id, user_id)
**FK**: team_id → teams(id) ON DELETE CASCADE
**FK**: user_id → users(id) ON DELETE CASCADE

---

## Domain Module 2: Project & Study

### Entity: projects
A funded initiative containing one or more studies.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| organization_id | UUIDv7 | NO | — | |
| code | VARCHAR(50) | NO | — | Short project code |
| name | VARCHAR(300) | NO | — | |
| description | TEXT | YES | NULL | |
| donor | VARCHAR(200) | YES | NULL | Primary donor/funder |
| grant_reference | VARCHAR(100) | YES | NULL | |
| budget | DECIMAL(15,2) | YES | NULL | |
| currency | CHAR(3) | YES | NULL | ISO 4217 |
| start_date | DATE | NO | — | |
| end_date | DATE | NO | — | |
| status | project_status | NO | 'draft' | |
| country | VARCHAR(100) | YES | NULL | Primary country |
| sector | VARCHAR(100) | YES | NULL | Health, Education, WASH, etc. |
| tags | TEXT[] | YES | NULL | |
| is_active | BOOLEAN | NO | TRUE | |
| created_by | UUIDv7 | NO | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**Uniques**: UK_project_code (organization_id, code, deleted_at)
**FK**: organization_id → organizations(id) ON DELETE CASCADE
**FK**: created_by → users(id) ON DELETE RESTRICT

**Lifecycle**: Draft → Active → Implementation → Closing → Closed → Archived

---

### Entity: studies
The central unit of research activity. Contains all data collection and analysis.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| project_id | UUIDv7 | NO | — | |
| code | VARCHAR(50) | NO | — | Unique per org |
| title | VARCHAR(500) | NO | — | |
| acronym | VARCHAR(30) | YES | NULL | |
| study_type | study_type | NO | — | 22 types defined |
| purpose | TEXT | NO | — | |
| objectives | TEXT[] | NO | — | Array of objective strings |
| research_questions | TEXT[] | NO | — | |
| hypotheses | TEXT[] | YES | NULL | |
| methodology | TEXT | NO | — | Overall methodology |
| population_description | TEXT | NO | — | |
| sample_size | INTEGER | YES | NULL | |
| sampling_method | sampling_method | YES | NULL | |
| location | GEOGRAPHY(POLYGON,4326) | YES | NULL | Study area boundary |
| start_date | DATE | NO | — | |
| end_date | DATE | NO | — | |
| status | study_status | NO | 'concept' | 12-state lifecycle |
| is_active | BOOLEAN | NO | TRUE | |
| created_by | UUIDv7 | NO | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**Uniques**: UK_study_code (organization_id, code, deleted_at) — note: organization_id via project
**FK**: project_id → projects(id) ON DELETE CASCADE
**FK**: created_by → users(id) ON DELETE RESTRICT
**CK**: check (end_date >= start_date)

**Lifecycle**: Concept → Design → Review → Approved → Pre_test → Field → Data_Analysis → Reporting → Dissemination → Closed → Archived

---

### Entity: theory_of_change
Theory of Change framework for a study or project. Versioned.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| to_chaible_type | VARCHAR(100) | NO | — | 'project' or 'study' |
| to_chaible_id | UUIDv7 | NO | — | Polymorphic owner |
| version | INTEGER | NO | 1 | |
| title | VARCHAR(500) | NO | — | |
| description | TEXT | NO | — | |
| assumptions | TEXT[] | YES | NULL | |
| context_analysis | TEXT | YES | NULL | |
| is_current | BOOLEAN | NO | TRUE | |
| created_by | UUIDv7 | NO | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**Uniques**: UK_toc_version (to_chaible_type, to_chaible_id, version)
**FK**: created_by → users(id) ON DELETE RESTRICT

---

### Entity: toc_components
Individual nodes in a Theory of Change (Impact, Outcome, Output, Activity, Input).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| toc_id | UUIDv7 | NO | — | |
| parent_id | UUIDv7 | YES | NULL | Self-referential hierarchy |
| component_type | toc_component_type | NO | — | Impact, Outcome, Output, Activity, Input |
| label | VARCHAR(500) | NO | — | |
| description | TEXT | YES | NULL | |
| order_index | INTEGER | NO | 0 | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: toc_id → theory_of_change(id) ON DELETE CASCADE
**FK**: parent_id → toc_components(id) ON DELETE CASCADE

---

### Entity: logical_frameworks
Logical Framework matrix for a study or project. Versioned.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| logframe_able_type | VARCHAR(100) | NO | — | |
| logframe_able_id | UUIDv7 | NO | — | |
| version | INTEGER | NO | 1 | |
| title | VARCHAR(500) | NO | — | |
| is_current | BOOLEAN | NO | TRUE | |
| created_by | UUIDv7 | NO | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |

**Uniques**: UK_lf_version (logframe_able_type, logframe_able_id, version)

---

### Entity: logframe_rows
Individual rows in a LogFrame matrix (Goal, Purpose, Outputs, Activities).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| logframe_id | UUIDv7 | NO | — | |
| level | logframe_level | NO | — | Goal, Purpose, Output, Activity |
| narrative_summary | TEXT | NO | — | |
| means_of_verification | TEXT | YES | NULL | |
| assumptions | TEXT | YES | NULL | |
| order_index | INTEGER | NO | 0 | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: logframe_id → logical_frameworks(id) ON DELETE CASCADE

---

## Domain Module 3: Indicators

### Entity: indicator_libraries
Shared collections of reusable indicator definitions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| organization_id | UUIDv7 | NO | — | |
| name | VARCHAR(200) | NO | — | |
| description | TEXT | YES | NULL | |
| version | INTEGER | NO | 1 | |
| is_public | BOOLEAN | NO | FALSE | |
| sector | TEXT[] | YES | NULL | |
| source | VARCHAR(200) | YES | NULL | WHO, USAID, etc. |
| created_by | UUIDv7 | NO | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**FK**: organization_id → organizations(id) ON DELETE CASCADE

---

### Entity: indicators
The most critical entity. Measures change toward a result. Versioned.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| indicator_able_type | VARCHAR(100) | NO | — | 'project', 'study', or 'library' |
| indicator_able_id | UUIDv7 | NO | — | Polymorphic owner |
| library_id | UUIDv7 | YES | NULL | If imported from library |
| code | VARCHAR(50) | NO | — | Unique per org |
| version | INTEGER | NO | 1 | |
| name | VARCHAR(300) | NO | — | |
| short_name | VARCHAR(100) | YES | NULL | |
| definition | TEXT | NO | — | |
| purpose | TEXT | NO | — | |
| indicator_type | indicator_type | NO | — | Quantitative, Qualitative, Proxy, Composite |
| level | indicator_level | NO | — | Impact, Outcome, Output, Process, Input |
| sub_type | VARCHAR(50) | NO | — | Count, Proportion, Percentage, Rate, etc. |
| unit | VARCHAR(100) | YES | NULL | |
| unit_of_measurement | VARCHAR(100) | NO | — | |
| direction | indicator_direction | NO | — | Positive, Negative, Neutral |
| frequency | indicator_frequency | NO | — | |
| is_calculated | BOOLEAN | NO | FALSE | |
| calculation_formula | TEXT | YES | NULL | |
| numerator | TEXT | YES | NULL | |
| denominator | TEXT | YES | NULL | |
| component_indicator_ids | UUID[] | YES | NULL | For composite indicators |
| aggregation_method | VARCHAR(50) | YES | NULL | |
| weights | JSONB | YES | NULL | |
| data_source | TEXT | NO | — | |
| data_source_type | data_source_type | NO | — | Survey, Admin, etc. |
| collection_method | VARCHAR(200) | YES | NULL | |
| baseline_value | DECIMAL(20,6) | YES | NULL | |
| baseline_year | INTEGER | YES | NULL | |
| target_value | DECIMAL(20,6) | YES | NULL | |
| target_year | INTEGER | YES | NULL | |
| threshold_minimum | DECIMAL(20,6) | YES | NULL | |
| threshold_maximum | DECIMAL(20,6) | YES | NULL | |
| disaggregations | JSONB | YES | NULL | Required/optional dimensions |
| sector | TEXT[] | YES | NULL | |
| sdg_goals | INTEGER[] | YES | NULL | |
| sdg_targets | TEXT[] | YES | NULL | |
| donor_framework | TEXT[] | YES | NULL | |
| is_kpi | BOOLEAN | NO | FALSE | |
| is_donor_reporting | BOOLEAN | NO | FALSE | |
| data_quality_checks | JSONB | YES | NULL | |
| status | indicator_status | NO | 'draft' | |
| created_by | UUIDv7 | NO | — | |
| reviewed_by | UUIDv7 | YES | NULL | |
| approved_by | UUIDv7 | YES | NULL | |
| approval_date | TIMESTAMPTZ | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |
| version_notes | TEXT | YES | NULL | |

**Uniques**: UK_indicator_code (organization_id, code, deleted_at)
**FK**: created_by → users(id), reviewed_by → users(id), approved_by → users(id)

**Lifecycle**: Draft → Under_Review → Approved → Active → Deprecated → Archived

---

### Entity: indicator_disaggregations
Defined disaggregation dimensions for an indicator.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| indicator_id | UUIDv7 | NO | — | |
| dimension | VARCHAR(100) | NO | — | 'Sex', 'Age Group', 'Region' |
| categories | TEXT[] | NO | — | e.g., ['Male', 'Female'] |
| is_required | BOOLEAN | NO | TRUE | |
| order_index | INTEGER | NO | 0 | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: indicator_id → indicators(id) ON DELETE CASCADE

---

### Entity: indicator_values
Time-series measurements of indicator values.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| indicator_id | UUIDv7 | NO | — | |
| project_id | UUIDv7 | YES | NULL | |
| study_id | UUIDv7 | YES | NULL | |
| value | DECIMAL(20,6) | YES | NULL | |
| value_qualitative | TEXT | YES | NULL | For qualitative indicators |
| numerator_value | DECIMAL(20,6) | YES | NULL | |
| denominator_value | DECIMAL(20,6) | YES | NULL | |
| confidence_low | DECIMAL(20,6) | YES | NULL | |
| confidence_high | DECIMAL(20,6) | YES | NULL | |
| standard_error | DECIMAL(20,6) | YES | NULL | |
| sample_size | INTEGER | YES | NULL | |
| period | VARCHAR(50) | NO | — | 'Q1 2025', 'Annual 2025' |
| period_start | DATE | NO | — | |
| period_end | DATE | NO | — | |
| geographic_level | VARCHAR(50) | YES | NULL | |
| geographic_code | VARCHAR(50) | YES | NULL | |
| disaggregation_dimension | VARCHAR(100) | YES | NULL | |
| disaggregation_category | VARCHAR(100) | YES | NULL | |
| is_baseline | BOOLEAN | NO | FALSE | |
| is_target | BOOLEAN | NO | FALSE | |
| is_actual | BOOLEAN | NO | TRUE | |
| is_estimated | BOOLEAN | NO | FALSE | |
| data_source | VARCHAR(300) | YES | NULL | |
| collection_date | DATE | NO | — | |
| reported_by | UUIDv7 | YES | NULL | |
| verified_by | UUIDv7 | YES | NULL | |
| status | indicator_value_status | NO | 'draft' | |
| notes | TEXT | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: indicator_id → indicators(id) ON DELETE CASCADE
**FK**: project_id → projects(id) ON DELETE SET NULL
**FK**: study_id → studies(id) ON DELETE SET NULL

---

## Domain Module 4: Questionnaires & Questions

### Entity: questionnaires
A structured data collection instrument.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| study_id | UUIDv7 | NO | — | |
| code | VARCHAR(50) | NO | — | |
| title | VARCHAR(500) | NO | — | |
| description | TEXT | YES | NULL | |
| survey_type | survey_type | NO | — | Household, KAP, FGD, KII, etc. |
| mode | survey_mode | NO | — | CAPI, PAPI, CATI, CAWI, Mixed |
| language | VARCHAR(10) | NO | — | Primary language ISO code |
| estimated_duration_minutes | INTEGER | YES | NULL | |
| version | INTEGER | NO | 1 | |
| is_current | BOOLEAN | NO | TRUE | |
| is_pretested | BOOLEAN | NO | FALSE | |
| approval_status | questionnaire_status | NO | 'draft' | |
| created_by | UUIDv7 | NO | — | |
| published_at | TIMESTAMPTZ | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**Uniques**: UK_qnr_code (study_id, code, version)
**FK**: study_id → studies(id) ON DELETE CASCADE
**CK**: Once published, version is immutable

**Lifecycle**: Draft → Peer_Review → Pre_test → Approved → Published → Field_Active → Closed → Archived

---

### Entity: sections
Logical grouping of questions within a questionnaire.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| questionnaire_id | UUIDv7 | NO | — | |
| parent_section_id | UUIDv7 | YES | NULL | For nested sections |
| code | VARCHAR(50) | NO | — | 'SEC-A', 'SEC-B' |
| title | VARCHAR(300) | NO | — | |
| description | TEXT | YES | NULL | |
| order_index | INTEGER | NO | 0 | |
| is_repeatable | BOOLEAN | NO | FALSE | |
| repeat_label | VARCHAR(100) | YES | NULL | |
| max_repetitions | INTEGER | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: questionnaire_id → questionnaires(id) ON DELETE CASCADE
**FK**: parent_section_id → sections(id) ON DELETE SET NULL

---

### Entity: questions
A single data point. Supports 23+ types with type-specific validation.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| section_id | UUIDv7 | NO | — | |
| code | VARCHAR(50) | NO | — | 'Q01', 'Q02' |
| text | TEXT | NO | — | |
| help_text | TEXT | YES | NULL | |
| question_type | question_type | NO | — | 24 types |
| is_required | BOOLEAN | NO | FALSE | |
| is_personal_data | BOOLEAN | NO | FALSE | Triggers PII handling |
| is_sensitive | BOOLEAN | NO | FALSE | |
| options | JSONB | YES | NULL | For select/Likert/ranking |
| validation_rules | JSONB | YES | NULL | Type-specific rules |
| attachment_types | TEXT[] | YES | NULL | For media questions |
| min_value | DECIMAL(20,6) | YES | NULL | |
| max_value | DECIMAL(20,6) | YES | NULL | |
| min_length | INTEGER | YES | NULL | |
| max_length | INTEGER | YES | NULL | |
| decimal_places | INTEGER | YES | NULL | |
| gps_accuracy_target | DECIMAL(10,2) | YES | NULL | |
| image_resolution | VARCHAR(20) | YES | NULL | |
| order_index | INTEGER | NO | 0 | |
| indent_level | INTEGER | NO | 0 | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |

**Uniques**: UK_qnr_question_code (section_id, code)
**FK**: section_id → sections(id) ON DELETE CASCADE

---

### Entity: question_options
Individual options for choice-based questions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| question_id | UUIDv7 | NO | — | |
| value | VARCHAR(100) | NO | — | |
| label | TEXT | NO | — | |
| label_translations | JSONB | YES | NULL | Language → translated label |
| order_index | INTEGER | NO | 0 | |
| is_exclusive | BOOLEAN | NO | FALSE | For "None of the above" |
| has_specify | BOOLEAN | NO | FALSE | 'Other (specify)' |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: question_id → questions(id) ON DELETE CASCADE

---

### Entity: skip_logic
Conditional branching rules.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| questionnaire_id | UUIDv7 | NO | — | |
| source_question_id | UUIDv7 | NO | — | Trigger question |
| target_question_id | UUIDv7 | NO | — | Skip destination |
| condition | JSONB | NO | — | Expression tree |
| logic_type | VARCHAR(20) | NO | 'skip' | 'skip', 'show', 'calculate' |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: questionnaire_id → questionnaires(id) ON DELETE CASCADE
**FK**: source_question_id → questions(id) ON DELETE CASCADE
**FK**: target_question_id → questions(id) ON DELETE CASCADE

---

### Entity: question_translations
Multi-language translations for questions and options.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| question_id | UUIDv7 | NO | — | |
| language | VARCHAR(10) | NO | — | ISO 639-1 |
| text | TEXT | NO | — | Translated question text |
| help_text | TEXT | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**Uniques**: UK_question_translation (question_id, language)
**FK**: question_id → questions(id) ON DELETE CASCADE

---

### Entity: question_indicator_map
Links questions to the indicators they measure.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| question_id | UUIDv7 | NO | — | |
| indicator_id | UUIDv7 | NO | — | |
| mapping_type | VARCHAR(50) | NO | 'direct' | 'direct', 'derived', 'contextual' |
| weight | DECIMAL(5,2) | YES | NULL | For composite scoring |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**Uniques**: UK_question_indicator (question_id, indicator_id)
**FK**: question_id → questions(id) ON DELETE CASCADE
**FK**: indicator_id → indicators(id) ON DELETE CASCADE

---

## Domain Module 5: Submissions & Responses

### Entity: submissions
A completed questionnaire instance. Immutable once submitted.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| submission_id | VARCHAR(100) | NO | — | Client-generated idempotency key |
| questionnaire_id | UUIDv7 | NO | — | |
| study_id | UUIDv7 | NO | — | |
| assignment_id | UUIDv7 | YES | NULL | |
| enumerator_id | UUIDv7 | YES | NULL | |
| respondent_id | VARCHAR(100) | YES | NULL | External identifier |
| status | submission_status | NO | 'draft' | |
| location | GEOGRAPHY(POINT,4326) | YES | NULL | |
| device_id | VARCHAR(200) | YES | NULL | |
| app_version | VARCHAR(20) | YES | NULL | |
| form_version | INTEGER | NO | — | |
| started_at | TIMESTAMPTZ | YES | NULL | |
| completed_at | TIMESTAMPTZ | NO | — | |
| duration_seconds | INTEGER | YES | NULL | |
| is_synced | BOOLEAN | NO | FALSE | |
| synced_at | TIMESTAMPTZ | YES | NULL | |
| validation_status | validation_status | NO | 'pending' | |
| flagged_for_review | BOOLEAN | NO | FALSE | |
| notes | TEXT | YES | NULL | |
| is_test | BOOLEAN | NO | FALSE | |
| checksum | VARCHAR(64) | YES | NULL | SHA-256 of response payload |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**Uniques**: UK_submission_id (submission_id) — global idempotency
**FK**: questionnaire_id → questionnaires(id) ON DELETE RESTRICT
**FK**: study_id → studies(id) ON DELETE RESTRICT
**FK**: assignment_id → assignments(id) ON DELETE SET NULL
**FK**: enumerator_id → users(id) ON DELETE SET NULL

**Lifecycle**: Draft → Submitted → QA_Review → Approved | Rejected → Resubmitted

---

### Entity: response_values
Individual question answers within a submission.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| submission_id | UUIDv7 | NO | — | |
| question_id | UUIDv7 | NO | — | |
| value | JSONB | YES | NULL | Type-coerced response value |
| media_url | VARCHAR(500) | YES | NULL | |
| media_hash | VARCHAR(64) | YES | NULL | SHA-256 |
| media_metadata | JSONB | YES | NULL | EXIF, GPS, size |
| is_calculated | BOOLEAN | NO | FALSE | |
| flagged | BOOLEAN | NO | FALSE | |
| flag_reason | TEXT | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**Uniques**: UK_response (submission_id, question_id)
**FK**: submission_id → submissions(id) ON DELETE CASCADE
**FK**: question_id → questions(id) ON DELETE RESTRICT

---

### Entity: data_quality_checks
Automated quality check results per submission.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| submission_id | UUIDv7 | NO | — | |
| check_type | VARCHAR(50) | NO | — | Completeness, Consistency, Range, GPS, Duration, Duplicate |
| status | VARCHAR(20) | NO | — | Pass, Warn, Fail |
| score | DECIMAL(5,2) | YES | NULL | 0-100 |
| details | JSONB | YES | NULL | Check-specific details |
| is_automated | BOOLEAN | NO | TRUE | |
| reviewed_by | UUIDv7 | YES | NULL | |
| reviewed_at | TIMESTAMPTZ | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: submission_id → submissions(id) ON DELETE CASCADE

---

## Domain Module 6: Enumerator & Field Management

### Entity: enumerators
Field personnel who collect data. Extends user entity.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| user_id | UUIDv7 | NO | — | FK to users |
| team_id | UUIDv7 | YES | NULL | |
| enumerator_code | VARCHAR(50) | NO | — | Field identifier |
| supervisor_id | UUIDv7 | YES | NULL | |
| device_id | VARCHAR(200) | YES | NULL | |
| device_model | VARCHAR(100) | YES | NULL | |
| language_skills | TEXT[] | YES | NULL | |
| training_date | DATE | YES | NULL | |
| training_passed | BOOLEAN | YES | NULL | |
| is_active | BOOLEAN | NO | TRUE | |
| location_tracking | BOOLEAN | NO | FALSE | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**Uniques**: UK_enumerator_code (organization_id, enumerator_code)
**FK**: user_id → users(id) ON DELETE CASCADE
**FK**: team_id → teams(id) ON DELETE SET NULL
**FK**: supervisor_id → users(id) ON DELETE SET NULL

---

### Entity: assignments
Task given to an enumerator to collect specific questionnaires.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| questionnaire_id | UUIDv7 | NO | — | |
| enumerator_id | UUIDv7 | NO | — | |
| study_id | UUIDv7 | NO | — | |
| target_count | INTEGER | NO | — | |
| completed_count | INTEGER | NO | 0 | |
| location | GEOGRAPHY(POLYGON,4326) | YES | NULL | Assigned area |
| due_date | DATE | NO | — | |
| status | assignment_status | NO | 'pending' | |
| notes | TEXT | YES | NULL | |
| created_by | UUIDv7 | NO | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**FK**: questionnaire_id → questionnaires(id) ON DELETE RESTRICT
**FK**: enumerator_id → users(id) ON DELETE CASCADE
**FK**: study_id → studies(id) ON DELETE CASCADE
**FK**: created_by → users(id) ON DELETE RESTRICT

**Lifecycle**: Pending → In_Progress → Completed → Overdue

---

### Entity: enumerator_performance
Performance metrics tracked per enumerator.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| enumerator_id | UUIDv7 | NO | — | |
| study_id | UUIDv7 | NO | — | |
| submissions_count | INTEGER | NO | 0 | |
| avg_duration_seconds | INTEGER | YES | NULL | |
| quality_score | DECIMAL(5,2) | YES | NULL | |
| completeness_rate | DECIMAL(5,2) | YES | NULL | |
| flag_rate | DECIMAL(5,2) | YES | NULL | |
| period_start | DATE | NO | — | |
| period_end | DATE | NO | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |

**Uniques**: UK_enum_perf (enumerator_id, study_id, period_start)
**FK**: enumerator_id → users(id) ON DELETE CASCADE

---

## Domain Module 7: Sampling

### Entity: sampling_plans
Sampling design for a study.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| study_id | UUIDv7 | NO | — | |
| target_population | TEXT | NO | — | |
| sampling_frame | TEXT | NO | — | |
| sampling_method | sampling_method | NO | — | |
| sample_size | INTEGER | NO | — | |
| achieved_sample | INTEGER | YES | NULL | |
| confidence_level | DECIMAL(5,4) | NO | 0.95 | |
| margin_of_error | DECIMAL(5,4) | NO | 0.05 | |
| design_effect | DECIMAL(5,2) | YES | NULL | |
| power_level | DECIMAL(5,4) | YES | NULL | |
| stratification_variables | JSONB | YES | NULL | |
| cluster_definition | TEXT | YES | NULL | |
| cluster_count | INTEGER | YES | NULL | |
| sampling_weights | JSONB | YES | NULL | |
| is_weighted | BOOLEAN | NO | FALSE | |
| replacement_strategy | TEXT | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: study_id → studies(id) ON DELETE CASCADE

---

### Entity: sampling_units
Individual units selected for the sample.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| sampling_plan_id | UUIDv7 | NO | — | |
| unit_id | VARCHAR(100) | NO | — | External identifier |
| strata_code | VARCHAR(50) | YES | NULL | |
| cluster_code | VARCHAR(50) | YES | NULL | |
| selection_weight | DECIMAL(10,6) | YES | NULL | |
| status | sample_unit_status | NO | 'selected' | |
| replacement_unit_id | UUIDv7 | YES | NULL | Self-referential |
| location | GEOGRAPHY(POINT,4326) | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: sampling_plan_id → sampling_plans(id) ON DELETE CASCADE

---

## Domain Module 8: Qualitative Data

### Entity: qualitative_sessions
Data collection events (FGDs, KIIs, observations).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| study_id | UUIDv7 | NO | — | |
| session_type | VARCHAR(50) | NO | — | FGD, KII, Observation, Document_Review |
| date | DATE | NO | — | |
| location | GEOGRAPHY(POINT,4326) | YES | NULL | |
| duration_minutes | INTEGER | YES | NULL | |
| facilitator_id | UUIDv7 | YES | NULL | |
| note_taker_id | UUIDv7 | YES | NULL | |
| participant_count | INTEGER | YES | NULL | |
| language | VARCHAR(10) | YES | NULL | |
| consent_obtained | BOOLEAN | NO | FALSE | |
| transcript_status | VARCHAR(50) | NO | 'pending' | |
| notes | TEXT | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**FK**: study_id → studies(id) ON DELETE CASCADE

---

### Entity: transcripts
Verbatim or summarized records of qualitative sessions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| session_id | UUIDv7 | NO | — | |
| language | VARCHAR(10) | NO | — | |
| format | VARCHAR(20) | NO | 'verbatim' | |
| content | TEXT | NO | — | Full transcript text |
| word_count | INTEGER | YES | NULL | |
| transcriber_id | UUIDv7 | YES | NULL | |
| reviewed_by | UUIDv7 | YES | NULL | |
| verification_status | VARCHAR(50) | NO | 'pending' | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |

**Uniques**: UK_session_lang (session_id, language)
**FK**: session_id → qualitative_sessions(id) ON DELETE CASCADE

---

### Entity: codes
Thematic codes used in qualitative analysis (codebook).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| study_id | UUIDv7 | NO | — | |
| parent_code_id | UUIDv7 | YES | NULL | Hierarchy |
| code | VARCHAR(100) | NO | — | Short code label |
| definition | TEXT | NO | — | |
| code_type | VARCHAR(20) | NO | — | deductive, inductive |
| color | VARCHAR(7) | YES | NULL | Hex color |
| created_by | UUIDv7 | NO | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**Uniques**: UK_code_name (study_id, code)
**FK**: study_id → studies(id) ON DELETE CASCADE

---

### Entity: coded_segments
Application of a code to a specific text segment.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| transcript_id | UUIDv7 | NO | — | |
| code_id | UUIDv7 | NO | — | |
| start_position | INTEGER | NO | — | Character offset |
| end_position | INTEGER | NO | — | Character offset |
| segment_text | TEXT | NO | — | The coded text |
| coder_id | UUIDv7 | NO | — | |
| confidence_score | DECIMAL(3,2) | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: transcript_id → transcripts(id) ON DELETE CASCADE
**FK**: code_id → codes(id) ON DELETE CASCADE

---

### Entity: themes
Higher-level analytical abstractions from coded data.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| study_id | UUIDv7 | NO | — | |
| parent_theme_id | UUIDv7 | YES | NULL | |
| name | VARCHAR(300) | NO | — | |
| definition | TEXT | YES | NULL | |
| generated_by | VARCHAR(20) | NO | 'human' | human, ai |
| is_reviewed | BOOLEAN | NO | FALSE | |
| created_by | UUIDv7 | NO | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: study_id → studies(id) ON DELETE CASCADE

---

### Entity: theme_code_map
Links themes to the codes that constitute them.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| theme_id | UUIDv7 | NO | — | |
| code_id | UUIDv7 | NO | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**Uniques**: UK_theme_code (theme_id, code_id)
**FK**: theme_id → themes(id) ON DELETE CASCADE
**FK**: code_id → codes(id) ON DELETE CASCADE

---

### Entity: memos
Analytical reflections linked to sessions, codes, or themes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| memo_able_type | VARCHAR(100) | NO | — | |
| memo_able_id | UUIDv7 | NO | — | |
| title | VARCHAR(300) | NO | — | |
| content | TEXT | NO | — | |
| author_id | UUIDv7 | NO | — | |
| is_private | BOOLEAN | NO | FALSE | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: author_id → users(id) ON DELETE CASCADE

---

## Domain Module 9: Analytics & Dashboards

### Entity: dashboards
Configurable dashboard definitions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| dashboard_able_type | VARCHAR(100) | NO | — | 'project', 'study', 'organization' |
| dashboard_able_id | UUIDv7 | NO | — | |
| title | VARCHAR(300) | NO | — | |
| dashboard_type | VARCHAR(50) | NO | — | Operational, Analytical, Executive, Donor |
| layout | JSONB | NO | '{}' | Grid/widget configuration |
| is_public | BOOLEAN | NO | FALSE | |
| refresh_interval_minutes | INTEGER | YES | NULL | |
| created_by | UUIDv7 | NO | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**FK**: created_by → users(id)

---

### Entity: dashboard_widgets
Individual widgets within a dashboard.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| dashboard_id | UUIDv7 | NO | — | |
| widget_type | VARCHAR(50) | NO | — | Chart, Table, Indicator, Map, Text, KPI |
| title | VARCHAR(200) | NO | — | |
| data_source | JSONB | NO | — | Query configuration |
| visualization_config | JSONB | NO | — | Chart type, colors, etc. |
| size | JSONB | YES | NULL | Width/height |
| position | JSONB | YES | NULL | Grid coordinates |
| order_index | INTEGER | NO | 0 | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: dashboard_id → dashboards(id) ON DELETE CASCADE

---

### Entity: saved_filters
Saved filter configurations for analytics.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| user_id | UUIDv7 | NO | — | |
| filter_able_type | VARCHAR(100) | NO | — | |
| filter_able_id | UUIDv7 | NO | — | |
| name | VARCHAR(200) | NO | — | |
| filter_config | JSONB | NO | — | |
| is_shared | BOOLEAN | NO | FALSE | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: user_id → users(id) ON DELETE CASCADE

---

## Domain Module 10: Reports

### Entity: report_templates
Reusable report structure templates.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| organization_id | UUIDv7 | NO | — | |
| name | VARCHAR(300) | NO | — | |
| report_type | VARCHAR(50) | NO | — | Technical, Executive, Donor, Policy_Brief |
| template_config | JSONB | NO | — | Sections, styling, layout |
| is_builtin | BOOLEAN | NO | FALSE | |
| created_by | UUIDv7 | NO | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**FK**: organization_id → organizations(id) ON DELETE CASCADE

---

### Entity: reports
Generated report instances.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| report_able_type | VARCHAR(100) | NO | — | 'project', 'study' |
| report_able_id | UUIDv7 | NO | — | |
| template_id | UUIDv7 | YES | NULL | |
| title | VARCHAR(500) | NO | — | |
| report_type | VARCHAR(50) | NO | — | |
| status | report_status | NO | 'draft' | |
| generated_by | VARCHAR(20) | NO | 'human' | human, ai_assisted, auto |
| language | VARCHAR(10) | NO | 'en' | |
| is_public | BOOLEAN | NO | FALSE | |
| published_at | TIMESTAMPTZ | YES | NULL | |
| export_url | VARCHAR(500) | YES | NULL | PDF/DOCX path |
| created_by | UUIDv7 | NO | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**FK**: template_id → report_templates(id) ON DELETE SET NULL
**FK**: created_by → users(id)

**Lifecycle**: Draft → Under_Review → Approved → Published → Archived

---

### Entity: report_sections
Content sections within a report.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| report_id | UUIDv7 | NO | — | |
| title | VARCHAR(300) | NO | — | |
| content | TEXT | YES | NULL | Rich text content |
| order_index | INTEGER | NO | 0 | |
| includes_indicator_ids | UUID[] | YES | NULL | |
| includes_chart_config | JSONB | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: report_id → reports(id) ON DELETE CASCADE

---

## Domain Module 11: AI & Intelligence

### Entity: ai_insights
Intelligence generated by AI for research decisions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| organization_id | UUIDv7 | NO | — | |
| insight_type | VARCHAR(50) | NO | — | Recommendation, Flag, Suggestion, Alert, Summary, Prediction |
| category | VARCHAR(50) | NO | — | Methodology, Data_Quality, Analysis, Reporting, Ethics, Sampling |
| title | VARCHAR(300) | NO | — | |
| content | TEXT | NO | — | |
| evidence | TEXT | NO | — | |
| confidence_score | DECIMAL(3,2) | NO | — | 0-1 |
| status | ai_insight_status | NO | 'pending' | |
| source_entity_type | VARCHAR(100) | NO | — | |
| source_entity_id | UUIDv7 | NO | — | |
| model_version | VARCHAR(50) | NO | — | |
| prompt_version | VARCHAR(50) | YES | NULL | |
| reviewed_by | UUIDv7 | YES | NULL | |
| reviewed_at | TIMESTAMPTZ | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: organization_id → organizations(id) ON DELETE CASCADE

---

### Entity: ai_conversations
User-AI interaction sessions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| user_id | UUIDv7 | NO | — | |
| organization_id | UUIDv7 | NO | — | |
| context_type | VARCHAR(100) | YES | NULL | |
| context_id | UUIDv7 | YES | NULL | |
| title | VARCHAR(300) | YES | NULL | |
| metadata | JSONB | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: user_id → users(id) ON DELETE CASCADE

---

### Entity: ai_messages
Individual messages within AI conversations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| conversation_id | UUIDv7 | NO | — | |
| role | VARCHAR(20) | NO | — | user, assistant, system |
| content | TEXT | NO | — | |
| model | VARCHAR(100) | YES | NULL | |
| tokens_in | INTEGER | YES | NULL | |
| tokens_out | INTEGER | YES | NULL | |
| latency_ms | INTEGER | YES | NULL | |
| cost_usd | DECIMAL(10,6) | YES | NULL | |
| metadata | JSONB | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: conversation_id → ai_conversations(id) ON DELETE CASCADE

---

### Entity: prompt_versions
Versioned prompt templates.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| prompt_key | VARCHAR(100) | NO | — | Unique identifier |
| version | INTEGER | NO | 1 | |
| model | VARCHAR(100) | NO | — | |
| system_prompt | TEXT | NO | — | |
| user_prompt_template | TEXT | NO | — | |
| parameters | JSONB | YES | NULL | Temperature, max_tokens, etc. |
| is_active | BOOLEAN | NO | FALSE | |
| created_by | UUIDv7 | NO | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**Uniques**: UK_prompt_version (prompt_key, version)

---

### Entity: embeddings
Vector embeddings for RAG and semantic search.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| organization_id | UUIDv7 | NO | — | |
| embeddable_type | VARCHAR(100) | NO | — | |
| embeddable_id | UUIDv7 | NO | — | |
| embedding | VECTOR(1536) | NO | — | pgvector |
| content_text | TEXT | YES | NULL | Original text |
| content_hash | VARCHAR(64) | YES | NULL | |
| model | VARCHAR(100) | NO | — | |
| chunk_index | INTEGER | YES | NULL | |
| metadata | JSONB | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: organization_id → organizations(id) ON DELETE CASCADE

---

## Domain Module 12: Knowledge Management

### Entity: knowledge_items
Captured institutional knowledge from research activities.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| organization_id | UUIDv7 | NO | — | |
| source_study_id | UUIDv7 | YES | NULL | |
| source_project_id | UUIDv7 | YES | NULL | |
| knowledge_type | VARCHAR(50) | NO | — | Lesson_Learned, Best_Practice, Challenge, Recommendation, Case_Study |
| title | VARCHAR(500) | NO | — | |
| content | TEXT | NO | — | |
| context | TEXT | NO | — | |
| category | VARCHAR(100) | NO | — | |
| tags | TEXT[] | NO | — | |
| is_verified | BOOLEAN | NO | FALSE | |
| is_actionable | BOOLEAN | NO | FALSE | |
| applicability | TEXT | YES | NULL | |
| related_standards | TEXT[] | YES | NULL | |
| submitted_by | UUIDv7 | NO | — | |
| reviewed_by | UUIDv7 | YES | NULL | |
| status | knowledge_status | NO | 'draft' | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | NO | NOW() | |
| deleted_at | TIMESTAMPTZ | YES | NULL | |

**FK**: organization_id → organizations(id) ON DELETE CASCADE
**FK**: source_study_id → studies(id) ON DELETE SET NULL

---

### Entity: knowledge_links
Cross-references between knowledge items.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| source_item_id | UUIDv7 | NO | — | |
| target_item_id | UUIDv7 | NO | — | |
| relationship_type | VARCHAR(50) | NO | 'related' | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: source_item_id → knowledge_items(id) ON DELETE CASCADE
**FK**: target_item_id → knowledge_items(id) ON DELETE CASCADE

---

## Domain Module 13: Audit & Compliance

### Entity: audit_events
Append-only record of all significant actions. Immutable.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| organization_id | UUIDv7 | NO | — | |
| event_type | VARCHAR(50) | NO | — | Create, Read, Update, Delete, Approve, Reject, Submit, Export |
| entity_type | VARCHAR(100) | NO | — | |
| entity_id | UUIDv7 | NO | — | |
| user_id | UUIDv7 | YES | NULL | |
| user_role | VARCHAR(50) | YES | NULL | Role at time of action |
| project_id | UUIDv7 | YES | NULL | |
| study_id | UUIDv7 | YES | NULL | |
| changes | JSONB | YES | NULL | Before/after diff |
| metadata | JSONB | YES | NULL | IP, user agent, device |
| ip_address | VARCHAR(45) | YES | NULL | |
| user_agent | VARCHAR(500) | YES | NULL | |
| device_id | VARCHAR(200) | YES | NULL | |
| is_system_action | BOOLEAN | NO | FALSE | |
| checksum | VARCHAR(64) | NO | — | SHA-256 of entire row |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**Partitioned by**: month (created_at)
**Note**: TRUNCATE-only for retention. No UPDATE/DELETE allowed.

---

### Entity: consent_records
Informed consent documentation for respondents.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| submission_id | UUIDv7 | YES | NULL | |
| study_id | UUIDv7 | NO | — | |
| respondent_id | VARCHAR(100) | NO | — | |
| consent_type | VARCHAR(50) | NO | — | Informed, Parental, Community, Gatekeeper |
| consent_given | BOOLEAN | NO | — | |
| consent_date | TIMESTAMPTZ | NO | — | |
| consent_method | VARCHAR(50) | NO | — | Written_signature, Verbal_witnessed, Digital |
| witness_id | VARCHAR(100) | YES | NULL | |
| document_url | VARCHAR(500) | YES | NULL | |
| withdrawal_date | TIMESTAMPTZ | YES | NULL | |
| withdrawal_reason | TEXT | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: study_id → studies(id) ON DELETE CASCADE
**FK**: submission_id → submissions(id) ON DELETE SET NULL

---

### Entity: notifications
Multi-channel notifications delivered to users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| organization_id | UUIDv7 | NO | — | |
| user_id | UUIDv7 | NO | — | |
| type | VARCHAR(50) | NO | — | Alert, Reminder, Approval, Rejection, Flag, System |
| title | VARCHAR(200) | NO | — | |
| body | TEXT | YES | NULL | |
| channel | VARCHAR(20) | NO | 'in_app' | In_app, Email, SMS, Push |
| is_read | BOOLEAN | NO | FALSE | |
| sent_at | TIMESTAMPTZ | NO | NOW() | |
| read_at | TIMESTAMPTZ | YES | NULL | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: organization_id → organizations(id) ON DELETE CASCADE
**FK**: user_id → users(id) ON DELETE CASCADE

---

### Entity: media_attachments
Centralized media storage reference table.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUIDv7 | NO | gen_uuid_v7() | |
| organization_id | UUIDv7 | NO | — | |
| attachable_type | VARCHAR(100) | NO | — | |
| attachable_id | UUIDv7 | NO | — | |
| file_type | VARCHAR(50) | NO | — | photo, audio, video, document, signature |
| mime_type | VARCHAR(100) | NO | — | |
| file_size_bytes | BIGINT | NO | — | |
| storage_path | VARCHAR(500) | NO | — | S3/MinIO path |
| file_hash | VARCHAR(64) | NO | — | SHA-256 |
| metadata | JSONB | YES | NULL | EXIF, GPS, duration, resolution |
| created_at | TIMESTAMPTZ | NO | NOW() | |

**FK**: organization_id → organizations(id) ON DELETE CASCADE

---

## Reference Data (Lookup Tables)

### organization_type: NGO, Government, Academic, Private_Sector, Multilateral, Donor
### user_role: SystemAdmin, OrgAdmin, ResearchDirector, PrincipalInvestigator, ResearchAssociate, DataManager, FieldSupervisor, Enumerator, QualityAssurance, EthicsOfficer, DonorViewer, Guest
### membership_status: invited, active, suspended
### project_status: draft, active, implementation, closing, closed, archived
### study_status: concept, design, review, approved, pre_test, field, data_analysis, reporting, dissemination, closed, archived
### study_type: baseline, midline, endline, needs_assessment, situation_analysis, kap, household, facility, market, impact_evaluation, rapid, process, outcome, performance, implementation_research, operational, action, longitudinal, cross_sectional, experimental, quasi_experimental, case_study, mixed_methods
### indicator_type: quantitative, qualitative, proxy, composite
### indicator_level: impact, outcome, output, process, input
### question_type: single_select, multiple_select, dropdown, text_short, text_long, numeric_int, numeric_decimal, percentage, date, time, datetime, gps, photo, video, audio, signature, barcode, ranking, likert, slider, matrix, note, calculated, composite
### submission_status: draft, submitted, qa_review, approved, rejected
### assignment_status: pending, in_progress, completed, overdue

---

## Entity Relationship Summary

### Tables by Module

| Module | Tables | MVP (P0) |
|--------|--------|----------|
| Organization & Access | 7 | 7 |
| Project & Study | 7 | 4 |
| Indicators | 4 | 3 |
| Questionnaires & Questions | 7 | 7 |
| Submissions & Responses | 3 | 3 |
| Enumerator & Field | 4 | 3 |
| Sampling | 2 | 0 |
| Qualitative Data | 7 | 0 |
| Analytics & Dashboards | 3 | 2 |
| Reports | 3 | 2 |
| AI & Intelligence | 5 | 0 |
| Knowledge Management | 2 | 0 |
| Audit & Compliance | 4 | 2 |
| Reference/Lookup | 4 | 4 |
| **Total** | **62** | **37** |

### Cross-cutting Relationships

```
organizations
├── organization_user → users (M:N with role)
├── projects (1:N)
│   ├── studies (1:N)
│   │   ├── questionnaires (1:N)
│   │   │   ├── sections (1:N)
│   │   │   │   └── questions (1:N)
│   │   │   │       ├── question_options (1:N)
│   │   │   │       ├── question_translations (1:N)
│   │   │   │       └── question_indicator_map → indicators (M:N)
│   │   │   ├── skip_logic (1:N)
│   │   │   └── submissions (1:N)
│   │   │       └── response_values (1:N)
│   │   ├── indicators (1:N)
│   │   │   ├── indicator_disaggregations (1:N)
│   │   │   └── indicator_values (1:N)
│   │   ├── sampling_plans (1:N)
│   │   │   └── sampling_units (1:N)
│   │   ├── qualitative_sessions (1:N)
│   │   │   ├── transcripts (1:N)
│   │   │   │   └── coded_segments (1:N)
│   │   │   ├── codes (1:N) → codebook
│   │   │   └── themes (1:N)
│   │   ├── assignments (1:N) → users (enumerator)
│   │   └── knowledge_items (1:N)
│   ├── theory_of_change (1:N)
│   ├── logical_frameworks (1:N)
│   └── indicator_libraries (1:N)
│       └── indicators (library-level)
├── teams (1:N)
│   └── team_members → users (M:N)
└── enumerators → users (1:1)

Cross-cutting:
audit_events → any entity (polymorphic)
media_attachments → any entity (polymorphic)
notifications → users (N:1)
embeddings → any entity (polymorphic)
consent_records → submissions/studies (N:1)
```
