# Sync Engine

## 1. Sync Protocol Overview

The sync engine implements a **delta sync** protocol where only records that have changed since the last synchronization are transmitted. The protocol is designed for unreliable networks, supports resume, and guarantees idempotency.

### Sync Flow Diagram

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Mobile       │     │  Field Ops API   │     │  Server DB   │
│  (Drift DB)   │     │  (Laravel)       │     │  (PostgreSQL)│
└──────┬───────┘     └────────┬─────────┘     └──────┬───────┘
       │                      │                      │
       │  ─── PUSH ─────────► │                      │
       │  POST /sync/push     │  ──► Validate ──────►│
       │  {changes,       │  │  ──► Detect conflicts │
       │   last_synced_at}  │  │  ──► Store          │
       │                     │  │                      │
       │  ◄── Response ──── │  │                      │
       │  {accepted,        │  │                      │
       │   conflicts,       │  │                      │
       │   server_time}      │  │                      │
       │                     │  │                      │
       │  ─── PULL ────────► │  │                      │
       │  GET /sync/pull     │  │  ◄── Query ──────── │
       │  ?since={checkpoint}│  │  changes since       │
       │                     │  │                      │
       │  ◄── Response ──── │  │                      │
       │  {changes,         │  │                      │
       │   sync_token}      │  │                      │
       │                     │  │                      │
       │  ─── MEDIA UPLOAD ► │  │                      │
       │  Chunked PUT        │  │  ◄── Store ──────── │
       │                     │  │                      │
       │  ◄── Complete ──── │  │                      │
       │                     │  │                      │
       v                     v                      v
  Update local DB     Update checkpoints      Update audit log
```

---

## 2. API Contract

### 2.1 Push Changes

```
POST /api/v1/sync/push
```

**Headers:**
```
Authorization: Bearer <jwt_token>
X-Device-Id: <uuidv7>
X-Idempotency-Key: <sha256-of-payload>
Content-Type: application/json
```

**Request Body:**
```json
{
  "last_synced_at": "2026-07-18T10:00:00Z",
  "changes": {
    "submissions": [
      {
        "id": "sub_001",
        "questionnaire_id": "qnr_001",
        "assignment_id": "asg_001",
        "status": "submitted",
        "respondent_id": "HH-001",
        "location": {"lat": -1.2834, "lng": 36.8172, "alt": 1600, "acc": 8.2},
        "device_id": "dev_001",
        "app_version": "1.0.0",
        "form_version": 2,
        "started_at": "2026-07-18T08:00:00Z",
        "completed_at": "2026-07-18T08:32:00Z",
        "duration_seconds": 1920,
        "checksum": "sha256hex",
        "responses": [
          {
            "question_code": "Q1",
            "value": "John Doe",
            "type": "text_short",
            "modified_at": "2026-07-18T08:05:00Z"
          },
          {
            "question_code": "Q3",
            "value": "borehole",
            "type": "select_one",
            "modified_at": "2026-07-18T08:10:00Z"
          },
          {
            "question_code": "Q6",
            "value": {"lat": -1.2834, "lng": 36.8172, "alt": 1600, "acc": 8.2},
            "type": "gps",
            "modified_at": "2026-07-18T08:20:00Z"
          }
        ],
        "media_refs": [
          {
            "question_code": "Q7",
            "file_hash": "sha256hex",
            "file_size": 2048576,
            "mime_type": "image/jpeg",
            "file_name": "photo_001.jpg"
          }
        ]
      }
    ],
    "media_refs": [
      {
        "submission_id": "sub_001",
        "question_code": "Q7",
        "file_hash": "sha256hex",
        "file_size": 2048576,
        "mime_type": "image/jpeg",
        "file_name": "photo_001.jpg"
      }
    ]
  }
}
```

**Response (200 OK):**
```json
{
  "data": {
    "accepted": [
      {
        "entity_type": "submission",
        "entity_id": "sub_001",
        "server_id": "srv_sub_001",
        "server_timestamp": "2026-07-18T10:05:00Z"
      }
    ],
    "media_tokens": [
      {
        "file_hash": "sha256hex",
        "upload_id": "upl_001",
        "upload_urls": [
          "https://storage.merline.app/media/upl_001/chunk/0",
          "https://storage.merline.app/media/upl_001/chunk/1"
        ],
        "total_chunks": 2,
        "chunk_size": 1048576
      }
    ],
    "conflicts": [],
    "rejected": []
  },
  "meta": {
    "request_id": "req_abc",
    "timestamp": "2026-07-18T10:05:00Z",
    "version": "1.0"
  }
}
```

### 2.2 Pull Changes

```
GET /api/v1/sync/pull?since=2026-07-18T10:00:00Z&device_id=dev_001
```

**Optional query parameters:**
```
entity_types[]=questionnaires&entity_types[]=assignments&entity_types[]=projects
limit=50
```

**Response (200 OK):**
```json
{
  "data": {
    "changes": {
      "questionnaires": [
        {
          "id": "qnr_002",
          "operation": "update",
          "data": {
            "id": "qnr_002",
            "code": "SURV-002",
            "title": "Household Health Survey v3",
            "version": 3,
            "definition": { ... full questionnaire JSON ... },
            "language": "en",
            "is_current": true,
            "approval_status": "published",
            "updated_at": "2026-07-18T09:30:00Z"
          }
        }
      ],
      "assignments": [
        {
          "id": "asg_002",
          "operation": "create",
          "data": {
            "id": "asg_002",
            "questionnaire_id": "qnr_002",
            "enumerator_id": "usr_001",
            "target_count": 20,
            "due_date": "2026-07-30",
            "status": "pending"
          }
        }
      ],
      "projects": [],
      "studies": [],
      "users": []
    },
    "deleted_entities": [
      {"entity_type": "questionnaire", "entity_id": "qnr_old"}
    ],
    "sync_token": "2026-07-18T10:05:00Z",
    "has_more": false
  },
  "meta": {
    "request_id": "req_def",
    "timestamp": "2026-07-18T10:05:00Z",
    "version": "1.0"
  }
}
```

### 2.3 Media Initiate Upload

```
POST /api/v1/media/init
```

**Request:**
```json
{
  "file_name": "photo_001.jpg",
  "file_size": 2048576,
  "mime_type": "image/jpeg",
  "file_hash": "sha256hex",
  "total_chunks": 2
}
```

**Response:**
```json
{
  "data": {
    "upload_id": "upl_001",
    "upload_urls": [
      "https://storage.merline.app/media/upl_001/chunk/0",
      "https://storage.merline.app/media/upl_001/chunk/1"
    ],
    "chunk_size": 1048576,
    "expires_at": "2026-07-18T12:00:00Z"
  }
}
```

### 2.4 Media Complete Upload

```
POST /api/v1/media/complete
```

**Request:**
```json
{
  "upload_id": "upl_001",
  "file_hash": "sha256hex"
}
```

**Response:**
```json
{
  "data": {
    "url": "https://storage.merline.app/media/sub_001/Q7/photo_001.jpg",
    "file_hash": "sha256hex",
    "file_size": 2048576
  }
}
```

---

## 3. Sync Engine Implementation

### 3.1 Core Sync Orchestrator

```dart
class SyncOrchestrator {
  final SyncQueueDao _queueDao;
  final SyncCheckpointDao _checkpointDao;
  final SyncApi _syncApi;
  final MediaUploader _mediaUploader;
  final ConflictResolver _conflictResolver;
  final NetworkInfo _networkInfo;
  final ChangeTracker _changeTracker;

  SyncOrchestrator({
    required SyncQueueDao queueDao,
    required SyncCheckpointDao checkpointDao,
    required SyncApi syncApi,
    required MediaUploader mediaUploader,
    required ConflictResolver conflictResolver,
    required NetworkInfo networkInfo,
    required ChangeTracker changeTracker,
  });

  Future<SyncResult> executeSync({SyncTrigger trigger = SyncTrigger.auto}) async {
    if (!await _networkInfo.isConnected) {
      return SyncResult.skipped(reason: 'No network connection');
    }

    final logEntry = SyncLogEntry(
      syncType: SyncType.full,
      startedAt: DateTime.now(),
      syncTrigger: trigger,
    );

    try {
      // Phase 1: Push local changes
      final pushResult = await _pushChanges();

      // Phase 2: Upload pending media
      final mediaResult = await _uploadPendingMedia();

      // Phase 3: Pull remote changes
      final pullResult = await _pullChanges();

      // Complete sync log
      logEntry.completedAt = DateTime.now();
      logEntry.status = SyncStatus.success;
      logEntry.itemsAttempted = pushResult.totalAttempted + mediaResult.totalAttempted + pullResult.totalAttempted;
      logEntry.itemsSucceeded = pushResult.totalAccepted + mediaResult.totalUploaded + pullResult.totalChanges;
      logEntry.itemsFailed = pushResult.totalRejected + mediaResult.totalFailed;
      logEntry.itemsConflicted = pushResult.totalConflicts;

      await _checkpointDao.updateLastSync();
      await _queueDao.logEntry(logEntry);

      return SyncResult.success(
        submissionsPushed: pushResult.acceptedCount,
        mediaUploaded: mediaResult.uploadedCount,
        changesPulled: pullResult.changesCount,
        conflicts: pushResult.conflicts,
      );
    } on DioException catch (e) {
      logEntry.status = SyncStatus.failed;
      logEntry.errorMessage = e.message;
      await _queueDao.logEntry(logEntry);
      return SyncResult.failed(e.message ?? 'Sync failed');
    }
  }

  Future<PushResult> _pushChanges() async {
    final changes = await _changeTracker.getPendingChanges();
    if (changes.isEmpty) return PushResult.empty();

    // Batch push (max 50 items per request)
    final batches = changes.chunk(50);
    int accepted = 0;
    int conflicted = 0;
    int rejected = 0;
    final conflicts = <SyncConflict>[];

    for (final batch in batches) {
      final response = await _syncApi.pushChanges(
        changes: batch,
        lastSyncedAt: await _checkpointDao.getLastSyncTime(),
      );

      // Process accepted items
      for (final item in response.accepted) {
        await _changeTracker.markSynced(item.entityType, item.entityId);
        accepted++;
      }

      // Process conflicts
      for (final conflict in response.conflicts) {
        final resolution = await _conflictResolver.resolve(conflict);
        if (resolution.winner == ResolutionWinner.local) {
          // Server will accept our version on next push
          conflicts.add(conflict);
        }
        conflicted++;
      }

      // Process rejected items
      for (final item in response.rejected) {
        await _changeTracker.markFailed(item.entityType, item.entityId, item.reason);
        rejected++;
      }
    }

    return PushResult(
      acceptedCount: accepted,
      conflictedCount: conflicted,
      rejectedCount: rejected,
      conflicts: conflicts,
    );
  }

  Future<PullResult> _pullChanges() async {
    int totalChanges = 0;

    // Pull each entity type
    for (final entityType in _syncableEntities) {
      final checkpoint = await _checkpointDao.getCheckpoint(entityType);

      bool hasMore = true;
      String? cursor;

      while (hasMore) {
        final response = await _syncApi.pullChanges(
          since: checkpoint.lastSyncedAt,
          entityType: entityType,
          limit: 100,
          cursor: cursor,
        );

        // Process creates and updates
        for (final change in response.changes) {
          await _changeTracker.applyRemoteChange(change);
          totalChanges++;
        }

        // Process deletes
        for (final deleted in response.deletedEntities) {
          await _changeTracker.applyRemoteDelete(deleted);
        }

        // Update checkpoint
        await _checkpointDao.updateCheckpoint(
          entityType: entityType,
          lastSyncedAt: DateTime.parse(response.syncToken),
        );

        hasMore = response.hasMore;
        cursor = response.nextCursor;
      }
    }

    return PullResult(changesCount: totalChanges);
  }

  Future<MediaUploadResult> _uploadPendingMedia() async {
    final pendingMedia = await _queueDao.getPendingMediaByPriority();
    int uploaded = 0;
    int failed = 0;

    for (final media in pendingMedia) {
      final result = await _mediaUploader.uploadMedia(media);
      if (result.isSuccess) {
        uploaded++;
      } else {
        failed++;
        if (media.syncAttempts >= media.maxRetries) {
          await _queueDao.markMediaFailed(media.id, result.errorMessage);
        } else {
          await _queueDao.incrementRetry(media.id, result.errorMessage);
        }
      }
    }

    return MediaUploadResult(uploadedCount: uploaded, failedCount: failed);
  }
}
```

### 3.2 Change Tracker

```dart
class ChangeTracker {
  final DriftDatabase _db;

  Future<List<SyncChange>> getPendingChanges() async {
    // Query all entities where sync_version > last_pushed_version
    final lastSync = await _db.syncCheckpointsDao.getLastSyncVersion();

    final pending = <SyncChange>[];
    pending.addAll(await _getChangedSubmissions(lastSync));
    pending.addAll(await _getChangedResponseValues(lastSync));
    return pending;
  }

  Future<List<SyncChange>> _getChangedSubmissions(int lastSyncVersion) async {
    final rows = await _db.customSelect(
      'SELECT id, sync_version, json_data FROM submissions '
      'WHERE sync_version > ? AND status != ? '
      'ORDER BY sync_version ASC LIMIT 100',
      variables: [Value(lastSyncVersion), Value('draft')],
    );

    return rows.map((row) {
      return SyncChange(
        entityType: 'submission',
        entityId: row.read<String>('id'),
        operation: 'create', // or 'update' if already synced
        data: jsonDecode(row.read<String>('json_data')),
        version: row.read<int>('sync_version'),
      );
    }).toList();
  }

  Future<void> markSynced(String entityType, String entityId) async {
    await _db.customUpdate(
      'UPDATE $entityType SET is_synced = 1, synced_at = ?, '
      'sync_status = ?, last_sync_error = NULL '
      'WHERE id = ?',
      variables: [
        Value(DateTime.now().toUtcIso8601()),
        Value('synced'),
        Value(entityId),
      ],
    );
  }

  Future<void> markFailed(String entityType, String entityId, String reason) async {
    await _db.customUpdate(
      'UPDATE $entityType SET sync_status = ?, last_sync_error = ? WHERE id = ?',
      variables: [Value('failed'), Value(reason), Value(entityId)],
    );
  }

  Future<void> applyRemoteChange(SyncChange change) async {
    switch (change.operation) {
      case 'create':
        await _upsertEntity(change);
        break;
      case 'update':
        await _upsertEntity(change);
        break;
      case 'delete':
        await _softDeleteEntity(change);
        break;
    }
  }

  Future<void> applyRemoteDelete(DeletedEntity deleted) async {
    await _db.customUpdate(
      'UPDATE ${deleted.entityType} SET is_active = 0, '
      'sync_status = ?, updated_at = ? WHERE id = ?',
      variables: [
        Value('deleted_remote'),
        Value(DateTime.now().toUtcIso8601()),
        Value(deleted.entityId),
      ],
    );
  }

  Future<bool> hasPendingSubmissions() async {
    final count = await _db.customSelect(
      "SELECT COUNT(*) as c FROM submissions WHERE is_synced = 0 AND status != 'draft'",
    );
    return count.first.read<int>('c') > 0;
  }
}
```

### 3.3 Retry Queue

```dart
class RetryQueue {
  static const int maxRetries = 5;
  static const Duration baseDelay = Duration(seconds: 10);
  static const Duration maxDelay = Duration(hours: 1);

  Future<void> processRetries() async {
    final failedItems = await _queueDao.getFailedItems();

    for (final item in failedItems) {
      if (item.retryCount >= maxRetries) {
        await _escalateToUser(item);
        continue;
      }

      final delay = _computeBackoff(item.retryCount);
      if (DateTime.now().isBefore(item.lastAttemptedAt.add(delay))) {
        continue; // Not yet time to retry
      }

      await _queueDao.updateStatus(item.id, SyncQueueStatus.queued);
    }
  }

  Duration _computeBackoff(int attempt) {
    // Exponential backoff: 10s, 20s, 40s, 80s, 160s → cap at 1 hour
    final delay = baseDelay * pow(2, attempt);
    return delay > maxDelay ? maxDelay : delay;
  }

  Future<void> _escalateToUser(SyncQueueItem item) async {
    // Mark as escalated — user sees in sync status screen
    await _queueDao.updateStatus(item.id, SyncQueueStatus.escalated);
  }
}
```

---

## 4. Conflict Resolution

### 4.1 Conflict Detection (Server-Side)

The server detects conflicts by comparing `updated_at` timestamps. If the server's version of a record has a timestamp newer than what the client reported as `last_synced_at`, and the client is pushing updates to the same record, a conflict is detected.

### 4.2 Conflict Resolution Rules

```dart
class ConflictResolver {
  Future<ResolutionResult> resolve(SyncConflict conflict) async {
    switch (conflict.entityType) {
      case 'submission':
        return _resolveSubmissionConflict(conflict);
      case 'response_value':
        return _resolveResponseValueConflict(conflict);
      case 'assignment':
        return _resolveAssignmentConflict(conflict);
      default:
        return ResolutionResult(winner: ResolutionWinner.server, mergeStrategy: MergeStrategy.overwrite);
    }
  }

  Future<ResolutionResult> _resolveSubmissionConflict(SyncConflict conflict) async {
    // For submission status changes:
    // - If local is 'submitted' and server is 'approved' → server wins (supervisor action)
    // - If local is 'submitted' and server is 'draft' → local wins (enumerator completed it)
    // - If local is 'submitted' and server is 'submitted' with different responses → field-level merge

    if (conflict.field == 'status') {
      if (conflict.serverValue == 'approved' || conflict.serverValue == 'rejected') {
        // Supervisor action takes precedence
        return ResolutionResult(winner: ResolutionWinner.server, mergeStrategy: MergeStrategy.overwrite);
      }
      // Enumerator submission overrides server draft
      return ResolutionResult(winner: ResolutionWinner.local, mergeStrategy: MergeStrategy.overwrite);
    }

    // Field-level LWW for response values
    if (conflict.field == 'response_value') {
      final localTime = DateTime.parse(conflict.localUpdatedAt);
      final serverTime = DateTime.parse(conflict.serverUpdatedAt);

      if (localTime.isAfter(serverTime)) {
        return ResolutionResult(winner: ResolutionWinner.local, mergeStrategy: MergeStrategy.overwrite);
      }
      return ResolutionResult(winner: ResolutionWinner.server, mergeStrategy: MergeStrategy.overwrite);
    }

    return ResolutionResult(winner: ResolutionWinner.server, mergeStrategy: MergeStrategy.overwrite);
  }

  Future<ResolutionResult> _resolveResponseValueConflict(SyncConflict conflict) async {
    // LWW per individual response value
    final localTime = DateTime.parse(conflict.localUpdatedAt);
    final serverTime = DateTime.parse(conflict.serverUpdatedAt);

    if (localTime.isAfter(serverTime)) {
      return ResolutionResult(winner: ResolutionWinner.local, mergeStrategy: MergeStrategy.overwrite);
    }
    return ResolutionResult(winner: ResolutionWinner.server, mergeStrategy: MergeStrategy.overwrite);
  }

  Future<ResolutionResult> _resolveAssignmentConflict(SyncConflict conflict) async {
    // Assignments are server-managed — server always wins
    return ResolutionResult(winner: ResolutionWinner.server, mergeStrategy: MergeStrategy.overwrite);
  }
}
```

### 4.3 Manual Conflict Resolution UI

```dart
class ConflictResolutionScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final conflicts = ref.watch(syncConflictsProvider);

    return Scaffold(
      appBar: AppBar(title: Text('Sync Conflicts (${conflicts.length})')),
      body: ListView.builder(
        itemCount: conflicts.length,
        itemBuilder: (context, index) {
          final conflict = conflicts[index];
          return Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${conflict.entityType}: ${conflict.entityId}',
                    style: context.textTheme.titleMedium),
                  SizedBox(height: 8),
                  Text('Field: ${conflict.field}'),
                  SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Your value:', style: TextStyle(fontWeight: FontWeight.bold)),
                            Text(conflict.localValue.toString()),
                            Text('Modified: ${_formatTime(conflict.localUpdatedAt)}'),
                          ],
                        ),
                      ),
                      Icon(Icons.vs, size: 32),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Server value:', style: TextStyle(fontWeight: FontWeight.bold)),
                            Text(conflict.serverValue.toString()),
                            Text('Modified: ${_formatTime(conflict.serverUpdatedAt)}'),
                          ],
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      ElevatedButton(
                        onPressed: () => ref.read(syncEngineProvider).resolve(
                          conflict, ResolutionWinner.local,
                        ),
                        child: Text('Keep Mine'),
                      ),
                      ElevatedButton(
                        onPressed: () => ref.read(syncEngineProvider).resolve(
                          conflict, ResolutionWinner.server,
                        ),
                        child: Text('Accept Server'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
```

---

## 5. Sync Monitoring and Analytics

```dart
class SyncAnalytics {
  Future<SyncReport> generateReport() async {
    final logs = await _syncLogDao.getRecent(30);

    return SyncReport(
      totalSyncs: logs.length,
      successfulSyncs: logs.where((l) => l.status == SyncStatus.success).length,
      failedSyncs: logs.where((l) => l.status == SyncStatus.failed).length,
      totalSubmissionsSynced: logs.fold(0, (sum, l) => sum + l.itemsSucceeded),
      totalConflicts: logs.fold(0, (sum, l) => sum + l.itemsConflicted),
      totalBytesUploaded: logs.fold<int>(0, (sum, l) => sum + l.bytesUploaded),
      averageSyncDuration: _average(logs.map((l) => l.duration.inSeconds)),
      lastSyncTime: logs.isNotEmpty ? logs.first.completedAt : null,
      pendingCount: await _queueDao.getPendingCount(),
      failedCount: await _queueDao.getFailedCount(),
      conflictCount: await _queueDao.getConflictCount(),
    );
  }
}
```

---

## 6. Sync State Provider

```dart
class SyncStateNotifier extends StateNotifier<SyncState> {
  final SyncOrchestrator _orchestrator;
  final ChangeTracker _changeTracker;

  SyncStateNotifier(this._orchestrator, this._changeTracker)
      : super(SyncState.initial());

  Future<void> triggerAutoSync() async {
    state = SyncState.inProgress(SyncTrigger.auto);
    final result = await _orchestrator.executeSync(trigger: SyncTrigger.auto);
    state = SyncState.completed(result);
  }

  Future<void> triggerManualSync() async {
    state = SyncState.inProgress(SyncTrigger.manual);
    final result = await _orchestrator.executeSync(trigger: SyncTrigger.manual);
    state = SyncState.completed(result);
  }

  Future<void> triggerBackgroundSync() async {
    state = SyncState.inProgress(SyncTrigger.background);
    final result = await _orchestrator.executeSync(trigger: SyncTrigger.background);
    state = SyncState.completed(result);
  }
}

class SyncState {
  final bool isSyncing;
  final SyncTrigger? trigger;
  final SyncResult? lastResult;
  final int pendingCount;
  final int failedCount;
  final int conflictCount;

  const SyncState({
    this.isSyncing = false,
    this.trigger,
    this.lastResult,
    this.pendingCount = 0,
    this.failedCount = 0,
    this.conflictCount = 0,
  });

  factory SyncState.initial() => SyncState();

  factory SyncState.inProgress(SyncTrigger trigger) => SyncState(
    isSyncing: true,
    trigger: trigger,
  );

  factory SyncState.completed(SyncResult result) => SyncState(
    isSyncing: false,
    pendingCount: result.pendingCount ?? 0,
    failedCount: result.failedCount ?? 0,
    conflictCount: result.conflictCount ?? 0,
  );
}
```
