# Enumerators, access codes, transcript review and evidence-based reports

Design record for the change that introduced personal enumerator accounts,
human review of transcripts before analysis, several interview types per
project, and reports that use approved transcripts only. Read with
`CLAUDE.md` (invariants) and `docs/FIELD-OFFLINE.md`.

## 1. How the app worked before

| Area | Before |
|---|---|
| Field sign-in | An admin created an **access code** (a field `User` with role `field-interviewer`). Codes were 4 characters, stored in plaintext in `users.field_access_code`, and **shared by a team**; the phone asked "who is conducting?" for every interview (`Interview.enumeratorName`). |
| Admin pages | *Assignments* (access codes + booked interviews), *Results*, *Transcripts*, *Reports* (which was really Findings), *AI Dialogue*, *Guides*, *Self-interviews*. AI reports had no index page. |
| Transcripts | Machine text (`text`) plus one admin correction layer (`editedText`). Recordings and transcripts were admin-only. Any `COMPLETED` transcript fed reports, findings and dialogue. |
| Interview type | `Interview.type` was a free string defaulted from the project's single `settings.method`. |
| Reports | AI wrote reports from completed transcripts; prevalence and "strength" were the model's own words. |

## 2. Data model (migration `20260930100000_enumerators_and_transcript_review`)

Additive. Nothing is dropped or rewritten.

* `enumerator_profiles` — `userId`, `uniqueId` (`ENU-XXXXXX`, unique per organization), `state`, `notes`.
* `field_access_codes` — `codeHash` (HMAC-SHA256, unique), `status` (`ACTIVE`/`REVOKED`), `expiresAt`, `lastUsedAt`, `useCount`, issued/revoked by and reason. A **partial unique index allows one ACTIVE code per user**. History is kept.
* `project_interview_types` — per-project types (`key`, `label`, `description`, `fields` JSON, `isActive`). A project with no rows uses the six built-ins. `Interview.type` stays a string key; `Interview.type_metadata` holds the type's extra details.
* `transcripts.review_status` (`TranscriptReviewStatus`), review/approval columns, `approved_revision_id`.
* `transcript_revisions` — immutable snapshots (`MACHINE`, `ENUMERATOR`, `ADMIN`, `APPROVED`), numbered per transcript. Never updated or deleted by code.
* `transcript_review_events` — who moved a transcript from which state to which, when, with what note.
* `transcript_segments`: `edited_speaker_label`, `flagged`, `flag_reason`, `review_note`. Machine `text`/`speaker_label` are never overwritten.
* `report_sources` — the approved transcripts (and revision) each report was written from.

Backfill (in the migration): existing field accounts get an enumerator profile (their old code keeps working); completed transcripts become `AVAILABLE_FOR_REVIEW` (**not** approved) with their machine text as revision 1. Tested against production-shaped rows in `enumerator-migration.integration.spec.ts`.

## 3. Access codes

* 10 characters from a 31-character alphabet (no `0/O/1/I/L`), `crypto.randomInt`, shown once as `XXXXX-XXXXX`. Unpredictable and unrelated to the person or time.
* Stored only as `HMAC-SHA256(ACCESS_CODE_PEPPER or JWT_SECRET, code)`. The plaintext is returned by exactly two calls (create enumerator, regenerate) and by no list/detail/log/URL. The service fails closed if no secret is set.
* `POST /auth/field-login`: throttled 10/min, `FieldLoginLimiter` blocks an address after 8 misses, unknown/revoked/expired/inactive all answer **"Invalid or expired access code"**. Failed and successful attempts are audited (`field_login.*`) without the tried code.
* Regenerate or revoke: one transaction, old code `REVOKED`, `tokenVersion` bumped (every phone signed out). Deactivating an account also ends its sessions. Logging out one phone does not end the others.
* A personal account's interviews are credited to the account's name **server-side**, whatever name the device sends.
* **Legacy shared 4-character codes still sign in** (backward compatible, marked "Shared code" in the UI) until an admin issues a personal code, which retires them. The old create/reveal endpoints (`/field-team`, `/users/:id/field-access-code`) were removed; only sign-in for existing legacy codes remains.

Permissions added: `view/create/edit/assign.enumerators`, `manage.access-codes`, `review.transcripts` (enumerator, **own interviews only**, enforced in the service, answering 404 for anything else), `approve.transcripts`. Existing organizations receive them on API start (`PermissionCatalogueSync`).

## 4. Transcript review

```
RECORDING_SUBMITTED → TRANSCRIPTION_PROCESSING → AVAILABLE_FOR_REVIEW
   → ENUMERATOR_EDITING → SUBMITTED_FOR_ADMIN_REVIEW ─┬→ APPROVED → LOCKED
                                                      └→ RETURNED_FOR_CORRECTION → ENUMERATOR_EDITING …
```

* Machine processing (`Transcript.status`) is separate from review (`reviewStatus`); the pipeline moves to `AVAILABLE_FOR_REVIEW` and writes revision 1 in the same transaction.
* Every transition is one transaction with the status in the `WHERE` (two racing actors cannot both win), plus a review event.
* Enumerator: listen (signed URL for their own recording), edit wording, correct speakers, add cues (`[laughs]`, `[pause]`, `[crying]`, `[inaudible]`, `[background noise]`, `[overlapping speech]`, or their own; brackets must balance), flag doubt, add notes, submit (freezes an `ENUMERATOR` revision).
* Administrator: compare any two revisions, edit only while it is theirs to edit (`AVAILABLE_FOR_REVIEW`, `SUBMITTED_FOR_ADMIN_REVIEW`), **return** with a required note, **approve** (freezes the `APPROVED` revision = authoritative text), **reopen** (with a reason, removes it from analysis), **lock**.
* Approval refuses while passages are flagged unless acknowledged; approving without the enumerator's submission needs an explicit skip and a note ≥ 10 characters (recorded as `approved_without_enumerator_review`).
* A finding cannot quote text that would be removed by an edit (existing rule, kept).

## 5. The evidence gate

Only `APPROVED`/`LOCKED` transcripts are evidence (`transcripts/review-status.ts`). Enforced in: report creation, the report pipeline (`latestTranscript`), the project "ask", findings AI-draft, quotation creation, and AI Dialogue. `common/architecture/evidence-gate.spec.ts` fails if a new analysis path reads transcripts without the gate. Reports and interview reports already stored keep displaying; new ones need approval, and a stored interview report is reused only if it was written after the approval.

## 6. Reports

* Quotations: verbatim from the approved text, with interview, **speaker (corrected label)**, timestamp, interview type and revision. Flagged passages and bracketed cues are never quoted.
* Sections/paragraphs are labelled: *Summary of what participants said*, *Interpretation*, *Theme*, *Recommendation*, *Sources*.
* Per finding the report **computes** where it was raised (from real interview refs and quotations), the interview types involved and an **evidence strength** (`analysis/evidence.ts`: Strong needs verbatim support from ≥3 interviews across ≥2 types with contrary evidence outnumbered; the text states this is not validation). Findings supported by neither an interview nor a verified quotation are **withheld and counted** in Limitations.
* Contrary/qualifying evidence, minority views and "where the evidence is insufficient" have their own places. A **triangulation table** (finding × interview type, with locations) is generated deterministically. One approved interview → an explicit "evidence is limited" warning.
* Prompt versions bumped (`interview-report-v2`, `project-report-v2`, `research-brief-v3`).

## 7. Interface

Sidebar: Dashboard · Projects · Enumerators · Submissions · Transcripts · Reports, then a *Set-up* group (Guides, Self-interviews). Retired: *Assignments* (redirects to Enumerators; "Book an interview" is a button on Submissions), *AI Dialogue* (opens from an approved transcript), *Findings* (a tab under Reports). The field app gets a *Transcripts* tab with a badge for what needs the enumerator.

## 8. Assumptions and limits

* Enumerator email is optional (many field staff have none); phone and state are required. Phone uniqueness is per organization, email is global (existing constraint).
* Review needs a connection (it plays the recording); recording, consent and interview creation remain offline-capable.
* The enumerator keeps access to transcripts of interviews they conducted after a project is unassigned; new interviews in it are refused.
* Transcripts approved before this change did not exist (they were backfilled as *available for review*): reports on old data need one approval pass.
* Not built: multi-language non-verbal cue vocabulary, per-word confidence display (segment-level only), Background Sync for review edits.
