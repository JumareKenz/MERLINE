# Merline Data Governance Framework

## Governance Model

```
Executive Sponsor (CEO/CTO)
    └── Data Governance Committee
        ├── Data Owners (domain-specific)
        │   └── Data Stewards (day-to-day)
        │       └── Data Custodians (technical)
        ├── Data Quality Champions
        └── Analytics Lead
```

| Role | Responsibility | Phase |
|------|----------------|-------|
| Data Governance Committee | Policy approval, dispute resolution, compliance oversight | Phase 1 |
| Data Owner (Program) | Define data quality requirements, approve access, certify datasets | Phase 1 |
| Data Owner (M&E) | Indicator definitions, reporting standards, donor requirements | Phase 1 |
| Data Steward (M&E) | Day-to-day data quality monitoring, metadata maintenance | Phase 1 |
| Data Steward (Field) | Data collection oversight, enumerator training, field validation | Phase 1 |
| Data Custodian (Engineering) | Technical implementation, security controls, backup/recovery | Phase 1 |
| Data Quality Champion | Quality metric monitoring, improvement initiatives | Phase 1 |
| Analytics Lead | BI content governance, metric definitions, report certification | Phase 1 |

---

## 1. Data Ownership

### 1.1 Data Domain Assignment

| Domain | Data Owner | Steward | Source | Criticality |
|--------|------------|---------|--------|-------------|
| Organization structure | Program Director | Admin Manager | orgs table | High |
| Project/Program config | Program Director | Program Manager | projects table | High |
| Study/Survey design | M&E Director | M&E Officer | studies, forms tables | High |
| Participant data | M&E Director | M&E Officer | subjects table | Critical |
| Submissions/responses | M&E Director | Field Supervisor | submissions, response_values | Critical |
| Indicator values | M&E Director | M&E Officer | indicator_values | Critical |
| AI inferences | AI Systems Architect | ML Engineer | inference_log, embeddings | Medium |
| User accounts | CTO | System Admin | users table | Critical |
| Audit logs | CTO | System Admin | audit_log | High |
| Analytics aggregations | Analytics Lead | Data Engineer | analytics schema | High |

### 1.2 Data Ownership Matrix

```sql
CREATE TABLE governance.data_ownership (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    data_owner_id UUID NOT NULL REFERENCES users(id),
    data_steward_id UUID REFERENCES users(id),
    data_custodian_id UUID REFERENCES users(id),
    criticality VARCHAR(20) NOT NULL CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
    retention_policy_id UUID REFERENCES governance.retention_policies(id),
    classification_id UUID REFERENCES governance.classifications(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE governance.data_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_name VARCHAR(100) REFERENCES governance.data_ownership(domain_name),
    asset_name VARCHAR(200) NOT NULL,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN (
        'table', 'view', 'materialized_view', 'function', 'report',
        'dashboard', 'pipeline', 'export', 'model'
    )),
    schema_name VARCHAR(100),
    table_name VARCHAR(100),
    description TEXT,
    certification_status VARCHAR(20) DEFAULT 'uncertified'
        CHECK (certification_status IN ('uncertified', 'bronze', 'silver', 'gold')),
    certified_at TIMESTAMPTZ,
    certified_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 1.3 Certification Levels

| Level | Criteria | Badge | Refresh |
|-------|----------|-------|---------|
| Gold | Complete documentation, quality SLA met, tested lineage, signed off by data owner | Gold | Quarterly recertification |
| Silver | Documented, quality SLA met, basic lineage | 🥈 | Semi-annual |
| Bronze | Documented, known quality status | 🥉 | Annual |
| Uncertified | No formal certification | — | — |

---

## 2. Data Quality Framework

### 2.1 Quality Dimensions

| Dimension | Definition | Measure | Target |
|-----------|------------|---------|--------|
| Completeness | All required fields populated | % of records with non-null required fields | ≥ 99% |
| Accuracy | Values reflect real-world truth | % of records matching verified source | ≥ 98% |
| Consistency | Values consistent across related tables | % of records with consistent values | ≥ 99% |
| Timeliness | Data available within SLA | Time from collection to availability | ≤ 5 min (real-time), ≤ 1 hr (batch) |
| Uniqueness | No duplicate records | % of records with unique ID | 100% |
| Validity | Values conform to defined formats/ranges | % of records passing validation rules | ≥ 99.5% |
| Integrity | Referential integrity maintained | % of foreign key relationships valid | 100% |
| Freshness | Data not stale | Time since last update vs expected | Within 2× expected interval |

### 2.2 Quality Rules

```sql
CREATE TABLE governance.quality_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(200) NOT NULL,
    description TEXT,
    dimension VARCHAR(50) NOT NULL CHECK (dimension IN (
        'completeness', 'accuracy', 'consistency', 'timeliness',
        'uniqueness', 'validity', 'integrity', 'freshness'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
    scope_schema VARCHAR(100) NOT NULL,
    scope_table VARCHAR(100) NOT NULL,
    scope_columns JSONB,  -- null = all columns
    condition_sql TEXT NOT NULL,  -- SQL that returns violating rows
    target_threshold DECIMAL(5,2) NOT NULL,  -- e.g., 99.00 = 99%
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Built-in quality rules
INSERT INTO governance.quality_rules (rule_name, dimension, severity, scope_schema, scope_table, condition_sql, target_threshold) VALUES
('Required field completeness', 'completeness', 'error', 'public', 'submissions',
 'SELECT id FROM submissions WHERE deleted_at IS NULL AND status IS NULL', 99.00),
('No duplicate submissions', 'uniqueness', 'error', 'public', 'submissions',
 'SELECT s1.id FROM submissions s1 JOIN submissions s2 ON s1.study_id = s2.study_id AND s1.subject_id = s2.subject_id AND s1.form_id = s2.form_id AND s1.id <> s2.id AND s1.deleted_at IS NULL', 100.00),
('GPS coordinate validity', 'validity', 'error', 'public', 'submissions',
 'SELECT id FROM submissions WHERE latitude IS NOT NULL AND (latitude < -90 OR latitude > 90 OR longitude < -180 OR longitude > 180)', 100.00),
('Date consistency', 'consistency', 'warning', 'public', 'submissions',
 'SELECT id FROM submissions WHERE submitted_at < created_at', 99.00),
('Referential integrity', 'integrity', 'error', 'public', 'submissions',
 'SELECT s.id FROM submissions s LEFT JOIN studies st ON st.id = s.study_id WHERE st.id IS NULL', 100.00);
```

### 2.3 Quality Monitoring Pipeline

```php
class DataQualityMonitor
{
    public function runQualityChecks(string $schema = null): QualityRun
    {
        $run = QualityRun::create([
            'started_at' => now(),
            'status' => 'running',
        ]);

        $rules = governance\QualityRule::where('is_active', true)
            ->when($schema, fn($q) => $q->where('scope_schema', $schema))
            ->get();

        $results = [];
        foreach ($rules as $rule) {
            $result = $this->executeRule($rule);
            $results[] = $result;
            $this->handleAlert($result);
        }

        $run->update([
            'completed_at' => now(),
            'status' => 'completed',
            'duration_ms' => now()->diffInMilliseconds($run->started_at),
        ]);

        QualityRunResult::insert($results);

        // Update data asset certification
        $this->reassessCertifications($results);

        return $run;
    }

    private function executeRule(QualityRule $rule): array
    {
        $start = microtime(true);

        try {
            // Count total rows
            $total = DB::connection('analytics')->selectOne("
                SELECT COUNT(*) as cnt
                FROM {$rule->scope_schema}.{$rule->scope_table}
                WHERE deleted_at IS NULL
            ")->cnt;

            // Count violating rows
            $violations = DB::connection('analytics')->select($rule->condition_sql);
            $violationCount = count($violations);

            $passRate = $total > 0
                ? round(($total - $violationCount) / $total * 100, 2)
                : 100.00;

            $duration = (int)((microtime(true) - $start) * 1000);

            return [
                'quality_rule_id' => $rule->id,
                'total_rows' => $total,
                'violation_count' => $violationCount,
                'pass_rate' => $passRate,
                'threshold' => $rule->target_threshold,
                'status' => $passRate >= $rule->target_threshold ? 'pass' : 'fail',
                'severity' => $rule->severity,
                'execution_duration_ms' => $duration,
                'sample_violations' => $this->getSampleViolations($violations, $rule),
            ];
        } catch (\Exception $e) {
            return [
                'quality_rule_id' => $rule->id,
                'status' => 'error',
                'error_message' => $e->getMessage(),
            ];
        }
    }

    private function handleAlert(array $result): void
    {
        if ($result['status'] === 'fail' && $result['severity'] === 'error') {
            Alert::create([
                'type' => 'data_quality_failure',
                'severity' => 'critical',
                'title' => "Quality rule failed: {$result['rule_name']}",
                'message' => "Pass rate: {$result['pass_rate']}% (threshold: {$result['threshold']}%). "
                    . "{$result['violation_count']} violations found.",
                'metadata' => [
                    'rule_id' => $result['quality_rule_id'],
                    'violation_count' => $result['violation_count'],
                    'pass_rate' => $result['pass_rate'],
                ],
            ]);

            // Notify data steward
            Notification::send($result['steward_id'], QualityAlertNotification::class, $result);
        }
    }

    private function reassessCertifications(array $results): void
    {
        // If quality drops below silver threshold, downgrade certification
        foreach ($results as $result) {
            if ($result['status'] === 'fail') {
                $asset = DataAsset::where('schema_name', $result['scope_schema'])
                    ->where('table_name', $result['scope_table'])
                    ->first();

                if ($asset && $asset->certification_status === 'gold') {
                    $asset->update([
                        'certification_status' => 'silver',
                        'certified_at' => now(),
                    ]);
                }
            }
        }
    }
}
```

### 2.4 Quality Dashboards

```sql
-- Quality trend view (last 30 days)
SELECT
    qr.id AS rule_id,
    qr.rule_name,
    qr.dimension,
    qr.scope_schema || '.' || qr.scope_table AS target,
    qrr.pass_rate,
    qrr.threshold,
    CASE WHEN qrr.pass_rate >= qrr.threshold THEN 'PASS' ELSE 'FAIL' END AS status,
    qrr.execution_duration_ms,
    qrr.created_at AS checked_at
FROM governance.quality_runs qr
JOIN governance.quality_run_results qrr ON qrr.quality_run_id = qr.id
WHERE qr.created_at >= now() - INTERVAL '30 days'
ORDER BY qr.created_at DESC;

-- Quality score by schema
SELECT
    scope_schema,
    ROUND(AVG(pass_rate), 1) AS avg_quality_score,
    COUNT(*) FILTER (WHERE pass_rate < threshold) AS failing_rules,
    COUNT(*) AS total_rules,
    ROUND(COUNT(*) FILTER (WHERE pass_rate >= threshold)::DECIMAL / COUNT(*) * 100, 1) AS pass_rate
FROM governance.quality_rules qr
JOIN governance.quality_run_results qrr ON qrr.quality_rule_id = qr.id
JOIN governance.quality_runs qru ON qru.id = qrr.quality_run_id
WHERE qru.created_at >= now() - INTERVAL '7 days'
GROUP BY scope_schema;
```

---

## 3. Metadata Management

### 3.1 Business Glossary

```sql
CREATE TABLE governance.business_glossary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term VARCHAR(200) NOT NULL UNIQUE,
    definition TEXT NOT NULL,
    synonyms TEXT[],
    domain VARCHAR(100),
    source VARCHAR(100),  -- e.g., "OECD DAC", "Donor requirement"
    data_type VARCHAR(50),  -- e.g., "String", "Numeric", "Date"
    valid_values JSONB,  -- For categorical terms
    calculation_formula TEXT,  -- For derived metrics
    parent_term_id UUID REFERENCES governance.business_glossary(id),
    version INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'superseded')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Core terms
INSERT INTO governance.business_glossary (term, definition, domain, data_type) VALUES
('Indicator', 'A quantitative or qualitative measure used to assess progress toward a specific outcome or objective', 'MERL', 'Numeric/Percentage'),
('Target', 'The planned value of an indicator at a specific point in time', 'MERL', 'Numeric/Percentage'),
('Baseline', 'The initial measurement of an indicator before program intervention begins', 'MERL', 'Numeric/Percentage'),
('Endline', 'The final measurement of an indicator after program intervention concludes', 'MERL', 'Numeric/Percentage'),
('Disaggregation', 'The breakdown of indicator data by demographic or geographic categories', 'MERL', 'Categorical'),
('Submission', 'A completed data collection form submitted by an enumerator or participant', 'MERL', 'Record'),
('Enumerator', 'A trained data collector responsible for administering surveys and recording observations', 'Operations', 'Person'),
('Study Round', 'A distinct phase of data collection within a study (baseline, midline, endline)', 'MERL', 'Period');
```

### 3.2 Technical Metadata

```sql
CREATE TABLE governance.column_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    glossary_term_id UUID REFERENCES governance.business_glossary(id),
    description TEXT,
    data_type VARCHAR(50) NOT NULL,
    is_nullable BOOLEAN,
    is_pii BOOLEAN DEFAULT FALSE,
    is_sensitive BOOLEAN DEFAULT FALSE,
    encryption_required BOOLEAN DEFAULT FALSE,
    mask_rule VARCHAR(50),  -- e.g., 'full_mask', 'partial_mask', 'hash'
    default_value TEXT,
    validation_rules JSONB,
    source_system VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(schema_name, table_name, column_name)
);

CREATE TABLE governance.table_lineage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_schema VARCHAR(100) NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    source_schema VARCHAR(100) NOT NULL,
    source_table VARCHAR(100) NOT NULL,
    transformation_type VARCHAR(50) NOT NULL CHECK (transformation_type IN (
        'direct_copy', 'aggregation', 'join', 'filter', 'calculation',
        'type_conversion', 'deduplication', 'enrichment'
    )),
    transformation_description TEXT,
    pipeline_name VARCHAR(200),
    refresh_frequency VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.3 Automated Metadata Collection

```php
class MetadataCollector
{
    public function collect(): void
    {
        // Extract schema from PostgreSQL
        $tables = DB::connection('analytics')->select("
            SELECT
                table_schema,
                table_name,
                table_type,
                obj_description((table_schema || '.' || table_name)::regclass) AS table_description
            FROM information_schema.tables
            WHERE table_schema IN ('public', 'analytics', 'analytics_public', 'governance')
            ORDER BY table_schema, table_name
        ");

        foreach ($tables as $table) {
            $columns = DB::connection('analytics')->select("
                SELECT
                    column_name,
                    data_type,
                    is_nullable,
                    column_default,
                    col_description(
                        (table_schema || '.' || table_name)::regclass,
                        ordinal_position
                    ) AS column_description
                FROM information_schema.columns
                WHERE table_schema = :schema AND table_name = :table
                ORDER BY ordinal_position
            ", ['schema' => $table->table_schema, 'table' => $table->table_name]);

            // Upsert into column_metadata
            foreach ($columns as $column) {
                ColumnMetadata::updateOrCreate(
                    [
                        'schema_name' => $table->table_schema,
                        'table_name' => $table->table_name,
                        'column_name' => $column->column_name,
                    ],
                    [
                        'data_type' => $column->data_type,
                        'is_nullable' => $column->is_nullable === 'YES',
                        'default_value' => $column->column_default,
                        'description' => $column->column_description,
                    ]
                );
            }
        }
    }
}
```

### 3.4 Data Dictionary API

```
GET /api/governance/data-dictionary
    → List all tables with descriptions

GET /api/governance/data-dictionary/{schema}/{table}
    → Table details, columns, types, descriptions, glossary links

GET /api/governance/data-dictionary/{schema}/{table}/lineage
    → Upstream and downstream lineage

GET /api/governance/business-glossary
    → All business terms

GET /api/governance/business-glossary/{term}
    → Term definition, synonyms, linked columns

GET /api/governance/certification
    → All data assets with certification levels
```

---

## 4. Data Classification

### 4.1 Classification Levels

| Level | Label | Definition | Examples | Controls |
|-------|-------|------------|----------|----------|
| L1 | Public | Can be freely shared | Program names, organization structure, published reports | No restrictions |
| L2 | Internal | Internal use only | Study designs, aggregate data, metadata | Authenticated access only |
| L3 | Confidential | Sensitive operational data | PII, participant responses, financial data | Encrypted at rest/in transit, role-based access, audit logging |
| L4 | Restricted | Highly sensitive/regulated | Health data, biometric data, special category data | All L3 controls + field-level encryption, access approval, quarterly audit |

```sql
CREATE TABLE governance.classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(10) NOT NULL UNIQUE CHECK (level IN ('L1', 'L2', 'L3', 'L4')),
    label VARCHAR(50) NOT NULL,
    description TEXT,
    encryption_required BOOLEAN DEFAULT FALSE,
    encryption_algorithm VARCHAR(50),
    retention_default_days INTEGER,
    access_approval_required BOOLEAN DEFAULT FALSE,
    audit_logging_required BOOLEAN DEFAULT TRUE,
    masking_required BOOLEAN DEFAULT FALSE
);

INSERT INTO governance.classifications VALUES
    (gen_random_uuid(), 'L1', 'Public', 'Freely shareable', FALSE, NULL, 3650, FALSE, FALSE, FALSE),
    (gen_random_uuid(), 'L2', 'Internal', 'Internal use only', FALSE, NULL, 2555, FALSE, TRUE, FALSE),
    (gen_random_uuid(), 'L3', 'Confidential', 'Sensitive operational data', TRUE, 'AES-256-GCM', 1825, TRUE, TRUE, TRUE),
    (gen_random_uuid(), 'L4', 'Restricted', 'Highly sensitive/regulated', TRUE, 'AES-256-GCM', 730, TRUE, TRUE, TRUE);

-- Column-level classification
ALTER TABLE governance.column_metadata
ADD COLUMN classification_level VARCHAR(10) REFERENCES governance.classifications(level);
```

### 4.2 PII Detection

```php
class PIIDetector
{
    private array $patterns = [
        'email' => '/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/',
        'phone' => '/\+?\d{1,4}[\s-]?\(?\d{1,4}\)?[\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,4}/',
        'national_id' => '/[A-Z]{1,3}-\d{4,8}-[A-Z]{0,2}/',
        'passport' => '/[A-Z]{1,2}\d{6,9}/',
        'gps_coords' => '/-?\d{1,3}\.\d{4,},\s*-?\d{1,3}\.\d{4,}/',
        'name' => null,  // Requires column name heuristic
    ];

    public function scanColumn(string $schema, string $table, string $column, string $sampleData): ?string
    {
        foreach ($this->patterns as $piiType => $pattern) {
            if ($pattern && preg_match($pattern, $sampleData)) {
                return $piiType;
            }
        }

        // Column name heuristic
        $columnLower = strtolower($column);
        $nameKeywords = ['name', 'first_name', 'last_name', 'full_name'];
        if (in_array($columnLower, $nameKeywords)) return 'name';

        $contactKeywords = ['email', 'phone', 'mobile', 'telephone', 'whatsapp'];
        if (in_array($columnLower, $contactKeywords)) return match($columnLower) {
            'email' => 'email',
            default => 'phone',
        };

        return null;
    }

    public function scanAllUnclassified(): array
    {
        $results = [];
        $columns = ColumnMetadata::whereNull('classification_level')->get();

        foreach ($columns as $column) {
            // Sample up to 100 rows
            $sample = DB::connection('analytics')->select("
                SELECT {$column->column_name}
                FROM {$column->schema_name}.{$column->table_name}
                WHERE {$column->column_name} IS NOT NULL
                LIMIT 100
            ");

            foreach ($sample as $row) {
                $value = $row->{$column->column_name};
                if (is_string($value) && strlen($value) > 0) {
                    $type = $this->scanColumn(
                        $column->schema_name,
                        $column->table_name,
                        $column->column_name,
                        $value
                    );
                    if ($type) {
                        $results[] = [
                            'column_id' => $column->id,
                            'detected_type' => $type,
                            'suggested_classification' => 'L3',
                        ];
                        break;
                    }
                }
            }
        }

        return $results;
    }
}
```

### 4.3 Field-Level Encryption

For L3/L4 columns, implement PostgreSQL pgcrypto:

```sql
-- Encrypted column storage
CREATE TABLE public.encrypted_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    row_id UUID NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    encrypted_value BYTEA NOT NULL,
    encryption_key_id UUID NOT NULL,  -- References key management
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Application-level encryption/decryption
class FieldEncryptionService
{
    private string $masterKey;

    public function encrypt(string $value, string $context): array
    {
        $keyId = $this->getKeyId($context);
        $key = $this->getKey($keyId);
        $iv = random_bytes(12);
        $encrypted = openssl_encrypt(
            $value,
            'aes-256-gcm',
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
        return [
            'encrypted' => base64_encode($iv . $encrypted . $tag),
            'key_id' => $keyId,
        ];
    }

    public function decrypt(string $encryptedData, string $keyId): string
    {
        $key = $this->getKey($keyId);
        $data = base64_decode($encryptedData);
        $iv = substr($data, 0, 12);
        $tag = substr($data, -16);
        $ciphertext = substr($data, 12, -16);
        return openssl_decrypt(
            $ciphertext,
            'aes-256-gcm',
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );
    }
}
```

---

## 5. Data Retention & Archival

### 5.1 Retention Policies

```sql
CREATE TABLE governance.retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name VARCHAR(200) NOT NULL,
    data_category VARCHAR(100) NOT NULL,
    retention_period_days INTEGER NOT NULL,
    archival_strategy VARCHAR(50) NOT NULL CHECK (archival_strategy IN (
        'delete', 'anonymize', 'aggregate_only', 'cold_storage', 'indefinite'
    )),
    legal_basis TEXT,
    review_frequency_days INTEGER DEFAULT 365,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO governance.retention_policies
    (policy_name, data_category, retention_period_days, archival_strategy) VALUES
    ('Participant data', 'PII', 3650, 'anonymize'),        -- 10 years, then anonymize
    ('Survey responses', 'MERL_data', 3650, 'aggregate_only'),  -- 10 years, keep aggregates
    ('Raw submissions', 'operational', 730, 'cold_storage'),     -- 2 years, move to S3 Glacier
    ('Audit logs', 'system', 1825, 'cold_storage'),              -- 5 years
    ('Analytics aggregates', 'analytics', 7300, 'indefinite'),   -- 20 years, keep all
    ('AI inference logs', 'AI', 365, 'delete'),                 -- 1 year, then delete
    ('Error logs', 'operational', 90, 'delete'),                -- 90 days
    ('Session data', 'system', 1, 'delete');                    -- 24 hours
```

### 5.2 Archival Pipeline

```php
class ArchivalJob
{
    public function process(): void
    {
        $policies = RetentionPolicy::where('is_active', true)->get();

        foreach ($policies as $policy) {
            $cutoff = now()->subDays($policy->retention_period_days);

            $archivable = DB::connection('analytics')->select("
                SELECT id FROM {$policy->scope_schema}.{$policy->scope_table}
                WHERE created_at < :cutoff
            ", ['cutoff' => $cutoff]);

            if (empty($archivable)) continue;

            match ($policy->archival_strategy) {
                'cold_storage' => $this->moveToColdStorage($policy, $archivable),
                'anonymize' => $this->anonymizeData($policy, $archivable),
                'aggregate_only' => $this->aggregateAndDelete($policy, $archivable),
                'delete' => $this->deleteData($policy, $archivable),
                'indefinite' => null,  // No action
            };

            $this->logArchival($policy, count($archivable));
        }
    }

    private function anonymizeData(RetentionPolicy $policy, array $ids): void
    {
        $ids = array_column($ids, 'id');
        DB::connection('analytics')->statement("
            UPDATE {$policy->scope_schema}.{$policy->scope_table}
            SET
                first_name = 'ANONYMIZED',
                last_name = 'ANONYMIZED',
                phone = NULL,
                email = NULL,
                gps_latitude = NULL,
                gps_longitude = NULL,
                national_id = NULL,
                anonymized_at = now()
            WHERE id = ANY(:ids)
        ", ['ids' => $ids]);
    }

    private function moveToColdStorage(RetentionPolicy $policy, array $records): void
    {
        // Export to Parquet and upload to S3 Glacier
        $exporter = new ParquetExporter();
        $path = "archives/{$policy->data_category}/" . date('Y/m/d') . '/';
        $exporter->exportToS3($policy, $records, $path, 'GLACIER');

        // Delete from primary
        $this->deleteData($policy, $records);
    }
}
```

---

## 6. Access Control

### 6.1 Role-Based Permissions

```sql
CREATE TABLE governance.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE governance.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES governance.roles(id),
    resource_type VARCHAR(100) NOT NULL,  -- e.g., 'dashboard', 'report', 'pipeline', 'table'
    resource_id VARCHAR(100),  -- null = all resources of type
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'view', 'create', 'edit', 'delete', 'export', 'share',
        'certify', 'manage_access', 'view_lineage', 'view_quality'
    )),
    constraints JSONB,  -- e.g., {"tenants": ["tenant_1"]}, {"org_units": ["OU1"]}
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Standard roles
INSERT INTO governance.roles (name, description, is_system_role) VALUES
    ('analytics_admin', 'Full access to all analytics features', TRUE),
    ('analytics_editor', 'Create and edit dashboards, reports', TRUE),
    ('analytics_viewer', 'View published dashboards and reports', TRUE),
    ('data_steward', 'Manage data quality, metadata, governance', TRUE),
    ('analytics_api', 'Programmatic API access', TRUE);
```

### 6.2 Row-Level Security

PostgreSQL Row-Level Security for multi-tenant isolation:

```sql
-- Enable RLS on analytics schemas
ALTER TABLE analytics.fact_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: users only see their tenant's data
CREATE POLICY tenant_isolation ON analytics.fact_submissions
    USING (
        dim_org_key IN (
            SELECT org_key FROM analytics.dim_org
            WHERE tenant_id = current_setting('app.tenant_id')::UUID
        )
    );

-- Function to set tenant context
CREATE OR REPLACE FUNCTION analytics.set_tenant_context(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.tenant_id', p_tenant_id::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.3 Access Request Workflow

```
User requests access
    ↓
Submitted to Data Owner for approval
    ↓
Data Owner reviews request (role, scope, duration)
    ↓
Approved → Automated provisioning (L1/L2)
         → Manual approval + review (L3/L4)
    ↓
User notified
Access granted with expiry
    ↓
Quarterly access review
Auto-revoke at expiry
```

---

## 7. Audit & Compliance

### 7.1 Audit Logging

```sql
CREATE TABLE governance.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    actor_id UUID,  -- User ID or NULL for system
    actor_type VARCHAR(20) DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'api')),
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(200),
    action VARCHAR(50) NOT NULL,
    details JSONB,  -- Changed fields, old/new values
    ip_address INET,
    user_agent TEXT,
    tenant_id UUID,
    classification_level VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit events
CREATE INDEX idx_audit_actor ON governance.audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_resource ON governance.audit_log(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_event ON governance.audit_log(event_type, created_at DESC);
CREATE INDEX idx_audit_tenant ON governance.audit_log(tenant_id, created_at DESC);

-- Automated audit triggers
CREATE OR REPLACE FUNCTION governance.audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO governance.audit_log (
        event_type, actor_id, actor_type, resource_type, resource_id,
        action, details, ip_address
    ) VALUES (
        TG_ARGV[0],  -- event_type from trigger definition
        current_setting('app.user_id')::UUID,
        current_setting('app.actor_type'),
        TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
        NEW.id::TEXT,
        TG_OP,
        CASE
            WHEN TG_OP = 'UPDATE' THEN
                jsonb_build_object(
                    'old', row_to_json(OLD)::jsonb,
                    'new', row_to_json(NEW)::jsonb,
                    'changed_fields', (
                        SELECT jsonb_object_agg(key, value)
                        FROM jsonb_each(row_to_json(NEW)::jsonb)
                        WHERE row_to_json(OLD)::jsonb->>key IS DISTINCT FROM row_to_json(NEW)::jsonb->>key
                    )
                )
            WHEN TG_OP = 'DELETE' THEN
                jsonb_build_object('old', row_to_json(OLD)::jsonb)
            ELSE
                jsonb_build_object('new', row_to_json(NEW)::jsonb)
        END,
        inet_client_addr()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to sensitive tables
CREATE TRIGGER audit_submissions
    AFTER INSERT OR UPDATE OR DELETE ON submissions
    FOR EACH ROW EXECUTE FUNCTION governance.audit_trigger('data_access');
```

### 7.2 Mandatory Events

| Event | Trigger | Retention | Classification |
|-------|---------|-----------|----------------|
| Data access (L3/L4) | Any SELECT on classified columns | 5 years | L3 |
| Data modification | INSERT, UPDATE, DELETE on any table | 5 years | L2 |
| Schema change | DDL operations | 10 years | L2 |
| Access grant/revoke | Permission changes | 5 years | L3 |
| Export/download | Any data export | 5 years | L3 |
| Login/logout | Authentication events | 1 year | L2 |
| API key usage | API authentication | 1 year | L2 |
| Failed access attempt | Permission denied | 1 year | L2 |

### 7.3 Compliance Reporting

```sql
-- Quarterly compliance report
SELECT
    actor_id,
    COUNT(*) FILTER (WHERE action = 'SELECT') AS data_access_count,
    COUNT(*) FILTER (WHERE action IN ('INSERT', 'UPDATE', 'DELETE')) AS data_modification_count,
    COUNT(*) FILTER (WHERE event_type = 'export') AS export_count,
    MIN(created_at) AS first_event,
    MAX(created_at) AS last_event
FROM governance.audit_log
WHERE created_at >= now() - INTERVAL '90 days'
GROUP BY actor_id
ORDER BY data_access_count DESC;

-- Access review report
SELECT
    u.id AS user_id,
    u.name,
    COUNT(DISTINCT r.id) AS role_count,
    COUNT(DISTINCT p.resource_type || ':' || COALESCE(p.resource_id, '*')) AS permission_count,
    MAX(a.accessed_at) AS last_access,
    CASE
        WHEN MAX(a.accessed_at) < now() - INTERVAL '90 days' THEN 'inactive'
        ELSE 'active'
    END AS status
FROM users u
JOIN model_has_roles mhr ON mhr.model_id = u.id AND mhr.model_type = 'App\\Models\\User'
JOIN roles r ON r.id = mhr.role_id
LEFT JOIN (
    SELECT actor_id, MAX(created_at) AS accessed_at
    FROM governance.audit_log
    WHERE created_at >= now() - INTERVAL '365 days'
    GROUP BY actor_id
) a ON a.actor_id = u.id
GROUP BY u.id, u.name
ORDER BY status, last_access;
```

---

## 8. Governance Metrics & Reporting

### 8.1 Key Governance Metrics

| Metric | Definition | Target | Monitoring |
|--------|------------|--------|------------|
| Data Quality Score | Avg pass rate across all quality rules | ≥ 98% | Daily |
| Certified Asset % | % of data assets with gold/silver certification | ≥ 80% | Weekly |
| Glossary Coverage | % of tables with linked glossary terms | ≥ 90% | Monthly |
| PII Classification | % of PII columns correctly classified | 100% | Weekly |
| Audit Coverage | % of mandatory events logged | 100% | Daily |
| Access Review Rate | % of users reviewed in last 90 days | 100% | Quarterly |
| Retention Compliance | % of data meeting retention policies | 100% | Monthly |

### 8.2 Governance Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Data Governance Dashboard                          [Q2 2026] │
├─────────────────────────────────────────────────────────────┤
│  Overall Governance Score: 87%              ↑ +3% from Q1  │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ Quality  │ Coverage │ Security │ Adoption │ Certification  │
│  94%     │  82%     │  91%     │  78%     │  Gold: 12      │
│  ▲ 2%    │  ▲ 1%    │  ▼ 1%    │  ▲ 5%    │  Silver: 8     │
├──────────┴──────────┴──────────┴──────────┴────────────────┤
│                                                             │
│  Open Quality Issues: 3     Overdue Certifications: 2      │
│  Unclassified Columns: 15  Untagged Tables: 4              │
│                                                             │
│  Recent Activity:                                           │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │ ✓ Quality check passed  (1 min ago)                   │  │
│  │ ✓ PII scan completed   (15 min ago) - 3 detected     │  │
│  │ ⚠ Retention policy due  (2 days) - submissions       │  │
│  │ ✗ Quality rule failed   (3 hrs ago) - GPS validit... │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Governance Automation

### 9.1 Scheduled Jobs

```php
// App\Console\Kernel.php
protected function schedule(Schedule $schedule): void
{
    // Daily quality checks
    $schedule->job(new RunQualityChecks())->dailyAt('03:00');

    // Weekly PII detection scan
    $schedule->job(new ScanForPII())->weekly()->sundays()->at('04:00');

    // Monthly retention enforcement
    $schedule->job(new EnforceRetentionPolicies())
        ->monthly()->lastDayOfMonth()->at('23:00');

    // Monthly metadata refresh
    $schedule->job(new CollectMetadata())->monthly()->at('02:00');

    // Quarterly access review notification
    $schedule->job(new NotifyAccessReview())->quarterly()->at('09:00');

    // Weekly certification reassessment
    $schedule->job(new ReassessCertifications())->weekly()->mondays()->at('05:00');

    // Real-time quality alerting (via events)
    // Handled by DataQualityMonitor::handleAlert()
}
```

### 9.2 Governance API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/governance/quality/score | Overall quality score |
| GET | /api/governance/quality/rules | All quality rules with latest results |
| POST | /api/governance/quality/run | Trigger quality check run |
| GET | /api/governance/data-dictionary | Full data dictionary |
| GET | /api/governance/lineage/{table}| Table lineage |
| GET | /api/governance/glossary | Business glossary |
| POST | /api/governance/glossary | Create glossary term |
| GET | /api/governance/audit?actor=&resource=&from=&to= | Query audit log |
| GET | /api/governance/certification | Asset certification status |
| GET | /api/governance/metrics | Governance KPIs |
| POST | /api/governance/export/dictionary | Export data dictionary (PDF/CSV) |
