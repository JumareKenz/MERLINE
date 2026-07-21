# Offline-First Architecture

## 1. Core Philosophy

**Offline is the default. Connectivity is an enhancement.**

All core features must work without network access. The app launches, authenticates, loads data, renders forms, captures media, records GPS, validates responses, and saves drafts — all offline.

---

## 2. Local Database Schema (Drift / SQLite)

### 2.1 Database Configuration

```dart
// Drift database with encryption (SQLCipher)
LazyDatabase _createDatabase() {
  return LazyDatabase(() async {
    final dbFile = await getApplicationDocumentsDirectory();
    final path = join(dbFile.path, 'merline.db');

    // Open with SQLCipher for encryption
    return NativeDatabase.createInBackground(
      path,
      setup: (db) {
        db.execute("PRAGMA key = '${await KeyManager.getDbKey()}'");
        db.execute('PRAGMA cipher_page_size = 4096');
        db.execute('PRAGMA kdf_iter = 64000');
        db.execute('PRAGMA cipher_hmac_algorithm = HMAC_SHA512');
        db.execute('PRAGMA cipher_kdf_algorithm = PBKDF2_HMAC_SHA512');
        db.execute('PRAGMA journal_mode = WAL');
        db.execute('PRAGMA synchronous = NORMAL');
        db.execute('PRAGMA foreign_keys = ON');
      },
    );
  });
}
```

### 2.2 Local Tables (Mapped to Domain Entities)

```sql
-- Core tables (always available offline)
CREATE TABLE users (
    id TEXT PRIMARY KEY,                              -- UUIDv7
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'en',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    avatar_url TEXT,
    auth_token TEXT,                                   -- Cached JWT
    refresh_token TEXT,                                -- Cached refresh token
    token_expires_at TEXT,                             -- ISO 8601
    is_synced INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    organization_id TEXT NOT NULL,
    status TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'synced',        -- synced, pending, conflict
    sync_version INTEGER NOT NULL DEFAULT 1,           -- Monotonic version for delta sync
    last_synced_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE studies (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    study_type TEXT NOT NULL,
    status TEXT NOT NULL,
    methodology TEXT,
    population TEXT,
    sample_size INTEGER,
    start_date TEXT,
    end_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'synced',
    sync_version INTEGER NOT NULL DEFAULT 1,
    last_synced_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE questionnaires (
    id TEXT PRIMARY KEY,
    study_id TEXT NOT NULL REFERENCES studies(id),
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    survey_type TEXT NOT NULL,
    version INTEGER NOT NULL,
    is_current INTEGER NOT NULL DEFAULT 1,
    language TEXT NOT NULL DEFAULT 'en',
    estimated_duration INTEGER,                         -- Minutes
    questionnaire_definition TEXT NOT NULL,              -- JSON: full structure
    approval_status TEXT NOT NULL DEFAULT 'draft',
    sync_status TEXT NOT NULL DEFAULT 'synced',
    sync_version INTEGER NOT NULL DEFAULT 1,
    last_synced_at TEXT,
    is_downloaded INTEGER NOT NULL DEFAULT 0,           -- Available offline?
    downloaded_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE sections (
    id TEXT PRIMARY KEY,
    questionnaire_id TEXT NOT NULL REFERENCES questionnaires(id),
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    repeatable INTEGER NOT NULL DEFAULT 0,
    repeat_label TEXT,
    max_repetitions INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE questions (
    id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL REFERENCES sections(id),
    questionnaire_id TEXT NOT NULL REFERENCES questionnaires(id),
    code TEXT NOT NULL,
    text TEXT NOT NULL,
    help_text TEXT,
    question_type TEXT NOT NULL,
    is_required INTEGER NOT NULL DEFAULT 0,
    is_personal_data INTEGER NOT NULL DEFAULT 0,
    is_sensitive INTEGER NOT NULL DEFAULT 0,
    options_json TEXT,                                  -- JSON array of options
    validation_rules_json TEXT,                         -- JSON validation config
    skip_logic_json TEXT,                               -- JSON skip logic rules
    calculation_formula TEXT,                           -- For calculated fields
    min_value REAL,
    max_value REAL,
    min_length INTEGER,
    max_length INTEGER,
    decimal_places INTEGER,
    gps_accuracy_required REAL,
    order_index INTEGER NOT NULL,
    indent_level INTEGER NOT NULL DEFAULT 0,
    indicator_codes_json TEXT,                          -- Linked indicators
    translations_json TEXT,                             -- { "fr": "text", "es": "text" }
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE question_options (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL REFERENCES questions(id),
    value TEXT NOT NULL,
    label TEXT NOT NULL,
    label_translations_json TEXT,                       -- { "fr": "libellé", ... }
    order_index INTEGER NOT NULL,
    is_exclusive INTEGER NOT NULL DEFAULT 0,            -- "None of the above"
    has_specify INTEGER NOT NULL DEFAULT 0              -- "Other (specify)"
);

CREATE TABLE submissions (
    id TEXT PRIMARY KEY,
    questionnaire_id TEXT NOT NULL REFERENCES questionnaires(id),
    study_id TEXT NOT NULL REFERENCES studies(id),
    assignment_id TEXT REFERENCES assignments(id),
    enumerator_id TEXT NOT NULL REFERENCES users(id),
    respondent_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft',                -- draft, submitted, synced, conflict
    location_json TEXT,                                  -- GPS capture at submission
    device_id TEXT,
    app_version TEXT,
    form_version INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    duration_seconds INTEGER,
    is_synced INTEGER NOT NULL DEFAULT 0,
    synced_at TEXT,
    server_received_at TEXT,                             -- Server acknowledgement timestamp
    server_submission_id TEXT,                           -- Server-side ID after sync
    checksum TEXT,                                       -- SHA-256 of all response values
    validation_status TEXT NOT NULL DEFAULT 'pending',
    flagged_for_review INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    is_test INTEGER NOT NULL DEFAULT 0,
    sync_attempts INTEGER NOT NULL DEFAULT 0,
    last_sync_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE response_values (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL REFERENCES submissions(id),
    question_code TEXT NOT NULL,                        -- References question.code
    question_type TEXT NOT NULL,                         -- For type-coercion
    value_json TEXT,                                     -- Type-coerced JSON value
    media_path TEXT,                                     -- Local file path for media
    media_hash TEXT,                                     -- SHA-256 of media
    media_metadata_json TEXT,                            -- EXIF, GPS, size
    calculated INTEGER NOT NULL DEFAULT 0,
    flagged INTEGER NOT NULL DEFAULT 0,
    flag_reason TEXT,
    modified_at TEXT NOT NULL
);

CREATE TABLE assignments (
    id TEXT PRIMARY KEY,
    questionnaire_id TEXT NOT NULL REFERENCES questionnaires(id),
    enumerator_id TEXT NOT NULL REFERENCES users(id),
    study_id TEXT NOT NULL REFERENCES studies(id),
    target_count INTEGER NOT NULL,
    completed_count INTEGER NOT NULL DEFAULT 0,
    location_json TEXT,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',              -- pending, in_progress, completed, overdue
    notes TEXT,
    sync_status TEXT NOT NULL DEFAULT 'synced',
    sync_version INTEGER NOT NULL DEFAULT 1,
    last_synced_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE media_files (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL REFERENCES submissions(id),
    question_code TEXT NOT NULL,
    file_type TEXT NOT NULL,                             -- photo, audio, video, signature, document
    file_path TEXT NOT NULL,                             -- Local absolute path
    original_file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,                          -- Bytes
    compressed_file_path TEXT,                           -- Compressed version
    compressed_file_size INTEGER,
    thumbnail_path TEXT,                                 -- For photos/video
    encryption_iv TEXT,                                  -- AES IV for file encryption
    media_hash TEXT NOT NULL,                            -- SHA-256
    metadata_json TEXT,                                  -- EXIF, GPS, timestamps
    upload_status TEXT NOT NULL DEFAULT 'pending',       -- pending, uploading, uploaded, failed
    upload_progress REAL NOT NULL DEFAULT 0,
    upload_chunk_size INTEGER,
    upload_total_chunks INTEGER,
    upload_completed_chunks INTEGER NOT NULL DEFAULT 0,
    upload_url TEXT,
    remote_url TEXT,                                     -- Server URL after upload
    sync_attempts INTEGER NOT NULL DEFAULT 0,
    last_sync_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE sync_queue (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,                           -- submission, media, response
    entity_id TEXT NOT NULL,                             -- UUID of the entity
    operation TEXT NOT NULL,                             -- create, update, delete
    priority INTEGER NOT NULL DEFAULT 0,                 -- 0=normal, 1=high, 2=urgent
    payload_json TEXT NOT NULL,                          -- Serialized operation data
    status TEXT NOT NULL DEFAULT 'queued',               -- queued, processing, failed, completed
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 5,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE sync_log (
    id TEXT PRIMARY KEY,
    sync_type TEXT NOT NULL,                             -- push, pull, media_upload
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress',          -- in_progress, success, failed, partial
    items_attempted INTEGER NOT NULL DEFAULT 0,
    items_succeeded INTEGER NOT NULL DEFAULT 0,
    items_failed INTEGER NOT NULL DEFAULT 0,
    items_conflicted INTEGER NOT NULL DEFAULT 0,
    bytes_uploaded INTEGER NOT NULL DEFAULT 0,
    bytes_downloaded INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    sync_trigger TEXT NOT NULL,                          -- manual, auto, background, push_notification
    created_at TEXT NOT NULL
);

CREATE TABLE sync_checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL UNIQUE,                    -- questionnaires, assignments, etc.
    last_synced_at TEXT NOT NULL,
    last_sync_version INTEGER NOT NULL DEFAULT 0,
    checksum TEXT                                        -- Integrity check
);

CREATE TABLE gps_cache (
    id TEXT PRIMARY KEY,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    altitude REAL,
    accuracy REAL NOT NULL,
    speed REAL,
    bearing REAL,
    timestamp TEXT NOT NULL,
    provider TEXT NOT NULL,                              -- gps, network, fused
    is_valid INTEGER NOT NULL DEFAULT 1
);

-- Indexes for offline query performance
CREATE INDEX idx_submissions_status ON submissions(status, is_synced);
CREATE INDEX idx_submissions_enumerator ON submissions(enumerator_id, status);
CREATE INDEX idx_response_values_submission ON response_values(submission_id);
CREATE INDEX idx_media_files_submission ON media_files(submission_id, upload_status);
CREATE INDEX idx_sync_queue_status ON sync_queue(status, priority, created_at);
CREATE INDEX idx_questions_questionnaire ON questions(questionnaire_id, order_index);
CREATE INDEX idx_sections_questionnaire ON sections(questionnaire_id, order_index);
CREATE INDEX idx_sync_log_created ON sync_log(created_at DESC);
CREATE INDEX idx_sync_checkpoints_type ON sync_checkpoints(entity_type);
```

### 2.3 Entity Sync Versions

Every mutable entity has a `sync_version` integer that increments on each local change. This enables efficient delta sync:

```dart
class ChangeTracker {
  Future<void> recordChange(String entityType, String entityId) async {
    await db.customUpdate(
      'UPDATE $entityType SET sync_version = sync_version + 1, '
      'updated_at = ? WHERE id = ?',
      variables: [Value(DateTime.now().toUtcIso8601()), Value(entityId)],
    );
    await syncQueueDao.enqueue(SyncQueueItem(
      entityType: entityType,
      entityId: entityId,
      operation: 'update',
    ));
  }
}
```

---

## 3. Offline Capability Per Feature

| Feature | Offline Capability | Synchronization Behavior |
|---------|-------------------|-------------------------|
| **Authentication** | Login with cached credentials; JWT stored in flutter_secure_storage; auto-refresh on next connection | Pull refreshed tokens when online |
| **Projects** | Full CRUD; project list, detail, status changes queued | Pull project updates; push project-level changes |
| **Questionnaires** | Download and cache full questionnaire definition (JSON); render from local DB; all 24 question types work offline | Pull new versions when published |
| **Submissions** | Full offline submission lifecycle: create, fill, save draft, mark complete | Push submissions when connected |
| **Media** | Capture photo/audio/video via native APIs; store encrypted locally; queue for upload | Chunked upload with resume; background upload via WorkManager |
| **GPS** | Acquire location via platform GPS APIs; cache recent coordinates; validate accuracy locally | GPS points included in submission payload |
| **Validation** | All validation rules evaluated client-side; instant feedback; no server needed | Validation rules embedded in questionnaire definition |
| **Draft Saving** | Autosave every 15s; manual save; crash recovery on restart; full form state preservation | Drafts are local-only until submitted |
| **Skip Logic** | Evaluated entirely client-side in the form engine | Logic rules embedded in questionnaire definition |
| **Assignments** | List, search, filter assignments; view details; track progress | Pull assignment updates; push completion status |
| **Sync Queue** | Persistent queue in SQLite survives app restart; prioritization by entity type | Background processing |
| **Maps** | Cached map tiles (MBTiles format) for offline areas; offline geoJSON overlays | Tile packages downloaded when on WiFi |
| **Dashboard** | Cached enumerator dashboard stats; last-known progress display | Stats updated on sync |
| **Settings** | All settings local; no server dependency | Language preference, theme synced when changed |

---

## 4. Sync Engine Design

### 4.1 Sync Architecture

```
┌─────────────────────────────────────────────────────┐
│                    SYNC ENGINE                        │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ Change       │  │ Sync Queue  │  │ Sync        │  │
│  │ Tracker      │  │ Manager     │  │ Scheduler   │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │
│         │                │                 │          │
│  ┌──────┴────────────────┴─────────────────┴──────┐  │
│  │              SYNC ORCHESTRATOR                   │  │
│  │  (Manages push/pull sequence)                    │  │
│  └──────┬─────────────────────────────────┬───────┘  │
│         │                                 │          │
│  ┌──────┴──────┐                   ┌──────┴──────┐   │
│  │ Push Engine  │                   │ Pull Engine  │   │
│  │ (DIO POST)   │                   │ (DIO GET)    │   │
│  └──────┬──────┘                   └──────┬──────┘   │
│         │                                 │          │
│  ┌──────┴──────┐                   ┌──────┴──────┐   │
│  │ Media        │                   │ Conflict     │   │
│  │ Uploader     │                   │ Resolver     │   │
│  └─────────────┘                   └─────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 4.2 Sync Flow

```
PUSH FLOW:
1. ChangeTracker identifies changed entities (sync_version > last_pushed_version)
2. SyncQueueManager enqueues items with priority
3. SyncOrchestrator reads queue ordered by priority, then created_at
4. PushEngine serializes changes to API format
5. Sends POST /api/v1/sync/push with batch payload
6. Processes server response:
   - Accepted items → mark as synced, update last_synced_at
   - Conflicted items → trigger conflict resolution
   - Rejected items → log error, retry or escalate
7. MediaUploader handles file uploads separately (chunked, with resume)

PULL FLOW:
1. SyncOrchestrator reads last sync checkpoint per entity type
2. Sends GET /api/v1/sync/pull?since={checkpoint}&entity_types[...]
3. Processes server response:
   - New/updated entities → upsert into local DB
   - Deleted entities → soft-delete locally
   - Update sync checkpoint with server timestamp
4. Notify relevant providers to refresh UI
```

### 4.3 Delta Sync Protocol

**Push request format:**
```json
POST /api/v1/sync/push
{
  "device_id": "uuid-v7",
  "last_synced_at": "2026-07-18T10:00:00Z",
  "changes": {
    "submissions": [
      {
        "id": "sub_001",
        "questionnaire_id": "qnr_001",
        "status": "submitted",
        "responses": [
          {"question_code": "Q1", "value": "Yes", "type": "single_select"},
          {"question_code": "Q2", "value": "42", "type": "numeric_int"}
        ],
        "location": {"lat": -1.234, "lng": 36.789, "acc": 8.5},
        "started_at": "2026-07-18T08:00:00Z",
        "completed_at": "2026-07-18T08:30:00Z",
        "duration_seconds": 1800,
        "form_version": 2,
        "checksum": "sha256hash",
        "device_id": "device_001",
        "app_version": "1.0.0"
      }
    ],
    "media_refs": [
      {
        "submission_id": "sub_001",
        "question_code": "Q5",
        "file_hash": "sha256hash",
        "file_size": 2048576,
        "file_type": "photo"
      }
    ]
  }
}
```

**Push response format:**
```json
{
  "accepted": [
    {"entity_type": "submission", "entity_id": "sub_001", "server_id": "srv_sub_001", "server_timestamp": "2026-07-18T10:05:00Z"}
  ],
  "conflicts": [],
  "rejected": [],
  "server_time": "2026-07-18T10:05:00Z"
}
```

**Pull request format:**
```json
GET /api/v1/sync/pull?since=2026-07-18T10:00:00Z&device_id=device_001&entity_types[]=questionnaires&entity_types[]=assignments&entity_types[]=projects
```

**Pull response format:**
```json
{
  "changes": {
    "questionnaires": [
      {
        "id": "qnr_002",
        "code": "SURV-002",
        "title": "Updated Health Survey v3",
        "version": 3,
        "definition": { ... },
        "updated_at": "2026-07-18T09:30:00Z",
        "operation": "update"           // create, update, delete
      }
    ],
    "assignments": [...],
    "deleted_entities": [
      {"entity_type": "questionnaire", "entity_id": "qnr_003"}
    ]
  },
  "sync_token": "2026-07-18T10:05:00Z",
  "has_more": false
}
```

### 4.4 Sync Triggers

| Trigger | Mechanism | Description |
|---------|-----------|-------------|
| **Auto-sync on connectivity** | Connectivity listener | When network becomes available, trigger sync after 5s debounce |
| **Periodic background sync** | WorkManager | Periodic 15-minute background sync task |
| **Manual sync** | User action | Pull-to-refresh or "Sync Now" button |
| **On submit** | Immediate | Complete submission triggers immediate push |
| **On app resume** | App lifecycle | Sync when app comes to foreground after > 5 minutes |
| **Push notification** | FCM | Server notifies device of changes |
| **On WiFi only** | Connectivity type | Media uploads only on WiFi (configurable) |

### 4.5 Sync Prioritization

```dart
enum SyncPriority { urgent, high, normal, low }

class SyncQueueManager {
  int priorityFor(SyncQueueItem item) {
    switch (item.entityType) {
      case 'submission':
        return SyncPriority.urgent;       // User data first
      case 'media':
        return SyncPriority.normal;       // Media after submissions
      case 'response':
        return SyncPriority.high;
      case 'draft_sync':
        return SyncPriority.low;          // Non-critical
      default:
        return SyncPriority.normal;
    }
  }
}
```

---

## 5. Conflict Detection and Resolution

### 5.1 Conflict Detection

Conflicts are detected on the server during push by comparing timestamps and field-level versions:

```json
{
  "conflicts": [
    {
      "entity_type": "submission",
      "entity_id": "sub_001",
      "field": "status",
      "local_value": "submitted",
      "server_value": "approved",
      "local_updated_at": "2026-07-18T10:00:00Z",
      "server_updated_at": "2026-07-18T10:02:00Z"
    }
  ]
}
```

### 5.2 Conflict Resolution Strategy

| Conflict Type | Default Resolution | Manual Resolution Available |
|--------------|-------------------|---------------------------|
| Submission status | LWW (latest timestamp wins) | Yes |
| Response value | LWW per field | Yes |
| Media hash mismatch | Server wins (reject duplicate) | No |
| Assignment status | Server wins (source of truth) | Yes (supervisor override) |
| Questionnaire version | Server wins (force update) | No |

### 5.3 Last-Writer-Wins (LWW) Implementation

```dart
class ConflictResolver {
  Future<ResolutionResult> resolve(Conflict conflict) async {
    if (conflict.entityType == 'submission' && conflict.field == 'response_value') {
      // Field-level LWW
      if (conflict.localUpdatedAt.isAfter(conflict.serverUpdatedAt)) {
        return ResolutionResult(winner: 'local', mergeStrategy: 'overwrite');
      }
      return ResolutionResult(winner: 'server', mergeStrategy: 'overwrite');
    }

    // Default to server wins for system-managed entities
    if (_isServerManaged(conflict.entityType)) {
      return ResolutionResult(winner: 'server', mergeStrategy: 'overwrite');
    }

    // Flag for manual resolution
    return ResolutionResult(winner: 'manual', mergeStrategy: 'defer');
  }
}
```

### 5.4 Manual Conflict Resolution UI

For conflicts requiring human intervention, the sync status screen provides:

1. **Conflict list**: entity type, field, local vs server values
2. **Side-by-side diff**: local version (left) vs server version (right)
3. **Resolution actions**: "Keep Local", "Accept Server", "Merge" (for compatible fields)
4. **Batch resolve**: supervisor can resolve all conflicts for an enumerator

---

## 6. Media Sync

### 6.1 Chunked Upload Protocol

```dart
class MediaUploader {
  static const chunkSize = 1 * 1024 * 1024; // 1 MB chunks

  Future<void> uploadMedia(MediaFile media) async {
    final file = File(media.filePath);
    final totalSize = await file.length();
    final totalChunks = (totalSize / chunkSize).ceil();

    // 1. Initiate upload
    final initResponse = await dio.post('/api/v1/media/init', data: {
      'file_name': media.originalFileName,
      'file_size': totalSize,
      'mime_type': media.mimeType,
      'file_hash': media.mediaHash,
      'total_chunks': totalChunks,
    });
    final uploadId = initResponse.data['upload_id'];
    final uploadUrls = List<String>.from(initResponse.data['upload_urls']);

    // 2. Upload chunks (with resume support)
    for (int i = media.uploadCompletedChunks; i < totalChunks; i++) {
      final chunkStart = i * chunkSize;
      final chunkEnd = min(chunkStart + chunkSize, totalSize);
      final chunkBytes = await file.readAsBytes(chunkStart, chunkEnd - chunkStart);

      await dio.put(
        uploadUrls[i],
        data: StreamedResponse(Stream.value(chunkBytes), chunkBytes.length),
        options: Options(headers: {
          'Content-Range': 'bytes $chunkStart-${chunkEnd - 1}/$totalSize',
          'Content-Type': 'application/octet-stream',
        }),
      );

      // Persist progress for resume
      await mediaDao.updateUploadProgress(media.id, i + 1);
    }

    // 3. Complete upload
    final completeResponse = await dio.post('/api/v1/media/complete', data: {
      'upload_id': uploadId,
      'file_hash': media.mediaHash,
    });

    // 4. Update local record
    await mediaDao.markUploaded(media.id, completeResponse.data['url']);
  }
}
```

### 6.2 Media Compression Pipeline

```dart
class MediaCompressionService {
  Future<CompressedFile> compressPhoto(File original) async {
    final compressed = await FlutterImageCompress.compressAndGetFile(
      original.path,
      '${original.path}_compressed.jpg',
      quality: 75,                    // JPEG quality 75%
      minWidth: 1920,
      minHeight: 1080,
    );
    return CompressedFile(
      path: compressed!.path,
      originalSize: await original.length(),
      compressedSize: await compressed.length(),
      ratio: await compressed.length() / await original.length(),
    );
  }

  Future<CompressedFile> compressAudio(File original) async {
    // Convert WAV to compressed MP3/Opus
    // Transcode using FFmpeg if available
    return compressAudioFile(original);
  }

  Future<CompressedFile> compressVideo(File original) async {
    // Compress video to H.264/AAC, 720p, 1Mbps bitrate
    return compressVideoFile(original);
  }
}
```

### 6.3 Media Sync Priority

| Media Type | Compression Target | Upload Trigger | Retry Limit |
|-----------|-------------------|----------------|-------------|
| Photo | 75% JPEG quality, max 1920x1080 | Auto-sync (WiFi only) | 5 attempts |
| Audio | 64kbps Opus/MP3 | Auto-sync (WiFi only) | 5 attempts |
| Video | 720p H.264, 1Mbps | Manual sync or WiFi auto | 3 attempts |
| Signature | PNG, max 800x600 | Immediate with submission | 5 attempts |
| Document | Original format | Manual sync | 3 attempts |

---

## 7. Background Sync (WorkManager)

```dart
class BackgroundSync {
  static void register() {
    Workmanager().registerPeriodicTask(
      'merline-sync',
      'backgroundSync',
      frequency: Duration(minutes: 15),
      constraints: Constraints(
        networkType: NetworkType.connected,
        requiresBatteryNotLow: true,
        requiresStorageNotLow: true,
      ),
      existingWorkPolicy: ExistingWorkPolicy.keep,
      backoffPolicy: BackoffPolicy.exponential,
      initialDelay: Duration(minutes: 5),
    );

    Workmanager().registerOneOffTask(
      'merline-media-upload',
      'backgroundMediaUpload',
      constraints: Constraints(
        networkType: NetworkType.connected,
        requiresCharging: false,          // Allow on battery
        requiresBatteryNotLow: true,
      ),
    );
  }

  @pragma('vm:entry-point')
  static Future<void> callbackDispatcher() async {
    await Workmanager().executeTask((task, inputData) async {
      final syncEngine = await _initializeSyncEngine();

      switch (task) {
        case 'backgroundSync':
          await syncEngine.pushChanges();
          await syncEngine.pullChanges();
          break;
        case 'backgroundMediaUpload':
          await syncEngine.uploadPendingMedia();
          break;
      }
      return true;
    });
  }
}
```

---

## 8. Manual Sync Trigger

```dart
class ManualSyncNotifier extends StateNotifier<SyncState> {
  Future<void> triggerFullSync() async {
    state = SyncState.inProgress(type: SyncType.full);
    try {
      // 1. Push local changes
      final pushResult = await _syncEngine.pushChanges();
      if (pushResult.hasConflicts) {
        state = SyncState.conflictsDetected(pushResult.conflicts);
        return;
      }

      // 2. Upload pending media
      await _syncEngine.uploadPendingMedia();

      // 3. Pull remote changes
      final pullResult = await _syncEngine.pullChanges();

      state = SyncState.completed(
        submissionsPushed: pushResult.acceptedCount,
        mediaUploaded: pushResult.mediaCount,
        changesPulled: pullResult.changesCount,
      );
    } on Exception catch (e) {
      state = SyncState.failed(e.toString());
    }
  }
}
```

---

## 9. Sync Status Indication

| Sync Status | Icon | Color | Description |
|-------------|------|-------|-------------|
| All synced | ✓ | Green | All data synchronized |
| Syncing... | ⟳ | Blue | Sync in progress |
| Pending sync | ● | Amber | Changes waiting to sync |
| Sync failed | ✗ | Red | Last sync failed |
| Offline | ◇ | Grey | No network connection |
| Conflicts | ⚠ | Orange | Conflicts need resolution |

### UI Components:

- **Persistent banner**: Shown at top when syncing or offline
- **Sync FAB**: Floating action button on dashboard showing sync status
- **Item-level indicator**: Each submission shows individual sync status icon
- **Pull-to-refresh**: Triggers sync on dashboard screens
- **AppBar badge**: Sync status icon + pending count in AppBar

---

## 10. Offline Data Integrity

```dart
class DataIntegrityService {
  static Future<String> computeSubmissionChecksum(Submission submission) async {
    final sorted = List<ResponseValue>.from(submission.responses)
      ..sort((a, b) => a.questionCode.compareTo(b.questionCode));
    final buffer = StringBuffer();
    for (final r in sorted) {
      buffer.write('${r.questionCode}:${r.valueJson}');
    }
    return sha256.convert(utf8.encode(buffer.toString())).toString();
  }

  static Future<bool> verifyMediaIntegrity(MediaFile media) async {
    final file = File(media.filePath);
    if (!await file.exists()) return false;
    final bytes = await file.readAsBytes();
    final hash = sha256.convert(bytes).toString();
    return hash == media.mediaHash;
  }

  Future<IntegrityReport> runFullIntegrityCheck() async {
    final report = IntegrityReport();

    // Check all submissions have valid checksums
    final submissions = await submissionDao.getAll();
    for (final sub in submissions) {
      final expected = await computeSubmissionChecksum(sub);
      if (expected != sub.checksum) {
        report.addIssue('Submission ${sub.id}: checksum mismatch');
      }
    }

    // Check all media files exist and have valid hashes
    final mediaFiles = await mediaDao.getAll();
    for (final media in mediaFiles) {
      if (!await verifyMediaIntegrity(media)) {
        report.addIssue('Media ${media.id}: file missing or hash mismatch');
      }
    }

    return report;
  }
}
```

---

## 11. Offline-First Checklist

- [x] Authentication works with cached tokens offline
- [x] All questionnaire data cached locally (definition, translations, media references)
- [x] Form rendering engine operates entirely from local DB
- [x] GPS capture uses platform APIs, no network required
- [x] Media capture stores files locally with compression
- [x] All validation rules evaluated client-side
- [x] Skip logic evaluated client-side
- [x] Calculated fields computed client-side
- [x] Autosave persists every 15 seconds
- [x] Draft recovery restores full form state after crash
- [x] Submission queuing persists locally until synced
- [x] Sync queue survives app restart
- [x] Background sync via WorkManager
- [x] Sync status visible at global and item level
- [x] Conflict detection on sync
- [x] Manual conflict resolution UI
- [x] Media chunked upload with resume
- [x] Media integrity verification (SHA-256)
- [x] Data integrity checksums
- [x] Offline map tile caching
- [x] Storage management (compression, cleanup, LRU eviction)
- [x] Local DB encryption (SQLCipher)
- [x] Secure token storage (flutter_secure_storage)
- [x] File encryption for sensitive media
