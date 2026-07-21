# Backend Testing Plan — Phase 1 (MVP)

## Technology Stack

- **Framework**: Laravel 11+
- **Test Runner**: PHPUnit 11
- **Mocking**: Mockery
- **DB Testing**: RefreshDatabase, SQLite in-memory (unit), PostgreSQL (integration)
- **HTTP Testing**: Laravel HTTP test assertions
- **Queue Testing**: `Queue::fake()`
- **Event Testing**: `Event::fake()`
- **Notification Testing**: `Notification::fake()`
- **Mail Testing**: `Mail::fake()`

## Test Count Targets

| Test Type | Target | Priority |
|-----------|--------|----------|
| Unit (services, helpers, value objects) | 400 | P0 |
| Feature (API endpoints) | 350 | P0 |
| Database (migrations, scopes, relationships) | 100 | P0 |
| Queue/Job | 80 | P0 |
| Event/Listener | 60 | P0 |
| Policy/Authorization | 80 | P0 |
| Validation (FormRequest) | 100 | P0 |
| Offline sync | 60 | P0 |
| **Total Backend** | **1,230** | |

## 1. Unit Testing Strategy

### Services
Test every public method on every service class. Mock dependencies.

```php
// Example: StudyServiceTest
public function test_it_creates_study_with_draft_status(): void
{
    $study = $this->studyService->create([
        'project_id' => $this->project->id,
        'title' => 'Baseline Survey 2026',
        'study_type' => 'baseline',
        'start_date' => now()->addDay(),
        'end_date' => now()->addMonths(6),
    ]);

    $this->assertEquals('draft', $study->status);
    $this->assertEquals('Baseline Survey 2026', $study->title);
}
```

### Services to test
- `StudyService` — CRUD, lifecycle transitions, cloning
- `QuestionnaireService` — Form creation, question CRUD, skip logic validation
- `IndicatorService` — CRUD, versioning, calculation
- `AssignmentService` — Create, update, complete, quota enforcement
- `SyncService` — Delta push/pull, conflict detection, resolution
- `ReportGenerationService` — Template loading, data aggregation, PDF generation
- `AnalyticsService` — KPI computation, aggregation queries
- `ExportService` — CSV, Excel, JSON generation
- `TeamService` — CRUD, membership management
- `NotificationService` — Multi-channel delivery, template rendering

### Value Objects
- `QuestionType` — Enum with type-specific validation rules
- `StudyStatus` — State machine with valid transitions
- `SubmissionStatus` — State machine
- `Role` — Permission set
- `GeoPoint` — Coordinate validation
- `PhoneNumber` — Format validation
- `EmailAddress` — Validation

### Helpers/Traits
- `HasTenantScope` — Scope filtering
- `HasSoftDelete` — Query scopes
- `HasVersioning` — Version increment behavior
- `HasAuditTrail` — Event creation on CRUD

## 2. Feature Testing Strategy

### API Endpoint Coverage

#### Authentication (P0)
- POST `/api/v1/auth/register` — validation, duplicate email, email verification
- POST `/api/v1/auth/login` — valid credentials, invalid, rate limiting
- POST `/api/v1/auth/logout` — token revocation
- POST `/api/v1/auth/refresh` — token refresh
- POST `/api/v1/auth/forgot-password` — flow
- POST `/api/v1/auth/reset-password` — flow

#### Organizations (P0)
- POST `/api/v1/organizations` — creation, duplicate slug
- GET `/api/v1/organizations` — list, pagination, filtering
- GET `/api/v1/organizations/{id}` — show, 404
- PUT `/api/v1/organizations/{id}` — update, authorization

#### Teams (P0)
- CRUD for teams
- Team member add/remove
- Supervisor assignment

#### Studies (P0)
- CRUD with lifecycle transitions
- Status transition validation (invalid transitions return 422)
- Study cloning
- Archive/restore

#### Questionnaires (P0)
- CRUD with versioning
- Question CRUD within questionnaire
- Skip logic validation (circular detection)
- Multi-language translation CRUD
- Form preview endpoint
- Publish/deploy flow

#### Indicators (P0)
- CRUD with versioning
- Indicator-to-question mapping

#### Assignments (P0)
- CRUD
- Quota enforcement
- Status tracking

#### Submissions (P0)
- Submit with validation
- Partial save/resume
- Submission retrieval with indicators
- Data export

#### Dashboards (P0)
- Auto-generated dashboard data
- Pre-built study metrics
- Filtering and segmentation
- RAG indicator status

#### Reports (P0)
- Template list
- One-click generation
- PDF export
- Report sections

```php
// Example: Questionnaire Feature Test
public function test_skip_logic_validates_no_circular_references(): void
{
    $questionnaire = $this->createQuestionnaire();
    $q1 = $this->createQuestion($questionnaire, 'select_one');
    $q2 = $this->createQuestion($questionnaire, 'text');

    $this->createSkipRule($q1, $q2, ['answer' => 'yes']);

    $response = $this->postJson("/api/v1/questionnaires/{$questionnaire->id}/skip-logic", [
        'source_question_id' => $q2->id,
        'target_question_id' => $q1->id,
        'condition' => ['answer' => 'yes'],
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['condition' => 'circular']);
}
```

## 3. Database Testing

### Migration Tests
- All `up()` methods run without error
- All `down()` methods are reversible
- Indexes, foreign keys, and constraints exist

### Scope Tests
- `active()` scope excludes soft-deleted records
- `forOrganization()` filters by tenant
- `byStatus()` filters correctly

### Relationship Tests
- Study hasMany Questionnaires
- Questionnaire belongsTo Study
- Submission hasMany ResponseValues
- User belongsToMany Organizations
- All cascade deletes work correctly

### Seeder Tests
- Seeders produce valid data
- Required relationships exist after seeding
- Demo seeders create realistic scenarios

## 4. Queue/Job Testing

### Jobs to test
- `ProcessSubmissionJob` — Validation, storage, analytics trigger
- `SyncMediaJob` — Media upload, compression, thumbnail generation
- `GenerateReportJob` — Template loading, data fetch, PDF render
- `SendNotificationJob` — Email, push, SMS delivery
- `AnalyticsRefreshJob` — KPI recalculation, cache invalidation
- `DataExportJob` — Large export generation
- `SyncPushJob` — Incoming sync processing
- `SyncPullJob` — Outgoing delta computation

```php
public function test_submission_job_creates_quality_check(): void
{
    Queue::fake();

    ProcessSubmissionJob::dispatch($this->submission);

    Queue::assertPushed(ProcessSubmissionJob::class);
}
```

## 5. Event Testing

### Events to test
- `StudyCreated` → Notification to org admin
- `StudyApproved` → Notification to researcher
- `SubmissionSynced` → Analytics refresh, supervisor notification
- `AssignmentCompleted` → Quota check, next assignment trigger
- `ReportGenerated` → Notification delivery
- `UserInvited` → Email invitation
- `DataExported` → Download link notification

```php
public function test_submission_sync_triggers_analytics_refresh(): void
{
    Event::fake();

    $this->syncService->pushSubmission($this->submission);

    Event::assertDispatched(SubmissionSynced::class);
    Event::assertListening(SubmissionSynced::class, RefreshAnalyticsListener::class);
}
```

## 6. Authorization/Policy Testing

### Roles and Permissions Matrix

| Endpoint | Admin | Manager | Researcher | Enumerator | Viewer |
|----------|-------|---------|------------|------------|--------|
| Create Study | ✓ | ✓ | ✓ | ✗ | ✗ |
| Design Form | ✓ | ✓ | ✓ | ✗ | ✗ |
| View Submissions | ✓ | ✓ | ✓ | ✗ | ✓ |
| Collect Data | ✗ | ✗ | ✗ | ✓ | ✗ |
| Export Data | ✓ | ✓ | ✓ | ✗ | ✗ |
| Manage Users | ✓ | ✓ | ✗ | ✗ | ✗ |
| View Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |

```php
public function test_enumerator_cannot_create_study(): void
{
    $this->actingAsEnumerator();

    $response = $this->postJson('/api/v1/studies', [...]);

    $response->assertForbidden();
}
```

## 7. Validation Testing (Form Requests)

### Pattern
- Every FormRequest has a corresponding test class
- Test valid payload, each invalid field, boundary conditions

### Key validation scenarios
- Required fields
- Field type enforcement (string, integer, date, UUID)
- String length limits
- Numeric range constraints
- Date logic (end >= start)
- Enum value validation
- Unique constraints
- Custom rules (skip logic, phone format, GPS coordinates)

## 8. Offline Sync Testing

### Sync Push
- Valid submission accepted
- Duplicate idempotency key rejected (409)
- Missing fields reject (422)
- Outdated form version rejected
- Media upload with chunked resume
- Conflict detection (stale `updated_at`)
- Last-writer-wins resolution

### Sync Pull
- Delta based on `last_synced_at`
- Only assigned questionnaires returned
- Form version updates propagated
- No orphaned data returned
- Pagination for large datasets

### Conflict Scenarios
- Two devices submit same record
- Enumerator edits while supervisor edits server-side
- Form updated while enumerator in field

```php
public function test_conflicting_submission_uses_last_writer_wins(): void
{
    $original = $this->createSubmission(['value' => 'A']);

    // Simulate two updates
    $update1 = $this->syncService->pushSync([
        'submission_id' => $original->submission_id,
        'value' => 'B',
        'updated_at' => '2026-07-18T10:00:00Z',
    ]);
    $update2 = $this->syncService->pushSync([
        'submission_id' => $original->submission_id,
        'value' => 'C',
        'updated_at' => '2026-07-18T12:00:00Z',
    ]);

    $this->assertEquals('C', $update2['value']);
}
```

## 9. Performance Testing (Backend)

### Response Time Baselines
| Endpoint | Target P50 | Target P95 | Target P99 |
|----------|-----------|-----------|-----------|
| GET /api/v1/studies | 200ms | 500ms | 1,000ms |
| GET /api/v1/studies/{id} | 100ms | 300ms | 500ms |
| POST /api/v1/submissions | 500ms | 1,000ms | 2,000ms |
| GET /api/v1/dashboards/study | 1,000ms | 3,000ms | 5,000ms |
| GET /api/v1/sync/pull | 500ms | 1,500ms | 3,000ms |
| POST /api/v1/sync/push | 1,000ms | 3,000ms | 5,000ms |
| POST /api/v1/reports/generate | 5,000ms | 15,000ms | 30,000ms |

### Query Count Baselines
- List endpoints: N+1 prevention verified (max 5 queries per page)
- Detail endpoints: Max 10 queries per request
- Dashboard aggregation: Max 20 queries per load
- Sync pull: Max 10 queries per request
