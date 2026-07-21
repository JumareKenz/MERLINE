# Merline Event Catalogue

## Document Control

| Version | Date | Author | Status |
|---------|------|--------|--------|
| 1.0 | 2026-07-18 | Enterprise Integration & Ecosystem Architect | Final |

---

## 1. Event Architecture Overview

All Merline domain events follow the [CloudEvents](https://cloudevents.io/) 1.0 specification with JSON format. Events are published by Laravel services and delivered through Redis Pub/Sub (real-time) and PostgreSQL (persistent store).

### Event Flow

```
Service                    Event Bus                    Consumers
   │                          │                            │
   │  Event::dispatch()       │                            │
   │─────────────────────────▶│                            │
   │                          │  ┌───────────────────┐     │
   │                          │  │ Store in PostgreSQL│     │
   │                          │  │ (audit trail)     │     │
   │                          │  └───────────────────┘     │
   │                          │                            │
   │                          │  ┌───────────────────┐     │
   │                          │  │ Publish to Redis   │────▶│ Internal listeners
   │                          │  └───────────────────┘     │ (services, plugins)
   │                          │                            │
   │                          │  ┌───────────────────┐     │
   │                          │  │ Route to Webhook   │────▶│ External webhooks
   │                          │  │ Engine (if sub)   │     │ (partner systems)
   │                          │  └───────────────────┘     │
```

---

## 2. CloudEvents Envelope

Every event uses the following envelope:

```json
{
  "specversion": "1.0",
  "type": "com.merline.{domain}.{action}",
  "source": "/organizations/{orgId}",
  "id": "uuid-v7",
  "time": "2026-07-18T14:30:00.000Z",
  "datacontenttype": "application/json",
  "subject": "{entityType}/{entityId}",
  "data": { },
  "data_base64": null,
  "knativebrokerttl": 86400,
  "correlationid": "correlation-uuid",
  "organizationid": "org-uuid"
}
```

| Field | Description |
|-------|-------------|
| `specversion` | CloudEvents spec version (1.0) |
| `type` | Event type: `com.merline.{domain}.{action}` |
| `source` | URI identifying the origin: `/organizations/{orgId}` |
| `id` | Unique event ID (UUIDv7, time-ordered) |
| `time` | ISO 8601 timestamp of event occurrence |
| `datacontenttype` | Media type of `data` |
| `subject` | Resource reference: `{entityType}/{entityId}` |
| `data` | Event-specific payload |
| `organizationid` | Tenant identifier for routing/filtering |

---

## 3. Full Event Catalogue

### 3.1 Organization Domain Events

| Event | Trigger | Data Schema | Subscribers |
|-------|---------|-------------|-------------|
| `com.merline.organization.created` | New organization registered | `{ org_id, name, org_type, country }` | Identity, Audit |
| `com.merline.organization.updated` | Organization details changed | `{ org_id, changed_fields[] }` | Audit |
| `com.merline.organization.deactivated` | Organization suspended/deleted | `{ org_id, reason }` | Identity, Audit, Notification |
| `com.merline.organization.settings_changed` | Org settings updated | `{ org_id, settings }` | Audit |

### 3.2 User & Identity Domain Events

| Event | Trigger | Data Schema | Subscribers |
|-------|---------|-------------|-------------|
| `com.merline.user.registered` | New user registered | `{ user_id, email, org_id }` | Audit, Notification |
| `com.merline.user.verified` | Email verified | `{ user_id }` | Audit |
| `com.merline.user.logged_in` | Successful login | `{ user_id, ip, device, mfa_method }` | Audit, Security |
| `com.merline.user.logged_out` | Logout or session expiry | `{ user_id, session_id }` | Audit |
| `com.merline.user.login_failed` | Failed login attempt | `{ user_id_or_email, ip, reason }` | Security (anomaly) |
| `com.merline.user.password_changed` | Password reset/change | `{ user_id, initiated_by }` | Audit, Notification |
| `com.merline.user.role_changed` | Role/permission updated | `{ user_id, org_id, old_role, new_role }` | Audit, Integration |
| `com.merline.user.suspended` | User suspended | `{ user_id, org_id, reason }` | Audit, Notification |
| `com.merline.user.deactivated` | User deactivated | `{ user_id, org_id, reason }` | Audit, Identity |
| `com.merline.user.mfa_enrolled` | MFA method added | `{ user_id, method }` | Audit |
| `com.merline.user.mfa_disabled` | MFA method removed | `{ user_id, method, initiated_by }` | Audit, Notification |
| `com.merline.user.session_revoked` | Session force-terminated | `{ user_id, session_id, admin_id }` | Audit |

### 3.3 Project Domain Events

| Event | Trigger | Data Schema | Subscribers |
|-------|---------|-------------|-------------|
| `com.merline.project.created` | New project created | `{ project_id, org_id, code, name }` | Audit, Analytics |
| `com.merline.project.updated` | Project details changed | `{ project_id, changed_fields[] }` | Audit |
| `com.merline.project.deleted` | Project soft-deleted | `{ project_id }` | Audit |
| `com.merline.project.archived` | Project archived | `{ project_id }` | Audit, Analytics |
| `com.merline.project.status_changed` | Lifecycle transition | `{ project_id, old_status, new_status }` | Audit, Notification, Integration |

### 3.4 Study Domain Events

| Event | Trigger | Data Schema | Subscribers |
|-------|---------|-------------|-------------|
| `com.merline.study.created` | New study created | `{ study_id, project_id, title, study_type }` | Audit, Analytics, Integration |
| `com.merline.study.updated` | Study details changed | `{ study_id, changed_fields[] }` | Audit |
| `com.merline.study.deleted` | Study soft-deleted | `{ study_id }` | Audit |
| `com.merline.study.archived` | Study archived | `{ study_id }` | Audit, Analytics |
| `com.merline.study.status_changed` | Lifecycle transition | `{ study_id, old_status, new_status, reason }` | Audit, Notification, Sync, Integration |
| `com.merline.study.cloned` | Study cloned | `{ study_id, source_study_id }` | Audit |
| `com.merline.study.published` | Study published for field | `{ study_id, published_at }` | Audit, Sync, Notification |

### 3.5 Indicator Domain Events

| Event | Trigger | Data Schema | Subscribers |
|-------|---------|-------------|-------------|
| `com.merline.indicator.created` | New indicator defined | `{ indicator_id, study_id, code, name }` | Audit, Analytics |
| `com.merline.indicator.updated` | Indicator definition changed | `{ indicator_id, changed_fields[] }` | Audit |
| `com.merline.indicator.deleted` | Indicator soft-deleted | `{ indicator_id }` | Audit |
| `com.merline.indicator.approved` | Indicator approved | `{ indicator_id, approved_by }` | Audit, Workflow |
| `com.merline.indicator.deprecated` | Indicator deprecated | `{ indicator_id, replacement_id }` | Audit |
| `com.merline.indicator.value_updated` | Indicator value recorded | `{ indicator_id, value, period, disaggregation }` | Audit, Analytics, Dashboard, Integration |
| `com.merline.indicator.threshold_breached` | Indicator crossed threshold | `{ indicator_id, value, threshold, direction }` | Notification, Alert, Integration |

### 3.6 Questionnaire Domain Events

| Event | Trigger | Data Schema | Subscribers |
|-------|---------|-------------|-------------|
| `com.merline.questionnaire.created` | New questionnaire created | `{ questionnaire_id, study_id, title }` | Audit |
| `com.merline.questionnaire.updated` | Questionnaire modified | `{ questionnaire_id, version }` | Audit |
| `com.merline.questionnaire.deleted` | Questionnaire soft-deleted | `{ questionnaire_id }` | Audit |
| `com.merline.questionnaire.published` | Questionnaire version published | `{ questionnaire_id, version }` | Audit, Sync, Notification |
| `com.merline.questionnaire.version_created` | New version branched | `{ questionnaire_id, old_version, new_version }` | Audit |

### 3.7 Submission & Data Domain Events

| Event | Trigger | Data Schema | Subscribers |
|-------|---------|-------------|-------------|
| `com.merline.submission.created` | New submission received | `{ submission_id, study_id, questionnaire_id, enumerator_id }` | Audit, Analytics, Data Quality, Notification, Integration |
| `com.merline.submission.updated` | Submission modified | `{ submission_id, changed_fields[] }` | Audit |
| `com.merline.submission.approved` | Submission approved after QA | `{ submission_id, approved_by }` | Audit, Analytics, Notification, Integration |
| `com.merline.submission.rejected` | Submission rejected | `{ submission_id, rejected_by, reason }` | Audit, Notification |
| `com.merline.submission.flagged` | Quality flag raised | `{ submission_id, flag_type, details }` | Audit, Data Quality, Notification |
| `com.merline.submission.voided` | Submission voided (irreversible) | `{ submission_id, voided_by, reason }` | Audit, Analytics |
| `com.merline.submission.batch_imported` | Batch import completed | `{ import_id, source, accepted_count, rejected_count }` | Audit, Notification, Integration |
| `com.merline.data.quality_check_passed` | Auto QC passed | `{ submission_id, check_type, score }` | Analytics |
| `com.merline.data.quality_check_failed` | Auto QC failed | `{ submission_id, check_type, score, details }` | Audit, Data Quality, Notification |
| `com.merline.data.anomaly_detected` | AI anomaly identified | `{ submission_id, anomaly_type, confidence, details }` | Data Quality, Notification |

### 3.8 Field Operations Domain Events

| Event | Trigger | Data Schema | Subscribers |
|-------|---------|-------------|-------------|
| `com.merline.assignment.created` | New assignment created | `{ assignment_id, enumerator_id, questionnaire_id, target }` | Audit, Sync, Notification |
| `com.merline.assignment.updated` | Assignment modified | `{ assignment_id, changed_fields[] }` | Audit, Sync |
| `com.merline.assignment.completed` | Assignment completed | `{ assignment_id, enumerator_id, completed_count }` | Audit, Notification, Analytics |
| `com.merline.assignment.overdue` | Assignment past due date | `{ assignment_id, due_date }` | Notification, Supervisor Alert |
| `com.merline.sync.completed` | Device sync completed | `{ device_id, enumerator_id, submissions_count, conflicts_count }` | Audit, Analytics, Supervisor Dashboard |
| `com.merline.sync.failed` | Device sync failed | `{ device_id, enumerator_id, reason }` | Audit, Notification, Support |
| `com.merline.sync.conflict_detected` | Sync conflict occurred | `{ device_id, submission_id, field, resolution }` | Audit |
| `com.merline.device.registered` | New device enrolled | `{ device_id, enumerator_id, model }` | Audit |
| `com.merline.device.suspended` | Device suspended | `{ device_id, reason }` | Audit, Notification |

### 3.9 Analytics & Reporting Domain Events

| Event | Trigger | Data Schema | Subscribers |
|-------|---------|-------------|-------------|
| `com.merline.dashboard.created` | New dashboard created | `{ dashboard_id, study_id, title }` | Audit |
| `com.merline.dashboard.shared` | Dashboard shared externally | `{ dashboard_id, shared_with }` | Audit |
| `com.merline.report.generated` | Report generation completed | `{ report_id, study_id, format, size_bytes }` | Audit, Notification, Integration |
| `com.merline.report.generation_failed` | Report generation failed | `{ report_id, reason }` | Audit, Notification |
| `com.merline.report.published` | Report published | `{ report_id, published_at }` | Audit, Notification, Integration |
| `com.merline.export.completed` | Data export completed | `{ export_id, format, row_count, size_bytes }` | Audit, Notification |

### 3.10 AI Domain Events

| Event | Trigger | Data Schema | Subscribers |
|-------|---------|-------------|-------------|
| `com.merline.ai.insight_generated` | AI insight created | `{ insight_id, type, category, confidence, source_entity }` | Audit, Analytics, Notification |
| `com.merline.ai.insight_accepted` | AI insight accepted by human | `{ insight_id, user_id }` | Audit, AI Quality |
| `com.merline.ai.insight_rejected` | AI insight rejected by human | `{ insight_id, reason }` | Audit, AI Quality |
| `com.merline.ai.inference_completed` | AI model inference done | `{ request_id, model, tokens, latency_ms, cost }` | Audit, AI Observability |
| `com.merline.ai.inference_failed` | AI model call failed | `{ request_id, model, error, fallback_used }` | Audit, AI Observability, Alert |

### 3.11 Integration Domain Events

| Event | Trigger | Data Schema | Subscribers |
|-------|---------|-------------|-------------|
| `com.merline.integration.connector_activated` | Connector enabled | `{ connector_id, type, target_system }` | Audit |
| `com.merline.integration.connector_deactivated` | Connector disabled | `{ connector_id, reason }` | Audit |
| `com.merline.integration.connector_sync_started` | Connector sync initiated | `{ connector_id, type, direction }` | Audit |
| `com.merline.integration.connector_sync_completed` | Connector sync succeeded | `{ connector_id, items_synced, duration }` | Audit, Analytics |
| `com.merline.integration.connector_sync_failed` | Connector sync failed | `{ connector_id, error, retry_count }` | Audit, Alert, Notification |
| `com.merline.integration.webhook.delivery_succeeded` | Webhook delivered | `{ webhook_id, url, event_type, status_code, latency }` | Audit |
| `com.merline.integration.webhook.delivery_failed` | Webhook delivery failed | `{ webhook_id, url, event_type, status_code, reason }` | Audit, Alert |

### 3.12 Knowledge Domain Events

| Event | Trigger | Data Schema | Subscribers |
|-------|---------|-------------|-------------|
| `com.merline.knowledge.created` | New knowledge item captured | `{ knowledge_id, study_id, type, category }` | Audit, Knowledge Management |
| `com.merline.knowledge.approved` | Knowledge item verified | `{ knowledge_id, reviewed_by }` | Audit |
| `com.merline.knowledge.updated` | Knowledge item updated | `{ knowledge_id, changed_fields[] }` | Audit |

---

## 4. Event Delivery Guarantees

### 4.1 Delivery Properties

| Property | Guarantee | Implementation |
|----------|-----------|----------------|
| **Delivery** | At-least-once | Events persisted to PostgreSQL before Pub/Sub publish |
| **Ordering** | Per-partition ordering (by `subject`) | Same entity's events delivered in order |
| **Deduplication** | By event `id` | Idempotent consumers ignore duplicate IDs |
| **Retention** | 90 days in event store | Partitioned PostgreSQL table with time-based retention |
| **TTL** | 24 hours in Redis Pub/Sub | Configurable per event type via `knativebrokerttl` |

### 4.2 Idempotency Pattern for Consumers

```php
public function handle(StudyCreated $event): void
{
    // Check if already processed
    if (ProcessedEvent::where('event_id', $event->id)->exists()) {
        return; // Already processed — idempotent
    }
    
    // Process the event
    $this->doWork($event->data);
    
    // Mark as processed
    ProcessedEvent::create(['event_id' => $event->id]);
}
```

---

## 5. Event Retention & Replay

### 5.1 Event Store Schema

```sql
CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    organization_id UUID NOT NULL,
    type            VARCHAR(200) NOT NULL,
    source          VARCHAR(500) NOT NULL,
    subject         VARCHAR(500),
    data            JSONB NOT NULL,
    metadata        JSONB NOT NULL DEFAULT '{}',
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (recorded_at);

-- Monthly partitions
CREATE TABLE events_2026_07 PARTITION OF events
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
```

### 5.2 Retention Policy

| Period | Storage | Access | Replayable |
|--------|---------|--------|------------|
| 0-30 days | Hot (primary PostgreSQL) | Full query | Yes |
| 31-90 days | Warm (PostgreSQL, compressed) | Query by type/source | Yes |
| 91-365 days | Cold (Parquet in S3) | Query via Athena/Trino | With notice |
| 1+ years | Archived (Glacier) | Restore request | 24-hour restore |

### 5.3 Event Replay API

```
POST /api/v1/admin/events/replay
{
  "type": "com.merline.submission.created",
  "from": "2026-07-01T00:00:00Z",
  "to": "2026-07-18T00:00:00Z",
  "filter": {
    "organization_id": "org-uuid"
  },
  "target": "webhook",
  "webhook_id": "wh-uuid"
}
```

---

## 6. Subscriber Management

### 6.1 Internal Subscribers

Internal subscribers are Laravel event listeners registered in `EventServiceProvider`:

```php
protected $listen = [
    'com.merline.submission.created' => [
        UpdateAnalyticsListener::class,
        RunDataQualityChecksListener::class,
        SendSubmissionNotificationListener::class,
    ],
    'com.merline.study.status_changed' => [
        NotifyEnumeratorsListener::class,
        UpdateIntegrationSyncListener::class,
    ],
];
```

### 6.2 External Subscribers (Webhooks)

External subscribers manage their subscriptions via the Webhook API (see `ARCHITECTURE.md` section 3).

---

## 7. Webhook Delivery Details

### 7.1 Delivery Flow

```
Event Published
     │
     ▼
Webhook Engine
     │
     ├── Matches event type to subscriptions
     ├── Applies filter (org, study, etc.)
     ├── Signs payload (HMAC-SHA256)
     └── Dispatches delivery job
           │
           ▼
     HTTP POST to subscriber URL
           │
           ├── 2xx → Mark delivered ✓
           ├── 4xx → Mark failed (no retry for 400, 401, 403, 404)
           └── 5xx / timeout → Retry with backoff
```

### 7.2 Backoff Schedule

| Attempt | Wait Before | Cumulative |
|---------|-------------|------------|
| 1 | 1 minute | 1 minute |
| 2 | 5 minutes | 6 minutes |
| 3 | 15 minutes | 21 minutes |
| 4 | 30 minutes | 51 minutes |
| 5 | 60 minutes | 1 hour 51 minutes |
| Dead Letter | After 5 failures | — |

### 7.3 Dead Letter Queue

Failed webhooks (after all retries) are stored in `webhook_dead_letters`:

```sql
CREATE TABLE webhook_dead_letters (
    id              UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    webhook_id      UUID NOT NULL,
    event_id        UUID NOT NULL,
    event_type      VARCHAR(200) NOT NULL,
    payload         JSONB NOT NULL,
    failure_reason  TEXT NOT NULL,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ,
    resolution      VARCHAR(50)  -- 'retried', 'ignored', 'archived'
);
```

---

## 8. Event Observability

### 8.1 Key Metrics

| Metric | Source | Description | Alert |
|--------|--------|-------------|-------|
| `event.bus.produced` | Event store | Events produced per minute | — |
| `event.bus.consumed` | Listeners | Events consumed per minute | — |
| `event.bus.backlog` | Redis | Unprocessed events in queue | > 10,000 |
| `event.bus.latency_ms` | Event timestamps | Time from publish to first consumer | > 5,000 ms |
| `event.webhook.delivery_success` | Webhook engine | Successful deliveries per webhook | — |
| `event.webhook.delivery_failed` | Webhook engine | Failed deliveries per webhook | > 5% rate |
| `event.webhook.dead_letter_count` | Dead letter table | Total dead letters | > 0 |
| `event.consumer.failure_rate` | Listeners | Consumer processing failures | > 1% |
| `event.store.size_gb` | PostgreSQL | Event store size | > 90% of allocated |

### 8.2 Event Dashboard

The event observability dashboard (Grafana) displays:

- Event throughput by type (bar chart)
- Event latency heatmap
- Top 10 slowest consumers
- Webhook delivery success/failure by subscription
- Dead letter queue count and age
- Event store growth rate

### 8.3 Audit Trail

Every event is recorded in the `audit_events` table:

| Field | Value |
|-------|-------|
| `event_type` | `event.published` or `event.consumed` |
| `entity_type` | `Event` |
| `entity_id` | Event UUID |
| `metadata` | Event type, source, consumer (if consumed) |
| `changes` | None (events are immutable) |

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-18 | Enterprise Integration & Ecosystem Architect | Initial event catalogue |
