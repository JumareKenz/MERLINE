# Mobile MVP Scope — Phase 1 Implementation Plan

## 1. Feature Scope for Phase 1

### 1.1 What Works Fully Offline

| Feature | Capability | Sync Behavior |
|---------|-----------|---------------|
| Authentication | Login with cached JWT; auto-refresh on connect | Token refresh on next connection |
| Project list & detail | View assigned projects, read-only | Pull updates on sync |
| Questionnaire download | Full download with definition JSON | Pull new versions when published |
| Form fill (all 24 types) | Complete offline rendering & input | Responses saved locally until submit |
| Skip logic evaluation | Client-side, instant | Logic embedded in questionnaire |
| Validation rules | Client-side, all rules evaluated | Rules embedded in questionnaire |
| Calculated fields | Client-side computation | Formula embedded in questionnaire |
| GPS capture | Platform GPS APIs, drift correction | Included in submission payload |
| Photo capture | Native camera → compress → encrypt → store | Chunked upload with resume |
| Audio recording | Native audio → compress → encrypt → store | Chunked upload with resume |
| Signature capture | Canvas → PNG → encrypt → store | Uploaded with submission |
| Barcode scanning | Platform barcode API | Value stored with submission |
| Draft saving | Autosave every 15s + manual save | Drafts are local-only until submitted |
| Crash recovery | Full form state restoration on restart | Local only |
| Submission queuing | Persistent queue in SQLite | Push on connectivity |
| Enumerator dashboard | Cached stats from last sync | Updated on sync |
| Assignment tracking | List, filter, view assignments offline | Pulled on sync |
| Settings | All settings local | Sync language/theme when changed |

### 1.2 What Requires Connectivity (Capped for MVP)

| Feature | MVP Behavior | Future Enhancement |
|---------|-------------|-------------------|
| Sync push | Manual trigger + auto on connectivity | Real-time sync via WebSocket |
| Media upload | WiFi-only by default, manual on mobile data | Cellular data toggle |
| Supervisor dashboard | Pull-to-refresh to get latest | Real-time live updates |
| Conflict resolution | Shown on next manual sync | Push notification of conflicts |
| Map tiles | Study area pre-download | Dynamic tile download |
| New questionnaire assignment | Pull on sync | Push notification of new assignments |

### 1.3 What is Read-Only for MVP

| Feature | Description |
|---------|-------------|
| Project details | View project info, no editing on mobile |
| Study configuration | View study details, no editing |
| Indicator library | View linked indicators, no editing |
| Team info | View team members, no management |

### 1.4 What is Full CRUD

| Feature | Create | Read | Update | Delete |
|---------|--------|------|--------|--------|
| Submissions | Yes | Yes | Yes (draft only) | Yes (draft only) |
| Response values | Yes | Yes | Yes | Yes (before submit) |
| Drafts | Yes | Yes | Yes | Yes |
| Media files | Yes | Yes | No | Yes (before submit) |

---

## 2. Module Implementation Sequence

### Sprint Breakdown (12 weeks)

```
Sprint 1-2: Foundation
├── Project setup (Flutter, Riverpod, Drift, Dio, routing)
├── Local database schema + DAOs
├── Theme system (light/dark, design tokens)
├── Secure storage + database encryption
├── Auth flow (login, token caching, offline auth)
└── Connectivity monitoring

Sprint 3-4: Core Data Layer
├── API client with interceptors (auth, retry, logging)
├── Repository implementations (auth, project, questionnaire, submission)
├── Data mappers (DTO ↔ Entity)
├── UUIDv7 generation
├── Error handling framework
├── Logging and crash reporting
└── Initial sync (pull questionnaires, assignments)

Sprint 5-6: Form Engine
├── Questionnaire definition parser
├── Form state manager (Riverpod StateNotifier)
├── Question widget factory
├── Text, number, date, time renderers
├── Select one, select multiple, dropdown renderers
├── GPS question with accuracy indicator
├── Photo capture with compression
├── Skip logic evaluator
├── Validation engine
├── Calculation engine
├── Note widget + section headers
└── Form navigation (swipe + buttons)

Sprint 7-8: Form Engine Advanced + Draft Management
├── Audio recording question
├── Video recording question
├── Signature capture
├── Barcode/QR scanning
├── Likert, ranking, slider, matrix renderers
├── Repeating groups
├── Composite question type
├── Autosave (15s interval)
├── Draft recovery after crash
├── Form review screen
├── Submission completion + queuing
└── Form progress indicator

Sprint 9-10: Sync Engine
├── Change tracker (sync_version mechanism)
├── Sync queue (persistent, prioritized)
├── Push engine (batch submission upload)
├── Pull engine (delta sync by entity type)
├── Media uploader (chunked, resume, retry)
├── Conflict detector + resolver (LWW)
├── Manual conflict resolution UI
├── Background sync (WorkManager)
├── Sync state provider + status indicators
└── Sync history screen

Sprint 11-12: Dashboard + UI Polish
├── Enumerator dashboard
├── Assignment list with statuses
├── Supervisor dashboard (basic)
├── Sync status screen
├── Settings screen (language, theme, storage)
├── Storage management (compression, cleanup)
├── Offline indicator banner
├── GPS drift detection + correction
├── Localized map with study area overlay
├── Accessibility pass (large text, TalkBack)
├── Dark mode finalization
└── Polish + bug fixes
```

---

## 3. Dependencies on Backend APIs

| API Endpoint | Mobile Feature | MVP Priority |
|-------------|---------------|-------------|
| `POST /api/v1/auth/login` | User authentication | P0 |
| `POST /api/v1/auth/refresh` | Token refresh | P0 |
| `GET /api/v1/auth/me` | Current user profile | P0 |
| `GET /api/v1/projects` | Project list | P0 |
| `GET /api/v1/projects/{id}` | Project detail | P0 |
| `GET /api/v1/studies` | Study list | P0 |
| `GET /api/v1/studies/{id}` | Study detail | P0 |
| `GET /api/v1/questionnaires` | Questionnaire list | P0 |
| `GET /api/v1/questionnaires/{id}` | Full questionnaire download | P0 |
| `GET /api/v1/assignments` | Assignment list | P0 |
| `GET /api/v1/assignments/{id}` | Assignment detail | P0 |
| `POST /api/v1/sync/push` | Push submissions | P0 |
| `GET /api/v1/sync/pull` | Pull changes | P0 |
| `POST /api/v1/media/init` | Initiate media upload | P0 |
| `PUT /api/v1/media/{uploadId}/chunk/{index}` | Upload media chunk | P0 |
| `POST /api/v1/media/complete` | Complete media upload | P0 |
| `GET /api/v1/sync/status` | Server sync status | P1 |
| `POST /api/v1/sync/conflicts/resolve` | Report conflict resolution | P1 |
| `GET /api/v1/dashboard/enumerator` | Enumerator dashboard stats | P1 |
| `GET /api/v1/dashboard/supervisor` | Supervisor dashboard stats | P1 |

---

## 4. Key Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| **Sync conflicts** cause data loss | Medium | Critical | Field-level LWW with manual override; all conflicts logged and auditable |
| **Media upload failures** in weak network | High | High | Chunked upload with resume; compression reduces file sizes; WiFi-only default |
| **GPS accuracy** poor in indoor/urban areas | High | Medium | Accuracy threshold warnings; allow override with flag; geofence validation |
| **Large questionnaire** (>200 questions) performance | Medium | Medium | Lazy loading, virtual scrolling, paginated form rendering |
| **Database corruption** from crash during write | Low | Critical | WAL mode journaling; periodic integrity checks; backup before sync |
| **Battery drain** from GPS/background sync | Medium | Medium | Adaptive location modes; configurable sync intervals; battery-aware strategies |
| **Storage full** from media accumulation | Medium | Medium | Compression; LRU eviction; proactive warnings; manual cleanup UI |
| **Offline auth token expiry** | Low | High | Refresh token with long expiry (7 days); offline grace period |
| **Backend API changes** breaking mobile sync | Low | High | API versioning (v1); contract testing between mobile and backend |
| **Rooted/jailbroken devices** compromising data | Medium | High | Root detection; encrypted storage; remote wipe capability |

---

## 5. Offline-First Checklist

### Authentication
- [x] Login works with cached credentials when offline
- [x] JWT token cached in flutter_secure_storage
- [x] Token auto-refresh on next connection
- [x] Offline grace period before forcing re-login

### Questionnaires
- [x] Full questionnaire definition cached locally (JSON)
- [x] All 24 question types render from local data
- [x] Translations available offline
- [x] Questionnaire version checked on sync; force update if needed

### Form Fill
- [x] All question types work without network
- [x] Skip logic evaluated client-side
- [x] Validation rules enforced client-side
- [x] Calculated fields computed client-side
- [x] Repeating groups functional offline
- [x] Media capture works without network
- [x] GPS capture works without network

### Draft & Submission
- [x] Autosave every 15 seconds
- [x] Manual save available
- [x] Crash recovery restores full form state
- [x] Submission queued locally when no network
- [x] Multiple submissions can be queued
- [x] Submission status tracked (draft → submitted → synced → conflict)

### Sync
- [x] Push changes when connectivity detected
- [x] Pull changes when connectivity detected
- [x] Background sync via WorkManager (15 min interval)
- [x] Manual sync trigger (pull-to-refresh, button)
- [x] Sync progress visible to user
- [x] Pending/failed/synced status per item
- [x] Media upload with chunked resumable upload
- [x] Retry with exponential backoff (max 5 retries)
- [x] Conflict detection and resolution

### Data Integrity
- [x] Submission checksums (SHA-256)
- [x] Media file integrity (SHA-256)
- [x] Database integrity checks (PRAGMA integrity_check)
- [x] Sync queue survives app restart
- [x] No duplicate submissions (idempotency keys)

### Maps
- [x] Pre-downloaded study area tiles
- [x] Offline map rendering with study boundaries
- [x] GPS point display on offline map

### Storage
- [x] Media compression before storage
- [x] LRU cache eviction for older media
- [x] Storage usage display
- [x] Manual cleanup option
- [x] Warning at 85% capacity; block at 95%

---

## 6. MVP Success Criteria for Mobile

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| Offline form fill | All 24 question types work without network | Manual test with airplane mode |
| Submission sync | >99% of submissions sync without data loss | Sync success tracking |
| Form load time | < 2 seconds for 50-question form from local DB | Profiling |
| Question navigation | < 100ms between questions | Profiling |
| Media upload resume | Resume from last chunk after interruption | Integration test |
| GPS accuracy | < 10m outdoor, < 50m indoor | Field test |
| Battery drain | < 30% over 8-hour field day | Device monitoring |
| Crash recovery | Full form state restored on restart | Integration test |
| Sync queue persistence | Queue survives app kill + restart | Integration test |
| Cold start | < 3 seconds | Profiling |
| Accessibility | All screens pass TalkBack navigation | Manual accessibility audit |
| Device compatibility | Works on Android 8+ (API 26), iOS 15+ | Device matrix testing |

---

## 7. Out of Scope for Phase 1

| Feature | Rationale | Planned Phase |
|---------|-----------|---------------|
| Real-time sync via WebSocket | Added complexity not needed for MVP | Phase 2 |
| Push notifications for new assignments | Requires FCM setup + server integration | Phase 2 |
| Supervisor live map of enumerators | GPS tracking privacy + battery concerns | Phase 2 |
| AI-powered form suggestions | AI layer not available in Phase 1 | Phase 2 |
| Video recording | Higher storage/bandwidth requirements | Phase 2 |
| Offline FGD/KII qualitative tools | Not in MVP scope per product definition | Phase 2 |
| DHIS2/KoboToolbox integration | Not in MVP scope | Phase 3 |
| Multiple language switching in-app | MVP supports form translation only | Phase 2 |
| Custom dashboard builder | Not in MVP scope per product definition | Phase 2 |
| Biometric authentication | Added security, not critical for MVP | Phase 2 |
| Mobile web entry (PWA) | Native Flutter app is primary mobile target | Phase 3 |
| Desktop/tablet adaptive layouts | Tablet support basic; full adaptive in Phase 2 | Phase 2 |

---

## 8. Summary

The MVP delivers a **fully offline-capable mobile data collection platform** supporting:

- **Authentication** with cached credentials
- **24 question types** rendered natively offline
- **Skip logic, validation, and calculated fields** evaluated client-side
- **GPS capture** with drift detection and accuracy validation
- **Media capture** (photo, audio, signature) with compression and encryption
- **Autosave and crash recovery** for uninterrupted field work
- **Submission queuing** with prioritized sync engine
- **Chunked media upload** with resume capability
- **Conflict detection and resolution** with LWW + manual override
- **Background sync** via WorkManager
- **Sync status visibility** at global and item level
- **Secure storage** with full encryption (DB, files, tokens)

**Total estimated effort**: 12 weeks for a team of 2-3 Flutter engineers + 1 backend engineer for sync API.

**Key architectural principles**: Offline-first (all features work without network), secure by default (encryption everywhere), resilient to interruptions (chunked uploads, retry queues, crash recovery), and performant on low-end devices (compression, lazy loading, battery-aware strategies).
