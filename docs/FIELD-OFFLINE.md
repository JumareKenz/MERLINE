# Field app: offline recording and lightweight upload

How the field PWA records with no connection, keeps audio safe on the phone,
and uploads it cheaply once a connection returns.

## Summary

| Concern | How |
|---|---|
| Record with no signal | `MediaRecorder` writes 5-second slices straight into IndexedDB while recording (`hooks/use-field-recorder.ts`). No network is involved until upload. |
| Survive a crash / closed tab / dead battery | Each slice is committed as it arrives. On the next app start, `recoverInterrupted()` queues any recording left mid-capture (consecutive MediaRecorder slices form a playable file). At most the last ~5 s is lost. |
| Small files | Opus, mono, **24 kbps**, with echo cancellation and noise suppression, which works out to **~11 MB per hour** (a 90-minute interview is ~16 MB, versus 80–170 MB at browser defaults). Safari records AAC/MP4 and treats the bitrate as a hint. |
| Weak or intermittent connections | Upload is split into **512 KiB parts**. A dropped connection re-sends one part, never the whole interview. Progress survives restarts. |
| Integrity | The device computes SHA-256 of the whole recording. The server re-assembles the parts, recomputes the hash, and discards the upload on a mismatch (the device then starts over). |
| Consent | Checked by the server on **every** step (status probe, each part, completion). A withdrawal mid-upload stops it at the next part. The field UI also blocks recording when cached consent doesn't permit it, but the server is the authority. |
| Idempotency | The upload id is the device's recording UUID. A re-sent part overwrites itself, and a re-sent completion returns the Media row already created. |
| Freeing the phone | Audio is deleted from IndexedDB only after the server has confirmed the checksum-verified recording. |
| Opening the app offline | The service worker precaches the field screens **and the JS/CSS chunks they reference**, re-warmed after sign-in. The interview screen is one static route (`/field/interview?id=…`) matched ignoring the query, so any assigned interview opens offline. |
| Knowing today's work offline | Each successful load of the worker's interviews is saved to IndexedDB (participant name, time, place, consent scope flags) and always shown labelled as cached, with its timestamp. |
| Truthful status | The sync pill only says "All recordings uploaded" when every recording on the device is server-confirmed. Offline, it says "Offline · N saved on this device". |

## Pieces

```
src/lib/field/types.ts       LocalRecording, RecordingRepo, UploadTransport
src/lib/field/idb.ts         IndexedDB repo (recordings, slices, snapshots), no dependencies
src/lib/field/outbox.ts      runOutbox(): resumable, idempotent upload engine; recoverInterrupted()
src/lib/field/transport.ts   UploadTransport over the shared API client
src/stores/field-outbox-store.ts   drives the outbox: app start, 'online', visibility, every 30 s
src/hooks/use-field-recorder.ts    capture: bitrate, slices to IDB, wake lock, level meter, interruptions
src/hooks/use-field-interviews.ts  live list + device snapshot
public/sw.js                 app-shell caching (never cross-origin, never non-GET)
```

API (NestJS, `interviews.controller.ts`), all requiring `upload.recordings`:

```
GET  /interviews/:id/recordings/uploads/:uploadId            → { receivedParts, completed }
PUT  /interviews/:id/recordings/uploads/:uploadId/parts/:n   multipart "chunk" (≤ 8 MB)
POST /interviews/:id/recordings/uploads/:uploadId/complete   { totalParts, mimeType, originalName, checksum, durationMs, recordedAt }
```

Parts are stored under `org/<org>/recording-parts/<user>/<uploadId>/` so one
user can never write into another's upload.

## Retry policy

| Server answer | Device does |
|---|---|
| No response (offline, timeout) | Stops the run; resumes on the next `online` event. Not counted as a failed attempt. |
| 401 | Keeps the recording queued; resumes after sign-in (same user only). |
| 403 / 404 (consent, or not assigned) | Marks it **blocked**; never retries automatically. The worker may delete it from the phone after confirming. |
| 400 checksum mismatch | Resets parts; retries from part 0 after backoff. |
| 5xx / other | Exponential backoff: 5 s, 10 s, … capped at 5 min. "Retry now" is available. |

## Honest limits

- **Uploads run while the app is open** (foreground, on focus, on reconnect,
  and every 30 s). Background Sync isn't dependable on iOS, so it isn't relied
  on. The Uploads screen says so.
- **Creating participants, consent and new interviews needs a connection**,
  so the server checks consent before any recording exists. Offline, the
  worker records interviews that were **assigned and synced** beforehand. The
  UI states this where it applies.
- Signing out keeps unsent audio on the phone, bound to its owner; it uploads
  only when the same user signs in again. The account sheet warns before
  signing out with unsent recordings.
- A cleared browser profile or private-browsing mode can lose device storage.
  The app requests persistent storage (`navigator.storage.persist()`) and
  shows usage and whether it's protected on the Uploads screen.

## Tests

- `src/lib/field/outbox.test.ts` (Vitest + fake-indexeddb): part size,
  resume after a dropped connection, lost-completion recovery, consent
  block, 401 pause, backoff, other-user isolation, checksum restart, crash
  recovery, slice ordering.
- `src/common/architecture/field-workflow.integration.spec.ts` (backend, DB +
  MinIO): out-of-order and re-sent parts, idempotent completion, missing
  parts, checksum mismatch, non-audio refusal, consent refusal before any
  bytes are stored, withdrawal mid-upload, per-user isolation.
- `e2e/merline.spec.ts` (Playwright, fake microphone): record → go offline →
  keep recording → stop → reconnect → verify on the server; and reopen an
  assigned interview with no connection.
