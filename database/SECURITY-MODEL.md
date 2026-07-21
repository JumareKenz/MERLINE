# Merline Database Security Model

## Overview

This document defines the complete database security architecture: Row-Level Security (RLS), field-level encryption, schema-per-tenant isolation, database roles, audit triggers, PII protection, data retention, and backup/recovery.

**Security principles**:
- Defense in depth: application + database + infrastructure layers
- Least privilege: minimum access for every role
- Tenant isolation: no cross-tenant data leakage
- Auditability: every data access is traceable
- Encryption: at rest, in transit, and for sensitive fields

---

## 1. Row-Level Security (RLS) Policies

### 1.1 RLS Implementation Strategy

RLS is applied at the application level (Laravel global scopes) rather than at the database level. Rationale:
- Schema-per-tenant already provides tenant isolation
- Laravel Eloquent scopes are more maintainable
- Database RLS adds complexity to connection pooling (PgBouncer)
- Application-level policies are testable and auditable

### 1.2 Tenant Isolation via Global Scope

```php
<?php
// app/Scopes/TenantScope.php

class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $tenantId = app(ContextService::class)->tenantId();
        $builder->where($model->getTable() . '.organization_id', $tenantId);
    }
}

// Applied to all tenant-scoped models
protected static function booted(): void
{
    static::addGlobalScope(new TenantScope);
}
```

### 1.3 Role-Based Query Scoping

```php
<?php
// app/Scopes/RoleScope.php

class RoleScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $user = auth()->user();
        
        match ($user->role) {
            'enumerator' => $builder->where('enumerator_id', $user->id),
            'supervisor' => $builder->whereIn('enumerator_id', $user->teamMembers()->pluck('id')),
            'viewer' => $builder->where('is_published', true),
            default => null, // Full access for admin/researcher
        };
    }
}
```

### 1.4 Database-Level RLS (For High-Security Tables)

```sql
-- Optional: Additional RLS on sensitive tables
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_values ENABLE ROW LEVEL SECURITY;

-- Policy: Enumerator can only see own submissions
CREATE POLICY submission_enumerator_policy ON submissions
    FOR ALL
    USING (enumerator_id = current_setting('app.current_user_id')::UUID);

-- Policy: Supervisor can see team submissions
CREATE POLICY submission_supervisor_policy ON submissions
    FOR SELECT
    USING (
        enumerator_id IN (
            SELECT user_id FROM team_members tm
            JOIN teams t ON t.id = tm.team_id
            WHERE t.supervisor_id = current_setting('app.current_user_id')::UUID
        )
    );
```

---

## 2. Field-Level Encryption Strategy

### 2.1 PII Classification

| Level | Definition | Examples | Handling |
|-------|------------|----------|----------|
| **Public** | No restriction | Project names, aggregations | No encryption |
| **Internal** | Org-internal | Indicator definitions, study methodologies | No encryption |
| **Sensitive** | PII, confidential | Names, phone numbers, GPS coordinates | Encrypted at rest |
| **Restricted** | Highly confidential | Consent records, health data, biometrics | Encrypted + audit log |

### 2.2 Laravel Encrypted Casts

```php
<?php
// app/Models/Submission.php

class Submission extends Model
{
    protected $casts = [
        'respondent_id' => 'encrypted',
        'notes' => 'encrypted',
    ];
}

// app/Models/ResponseValue.php

class ResponseValue extends Model
{
    protected $casts = [
        'value' => 'encrypted:json', // Encrypts the entire JSONB value
    ];
}
```

### 2.3 Database-Level Encryption Functions

```sql
-- Extension for pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive data using AES-256
CREATE OR REPLACE FUNCTION encrypt_sensitive(data TEXT, key TEXT DEFAULT current_setting('app.encryption_key'))
RETURNS BYTEA AS $$
BEGIN
    RETURN encrypt(data::bytea, key::bytea, 'aes');
END;
$$ LANGUAGE plpgsql STABLE;

-- Decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive(data BYTEA, key TEXT DEFAULT current_setting('app.encryption_key'))
RETURNS TEXT AS $$
BEGIN
    RETURN convert_from(decrypt(data, key::bytea, 'aes'), 'UTF8');
END;
$$ LANGUAGE plpgsql STABLE;
```

### 2.4 PII Column Tracking

```sql
-- Questions flagged as PII are tracked for automatic encryption
CREATE TABLE public.pii_columns (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    organization_id UUID NOT NULL,
    table_name      VARCHAR(100) NOT NULL,
    column_name     VARCHAR(100) NOT NULL,
    encryption_key_id VARCHAR(100) NOT NULL,
    rotation_date   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_pii_columns_org ON public.pii_columns(organization_id);
```

---

## 3. Schema-Per-Tenant Isolation Implementation

### 3.1 Isolation Architecture

```
┌─────────────────────────────────────────────────────┐
│                  PostgreSQL Cluster                   │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ public    │  │ tenant_A │  │ tenant_B │  ...      │
│  │ schema    │  │ schema   │  │ schema   │           │
│  │           │  │           │  │           │           │
│  │ • users   │  │ • projects│  │ • projects│           │
│  │ • orgs    │  │ • studies │  │ • studies │           │
│  │ • roles   │  │ • ...     │  │ • ...     │           │
│  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────┘
```

### 3.2 Tenant Resolution Flow

```
1. Request arrives → API Gateway authenticates JWT
2. JWT contains: { sub: user_id, org: tenant_id, role: role }
3. Middleware extracts tenant_id → sets search_path
4. Laravel connection uses: SET search_path TO tenant_{id}, public
5. All queries automatically scope to tenant schema
```

### 3.3 Tenant Creation DDL

```sql
DO $$
DECLARE
    tenant_id UUID := 'generated-uuid';
    schema_name TEXT := 'tenant_' || replace(tenant_id::TEXT, '-', '_');
BEGIN
    -- Create isolated schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
    
    -- Create tenant-specific role
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', 
        'tenant_' || tenant_id, 'generated-password');
    
    -- Grant schema permissions
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', schema_name, 'tenant_' || tenant_id);
    EXECUTE format('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I TO %I', 
        schema_name, 'tenant_' || tenant_id);
END $$;
```

### 3.4 Cross-Tenant Operations

```sql
-- System admin queries (with superuser permission)
SET search_path TO public;

-- List all tenant schemas
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name LIKE 'tenant_%';

-- Aggregate across tenants (for platform analytics)
SELECT COUNT(*) AS total_submissions
FROM (
    SELECT tableoid::regclass::text AS tenant, COUNT(*)
    FROM tenant_A.submissions
    UNION ALL
    SELECT tableoid::regclass::text, COUNT(*)
    FROM tenant_B.submissions
) AS all_submissions;
```

---

## 4. Database Roles and Permissions

### 4.1 Database Role Hierarchy

```sql
-- System roles
CREATE ROLE merline_admin LOGIN SUPERUSER;
CREATE ROLE merline_app LOGIN NOINHERIT;
CREATE ROLE merline_readonly LOGIN NOINHERIT;
CREATE ROLE merline_migration LOGIN NOINHERIT;

-- Application roles (inherit from merline_app)
CREATE ROLE merline_app_web LOGIN INHERIT;
CREATE ROLE merline_app_queue LOGIN INHERIT;
CREATE ROLE merline_app_scheduler LOGIN INHERIT;

-- Tenant-specific roles (created per tenant)
CREATE ROLE tenant_{id}_owner;
CREATE ROLE tenant_{id}_reader;
```

### 4.2 Permission Grants

```sql
-- Web application: full CRUD on tenant tables
GRANT USAGE ON SCHEMA tenant_{id} TO merline_app_web;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA tenant_{id} TO merline_app_web;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA tenant_{id} TO merline_app_web;

-- Queue workers: same as web but can also TRUNCATE temp tables
GRANT TRUNCATE ON TABLE temp_import_data TO merline_app_queue;

-- Read-only: for analytics/reports
GRANT CONNECT ON DATABASE merline TO merline_readonly;
GRANT USAGE ON SCHEMA tenant_{id} TO merline_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA tenant_{id} TO merline_readonly;

-- Migration role: can create/alter tables
GRANT ALL PRIVILEGES ON SCHEMA tenant_{id} TO merline_migration;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tenant_{id} TO merline_migration;
```

### 4.3 Default Privileges

```sql
-- Automatically grant permissions on new tables
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_{id}
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO merline_app_web;

ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_{id}
    GRANT SELECT ON TABLES TO merline_readonly;
```

---

## 5. Audit Trigger Implementation

### 5.1 Application-Level Audit

```php
<?php
// app/Listeners/LogAuditEvent.php

class LogAuditEvent
{
    public function handle(object $event): void
    {
        $audit = new AuditEvent();
        $audit->organization_id = $event->organizationId;
        $audit->event_type = $event->eventType;
        $audit->entity_type = $event->entityType;
        $audit->entity_id = $event->entityId;
        $audit->user_id = auth()->id();
        $audit->user_role = auth()->user()?->role;
        $audit->changes = $event->changes;
        $audit->ip_address = request()->ip();
        $audit->user_agent = request()->userAgent();
        $audit->device_id = request()->header('X-Device-Id');
        $audit->checksum = $this->generateChecksum($audit);
        $audit->save();
    }

    private function generateChecksum(AuditEvent $audit): string
    {
        $data = implode('|', [
            $audit->organization_id, $audit->event_type, $audit->entity_type,
            $audit->entity_id, $audit->user_id, $audit->created_at,
        ]);
        return hash('sha256', $data);
    }
}
```

### 5.2 Audit Events Coverage

| Event Type | Entities | Trigger |
|-----------|----------|---------|
| CREATE | All domain entities | Model created event |
| UPDATE | All domain entities | Model updated event (with diff) |
| DELETE | All domain entities | Model deleted event |
| APPROVE | Submissions, Indicators | Status change to approved |
| REJECT | Submissions | Status change to rejected |
| EXPORT | Submissions, Reports | Export action |
| LOGIN | Users | Authentication |
| FAILED_LOGIN | Users | Failed authentication |
| SYNC | Submissions | Sync event |
| DATA_ACCESS | Submissions (PII) | PII field accessed |

### 5.3 Database-Level Audit Trigger (Supplemental)

```sql
-- For critical immutable tables
CREATE OR REPLACE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_events (
        organization_id, event_type, entity_type, entity_id,
        user_id, changes, ip_address, checksum
    ) VALUES (
        COALESCE(NEW.organization_id, OLD.organization_id),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        current_setting('app.current_user_id')::UUID,
        CASE 
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::JSONB
            WHEN TG_OP = 'UPDATE' THEN 
                jsonb_build_object('old', row_to_json(OLD)::JSONB, 'new', row_to_json(NEW)::JSONB)
            ELSE row_to_json(NEW)::JSONB
        END,
        inet_client_addr()::TEXT,
        encode(sha256(COALESCE(NEW.id::TEXT, OLD.id::TEXT) || TG_OP || NOW()::TEXT), 'hex')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to critical tables
CREATE TRIGGER trg_audit_submissions AFTER INSERT OR UPDATE OR DELETE ON submissions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_audit_indicators AFTER INSERT OR UPDATE OR DELETE ON indicators
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

### 5.4 Audit Table Integrity Verification

```sql
-- Periodic integrity check (scheduled via pg_cron)
CREATE OR REPLACE FUNCTION verify_audit_integrity()
RETURNS TABLE(partition_name TEXT, record_count BIGINT, tampered_count BIGINT) AS $$
DECLARE
    partition_rec RECORD;
BEGIN
    FOR partition_rec IN 
        SELECT inhrelid::regclass::text AS partition_name
        FROM pg_inherits
        WHERE inhparent = 'public.audit_events'::regclass
    LOOP
        RETURN QUERY EXECUTE format('
            SELECT 
                %L::text AS partition_name,
                COUNT(*)::bigint AS record_count,
                COUNT(*) FILTER (
                    WHERE checksum != encode(sha256(
                        COALESCE(organization_id::text, '''') || ''|'' ||
                        COALESCE(event_type, '''') || ''|'' ||
                        COALESCE(entity_type, '''') || ''|'' ||
                        COALESCE(entity_id::text, '''') || ''|'' ||
                        COALESCE(user_id::text, '''') || ''|'' ||
                        COALESCE(created_at::text, '''')
                    ), ''hex'')
                )::bigint AS tampered_count
            FROM %I
        ', partition_rec.partition_name, partition_rec.partition_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. PII Identification and Protection Strategy

### 6.1 PII Data Inventory

| Table | Column | PII Level | Encryption | Masking |
|-------|--------|-----------|------------|---------|
| users | email | Sensitive | AES-256 | email@***.com |
| users | phone | Sensitive | AES-256 | ***-***-1234 |
| users | first_name | Sensitive | AES-256 | J*** |
| users | last_name | Sensitive | AES-256 | S*** |
| submissions | respondent_id | Sensitive | AES-256 | Partial |
| submissions | notes | Sensitive | AES-256 | N/A |
| response_values | value (when PII question) | Sensitive | AES-256 | Per type |
| consent_records | respondent_id | Restricted | AES-256 | Full |
| qualitative_sessions | notes | Sensitive | AES-256 | N/A |
| transcripts | content | Restricted | AES-256 | N/A |

### 6.2 Encryption at Rest Strategy

```php
<?php
// config/encryption.php

return [
    'key' => env('FIELD_ENCRYPTION_KEY'),
    'cipher' => 'AES-256-GCM',
    'key_rotation' => [
        'enabled' => true,
        'interval_days' => 90,
        'grace_period_days' => 7, // Old key still valid during rotation
    ],
    'columns' => [
        'users' => ['email', 'phone', 'first_name', 'last_name'],
        'submissions' => ['respondent_id', 'notes'],
        'consent_records' => ['respondent_id'],
        'transcripts' => ['content'],
    ],
];

// app/Casts/EncryptedCast.php

class EncryptedCast implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        if ($value === null) return null;
        return decrypt($value);
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        if ($value === null) return null;
        return encrypt($value);
    }
}
```

### 6.3 Data Masking for Exports

```php
<?php
// app/Services/DataMaskingService.php

class DataMaskingService
{
    public function maskForExport(array $data, string $userRole): array
    {
        return match ($userRole) {
            'enumerator' => $this->maskForEnumerator($data),
            'viewer' => $this->maskForViewer($data),
            'researcher' => $this->maskForResearcher($data),
            default => $data, // Admin sees full data
        };
    }

    private function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        return substr($parts[0], 0, 2) . '***@' . $parts[1];
    }

    private function maskPhone(string $phone): string
    {
        return '***-***-' . substr($phone, -4);
    }

    private function maskEnumerator(array $data): array
    {
        if (isset($data['respondent_id'])) {
            $data['respondent_id'] = substr($data['respondent_id'], 0, 4) . '****';
        }
        return $data;
    }
}
```

### 6.4 PII Access Logging

```php
<?php
// app/Http/Middleware/LogPIIAccess.php

class LogPIIAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Check if response contains PII data
        if ($this->containsPII($response->getContent())) {
            AuditEvent::create([
                'organization_id' => tenant()->id,
                'event_type' => 'DATA_ACCESS',
                'entity_type' => 'submissions',
                'entity_id' => $this->extractEntityId($request),
                'user_id' => auth()->id(),
                'user_role' => auth()->user()?->role,
                'metadata' => json_encode([
                    'endpoint' => $request->path(),
                    'contains_pii' => true,
                    'export_format' => $request->query('format'),
                ]),
            ]);
        }

        return $response;
    }

    private function containsPII(string $content): bool
    {
        // Check endpoint + content for PII indicators
        return str_contains(request()->path(), 'export')
            || request()->query('include_pii') === 'true';
    }
}
```

---

## 7. Data Retention and Purging Policies

### 7.1 Retention Schedule

| Data Category | Active Period | Warm Storage | Cold Storage | Hard Delete |
|--------------|---------------|--------------|--------------|-------------|
| Active study data | Study duration + 12mo | 12mo in DB | Compressed in S3 (Parquet) | After archive + 7yr |
| Completed studies | — | 12mo in DB | S3 Glacier | After 7yr configurable |
| User data | Employment + 24mo | Anonymized in DB | — | After 5yr |
| Audit logs | 3mo hot | 12mo warm in DB | S3 Glacier | After 7yr |
| AI inference logs | 90 days | — | — | After 90 days |
| Session/tokens | Until expiry | — | — | On expiry/logout |
| Media files | Study + 12mo | — | S3 Glacier | After archive + 7yr |
| Consent records | Study + 12mo | — | S3 Glacier (encrypted) | After archive + 10yr |

### 7.2 Retention Policy Implementation

```sql
-- Audit event retention: partition-based purging
CREATE OR REPLACE FUNCTION purge_audit_partitions()
RETURNS void AS $$
DECLARE
    retention_months INTEGER := 84; -- 7 years
BEGIN
    -- Drop partitions older than retention period
    EXECUTE format('
        DROP TABLE IF EXISTS public.audit_events_%s',
        to_char(NOW() - (retention_months || '' months'')::INTERVAL, ''YYYY_MM'')
    );
END;
$$ LANGUAGE plpgsql;

-- Schedule monthly purge
SELECT cron.schedule('purge-audit-partitions', '0 2 1 * *',
    'SELECT purge_audit_partitions()');
```

### 7.3 Soft Delete → Hard Delete Flow

```php
<?php
// app/Console/Commands/PurgeSoftDeletedData.php

class PurgeSoftDeletedData extends Command
{
    protected $signature = 'data:purge {--dry-run : Preview only}';

    public function handle(): int
    {
        $cutoff = now()->subYears(7);

        $tables = [
            'projects' => 5,     // years after delete
            'studies' => 5,
            'submissions' => 7,
            'indicators' => 7,
            'questionnaires' => 7,
        ];

        foreach ($tables as $table => $years) {
            $query = DB::table($table)
                ->where('deleted_at', '<', now()->subYears($years));

            $count = $query->count();

            if ($this->option('dry-run')) {
                $this->info("Table {$table}: {$count} records eligible for purge");
                continue;
            }

            $query->chunk(1000, function ($records) use ($table) {
                // Archive to S3 before deletion
                $this->archiveToS3($table, $records);
                // Hard delete
                DB::table($table)->whereIn('id', $records->pluck('id'))->delete();
            });

            $this->info("Purged {$count} records from {$table}");
        }

        return Command::SUCCESS;
    }

    private function archiveToS3(string $table, $records): void
    {
        $path = "archives/{$table}/" . now()->format('Y/m/d') . ".parquet";
        // Write to S3 in Parquet format
        Storage::disk('s3-archive')->put($path, $this->toParquet($records));
    }
}
```

---

## 8. Backup and Recovery Strategy

### 8.1 Backup Schedule

| Backup Type | Frequency | Retention | Storage | RPO |
|------------|-----------|-----------|---------|-----|
| Full database | Daily | 30 days | S3 + cross-region | 24 hours |
| WAL archival | Continuous | 7 days | S3 | 5 minutes |
| Tenant schema | On request | Per request | S3 | N/A |
| Configuration | Per change | 90 days | S3 | N/A |

### 8.2 Backup Script

```bash
#!/bin/bash
# scripts/backup-database.sh

BACKUP_DIR="/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="merline"
S3_BUCKET="s3://merline-backups"

# Full database backup (custom format for parallel restore)
pg_dump \
    --format=custom \
    --compress=9 \
    --file="${BACKUP_DIR}/full_${DATE}.dump" \
    --dbname="${DB_NAME}" \
    --no-owner \
    --verbose

# Encrypt backup
gpg --encrypt --recipient backup-key \
    --output "${BACKUP_DIR}/full_${DATE}.dump.gpg" \
    "${BACKUP_DIR}/full_${DATE}.dump"

# Upload to S3
aws s3 cp "${BACKUP_DIR}/full_${DATE}.dump.gpg" \
    "${S3_BUCKET}/full/${DATE}/"

# Verify backup integrity
pg_restore --list "${BACKUP_DIR}/full_${DATE}.dump" > /dev/null
if [ $? -eq 0 ]; then
    echo "Backup integrity verified: ${DATE}"
else
    echo "Backup integrity FAILED: ${DATE}" | mail -s "BACKUP FAILURE" devops@merline.io
fi

# Cleanup old backups (local)
find "${BACKUP_DIR}" -type f -name "full_*.dump*" -mtime +30 -delete
```

### 8.3 Point-in-Time Recovery Procedure

```bash
#!/bin/bash
# scripts/pitr-recovery.sh

RESTORE_TIME="2026-07-18 14:30:00 UTC"
DB_NAME="merline"
RESTORE_DB="merline_recovery"

# Stop application traffic
systemctl stop merline-api

# Restore from base backup
pg_restore \
    --dbname="${RESTORE_DB}" \
    --format=custom \
    --jobs=4 \
    --verbose \
    "${BACKUP_DIR}/latest_full.dump"

# Apply WAL to point in time
pg_ctl promote -D /var/lib/postgresql/data

# Or use recovery.conf for PITR:
# restore_command = 'aws s3 cp s3://merline-backups/wal/%f %p'
# recovery_target_time = '2026-07-18 14:30:00 UTC'
# recovery_target_action = 'promote'

# Verify data integrity
psql -d "${RESTORE_DB}" -c "SELECT COUNT(*) FROM submissions;"

# Switch traffic
# Update connection strings to point to restored database

# Notify team
echo "Recovery complete to ${RESTORE_TIME}"
```

### 8.4 Tenant-Specific Backup and Restore

```bash
#!/bin/bash
# Export single tenant
pg_dump \
    --schema="tenant_abc123" \
    --format=custom \
    --file="tenant_abc123_$(date +%Y%m%d).dump" \
    --dbname="merline"

# Import single tenant to another cluster
pg_restore \
    --schema="tenant_abc123" \
    --dbname="merline_new" \
    --format=custom \
    "tenant_abc123_20260718.dump"
```

### 8.5 Disaster Recovery Plan

| Scenario | Recovery Method | RTO | RPO |
|----------|----------------|-----|-----|
| Server failure | Promote replica to primary | < 5 min | < 5 min |
| Data corruption | PITR to last good state | < 1 hour | < 5 min |
| Accidental table drop | Schema-level restore + WAL | < 2 hours | < 5 min |
| Region failure | Cross-region replica promotion | < 30 min | < 5 min |
| Ransomware | Full restore from encrypted backup | < 4 hours | < 24 hours |

### 8.6 Recovery Testing

```php
<?php
// app/Console/Commands/TestRecovery.php

class TestRecovery extends Command
{
    public function handle(): int
    {
        $this->info('Starting recovery drill...');

        // 1. Create test database
        DB::statement('CREATE DATABASE merline_drill_test');

        // 2. Restore latest backup
        $exitCode = exec('pg_restore --dbname=merline_drill_test --format=custom --jobs=4 latest_backup.dump');
        
        if ($exitCode !== 0) {
            $this->error('Recovery drill FAILED: pg_restore error');
            return Command::FAILURE;
        }

        // 3. Verify data integrity
        $tables = DB::connection('drill')->select("
            SELECT table_name, (xpath('/row/cnt/text()', xmlagg(xmlelement(name cnt, count(*)))))[1]::text::int AS cnt
            FROM information_schema.tables t
            JOIN pg_catalog.pg_class c ON c.relname = t.table_name
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
            GROUP BY table_name
        ");

        $this->info("Verified {$tables} tables with data");

        // 4. Run integrity checks
        $checks = DB::connection('drill')->select("
            SELECT schemaname, tablename, indexname, idx_scan
            FROM pg_stat_user_indexes
        ");

        // 5. Cleanup
        DB::statement('DROP DATABASE IF EXISTS merline_drill_test');

        $this->info('Recovery drill COMPLETED successfully');
        return Command::SUCCESS;
    }
}
```

---

## 9. Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Tenant isolation** | Schema-per-tenant | Best isolation without per-database overhead |
| **RLS approach** | Application-level scopes | More maintainable than database RLS with PgBouncer |
| **Encryption** | Laravel encrypted casts + AES-256-GCM | Application-level encryption is auditable and portable |
| **PII tracking** | Column-level metadata + export masking | Complies with GDPR/data sovereignty requirements |
| **Audit** | Append-only partitioned table + checksums | Enables tamper detection and long-term retention |
| **Backup** | Custom format pg_dump + WAL archival | Best balance of compression, parallel restore, and PITR |
| **Retention** | Configurable per tenant/data type | Meets donor compliance requirements (USAID: 7yr, EU: 5yr) |
| **Recovery testing** | Automated quarterly drills | Validates RTO/RPO targets under controlled conditions |
