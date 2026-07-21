# Merline Analytics Data Model

## Design Philosophy

The analytics data model uses **Kimball star schema** principles: fact tables capture measurements (events, values), dimension tables provide context (who, what, where, when). The model is optimized for:

- **Query simplicity**: BI tools join facts to dimensions with minimal complexity
- **Performance**: Pre-joined and aggregated for dashboard-speed queries
- **Traceability**: Every aggregate value can be traced back to source submissions
- **Time intelligence**: Period-over-period comparisons built into the schema

---

## 1. Star Schema Overview

### 1.1 Fact Tables (4)

| Fact Table | Grain | Measures | Rows/Month (est) |
|------------|-------|----------|------------------|
| `fact_submissions` | One row per submission | counts, duration, quality score | 100K - 5M |
| `fact_data_quality` | One row per quality check per submission | score, status, flag count | 500K - 25M |
| `fact_indicator_values` | One row per indicator per period per disaggregation | value, numerator, denominator, CI | 10K - 500K |
| `fact_ai_inferences` | One row per AI inference call | tokens, latency, cost, score | 50K - 2M |

### 1.2 Dimension Tables (8)

| Dimension | Type | Rows | SCD Type | Description |
|-----------|------|------|----------|-------------|
| `dim_time` | Static | 36,525 (100 years) | None | Calendar day attributes |
| `dim_organization` | Conformed | 10-1K | Type 2 | Tenant organizations |
| `dim_project` | Conformed | 100-10K | Type 2 | Projects/programs |
| `dim_study` | Conformed | 1K-50K | Type 2 | Studies within projects |
| `dim_questionnaire` | Conformed | 1K-20K | Type 2 | Survey instruments |
| `dim_enumerator` | Conformed | 100-10K | Type 2 | Data collectors |
| `dim_location` | Conformed | 100-100K | Type 1 | Geographic hierarchy |
| `dim_indicator` | Conformed | 100-10K | Type 2 | Indicator definitions |

---

## 2. Fact Table Specifications

### 2.1 fact_submissions

**Grain:** One row per submission (survey response)

| Column | Type | Source | Description |
|--------|------|--------|-------------|
| submission_key | BIGINT | PK (surrogate) | Sequential analytics key |
| submission_id | UUID | operational.submissions | Natural key for tracing |
| dim_organization_key | INT | FK | Organization |
| dim_project_key | INT | FK | Project (via study) |
| dim_study_key | INT | FK | Study |
| dim_questionnaire_key | INT | FK | Questionnaire |
| dim_enumerator_key | INT | FK | Enumerator who collected |
| dim_location_key | INT | FK | Submission GPS location |
| dim_time_completed_key | INT | FK | Date of completion |
| dim_time_started_key | INT | FK | Date started |
| status | VARCHAR | operational | submitted, approved, rejected, qa_review |
| duration_seconds | INT | operational | Calculated collection time |
| duration_category | VARCHAR | Derived | too_fast, fast, normal, slow, too_slow |
| flagged_for_review | BOOLEAN | operational | Quality flag |
| validation_status | VARCHAR | operational | pending, passed, warning, failed |
| is_test | BOOLEAN | operational | Test mode flag |
| form_version | INT | operational | Questionnaire version |
| is_synced | BOOLEAN | operational | Server sync status |
| completeness_score | DECIMAL(5,2) | Derived | % of required questions answered |
| created_at | TIMESTAMPTZ | operational | Record creation |

**Partitioning:** By `dim_time_completed_key` (monthly)

**Indexes:**
```sql
CREATE UNIQUE INDEX pk_fact_submissions ON fact_submissions(submission_key);
CREATE INDEX ix_fact_sub_study ON fact_submissions(dim_study_key, dim_time_completed_key);
CREATE INDEX ix_fact_sub_enum ON fact_submissions(dim_enumerator_key, dim_time_completed_key);
CREATE INDEX ix_fact_sub_status ON fact_submissions(status, dim_time_completed_key);
```

### 2.2 fact_data_quality

**Grain:** One row per quality check execution per submission

| Column | Type | Description |
|--------|------|-------------|
| quality_key | BIGINT | PK (surrogate) |
| dim_submission_key | BIGINT | FK to fact_submissions |
| dim_study_key | INT | FK (denormalized for performance) |
| dim_enumerator_key | INT | FK |
| dim_time_key | INT | FK - date of check |
| check_type | VARCHAR | completeness, accuracy, consistency, range, gps, duration, duplicate, outlier, straightlining |
| status | VARCHAR | pass, warn, fail |
| score | DECIMAL(5,2) | 0-100 quality score |
| details | JSONB | Check-specific metadata |
| is_automated | BOOLEAN | System vs human review |
| reviewed_by | UUID | Human reviewer (if applicable) |

**Partitioning:** By `dim_time_key` (monthly)

### 2.3 fact_indicator_values

**Grain:** One row per indicator per time period per disaggregation

| Column | Type | Description |
|--------|------|-------------|
| indicator_value_key | BIGINT | PK (surrogate) |
| dim_indicator_key | INT | FK |
| dim_organization_key | INT | FK |
| dim_project_key | INT | FK |
| dim_study_key | INT | FK |
| dim_location_key | INT | FK |
| dim_time_period_start_key | INT | FK |
| dim_time_period_end_key | INT | FK |
| value | DECIMAL(20,6) | Computed indicator value |
| numerator_value | DECIMAL(20,6) | For proportion/rate indicators |
| denominator_value | DECIMAL(20,6) | For proportion/rate indicators |
| confidence_low | DECIMAL(20,6) | 95% CI lower bound |
| confidence_high | DECIMAL(20,6) | 95% CI upper bound |
| standard_error | DECIMAL(20,6) | Standard error |
| sample_size | INT | N for this value |
| disaggregation_dimension | VARCHAR | sex, age_group, region, etc. |
| disaggregation_category | VARCHAR | male, female, 0-11m, etc. |
| is_baseline | BOOLEAN | Baseline measurement |
| is_actual | BOOLEAN | Actual (collected) value |
| is_estimated | BOOLEAN | Modeled/estimated value |
| rag_status | VARCHAR | achieved, on_track, at_risk, off_track |

**Partitioning:** By `dim_time_period_end_key` (quarterly)

### 2.4 fact_ai_inferences

**Grain:** One row per AI model invocation

| Column | Type | Description |
|--------|------|-------------|
| inference_key | BIGINT | PK (surrogate) |
| dim_organization_key | INT | FK |
| dim_time_key | INT | FK |
| dim_user_key | INT | FK (who triggered) |
| model | VARCHAR | gpt-4o, claude-3.5, etc. |
| route_key | VARCHAR | analysis, summary, qa, etc. |
| prompt_key | VARCHAR | Prompt template identifier |
| input_tokens | INT | Token count |
| output_tokens | INT | Token count |
| total_tokens | INT | Generated column |
| latency_ms | INT | Response time |
| cost_usd | DECIMAL(10,8) | Computed cost |
| was_cached | BOOLEAN | Served from cache |
| was_fallback | BOOLEAN | Used fallback model |
| quality_score | DECIMAL(3,2) | Automated eval score |
| user_rating | INT | 1-5 thumbs rating |
| error_message | TEXT | If failed |

**Partitioning:** By `dim_time_key` (monthly), 90-day retention

---

## 3. Dimension Table Specifications

### 3.1 dim_time

| Column | Type | Description |
|--------|------|-------------|
| date_key | INT | PK - YYYYMMDD format |
| full_date | DATE | ISO date |
| year | INT | Calendar year |
| quarter | INT | 1-4 |
| month | INT | 1-12 |
| month_name | VARCHAR | January, February... |
| week | INT | ISO week number |
| day_of_week | INT | 1=Monday, 7=Sunday |
| day_name | VARCHAR | Monday, Tuesday... |
| day_of_month | INT | 1-31 |
| day_of_year | INT | 1-366 |
| is_weekend | BOOLEAN | Saturday/Sunday |
| is_holiday | BOOLEAN | Configurable per tenant |

**Population:** Pre-generated for 100 years (2025-2124), 36,525 rows.

### 3.2 dim_organization (SCD Type 2)

| Column | Type | Description |
|--------|------|-------------|
| org_key | INT | PK (surrogate) |
| org_id | UUID | Natural key |
| name | VARCHAR | Organization name |
| org_type | VARCHAR | NGO, Government, Academic, Donor |
| country | VARCHAR | Primary country |
| region | VARCHAR | Operational region |
| tier | VARCHAR | Enterprise, Standard, Community |
| is_active | BOOLEAN | Active status |
| valid_from | DATE | SCD start |
| valid_to | DATE | SCD end (NULL = current) |
| is_current | BOOLEAN | Current version flag |

### 3.3 dim_project (SCD Type 2)

| Column | Type | Description |
|--------|------|-------------|
| project_key | INT | PK (surrogate) |
| project_id | UUID | Natural key |
| code | VARCHAR | Project code |
| name | VARCHAR | Project name |
| donor | VARCHAR | Primary donor/funder |
| sector | VARCHAR | Health, Education, etc. |
| country | VARCHAR | Primary country |
| status | VARCHAR | lifecycle status |
| budget | DECIMAL | Total budget |
| start_date | DATE | Project start |
| end_date | DATE | Project end |
| valid_from | DATE | SCD start |
| valid_to | DATE | SCD end |
| is_current | BOOLEAN | Current flag |

### 3.4 dim_study (SCD Type 2)

| Column | Type | Description |
|--------|------|-------------|
| study_key | INT | PK (surrogate) |
| study_id | UUID | Natural key |
| project_key | INT | FK to dim_project |
| code | VARCHAR | Study code |
| title | VARCHAR | Study title |
| study_type | VARCHAR | baseline, midline, endline, KAP, etc. |
| methodology | VARCHAR | Quantitative, Qualitative, Mixed |
| sampling_method | VARCHAR | SRS, stratified, cluster, etc. |
| sample_size | INT | Planned sample |
| status | VARCHAR | Lifecycle status |
| start_date | DATE | Field start |
| end_date | DATE | Field end |
| valid_from | DATE | SCD start |
| valid_to | DATE | SCD end |
| is_current | BOOLEAN | Current flag |

### 3.5 dim_questionnaire (SCD Type 2)

| Column | Type | Description |
|--------|------|-------------|
| questionnaire_key | INT | PK (surrogate) |
| questionnaire_id | UUID | Natural key |
| study_key | INT | FK to dim_study |
| code | VARCHAR | Questionnaire code |
| title | VARCHAR | Questionnaire title |
| survey_type | VARCHAR | Household, KAP, FGD, etc. |
| mode | VARCHAR | CAPI, PAPI, CATI |
| version | INT | Questionnaire version |
| estimated_duration | INT | Minutes |
| question_count | INT | Number of questions |
| valid_from | DATE | SCD start |
| valid_to | DATE | SCD end |
| is_current | BOOLEAN | Current flag |

### 3.6 dim_enumerator (SCD Type 2)

| Column | Type | Description |
|--------|------|-------------|
| enumerator_key | INT | PK (surrogate) |
| enumerator_id | UUID | Natural key (user ID) |
| full_name | VARCHAR | Enumerator name |
| team_name | VARCHAR | Team membership |
| supervisor_name | VARCHAR | Supervisor name |
| locale | VARCHAR | Language preference |
| training_date | DATE | Last training date |
| training_passed | BOOLEAN | Training status |
| is_active | BOOLEAN | Active status |
| valid_from | DATE | SCD start |
| valid_to | DATE | SCD end |
| is_current | BOOLEAN | Current flag |

### 3.7 dim_location (SCD Type 1)

| Column | Type | Description |
|--------|------|-------------|
| location_key | INT | PK (surrogate) |
| admin_level_0 | VARCHAR | Country |
| admin_level_1 | VARCHAR | Region/Province/State |
| admin_level_2 | VARCHAR | District/County |
| admin_level_3 | VARCHAR | Ward/Sub-county |
| admin_level_4 | VARCHAR | Village/Locality |
| latitude | DECIMAL(9,6) | Centroid latitude |
| longitude | DECIMAL(9,6) | Centroid longitude |
| geometry | GEOGRAPHY | Boundary polygon |
| urban_rural | VARCHAR | Urban/Rural classification |

### 3.8 dim_indicator (SCD Type 2)

| Column | Type | Description |
|--------|------|-------------|
| indicator_key | INT | PK (surrogate) |
| indicator_id | UUID | Natural key |
| code | VARCHAR | Indicator code |
| name | VARCHAR | Indicator name |
| definition | TEXT | Operational definition |
| level | VARCHAR | Impact, Outcome, Output, Process |
| indicator_type | VARCHAR | Quantitative, Qualitative, Proxy, Composite |
| sub_type | VARCHAR | Proportion, Percentage, Rate, Count, etc. |
| unit | VARCHAR | Unit of measurement |
| direction | VARCHAR | Positive, Negative, Neutral |
| baseline_value | DECIMAL | Baseline measurement |
| target_value | DECIMAL | Target value |
| frequency | VARCHAR | Annual, Quarterly, etc. |
| is_kpi | BOOLEAN | Key Performance Indicator |
| is_donor_reporting | BOOLEAN | Required by donor |
| valid_from | DATE | SCD start |
| valid_to | DATE | SCD end |
| is_current | BOOLEAN | Current flag |

---

## 4. Slowly Changing Dimensions (SCD Type 2)

### 4.1 When to Create a New Version

SCD Type 2 tracking is applied to: project name, study title, indicator definition, enumerator team, organization name.

A new version is created when:
- Name or key descriptive attribute changes
- Status changes (e.g., project moves from Active to Closed)
- Indicator definition is revised

### 4.2 Historical Tracking Example

```sql
-- Track indicator definition changes over time
SELECT
    i.name,
    i.definition,
    i.valid_from,
    i.valid_to,
    i.is_current,
    iv.value,
    iv.period_end
FROM dim_indicator i
JOIN fact_indicator_values iv ON iv.dim_indicator_key = i.indicator_key
WHERE i.indicator_id = 'uuid-123'
ORDER BY iv.period_end, i.valid_from;

-- Result shows which definition was active when each value was recorded
-- Enables: "What was the indicator definition when the 2023 baseline was set?"
```

### 4.3 SCD Management

```sql
-- Type 2 dimension upsert function
CREATE OR REPLACE FUNCTION analytics.upsert_dim_indicator(
    p_indicator_id UUID,
    p_name VARCHAR,
    p_definition TEXT,
    p_target_value DECIMAL
) RETURNS INT AS $$
DECLARE
    v_current_key INT;
    v_new_key INT;
BEGIN
    -- Get current version
    SELECT indicator_key INTO v_current_key
    FROM analytics.dim_indicator
    WHERE indicator_id = p_indicator_id AND is_current = TRUE;

    -- If name/definition changed, close current and create new
    IF v_current_key IS NOT NULL AND EXISTS (
        SELECT 1 FROM analytics.dim_indicator
        WHERE indicator_key = v_current_key
        AND (name IS DISTINCT FROM p_name OR definition IS DISTINCT FROM p_definition)
    ) THEN
        UPDATE analytics.dim_indicator
        SET valid_to = CURRENT_DATE, is_current = FALSE
        WHERE indicator_key = v_current_key;

        INSERT INTO analytics.dim_indicator (indicator_id, name, definition, target_value, valid_from, is_current)
        VALUES (p_indicator_id, p_name, p_definition, p_target_value, CURRENT_DATE, TRUE)
        RETURNING indicator_key INTO v_new_key;

        RETURN v_new_key;
    END IF;

    -- No change or new record: update/insert
    IF v_current_key IS NOT NULL THEN
        UPDATE analytics.dim_indicator
        SET target_value = p_target_value
        WHERE indicator_key = v_current_key;
        RETURN v_current_key;
    ELSE
        INSERT INTO analytics.dim_indicator (indicator_id, name, definition, target_value, valid_from, is_current)
        VALUES (p_indicator_id, p_name, p_definition, p_target_value, CURRENT_DATE, TRUE)
        RETURNING indicator_key INTO v_new_key;
        RETURN v_new_key;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. Materialized View Specifications

### 5.1 mv_study_dashboard

**Purpose:** Powers the pre-built study dashboard (submission counts, completion rates, quality)

```sql
CREATE MATERIALIZED VIEW analytics.mv_study_dashboard AS
SELECT
    ds.study_key,
    ds.study_id,
    ds.title AS study_title,
    ds.study_type,
    ds.status,
    ds.sample_size,
    ds.start_date,
    ds.end_date,

    -- Submission counts
    COUNT(DISTINCT fs.submission_key) AS total_submissions,
    COUNT(DISTINCT fs.submission_key) FILTER (WHERE fs.status = 'approved') AS approved_submissions,
    COUNT(DISTINCT fs.submission_key) FILTER (WHERE fs.status = 'rejected') AS rejected_submissions,
    COUNT(DISTINCT fs.submission_key) FILTER (WHERE fs.flagged_for_review) AS flagged_submissions,

    -- Enumerator activity
    COUNT(DISTINCT fs.dim_enumerator_key) AS active_enumerators,
    COUNT(DISTINCT fs.dim_enumerator_key) FILTER (
        WHERE fs.dim_time_completed_key >= TO_CHAR(CURRENT_DATE - INTERVAL '7 days', 'YYYYMMDD')::INT
    ) AS active_enumerators_7d,

    -- Duration stats
    AVG(fs.duration_seconds)::INT AS avg_duration_seconds,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fs.duration_seconds) AS median_duration_seconds,

    -- Quality
    AVG(dq.score)::DECIMAL(5,2) AS avg_quality_score,

    -- Progress
    CASE
        WHEN ds.sample_size IS NULL OR ds.sample_size = 0 THEN NULL
        ELSE ROUND(
            COUNT(DISTINCT fs.submission_key)::DECIMAL / ds.sample_size * 100, 1
        )
    END AS completion_rate_pct,

    -- Timeline
    MIN(fs.dim_time_completed_key) AS first_submission_date,
    MAX(fs.dim_time_completed_key) AS last_submission_date,

    -- Flag rate
    CASE
        WHEN COUNT(DISTINCT fs.submission_key) = 0 THEN NULL
        ELSE ROUND(
            COUNT(DISTINCT fs.submission_key) FILTER (WHERE fs.flagged_for_review)::DECIMAL /
            NULLIF(COUNT(DISTINCT fs.submission_key), 0) * 100, 1
        )
    END AS flag_rate_pct

FROM analytics.dim_study ds
LEFT JOIN analytics.fact_submissions fs ON fs.dim_study_key = ds.study_key
LEFT JOIN analytics.fact_data_quality dq ON dq.dim_submission_key = fs.submission_key
WHERE ds.is_current = TRUE
GROUP BY ds.study_key, ds.study_id, ds.title, ds.study_type, ds.status,
         ds.sample_size, ds.start_date, ds.end_date;

CREATE UNIQUE INDEX ix_mv_study_dashboard ON analytics.mv_study_dashboard(study_key);
```

**Refresh:** Every 15 minutes via CONCURRENTLY

### 5.2 mv_indicator_tracking

**Purpose:** Powers the indicator tracking dashboard (baseline vs actual vs target, RAG status)

```sql
CREATE MATERIALIZED VIEW analytics.mv_indicator_tracking AS
SELECT
    di.indicator_key,
    di.indicator_id,
    di.code AS indicator_code,
    di.name AS indicator_name,
    di.level,
    di.indicator_type,
    di.unit,
    di.direction,
    di.baseline_value,
    di.target_value,
    di.is_kpi,
    di.is_donor_reporting,

    -- Latest actual value
    fi.value AS latest_value,
    fi.numerator_value AS latest_numerator,
    fi.denominator_value AS latest_denominator,
    fi.period_end AS latest_period_end,
    fi.sample_size AS latest_sample_size,
    fi.confidence_low AS latest_ci_low,
    fi.confidence_high AS latest_ci_high,

    -- RAG status
    CASE
        WHEN fi.value IS NULL THEN 'no_data'
        WHEN di.target_value IS NULL THEN 'tracking_only'
        WHEN di.direction = 'positive' AND fi.value >= di.target_value THEN 'achieved'
        WHEN di.direction = 'negative' AND fi.value <= di.target_value THEN 'achieved'
        WHEN di.direction = 'positive' AND fi.value >= di.target_value * 0.75 THEN 'on_track'
        WHEN di.direction = 'negative' AND fi.value <= di.target_value * 1.25 THEN 'on_track'
        WHEN di.direction = 'positive' AND fi.value >= di.target_value * 0.50 THEN 'at_risk'
        WHEN di.direction = 'negative' AND fi.value <= di.target_value * 1.50 THEN 'at_risk'
        ELSE 'off_track'
    END AS rag_status,

    -- Achievement percentage
    CASE
        WHEN di.baseline_value IS NULL OR di.target_value IS NULL OR fi.value IS NULL THEN NULL
        WHEN di.target_value = di.baseline_value THEN NULL
        WHEN di.direction = 'positive' THEN
            ROUND((fi.value - di.baseline_value) / (di.target_value - di.baseline_value) * 100, 1)
        ELSE
            ROUND((di.baseline_value - fi.value) / (di.baseline_value - di.target_value) * 100, 1)
    END AS achievement_pct,

    -- Trend direction (compared to previous period)
    fi.period_end AS current_period,
    prev.value AS previous_value,
    prev.period_end AS previous_period,
    CASE
        WHEN prev.value IS NULL OR fi.value IS NULL THEN 'no_trend'
        WHEN fi.value > prev.value THEN 'increasing'
        WHEN fi.value < prev.value THEN 'decreasing'
        ELSE 'stable'
    END AS trend_direction

FROM analytics.dim_indicator di
LEFT JOIN LATERAL (
    SELECT value, numerator_value, denominator_value, period_end,
           sample_size, confidence_low, confidence_high
    FROM analytics.fact_indicator_values
    WHERE dim_indicator_key = di.indicator_key
      AND is_actual = TRUE
      AND disaggregation_dimension IS NULL  -- Non-disaggregated
    ORDER BY period_end DESC
    LIMIT 1
) fi ON TRUE
LEFT JOIN LATERAL (
    SELECT value, period_end
    FROM analytics.fact_indicator_values
    WHERE dim_indicator_key = di.indicator_key
      AND is_actual = TRUE
      AND disaggregation_dimension IS NULL
    ORDER BY period_end DESC
    OFFSET 1 LIMIT 1
) prev ON TRUE
WHERE di.is_current = TRUE;

CREATE UNIQUE INDEX ix_mv_indicator_tracking ON analytics.mv_indicator_tracking(indicator_key);
CREATE INDEX ix_mv_indicator_rag ON analytics.mv_indicator_tracking(rag_status);
CREATE INDEX ix_mv_indicator_kpi ON analytics.mv_indicator_tracking(is_kpi) WHERE is_kpi = TRUE;
```

**Refresh:** Every 60 minutes via CONCURRENTLY

### 5.3 mv_enumerator_performance

**Purpose:** Powers enumerator performance dashboards

```sql
CREATE MATERIALIZED VIEW analytics.mv_enumerator_performance AS
SELECT
    de.enumerator_key,
    de.enumerator_id,
    de.full_name AS enumerator_name,
    de.team_name,
    de.supervisor_name,
    de.is_active,

    fs.dim_study_key,
    ds.title AS study_title,

    -- Productivity
    COUNT(DISTINCT fs.submission_key) AS total_submissions,
    COUNT(DISTINCT fs.submission_key) FILTER (
        WHERE fs.dim_time_completed_key >= TO_CHAR(CURRENT_DATE - INTERVAL '7 days', 'YYYYMMDD')::INT
    ) AS submissions_7d,
    COUNT(DISTINCT fs.submission_key) / NULLIF(30, 0) AS submissions_per_day_30d,

    -- Quality
    COUNT(DISTINCT fs.submission_key) FILTER (WHERE fs.flagged_for_review) AS flagged_submissions,
    COUNT(DISTINCT fs.submission_key) FILTER (WHERE fs.validation_status = 'failed') AS failed_submissions,
    ROUND(
        COUNT(DISTINCT fs.submission_key) FILTER (WHERE fs.flagged_for_review)::DECIMAL /
        NULLIF(COUNT(DISTINCT fs.submission_key), 0) * 100, 1
    ) AS flag_rate_pct,
    AVG(dq.score)::DECIMAL(5,2) AS avg_quality_score,

    -- Duration
    AVG(fs.duration_seconds)::INT AS avg_duration_seconds,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fs.duration_seconds) AS median_duration_seconds,

    -- Timeliness
    MIN(fs.dim_time_completed_key) AS first_submission_date,
    MAX(fs.dim_time_completed_key) AS last_submission_date,
    COUNT(DISTINCT fs.dim_time_completed_key) AS active_days

FROM analytics.dim_enumerator de
JOIN analytics.fact_submissions fs ON fs.dim_enumerator_key = de.enumerator_key
JOIN analytics.dim_study ds ON ds.study_key = fs.dim_study_key
LEFT JOIN analytics.fact_data_quality dq ON dq.dim_submission_key = fs.submission_key
WHERE de.is_current = TRUE
  AND ds.is_current = TRUE
GROUP BY de.enumerator_key, de.enumerator_id, de.full_name, de.team_name,
         de.supervisor_name, de.is_active, fs.dim_study_key, ds.title;

CREATE UNIQUE INDEX ix_mv_enum_perf ON analytics.mv_enumerator_performance(enumerator_key, dim_study_key);
```

**Refresh:** Every 6 hours via CONCURRENTLY

### 5.4 mv_geographic_coverage

**Purpose:** Powers geographic coverage maps

```sql
CREATE MATERIALIZED VIEW analytics.mv_geographic_coverage AS
SELECT
    dl.admin_level_0,
    dl.admin_level_1,
    dl.admin_level_2,
    dl.admin_level_3,
    fs.dim_study_key,
    ds.title AS study_title,
    ds.study_type,

    COUNT(DISTINCT fs.submission_key) AS submission_count,
    COUNT(DISTINCT fs.dim_enumerator_key) AS enumerator_count,
    MIN(fs.dim_time_completed_key) AS first_submission,
    MAX(fs.dim_time_completed_key) AS last_submission,
    COUNT(DISTINCT fs.submission_key) FILTER (
        WHERE fs.dim_time_completed_key >= TO_CHAR(CURRENT_DATE - INTERVAL '7 days', 'YYYYMMDD')::INT
    ) AS submissions_7d

FROM analytics.fact_submissions fs
JOIN analytics.dim_location dl ON dl.location_key = fs.dim_location_key
JOIN analytics.dim_study ds ON ds.study_key = fs.dim_study_key
WHERE ds.is_current = TRUE
  AND fs.status != 'draft'
GROUP BY dl.admin_level_0, dl.admin_level_1, dl.admin_level_2, dl.admin_level_3,
         fs.dim_study_key, ds.title, ds.study_type;

CREATE INDEX ix_mv_geo_study ON analytics.mv_geographic_coverage(dim_study_key);
CREATE INDEX ix_mv_geo_admin1 ON analytics.mv_geographic_coverage(admin_level_0, admin_level_1);
```

**Refresh:** Every 24 hours via CONCURRENTLY

### 5.5 mv_longitudinal_trends

**Purpose:** Powers baseline → midline → endline comparison charts

```sql
CREATE MATERIALIZED VIEW analytics.mv_longitudinal_trends AS
SELECT
    fi.dim_indicator_key,
    di.code AS indicator_code,
    di.name AS indicator_name,
    di.level,
    ds.project_key,
    dp.name AS project_name,
    ds.study_key,
    ds.title AS study_title,
    ds.study_type,
    ds.start_date AS study_start_date,
    ds.end_date AS study_end_date,

    fi.period_end,
    fi.value,
    fi.numerator_value,
    fi.denominator_value,
    fi.confidence_low,
    fi.confidence_high,
    fi.sample_size,
    fi.disaggregation_dimension,
    fi.disaggregation_category

FROM analytics.fact_indicator_values fi
JOIN analytics.dim_indicator di ON di.indicator_key = fi.dim_indicator_key AND di.is_current = TRUE
JOIN analytics.dim_study ds ON ds.study_key = fi.dim_study_key AND ds.is_current = TRUE
JOIN analytics.dim_project dp ON dp.project_key = ds.project_key AND dp.is_current = TRUE
WHERE fi.is_actual = TRUE;

CREATE INDEX ix_mv_longitudinal_indicator ON analytics.mv_longitudinal_trends(dim_indicator_key, period_end);
CREATE INDEX ix_mv_longitudinal_study ON analytics.mv_longitudinal_trends(study_key);
CREATE INDEX ix_mv_longitudinal_project ON analytics.mv_longitudinal_trends(project_key);
```

**Refresh:** Every 60 minutes via CONCURRENTLY

---

## 6. Aggregate Tables

### 6.1 agg_daily_submissions

**Purpose:** Pre-computed daily submission counts for time-series charts

```sql
CREATE TABLE analytics.agg_daily_submissions (
    agg_date DATE NOT NULL,
    dim_organization_key INT NOT NULL,
    dim_project_key INT,
    dim_study_key INT NOT NULL,
    dim_enumerator_key INT,
    total_submissions INT NOT NULL DEFAULT 0,
    approved_submissions INT NOT NULL DEFAULT 0,
    rejected_submissions INT NOT NULL DEFAULT 0,
    flagged_submissions INT NOT NULL DEFAULT 0,
    unique_enumerators INT NOT NULL DEFAULT 0,
    avg_duration_seconds INT,
    avg_quality_score DECIMAL(5,2),
    PRIMARY KEY (agg_date, dim_study_key, dim_enumerator_key)
);
```

**Population:** Incremental nightly batch via:
```sql
INSERT INTO analytics.agg_daily_submissions
SELECT
    fs.dim_time_completed_key::TEXT::DATE AS agg_date,
    fs.dim_organization_key,
    fs.dim_project_key,
    fs.dim_study_key,
    fs.dim_enumerator_key,
    COUNT(*) AS total_submissions,
    COUNT(*) FILTER (WHERE fs.status = 'approved') AS approved_submissions,
    COUNT(*) FILTER (WHERE fs.status = 'rejected') AS rejected_submissions,
    COUNT(*) FILTER (WHERE fs.flagged_for_review) AS flagged_submissions,
    COUNT(DISTINCT fs.dim_enumerator_key) AS unique_enumerators,
    AVG(fs.duration_seconds)::INT AS avg_duration_seconds,
    AVG(dq.score)::DECIMAL(5,2) AS avg_quality_score
FROM analytics.fact_submissions fs
LEFT JOIN analytics.fact_data_quality dq ON dq.dim_submission_key = fs.submission_key
WHERE fs.dim_time_completed_key = TO_CHAR(YESTERDAY, 'YYYYMMDD')::INT
GROUP BY agg_date, fs.dim_organization_key, fs.dim_project_key,
         fs.dim_study_key, fs.dim_enumerator_key;
```

### 6.2 agg_indicator_achievement

**Purpose:** Pre-computed indicator status for KPI dashboards

```sql
CREATE TABLE analytics.agg_indicator_achievement (
    snapshot_date DATE NOT NULL,
    dim_organization_key INT NOT NULL,
    dim_project_key INT,
    dim_study_key INT,
    total_indicators INT NOT NULL,
    achieved_count INT NOT NULL,
    on_track_count INT NOT NULL,
    at_risk_count INT NOT NULL,
    off_track_count INT NOT NULL,
    no_data_count INT NOT NULL,
    achievement_rate DECIMAL(5,2),
    PRIMARY KEY (snapshot_date, dim_organization_key)
);
```

---

## 7. Table Count Summary

| Schema | Table Type | Count |
|--------|-----------|-------|
| `analytics` | Fact tables | 4 |
| `analytics` | Dimension tables | 8 |
| `analytics` | Materialized views | 5 |
| `analytics` | Aggregate tables | 2 |
| `analytics` | Semantic views | ~15 |
| `analytics_public` | Cross-tenant platform tables | 3 |
| **Total analytics objects** | | **37** |
