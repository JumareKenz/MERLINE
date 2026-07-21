# Merline Physical Database Model

## Overview

This document provides the complete physical database design for PostgreSQL 16+ with extensions. It covers DDL patterns, column types, indexing strategy, partitioning, PostGIS configuration, pgvector setup, full-text search, and JSONB schema validation.

**Key extensions**: `pgcrypto`, `uuid-ossp`, `pgvector`, `postgis`, `btree_gin`, `pg_partman`, `pg_cron`

---

## 1. Base DDL Patterns

### 1.1 UUIDv7 Generation Function

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- UUIDv7 implementation (time-ordered UUID)
CREATE OR REPLACE FUNCTION gen_uuid_v7() RETURNS uuid AS $$
DECLARE
  timestamp    TIMESTAMPTZ := clock_timestamp();
  unix_ts_ms   BIGINT := (EXTRACT(epoch FROM timestamp) * 1000)::BIGINT;
  uuid_bytes   BYTEA := int8send(unix_ts_ms) || gen_random_bytes(10);
BEGIN
  -- Set version 7 (UUID version bits: 0111)
  uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
  -- Set variant (10xx)
  uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
  RETURN uuid(uuid_bytes);
END;
$$ LANGUAGE plpgsql VOLATILE;
```

### 1.2 Timestamp Trigger Function

```sql
CREATE OR REPLACE FUNCTION set_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = COALESCE(NEW.created_at, NOW());
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 1.3 Soft Delete Pattern

Every domain table uses `deleted_at TIMESTAMPTZ NULL` as soft-delete column. Queries must include `WHERE deleted_at IS NULL` by default (enforced via Laravel Global Scope).

---

## 2. Tenant Schema Template

Each tenant gets an isolated schema. The following DDL is executed for each new tenant.

```sql
-- Called per tenant registration
CREATE SCHEMA IF NOT EXISTS tenant_{tenant_id};
SET search_path TO tenant_{tenant_id}, public;

-- Apply all domain tables (see below) within this schema
```

---

## 3. Domain Tables DDL

### 3.1 Organizations Table (public schema)

```sql
CREATE TABLE public.organizations (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    name            VARCHAR(300) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    short_name      VARCHAR(50),
    org_type        VARCHAR(50) NOT NULL CHECK (org_type IN (
                        'NGO', 'Government', 'Academic', 'Private_Sector', 'Multilateral', 'Donor'
                    )),
    country         VARCHAR(100) NOT NULL,
    region          VARCHAR(100),
    website         VARCHAR(500),
    logo_url        VARCHAR(500),
    tax_id          VARCHAR(50),
    donor_id        VARCHAR(50),
    settings        JSONB NOT NULL DEFAULT '{}',
    donor_compliance JSONB,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    parent_org_id   UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX uk_org_slug ON public.organizations(slug) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uk_org_name ON public.organizations(name) WHERE deleted_at IS NULL;
CREATE INDEX ix_org_type ON public.organizations(org_type);
CREATE INDEX ix_org_country ON public.organizations(country);
```

### 3.2 Users Table (public schema)

```sql
CREATE TABLE public.users (
    id                UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    email             VARCHAR(255) NOT NULL,
    password_hash     VARCHAR(255) NOT NULL,
    first_name        VARCHAR(100) NOT NULL,
    last_name         VARCHAR(100) NOT NULL,
    phone             VARCHAR(30),
    title             VARCHAR(100),
    department        VARCHAR(100),
    locale            VARCHAR(10) NOT NULL DEFAULT 'en',
    timezone          VARCHAR(50) NOT NULL DEFAULT 'UTC',
    avatar_url        VARCHAR(500),
    email_verified_at TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at     TIMESTAMPTZ,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX uk_user_email ON public.users(email) WHERE deleted_at IS NULL;
CREATE INDEX ix_user_name ON public.users(first_name, last_name);
CREATE INDEX ix_user_locale ON public.users(locale);
```

### 3.3 Organization User Pivot (public schema)

```sql
CREATE TABLE public.organization_user (
    id                UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role              VARCHAR(50) NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended')),
    invited_by        UUID REFERENCES public.users(id),
    invited_at        TIMESTAMPTZ,
    joined_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX uk_org_user ON public.organization_user(organization_id, user_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_org_user_role ON public.organization_user(organization_id, role);
CREATE INDEX ix_org_user_user ON public.organization_user(user_id);
```

### 3.4 Projects Table (tenant schema)

```sql
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    organization_id UUID NOT NULL,  -- set by application context
    code            VARCHAR(50) NOT NULL,
    name            VARCHAR(300) NOT NULL,
    description     TEXT,
    donor           VARCHAR(200),
    grant_reference VARCHAR(100),
    budget          DECIMAL(15,2),
    currency        CHAR(3),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
                        'draft', 'active', 'implementation', 'closing', 'closed', 'archived'
                    )),
    country         VARCHAR(100),
    sector          VARCHAR(100),
    tags            TEXT[],
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT ck_project_dates CHECK (end_date >= start_date)
);

CREATE UNIQUE INDEX uk_project_code ON projects(organization_id, code) WHERE deleted_at IS NULL;
CREATE INDEX ix_project_status ON projects(status);
CREATE INDEX ix_project_dates ON projects(start_date, end_date);
CREATE INDEX ix_project_org ON projects(organization_id);
CREATE INDEX ix_project_sector ON projects(sector);
-- Full-text search index
CREATE INDEX ix_project_fts ON projects USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

### 3.5 Studies Table (tenant schema)

```sql
CREATE TABLE studies (
    id                  UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    code                VARCHAR(50) NOT NULL,
    title               VARCHAR(500) NOT NULL,
    acronym             VARCHAR(30),
    study_type          VARCHAR(50) NOT NULL,
    purpose             TEXT NOT NULL,
    objectives          TEXT[] NOT NULL,
    research_questions  TEXT[] NOT NULL,
    hypotheses          TEXT[],
    methodology         TEXT NOT NULL,
    population_description TEXT NOT NULL,
    sample_size         INTEGER,
    sampling_method     VARCHAR(50),
    location            GEOGRAPHY(POLYGON, 4326),
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'concept' CHECK (status IN (
                            'concept', 'design', 'review', 'approved', 'pre_test',
                            'field', 'data_analysis', 'reporting', 'dissemination',
                            'closed', 'archived'
                        )),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_by          UUID NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT ck_study_dates CHECK (end_date >= start_date)
);

CREATE UNIQUE INDEX uk_study_code ON studies(organization_id, code) WHERE deleted_at IS NULL
    -- organization_id derived via project join, but stored as computed for perf
    ;
-- Alternative: use project_id + code
CREATE UNIQUE INDEX uk_study_project_code ON studies(project_id, code) WHERE deleted_at IS NULL;
CREATE INDEX ix_study_status ON studies(status);
CREATE INDEX ix_study_type ON studies(study_type);
CREATE INDEX ix_study_project ON studies(project_id);
CREATE INDEX ix_study_dates ON studies(start_date, end_date);
CREATE INDEX ix_study_fts ON studies USING GIN(to_tsvector('english', title || ' ' || COALESCE(purpose, '')));
-- Spatial index
CREATE INDEX ix_study_location ON studies USING GIST(location);
```

### 3.6 Indicators Table (tenant schema)

```sql
CREATE TABLE indicators (
    id                    UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    indicator_able_type   VARCHAR(100) NOT NULL,
    indicator_able_id     UUID NOT NULL,
    library_id            UUID,
    code                  VARCHAR(50) NOT NULL,
    version               INTEGER NOT NULL DEFAULT 1,
    name                  VARCHAR(300) NOT NULL,
    short_name            VARCHAR(100),
    definition            TEXT NOT NULL,
    purpose               TEXT NOT NULL,
    indicator_type        VARCHAR(20) NOT NULL CHECK (indicator_type IN (
                              'quantitative', 'qualitative', 'proxy', 'composite'
                          )),
    level                 VARCHAR(20) NOT NULL CHECK (level IN (
                              'impact', 'outcome', 'output', 'process', 'input'
                          )),
    sub_type              VARCHAR(50) NOT NULL DEFAULT 'count',
    unit                  VARCHAR(100),
    unit_of_measurement   VARCHAR(100) NOT NULL,
    direction             VARCHAR(20) NOT NULL CHECK (direction IN ('positive', 'negative', 'neutral')),
    frequency             VARCHAR(20) NOT NULL,
    is_calculated         BOOLEAN NOT NULL DEFAULT FALSE,
    calculation_formula   TEXT,
    numerator             TEXT,
    denominator           TEXT,
    component_indicator_ids UUID[],
    aggregation_method    VARCHAR(50),
    weights               JSONB,
    data_source           TEXT NOT NULL,
    data_source_type      VARCHAR(50) NOT NULL,
    collection_method     VARCHAR(200),
    baseline_value        DECIMAL(20,6),
    baseline_year         INTEGER,
    target_value          DECIMAL(20,6),
    target_year           INTEGER,
    threshold_minimum     DECIMAL(20,6),
    threshold_maximum     DECIMAL(20,6),
    disaggregations       JSONB,
    sector                TEXT[],
    sdg_goals             INTEGER[],
    sdg_targets           TEXT[],
    donor_framework       TEXT[],
    is_kpi                BOOLEAN NOT NULL DEFAULT FALSE,
    is_donor_reporting    BOOLEAN NOT NULL DEFAULT FALSE,
    data_quality_checks   JSONB,
    status                VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
                              'draft', 'under_review', 'approved', 'active', 'deprecated', 'archived'
                          )),
    created_by            UUID NOT NULL,
    reviewed_by           UUID,
    approved_by           UUID,
    approval_date         TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at            TIMESTAMPTZ,
    version_notes         TEXT
);

-- For polymorphic queries
CREATE INDEX ix_indicator_poly ON indicators(indicator_able_type, indicator_able_id);
CREATE INDEX ix_indicator_code ON indicators(code);
CREATE INDEX ix_indicator_type ON indicators(indicator_type);
CREATE INDEX ix_indicator_level ON indicators(level);
CREATE INDEX ix_indicator_status ON indicators(status);
CREATE INDEX ix_indicator_kpi ON indicators(is_kpi) WHERE is_kpi = TRUE;
CREATE INDEX ix_indicator_donor ON indicators(is_donor_reporting) WHERE is_donor_reporting = TRUE;
CREATE INDEX ix_indicator_fts ON indicators USING GIN(to_tsvector('english', name || ' ' || COALESCE(definition, '')));
```

### 3.7 Questionnaires Table (tenant schema)

```sql
CREATE TABLE questionnaires (
    id                      UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    study_id                UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    code                    VARCHAR(50) NOT NULL,
    title                   VARCHAR(500) NOT NULL,
    description             TEXT,
    survey_type             VARCHAR(50) NOT NULL,
    mode                    VARCHAR(20) NOT NULL CHECK (mode IN ('CAPI', 'PAPI', 'CATI', 'CAWI', 'Mixed')),
    language                VARCHAR(10) NOT NULL,
    estimated_duration_minutes INTEGER,
    version                 INTEGER NOT NULL DEFAULT 1,
    is_current              BOOLEAN NOT NULL DEFAULT TRUE,
    is_pretested            BOOLEAN NOT NULL DEFAULT FALSE,
    approval_status         VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (approval_status IN (
                                'draft', 'peer_review', 'pre_test', 'approved', 'published',
                                'field_active', 'closed', 'archived'
                            )),
    created_by              UUID NOT NULL,
    published_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ
);

CREATE UNIQUE INDEX uk_qnr_version ON questionnaires(study_id, code, version);
CREATE INDEX ix_qnr_study ON questionnaires(study_id);
CREATE INDEX ix_qnr_status ON questionnaires(approval_status);
CREATE INDEX ix_qnr_current ON questionnaires(is_current) WHERE is_current = TRUE;
CREATE INDEX ix_qnr_fts ON questionnaires USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));
```

### 3.8 Questions Table (tenant schema)

```sql
CREATE TABLE questions (
    id                  UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    section_id          UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    code                VARCHAR(50) NOT NULL,
    text                TEXT NOT NULL,
    help_text           TEXT,
    question_type       VARCHAR(30) NOT NULL CHECK (question_type IN (
                            'single_select', 'multiple_select', 'dropdown', 'text_short', 'text_long',
                            'numeric_int', 'numeric_decimal', 'percentage', 'date', 'time', 'datetime',
                            'gps', 'photo', 'video', 'audio', 'signature', 'barcode',
                            'ranking', 'likert', 'slider', 'matrix', 'note', 'calculated', 'composite'
                        )),
    is_required         BOOLEAN NOT NULL DEFAULT FALSE,
    is_personal_data    BOOLEAN NOT NULL DEFAULT FALSE,
    is_sensitive        BOOLEAN NOT NULL DEFAULT FALSE,
    options             JSONB,
    validation_rules    JSONB,
    attachment_types    TEXT[],
    min_value           DECIMAL(20,6),
    max_value           DECIMAL(20,6),
    min_length          INTEGER,
    max_length          INTEGER,
    decimal_places      INTEGER,
    gps_accuracy_target DECIMAL(10,2),
    image_resolution    VARCHAR(20),
    order_index         INTEGER NOT NULL DEFAULT 0,
    indent_level        INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uk_question_code ON questions(section_id, code);
CREATE INDEX ix_question_section ON questions(section_id);
CREATE INDEX ix_question_type ON questions(question_type);
CREATE INDEX ix_question_order ON questions(section_id, order_index);
CREATE INDEX ix_question_personal ON questions(is_personal_data) WHERE is_personal_data = TRUE;
-- GIN index for JSONB querying on options and validation_rules
CREATE INDEX ix_question_options ON questions USING GIN(options jsonb_path_ops);
CREATE INDEX ix_question_validation ON questions USING GIN(validation_rules jsonb_path_ops);
```

### 3.9 Submissions Table (tenant schema)

```sql
CREATE TABLE submissions (
    id                  UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    submission_id       VARCHAR(100) NOT NULL,
    questionnaire_id    UUID NOT NULL REFERENCES questionnaires(id) ON DELETE RESTRICT,
    study_id            UUID NOT NULL REFERENCES studies(id) ON DELETE RESTRICT,
    assignment_id       UUID REFERENCES assignments(id) ON DELETE SET NULL,
    enumerator_id       UUID,
    respondent_id       VARCHAR(100),
    status              VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
                            'draft', 'submitted', 'qa_review', 'approved', 'rejected'
                        )),
    location            GEOGRAPHY(POINT, 4326),
    device_id           VARCHAR(200),
    app_version         VARCHAR(20),
    form_version        INTEGER NOT NULL,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ NOT NULL,
    duration_seconds    INTEGER,
    is_synced           BOOLEAN NOT NULL DEFAULT FALSE,
    synced_at           TIMESTAMPTZ,
    validation_status   VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (validation_status IN (
                            'pending', 'passed', 'warning', 'failed'
                        )),
    flagged_for_review  BOOLEAN NOT NULL DEFAULT FALSE,
    notes               TEXT,
    is_test             BOOLEAN NOT NULL DEFAULT FALSE,
    checksum            VARCHAR(64),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
) PARTITION BY RANGE (created_at);

-- Global idempotency key
CREATE UNIQUE INDEX uk_submission_id ON submissions(submission_id);
CREATE INDEX ix_submission_qnr ON submissions(questionnaire_id);
CREATE INDEX ix_submission_study ON submissions(study_id);
CREATE INDEX ix_submission_enum ON submissions(enumerator_id);
CREATE INDEX ix_submission_status ON submissions(status);
CREATE INDEX ix_submission_sync ON submissions(is_synced) WHERE is_synced = FALSE;
CREATE INDEX ix_submission_flag ON submissions(flagged_for_review) WHERE flagged_for_review = TRUE;
CREATE INDEX ix_submission_location ON submissions USING GIST(location);
CREATE INDEX ix_submission_dates ON submissions(completed_at, started_at);

-- Monthly partitions
CREATE TABLE submissions_2026_07 PARTITION OF submissions
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE submissions_2026_08 PARTITION OF submissions
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
-- ... auto-created by pg_partman
```

### 3.10 Response Values Table (tenant schema)

```sql
CREATE TABLE response_values (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    submission_id   UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    value           JSONB,
    media_url       VARCHAR(500),
    media_hash      VARCHAR(64),
    media_metadata  JSONB,
    is_calculated   BOOLEAN NOT NULL DEFAULT FALSE,
    flagged         BOOLEAN NOT NULL DEFAULT FALSE,
    flag_reason     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uk_response ON response_values(submission_id, question_id);
CREATE INDEX ix_response_submission ON response_values(submission_id);
CREATE INDEX ix_response_question ON response_values(question_id);
CREATE INDEX ix_response_flagged ON response_values(flagged) WHERE flagged = TRUE;
-- GIN for querying JSONB response values
CREATE INDEX ix_response_value ON response_values USING GIN(value jsonb_path_ops);
```

### 3.11 Audit Events Table (public schema, partitioned)

```sql
CREATE TABLE public.audit_events (
    id              UUID NOT NULL DEFAULT gen_uuid_v7(),
    organization_id UUID NOT NULL,
    event_type      VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       UUID NOT NULL,
    user_id         UUID,
    user_role       VARCHAR(50),
    project_id      UUID,
    study_id        UUID,
    changes         JSONB,
    metadata        JSONB,
    ip_address      VARCHAR(45),
    user_agent      VARCHAR(500),
    device_id       VARCHAR(200),
    is_system_action BOOLEAN NOT NULL DEFAULT FALSE,
    checksum        VARCHAR(64) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- No UPDATE/DELETE allowed on audit_events (trigger-enforced)
CREATE INDEX ix_audit_org ON public.audit_events(organization_id);
CREATE INDEX ix_audit_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX ix_audit_user ON public.audit_events(user_id);
CREATE INDEX ix_audit_type ON public.audit_events(event_type);
CREATE INDEX ix_audit_created ON public.audit_events(created_at);
CREATE INDEX ix_audit_checksum ON public.audit_events(checksum);

-- Monthly partitions (auto-managed by pg_partman)
CREATE TABLE public.audit_events_2026_07 PARTITION OF public.audit_events
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE public.audit_events_2026_08 PARTITION OF public.audit_events
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
```

---

## 4. pgvector Configuration

### 4.1 Extension Setup

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4.2 Embeddings Table (tenant schema)

```sql
CREATE TABLE embeddings (
    id                UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    organization_id   UUID NOT NULL,
    embeddable_type   VARCHAR(100) NOT NULL,
    embeddable_id     UUID NOT NULL,
    embedding         vector(1536) NOT NULL,
    content_text      TEXT,
    content_hash      VARCHAR(64),
    model             VARCHAR(100) NOT NULL,
    chunk_index       INTEGER,
    metadata          JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_embedding_poly ON embeddings(embeddable_type, embeddable_id);
CREATE INDEX ix_embedding_org ON embeddings(organization_id);
-- IVFFlat index for approximate nearest neighbor search
CREATE INDEX ix_embedding_vec ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- Alternative: HNSW index for better accuracy
-- CREATE INDEX ix_embedding_hnsw ON embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 200);

-- Cosine similarity search example:
-- SELECT * FROM embeddings
-- ORDER BY embedding <=> '[0.1, 0.2, ...]'
-- LIMIT 10;
```

---

## 5. PostGIS Configuration

### 5.1 Extension Setup

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

### 5.2 Spatial Columns Usage

| Table | Column | Type | SRID | Purpose |
|-------|--------|------|------|---------|
| studies | location | GEOGRAPHY(POLYGON) | 4326 | Study area boundary |
| submissions | location | GEOGRAPHY(POINT) | 4326 | Submission GPS point |
| assignments | location | GEOGRAPHY(POLYGON) | 4326 | Assigned area |
| sampling_units | location | GEOGRAPHY(POINT) | 4326 | Sample point location |
| qualitative_sessions | location | GEOGRAPHY(POINT) | 4326 | Session location |
| organizations(public) | location | GEOGRAPHY(POINT) | 4326 | HQ location |

### 5.3 Spatial Indexes

```sql
CREATE INDEX ix_studies_location ON studies USING GIST(location);
CREATE INDEX ix_submissions_location ON submissions USING GIST(location);
CREATE INDEX ix_assignments_location ON assignments USING GIST(location);
CREATE INDEX ix_sampling_units_location ON sampling_units USING GIST(location);
```

### 5.4 Common Spatial Queries

```sql
-- Find submissions within study area
SELECT s.* FROM submissions s, studies st
WHERE st.id = 'study-uuid'
AND ST_Within(s.location::geometry, st.location::geometry);

-- Find submissions within radius of a point
SELECT * FROM submissions
WHERE ST_DWithin(location, ST_MakePoint(36.8156, -1.2834)::geography, 5000);

-- Find enumerators near a location
SELECT e.*, u.first_name, u.last_name
FROM enumerators e
JOIN users u ON u.id = e.user_id
WHERE ST_DWithin(e.last_known_location, ST_MakePoint(lon, lat)::geography, 10000);
```

---

## 6. Full-Text Search Configuration

### 6.1 Search Configuration

```sql
-- Create a custom text search configuration
CREATE TEXT SEARCH CONFIGURATION merline_fts (COPY = english);
ALTER TEXT SEARCH CONFIGURATION merline_fts
    ALTER MAPPING FOR asciihword, asciiword, hword, hword_asciipart, hword_part, word
    WITH english_stem;
```

### 6.2 Composite Search Function

```sql
CREATE OR REPLACE FUNCTION search_merline(
    search_term TEXT,
    entity_types TEXT[] DEFAULT NULL,
    org_id UUID DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
    entity_type TEXT,
    entity_id UUID,
    title TEXT,
    snippet TEXT,
    rank REAL
) LANGUAGE plpgsql STABLE AS $$
DECLARE
    tsquery tsquery := plainto_tsquery('merline_fts', search_term);
BEGIN
    RETURN QUERY
    -- Projects
    SELECT 'project'::TEXT, p.id::UUID, p.name::TEXT,
           ts_headline('merline_fts', COALESCE(p.description, ''), tsquery)::TEXT,
           ts_rank(to_tsvector('merline_fts', p.name || ' ' || COALESCE(p.description, '')), tsquery)::REAL
    FROM projects p
    WHERE (org_id IS NULL OR p.organization_id = org_id)
      AND (entity_types IS NULL OR 'project' = ANY(entity_types))
      AND to_tsvector('merline_fts', p.name || ' ' || COALESCE(p.description, '')) @@ tsquery
      AND p.deleted_at IS NULL
    UNION ALL
    -- Studies
    SELECT 'study'::TEXT, s.id, s.title,
           ts_headline('merline_fts', COALESCE(s.purpose, ''), tsquery),
           ts_rank(to_tsvector('merline_fts', s.title || ' ' || COALESCE(s.purpose, '')), tsquery)
    FROM studies s
    WHERE (org_id IS NULL OR s.organization_id = org_id)
      AND (entity_types IS NULL OR 'study' = ANY(entity_types))
      AND to_tsvector('merline_fts', s.title || ' ' || COALESCE(s.purpose, '')) @@ tsquery
      AND s.deleted_at IS NULL
    UNION ALL
    -- Indicators
    SELECT 'indicator'::TEXT, i.id, i.name,
           ts_headline('merline_fts', COALESCE(i.definition, ''), tsquery),
           ts_rank(to_tsvector('merline_fts', i.name || ' ' || COALESCE(i.definition, '')), tsquery)
    FROM indicators i
    WHERE (org_id IS NULL OR i.organization_id = org_id)
      AND (entity_types IS NULL OR 'indicator' = ANY(entity_types))
      AND to_tsvector('merline_fts', i.name || ' ' || COALESCE(i.definition, '')) @@ tsquery
      AND i.deleted_at IS NULL
    ORDER BY rank DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;
```

---

## 7. JSONB Schema Validation

### 7.1 Validation Approach

JSONB columns are validated at the application layer (Laravel form requests) and optionally with PostgreSQL CHECK constraints for critical structures.

### 7.2 Question Options Validation

```sql
-- Ensure question options have required structure
ALTER TABLE questions ADD CONSTRAINT ck_question_options_structure
    CHECK (
        question_type NOT IN ('single_select', 'multiple_select', 'dropdown', 'likert', 'ranking')
        OR (
            options IS NOT NULL
            AND jsonb_typeof(options) = 'array'
            AND jsonb_array_length(options) >= 1
            AND options @> '[{"value": "", "label": ""}]'::jsonb = FALSE
        )
    );

-- Validation rules structure
ALTER TABLE questions ADD CONSTRAINT ck_validation_rules_structure
    CHECK (
        validation_rules IS NULL
        OR jsonb_typeof(validation_rules) = 'object'
    );
```

### 7.3 Disaggregations Validation

```sql
ALTER TABLE indicators ADD CONSTRAINT ck_disaggregations_structure
    CHECK (
        disaggregations IS NULL
        OR (
            jsonb_typeof(disaggregations) = 'array'
            AND disaggregations @> '[{"dimension": "", "categories": []}]'::jsonb = FALSE
        )
    );
```

### 7.4 Dashboard Layout Validation

```sql
ALTER TABLE dashboards ADD CONSTRAINT ck_layout_structure
    CHECK (
        layout IS NULL
        OR (
            jsonb_typeof(layout) = 'object'
            AND layout ? 'widgets'
            AND jsonb_typeof(layout->'widgets') = 'array'
        )
    );
```

---

## 8. Index Design Summary

### 8.1 Index Categories

| Category | Count | Examples |
|----------|-------|----------|
| Primary Key (UUID) | ~60 | All tables |
| Unique Constraint | ~35 | Business key uniqueness |
| Foreign Key | ~120 | Referential integrity |
| Standard B-tree | ~90 | Status, type, date fields |
| GIN (JSONB) | ~15 | Options, validation_rules, metadata |
| GIN (FTS) | ~10 | Full-text search on text fields |
| GiST (Spatial) | ~8 | Geography columns |
| IVFFlat/HNSW (Vector) | ~1 per tenant | Embedding similarity search |
| Partial Index | ~12 | Filtered on active/flagged/current |
| Composite Index | ~15 | Multi-column query patterns |

### 8.2 Critical Query Patterns by Index

| Query Pattern | Index | Table |
|--------------|-------|-------|
| Get active studies for project | ix_study_project, ix_study_status | studies |
| Find submissions by enumerator | ix_submission_enum | submissions |
| Get unsynced submissions | ix_submission_sync | submissions |
| Search indicators by name/definition | ix_indicator_fts | indicators |
| Find submissions in geofence | ix_submissions_location | submissions |
| Get latest questionnaire version | ix_qnr_current | questionnaires |
| Get KPI indicators | ix_indicator_kpi | indicators |
| Audit trail for entity | ix_audit_entity | audit_events |
| Similarity search via embeddings | ix_embedding_vec | embeddings |

---

## 9. Sequences

UUIDv7 eliminates the need for auto-increment sequences. The only counter sequences used are:

```sql
-- For human-readable reference codes
CREATE SEQUENCE seq_project_code START 1000;
CREATE SEQUENCE seq_study_code START 1000;
CREATE SEQUENCE seq_indicator_code START 1000;

-- Example usage for generating project code
-- SELECT 'PRJ-' || to_char(NOW(), 'YYYY') || '-' || LPAD(nextval('seq_project_code')::TEXT, 4, '0');
```

---

## 10. Materialized Views

### 10.1 Study Progress Summary

```sql
CREATE MATERIALIZED VIEW mv_study_progress AS
SELECT
    s.id AS study_id,
    s.project_id,
    s.title AS study_title,
    s.status AS study_status,
    COUNT(DISTINCT q.id) AS questionnaire_count,
    COUNT(DISTINCT sub.id) AS submission_count,
    COUNT(DISTINCT sub.id) FILTER (WHERE sub.status = 'approved') AS approved_count,
    COUNT(DISTINCT sub.id) FILTER (WHERE sub.flagged_for_review = TRUE) AS flagged_count,
    COUNT(DISTINCT e.id) AS enumerator_count,
    MIN(sub.completed_at) AS first_submission,
    MAX(sub.completed_at) AS last_submission,
    s.start_date,
    s.end_date
FROM studies s
LEFT JOIN questionnaires q ON q.study_id = s.id AND q.deleted_at IS NULL
LEFT JOIN submissions sub ON sub.study_id = s.id AND sub.deleted_at IS NULL
LEFT JOIN assignments a ON a.study_id = s.id AND a.deleted_at IS NULL
LEFT JOIN users e ON e.id = a.enumerator_id
GROUP BY s.id, s.project_id, s.title, s.status, s.start_date, s.end_date;

CREATE UNIQUE INDEX ix_mv_study_progress ON mv_study_progress(study_id);
```

### 10.2 Indicator Performance Summary

```sql
CREATE MATERIALIZED VIEW mv_indicator_performance AS
SELECT
    i.id AS indicator_id,
    i.code AS indicator_code,
    i.name AS indicator_name,
    i.level,
    i.indicator_type,
    i.baseline_value,
    i.target_value,
    iv.value AS latest_value,
    iv.period_end AS latest_period,
    CASE
        WHEN i.target_value IS NULL THEN 'no_target'
        WHEN iv.value >= i.target_value THEN 'achieved'
        WHEN i.baseline_value IS NOT NULL AND i.target_value IS NOT NULL
            AND (iv.value - i.baseline_value) >= (i.target_value - i.baseline_value) * 0.75 THEN 'on_track'
        WHEN i.baseline_value IS NOT NULL AND i.target_value IS NOT NULL
            AND (iv.value - i.baseline_value) >= (i.target_value - i.baseline_value) * 0.5 THEN 'at_risk'
        ELSE 'off_track'
    END AS rag_status,
    i.is_kpi,
    i.is_donor_reporting
FROM indicators i
LEFT JOIN LATERAL (
    SELECT value, period_end
    FROM indicator_values
    WHERE indicator_id = i.id
      AND is_actual = TRUE
      AND status = 'approved'
    ORDER BY period_end DESC
    LIMIT 1
) iv ON TRUE
WHERE i.deleted_at IS NULL;

CREATE UNIQUE INDEX ix_mv_indicator_perf ON mv_indicator_performance(indicator_id);
CREATE INDEX ix_mv_indicator_rag ON mv_indicator_performance(rag_status);
CREATE INDEX ix_mv_indicator_kpi ON mv_indicator_performance(is_kpi) WHERE is_kpi = TRUE;
```

### 10.3 Enumerator Performance Summary

```sql
CREATE MATERIALIZED VIEW mv_enumerator_performance AS
SELECT
    a.enumerator_id,
    a.study_id,
    u.first_name || ' ' || u.last_name AS enumerator_name,
    COUNT(DISTINCT a.id) AS total_assignments,
    COUNT(DISTINCT sub.id) AS total_submissions,
    COUNT(DISTINCT sub.id) FILTER (WHERE sub.validation_status = 'failed') AS failed_submissions,
    COUNT(DISTINCT sub.id) FILTER (WHERE sub.flagged_for_review = TRUE) AS flagged_submissions,
    ROUND(AVG(sub.duration_seconds)::NUMERIC, 0)::INTEGER AS avg_duration_seconds,
    MIN(sub.completed_at) AS first_submission_date,
    MAX(sub.completed_at) AS last_submission_date
FROM users u
JOIN assignments a ON a.enumerator_id = u.id AND a.deleted_at IS NULL
LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.deleted_at IS NULL AND sub.status != 'draft'
GROUP BY a.enumerator_id, a.study_id, u.first_name, u.last_name;

CREATE UNIQUE INDEX ix_mv_enum_perf ON mv_enumerator_performance(enumerator_id, study_id);
```

### 10.4 Materialized View Refresh Strategy

```sql
-- Refresh via pg_cron scheduled job
SELECT cron.schedule('refresh-mv-study-progress', '*/15 * * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_study_progress');

SELECT cron.schedule('refresh-mv-indicator-perf', '0 */1 * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_indicator_performance');

SELECT cron.schedule('refresh-mv-enum-perf', '0 */6 * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_enumerator_performance');

-- Application-level refresh after critical events
-- Event::studyUpdated -> dispatch(RefreshMaterializedView::class)
```

---

## 11. Triggers

### 11.1 Auto-Timestamp Trigger

```sql
-- Applied to all domain tables
CREATE TRIGGER trg_set_timestamps BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION set_timestamps();
-- Repeat for: studies, indicators, questionnaires, submissions, etc.
```

### 11.2 Audit Trigger (Application-Level)

```sql
-- Application-level audit logging via Laravel events.
-- Database-level triggers may supplement for critical tables:
CREATE OR REPLACE FUNCTION log_audit_event() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_events (
        organization_id, event_type, entity_type, entity_id,
        user_id, changes, metadata, checksum
    ) VALUES (
        COALESCE(NEW.organization_id, OLD.organization_id),
        TG_OP, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id),
        current_setting('app.current_user_id')::UUID,
        CASE WHEN TG_OP = 'UPDATE' THEN
            jsonb_build_object('old', row_to_json(OLD)::jsonb, 'new', row_to_json(NEW)::jsonb)
        ELSE row_to_json(NEW)::jsonb END,
        jsonb_build_object('host', inet_client_addr()),
        encode(sha256(row_to_json(NEW)::text::bytea), 'hex')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 11.3 Submission Immutability Trigger

```sql
CREATE OR REPLACE FUNCTION prevent_submission_modification() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('submitted', 'approved') THEN
        RAISE EXCEPTION 'Cannot modify a submitted or approved submission';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_submission_immutable BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION prevent_submission_modification();
```

### 11.4 Checksum Trigger (Audit Events)

```sql
CREATE OR REPLACE FUNCTION set_audit_checksum() RETURNS TRIGGER AS $$
DECLARE
    row_data TEXT;
BEGIN
    row_data := row_to_json(NEW)::TEXT;
    NEW.checksum := encode(sha256(row_data::bytea), 'hex');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_checksum BEFORE INSERT ON public.audit_events
    FOR EACH ROW EXECUTE FUNCTION set_audit_checksum();
```

---

## 12. Partitioning Strategy

### 12.1 Partitioned Tables

| Table | Strategy | Key | Interval | Retention |
|-------|----------|-----|----------|-----------|
| submissions | RANGE | created_at | Monthly | Active + 12mo → archive |
| audit_events | RANGE | created_at | Monthly | Hot 3mo, warm 12mo, cold 7yr |
| response_values | Inherited | Via submissions | — | Same as parent |
| embeddings | RANGE (future) | created_at | Quarterly | Active + 90 days |

### 12.2 Partition Management with pg_partman

```sql
CREATE EXTENSION IF NOT EXISTS pg_partman;

SELECT partman.create_parent(
    p_parent_table := 'public.audit_events',
    p_control := 'created_at',
    p_type := 'native',
    p_interval := '1 month',
    p_premake := 3
);

SELECT partman.create_parent(
    p_parent_table := 'submissions',
    p_control := 'created_at',
    p_type := 'native',
    p_interval := '1 month',
    p_premake := 3
);

-- Schedule maintenance
SELECT cron.schedule('partman-maintenance', '0 0 * * *',
    'SELECT partman.run_maintenance()');
```

---

## 13. Database Configuration (postgresql.conf)

```ini
# Memory
shared_buffers = '4GB'                   # 25% of RAM
effective_cache_size = '12GB'            # 75% of RAM
work_mem = '64MB'                        # Per-operation sort memory
maintenance_work_mem = '1GB'             # For VACUUM, CREATE INDEX
wal_buffers = '64MB'                     # WAL buffer

# Connections
max_connections = 200
superuser_reserved_connections = 5

# Parallelism
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
parallel_tuple_cost = 0.01
parallel_setup_cost = 100

# Planner
random_page_cost = 1.1                   # SSD-optimized
effective_io_concurrency = 200
default_statistics_target = 500

# WAL
wal_level = 'logical'                    # For CDC
wal_compression = 'zstd'
min_wal_size = '4GB'
max_wal_size = '16GB'

# Autovacuum
autovacuum_max_workers = 4
autovacuum_naptime = '60s'
autovacuum_vacuum_scale_factor = 0.01
autovacuum_analyze_scale_factor = 0.005

# Extensions
shared_preload_libraries = 'pg_stat_statements, auto_explain, pg_cron'

# Logging
log_min_duration_statement = 1000        # Log queries > 1s
log_autovacuum_min_duration = 1000

# Pgvector
ivfflat.probes = 10                      # Default probe count for IVFFlat

# PostGIS
postgis.gdal_enabled_drivers = 'GTiff PNG JPEG'
```

---

## 14. Schema-per-Tenant Implementation

### 14.1 Tenant Schema Template

```sql
-- Called during tenant creation
CREATE SCHEMA IF NOT EXISTS tenant_{tenant_id};
SET search_path TO tenant_{tenant_id}, public;

-- Deploy all tenant-scoped tables (see DDL above)  
-- Each table includes organization_id for cross-schema safety
```

### 14.2 Application Search Path Resolution

```php
// Laravel middleware sets tenant context
DB::statement("SET search_path TO tenant_{$tenantId}, public");
```

---

## 15. Table Count Summary

| Schema | Tables | Notes |
|--------|--------|-------|
| public (global) | 7 | organizations, users, organization_user, roles, permissions, audit_events, media_attachments |
| tenant_{id} (per tenant) | 55 | All domain entities |
| **Total per tenant** | **62** | 7 global + 55 tenant-scoped |
