# Merline Database Migration Strategy

## Overview

This document defines the complete database migration approach for the Merline platform. It covers Laravel Migration patterns, schema-per-tenant migration execution, zero-downtime deployments, rollback strategies, testing, and versioning.

**Core principle**: Every schema change must be reversible, testable, and deployable without downtime across all tenant schemas.

---

## 1. Laravel Migration Architecture

### 1.1 Migration Directory Structure

```
database/
├── migrations/
│   ├── 0001_01_01_000000_create_public_schema.php        # Global tables (public schema)
│   ├── 0001_01_01_000001_create_tenant_schema_template.php # Template for tenant schemas
│   ├── 2026_07_18_000001_create_projects_table.php        # Tenant-scoped tables
│   ├── 2026_07_18_000002_create_studies_table.php
│   ├── ... 
│   └── 2026_07_18_000060_create_embeddings_table.php
├── tenants/
│   ├── 2026_07_18_000001_create_projects_table.php        # Tenant-only migrations
│   ├── ...
├── seeds/
│   ├── DatabaseSeeder.php
│   ├── RoleSeeder.php
│   ├── PermissionSeeder.php
│   ├── IndicatorLibrarySeeder.php
│   └── ReportTemplateSeeder.php
└── testing/
    └── TenantMigrationTest.php
```

### 1.2 Migration Base Class

```php
<?php
// app/Console/Commands/MakeTenantMigration.php
// Artisan command to scaffold tenant-aware migrations

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

abstract class TenantMigration extends Migration
{
    protected string $connection = 'tenant';

    /**
     * Run migrations across all tenant schemas.
     */
    public function up(): void
    {
        $tenants = DB::connection('public')->table('organizations')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->pluck('id');

        foreach ($tenants as $tenantId) {
            $this->runForTenant($tenantId);
        }
    }

    /**
     * Rollback migrations across all tenant schemas.
     */
    public function down(): void
    {
        $tenants = DB::connection('public')->table('organizations')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->pluck('id');

        foreach ($tenants as $tenantId) {
            $this->rollbackForTenant($tenantId);
        }
    }

    abstract protected function runForTenant(string $tenantId): void;
    abstract protected function rollbackForTenant(string $tenantId): void;
}
```

---

## 2. Schema-per-Tenant Migration Execution

### 2.1 Tenant Schema Resolution

```php
<?php
// app/Providers/TenantServiceProvider.php

public function boot(): void
{
    // Middleware sets tenant context per request
    $this->app['events']->listen(TeamFeatureBooted::class, function ($event) {
        $tenantId = $event->tenant->id;
        config(['database.connections.tenant.schema' => "tenant_{$tenantId}"]);
        
        DB::connection('tenant')->statement(
            "SET search_path TO tenant_{$tenantId}, public"
        );
    });
}
```

### 2.2 Migration Execution Command

```php
<?php
// app/Console/Commands/MigrateTenants.php

class MigrateTenants extends Command
{
    protected $signature = 'tenants:migrate 
                            {--tenant= : Single tenant ID to migrate}
                            {--batch : Migrate in batches of 10}
                            {--pretend : Dry run}
                            {--force : Force in production}';
    
    public function handle(): int
    {
        $tenants = $this->option('tenant')
            ? collect([$this->option('tenant')])
            : DB::connection('public')->table('organizations')
                ->where('is_active', true)->pluck('id');

        $batchSize = $this->option('batch') ? 10 : count($tenants);
        $bar = $this->output->createProgressBar(count($tenants));

        foreach ($tenants->chunk($batchSize) as $batch) {
            $batch->each(function ($tenantId) use ($bar) {
                $this->migrateTenant($tenantId);
                $bar->advance();
            });
        }

        $bar->finish();
        return Command::SUCCESS;
    }

    protected function migrateTenant(string $tenantId): void
    {
        config(["database.connections.tenant.schema" => "tenant_{$tenantId}"]);
        
        Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenants',
            '--force' => $this->option('force'),
            '--pretend' => $this->option('pretend'),
            '--no-interaction' => true,
        ]);
    }
}
```

### 2.3 Tenant Creation Flow

```
1. Organization registered
2. Create schema: CREATE SCHEMA tenant_{id}
3. Run base tenant migrations (all tenant tables)
4. Seed default data (roles, permission templates)
5. Create admin user membership
```

```php
<?php
// app/Actions/CreateTenantSchema.php

class CreateTenantSchema
{
    public function __invoke(Organization $org): void
    {
        DB::statement("CREATE SCHEMA IF NOT EXISTS tenant_{$org->id}");
        
        config(["database.connections.tenant.schema" => "tenant_{$org->id}"]);
        
        // Run all tenant migrations
        Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenants',
            '--force' => true,
        ]);
        
        // Seed defaults
        Artisan::call('db:seed', [
            '--class' => 'TenantSeeder',
            '--database' => 'tenant',
            '--force' => true,
        ]);
    }
}
```

---

## 3. Zero-Downtime Migration Patterns

### 3.1 Principles

| Principle | Description |
|-----------|-------------|
| **Backward compatible** | Old code must work with new schema |
| **Additive first** | Add columns/tables before removing |
| **Dual-write** | Write to old and new columns during transition |
| **Lazy migration** | Backfill data in background jobs |
| **Read replicas** | Test on replicas before primary |

### 3.2 Safe Migration Patterns

#### Pattern A: Adding a Column

```php
// SAFE: Add nullable column, backfill data, then add NOT NULL
Schema::table('projects', function (Blueprint $table) {
    $table->string('sector', 100)->nullable()->after('country');
});

// Background job backfills data
// After all rows populated:
Schema::table('projects', function (Blueprint $table) {
    $table->string('sector', 100)->nullable(false)->change();
});
```

#### Pattern B: Renaming a Column

```php
// Step 1: Add new column
Schema::table('studies', function (Blueprint $table) {
    $table->string('new_title', 500)->nullable()->after('title');
});

// Step 2: Application dual-writes to both columns
// Step 3: Backfill old data to new column
DB::table('studies')->whereNull('new_title')->update([
    'new_title' => DB::raw('title')
]);

// Step 4: Deploy code reading from new column
// Step 5: Remove old column
Schema::table('studies', function (Blueprint $table) {
    $table->dropColumn('title');
});
Schema::table('studies', function (Blueprint $table) {
    $table->renameColumn('new_title', 'title');
});
```

#### Pattern C: Adding a NOT NULL Column

```php
// Step 1: Add nullable
Schema::table('submissions', function (Blueprint $table) {
    $table->uuid('study_id')->nullable()->after('id');
});

// Step 2: Backfill via join
DB::statement("
    UPDATE submissions s
    SET study_id = q.study_id
    FROM questionnaires q
    WHERE s.questionnaire_id = q.id
");

// Step 3: Add NOT NULL
Schema::table('submissions', function (Blueprint $table) {
    $table->uuid('study_id')->nullable(false)->change();
});
```

#### Pattern D: Creating an Index

```php
// SAFE: CONCURRENTLY prevents table locks
// Use raw SQL for concurrent index creation
DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_studies_status 
               ON studies(status)');
```

#### Pattern E: Dropping a Column

```php
// Step 1: Mark as deprecated, stop application writes
// Step 2: Monitor for no reads
// Step 3: Drop (requires exclusive lock — schedule during maintenance)
Schema::table('projects', function (Blueprint $table) {
    $table->dropColumn('deprecated_field');
});
```

### 3.3 Migration Locking Prevention

```sql
-- Set lock timeout to prevent indefinite blocking
SET lock_timeout = '5s';

-- Use statement-level locking for DDL
-- pg_partman handles partition maintenance with minimal locks
```

---

## 4. Rollback Strategy

### 4.1 Every Migration Must Have a Down

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('indicators', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // ... all columns
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('indicators');
    }
};
```

### 4.2 Rollback Execution

```bash
# Rollback single tenant
php artisan tenants:migrate --tenant={id} --down

# Rollback all tenants
php artisan migrate:rollback --database=tenant --path=database/migrations/tenants

# Rollback to specific batch
php artisan migrate:rollback --database=tenant --step=3
```

### 4.3 Rollback Safety Checks

```php
<?php
// app/Console/Commands/ValidateMigrationRollback.php

class ValidateMigrationRollback extends Command
{
    public function handle(): int
    {
        // Create temporary tenant schema
        DB::statement('CREATE SCHEMA IF NOT EXISTS test_rollback');
        config(['database.connections.tenant.schema' => 'test_rollback']);
        
        // Run migrations
        Artisan::call('migrate', ['--database' => 'tenant', '--path' => 'database/migrations/tenants']);
        
        // Verify all tables exist
        $tables = DB::connection('tenant')->select(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'test_rollback'"
        );
        
        // Rollback all
        Artisan::call('migrate:rollback', ['--database' => 'tenant', '--step' => 999]);
        
        // Verify no tables remain
        $remaining = DB::connection('tenant')->select(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'test_rollback'"
        );
        
        assert(count($remaining) === 0, 'Rollback did not clean up all tables');
        
        DB::statement('DROP SCHEMA IF EXISTS test_rollback CASCADE');
        
        return Command::SUCCESS;
    }
}
```

---

## 5. Data Migration for Existing Tenants

### 5.1 Data Migration Phases

| Phase | Action | When |
|-------|--------|------|
| 1. Schema migration | Add/alter tables and columns | Before data migration |
| 2. Backfill | Populate new columns from existing data | Background job |
| 3. Transform | Transform data format if needed | Chunked processing |
| 4. Validate | Verify data integrity | After completion |
| 5. Cleanup | Remove deprecated columns/tables | After validation |

### 5.2 Tenant Data Migration Job

```php
<?php
// app/Jobs/MigrateTenantData.php

class MigrateTenantData implements ShouldQueue
{
    public function __construct(
        private string $tenantId,
        private string $migrationName
    ) {}

    public function handle(): void
    {
        config(["database.connections.tenant.schema" => "tenant_{$this->tenantId}"]);
        
        DB::connection('tenant')->transaction(function () {
            // Chunk-based data transformation
            DB::connection('tenant')->table('indicators')
                ->whereNull('short_name')
                ->orderBy('id')
                ->chunk(500, function ($indicators) {
                    foreach ($indicators as $indicator) {
                        DB::connection('tenant')->table('indicators')
                            ->where('id', $indicator->id)
                            ->update([
                                'short_name' => $this->generateShortName($indicator),
                                'updated_at' => now(),
                            ]);
                    }
                });
        });
        
        // Log completion
        Log::info("Data migration completed for tenant {$this->tenantId}", [
            'migration' => $this->migrationName,
        ]);
    }

    protected function generateShortName($indicator): string
    {
        return Str::limit($indicator->name, 100);
    }
}
```

### 5.3 Migration State Tracking

```sql
CREATE TABLE public.tenant_migration_state (
    id                  UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    tenant_id           UUID NOT NULL REFERENCES public.organizations(id),
    migration_name      VARCHAR(255) NOT NULL,
    batch               INTEGER NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending' 
                        CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    error_message       TEXT,
    rows_affected       BIGINT DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uk_tenant_migration ON public.tenant_migration_state(tenant_id, migration_name);
```

---

## 6. Migration Versioning Strategy

### 6.1 File Naming Convention

```
{YYYY}_{MM}_{DD}_{HHMMSS}_{description}.php

Examples:
2026_07_18_000001_create_projects_table.php
2026_07_18_000002_create_studies_table.php
2026_08_01_000001_add_sector_to_projects.php
2026_08_15_000001_create_indicators_table.php
```

### 6.2 Squashing Migrations

For performance, old migrations may be squashed:

```bash
# Generate a squashed migration file
php artisan migrate:squash

# Or manually consolidate
# database/migrations/squashed/2026_07_18_000000_initial_tenant_schema.php
```

### 6.3 Migration Batch Management

```php
<?php
// config/tenancy.php

return [
    'migration_batches' => [
        'initial' => [
            'path' => 'database/migrations/tenants/initial',
            'tables' => ['projects', 'studies', 'indicators', 'questionnaires', 'questions', 'submissions'],
        ],
        'phase1' => [
            'path' => 'database/migrations/tenants/phase1',
            'tables' => ['qualitative_*', 'knowledge_items', 'dashboards', 'reports'],
        ],
        'phase2' => [
            'path' => 'database/migrations/tenants/phase2',
            'tables' => ['embeddings', 'ai_*', 'prompt_versions'],
        ],
    ],
];
```

---

## 7. Testing Approach for Migrations

### 7.1 Migration Test Suite

```php
<?php
// tests/Unit/Database/TenantMigrationTest.php

class TenantMigrationTest extends TestCase
{
    protected string $testSchema = 'test_migration_validation';

    protected function setUp(): void
    {
        parent::setUp();
        DB::statement("CREATE SCHEMA IF NOT EXISTS {$this->testSchema}");
        config(["database.connections.tenant.schema" => $this->testSchema]);
    }

    protected function tearDown(): void
    {
        DB::statement("DROP SCHEMA IF EXISTS {$this->testSchema} CASCADE");
        parent::tearDown();
    }

    /** @test */
    public function all_migrations_run_without_errors()
    {
        $exitCode = Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenants',
            '--force' => true,
        ]);

        $this->assertEquals(0, $exitCode);
    }

    /** @test */
    public function all_migrations_are_reversible()
    {
        // Run all up
        Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenants',
            '--force' => true,
        ]);

        // Get table count after up
        $tablesAfterUp = $this->getTableCount();

        // Rollback all
        Artisan::call('migrate:rollback', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenants',
            '--step' => 999,
            '--force' => true,
        ]);

        // Get table count after rollback
        $tablesAfterDown = $this->getTableCount();

        // Should equal initial count (only migration tracking tables)
        $this->assertEquals(0, $tablesAfterDown, 
            "Rollback left {$tablesAfterDown} tables remaining");
    }

    /** @test */
    public function each_migration_is_idempotent()
    {
        Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenants',
            '--force' => true,
        ]);

        // Run again — should be no-op
        $exitCode = Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenants',
            '--force' => true,
        ]);

        $this->assertEquals(0, $exitCode);
        $this->assertStringContainsString('Nothing to migrate', Artisan::output());
    }

    /** @test */
    public function foreign_keys_are_valid()
    {
        Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenants',
            '--force' => true,
        ]);

        // Check no invalid FK references
        $constraints = DB::connection('tenant')->select("
            SELECT
                tc.table_schema,
                tc.table_name,
                tc.constraint_name,
                ccu.table_name AS referenced_table
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = ?
        ", [$this->testSchema]);

        foreach ($constraints as $fk) {
            $referencedExists = DB::connection('tenant')->select(
                "SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = ? AND table_name = ?",
                [$fk->table_schema, $fk->referenced_table]
            );
            $this->assertNotEmpty($referencedExists,
                "FK {$fk->constraint_name} references non-existent table {$fk->referenced_table}");
        }
    }

    protected function getTableCount(): int
    {
        return DB::connection('tenant')->select(
            "SELECT COUNT(*) as count FROM information_schema.tables 
             WHERE table_schema = ? 
             AND table_type = 'BASE TABLE'
             AND table_name NOT LIKE '%migration%'",
            [$this->testSchema]
        )[0]->count;
    }
}
```

### 7.2 Performance Test for Tenant Migrations

```php
<?php
// tests/Performance/TenantMigrationPerformanceTest.php

class TenantMigrationPerformanceTest extends TestCase
{
    /** @test */
    public function migration_scales_linearly_with_tenants()
    {
        $schemaCount = 10;
        $schemas = [];

        // Create test schemas
        for ($i = 0; $i < $schemaCount; $i++) {
            $schemaName = "test_perf_tenant_{$i}";
            DB::statement("CREATE SCHEMA IF NOT EXISTS {$schemaName}");
            $schemas[] = $schemaName;
        }

        $start = microtime(true);

        foreach ($schemas as $schema) {
            config(["database.connections.tenant.schema" => $schema]);
            Artisan::call('migrate', [
                '--database' => 'tenant',
                '--path' => 'database/migrations/tenants',
                '--force' => true,
            ]);
        }

        $duration = microtime(true) - $start;
        $avgPerTenant = $duration / $schemaCount;

        // Assert: average migration time < 2 seconds per tenant
        $this->assertLessThan(2.0, $avgPerTenant,
            "Average migration time per tenant: {$avgPerTenant}s");

        // Cleanup
        foreach ($schemas as $schema) {
            DB::statement("DROP SCHEMA IF EXISTS {$schema} CASCADE");
        }
    }
}
```

---

## 8. Migration CI/CD Pipeline

### 8.1 GitHub Actions Workflow

```yaml
# .github/workflows/migrations.yml
name: Database Migration Tests

on:
  pull_request:
    paths:
      - 'database/migrations/**'
      - 'app/Console/Commands/MigrateTenants.php'

jobs:
  test-migrations:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: merline_test
          POSTGRES_USER: merline
          POSTGRES_PASSWORD: secret
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          extensions: pgsql, pdo_pgsql
      
      - name: Install Dependencies
        run: composer install --prefer-dist
      
      - name: Run Global Migrations
        run: php artisan migrate --database=pgsql --force
        env:
          DB_CONNECTION: pgsql
          DB_HOST: localhost
          DB_PORT: 5432
          DB_DATABASE: merline_test
          DB_USERNAME: merline
          DB_PASSWORD: secret
      
      - name: Run Migration Tests
        run: php artisan test --filter=TenantMigrationTest
        env:
          DB_CONNECTION: pgsql
          DB_HOST: localhost
          DB_PORT: 5432
          DB_DATABASE: merline_test
          DB_USERNAME: merline
          DB_PASSWORD: secret
      
      - name: Run Performance Tests
        run: php artisan test --filter=TenantMigrationPerformanceTest
        env:
          DB_CONNECTION: pgsql
          DB_HOST: localhost
          DB_PORT: 5432
          DB_DATABASE: merline_test
          DB_USERNAME: merline
          DB_PASSWORD: secret
```

### 8.2 Deployment Checklist

```
□ Migration code reviewed by ≥2 engineers
□ Migration tested against staging with production-like data
□ Rollback verified in test environment
□ Performance benchmark: < 2s per tenant
□ No long-running locks (> 5s)
□ No backward-incompatible changes
□ Data backfill jobs tested
□ Monitoring alerts configured for migration duration
□ Runbook updated for manual rollback procedure
```

---

## 9. Migration Error Handling

### 9.1 Error Recovery Procedure

```php
<?php
// app/Exceptions/TenantMigrationException.php

class TenantMigrationException extends Exception
{
    public function __construct(
        public readonly string $tenantId,
        public readonly string $migrationName,
        public readonly string $originalMessage,
        ?Throwable $previous = null
    ) {
        parent::__construct(
            "Tenant {$this->tenantId} failed on migration {$this->migrationName}: {$this->originalMessage}",
            previous: $previous
        );
    }

    public function report(): void
    {
        Log::error('Tenant migration failed', [
            'tenant_id' => $this->tenantId,
            'migration' => $this->migrationName,
            'error' => $this->originalMessage,
        ]);

        // Notify DevOps channel
        Notification::route('slack', config('services.slack.devops_webhook'))
            ->notify(new TenantMigrationFailed($this));
    }
}
```

### 9.2 Retry Logic

```php
<?php
// app/Console/Commands/RetryFailedTenantMigration.php

class RetryFailedTenantMigration extends Command
{
    public function handle(): int
    {
        $failedMigrations = DB::connection('public')
            ->table('tenant_migration_state')
            ->where('status', 'failed')
            ->get();

        foreach ($failedMigrations as $failure) {
            try {
                config(["database.connections.tenant.schema" => "tenant_{$failure->tenant_id}"]);
                
                Artisan::call('migrate', [
                    '--database' => 'tenant',
                    '--path' => 'database/migrations/tenants',
                    '--force' => true,
                ]);

                DB::connection('public')->table('tenant_migration_state')
                    ->where('id', $failure->id)
                    ->update(['status' => 'completed', 'completed_at' => now()]);
            } catch (\Exception $e) {
                Log::error("Retry failed for tenant {$failure->tenant_id}", [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return Command::SUCCESS;
    }
}
```

---

## 10. Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Migration framework** | Laravel Migrations | Native ORM integration, version tracking, rollback support |
| **Tenant migration execution** | Custom `tenants:migrate` command | Laravel lacks native schema-per-tenant migration support |
| **Migration isolation** | Schema prefix + SET search_path | Clean tenant isolation without modifying connection config per migration |
| **Zero-downtime pattern** | Additive + dual-write + backfill | Prevents application downtime during schema changes |
| **Rollback testing** | Automated test creates/rolls back schema | Ensures every migration is reversible before deployment |
| **Migration batching** | Initial → Phase 1 → Phase 2 | Enables progressive schema deployment aligned with feature phases |
| **Lock prevention** | CONCURRENTLY indexes, lock_timeout | Prevents DDL from blocking application queries |
