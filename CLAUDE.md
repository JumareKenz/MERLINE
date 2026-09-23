# Merline — working context

Read this first. It is the fastest path to being useful in this repository, and
it records decisions that are easy to undo by accident.

**Product:** a qualitative interview platform for field research — interview
guides, assignments, consent, offline recording, transcription, evidence-linked
findings, human approval, reports.

**It used to be** a general MERL platform (monitoring, evaluation, research,
learning). That domain is frozen, not deleted. See `LEGACY.md`.

---

## Current state

| Phase | Status |
|---|---|
| Phase 0 — qualitative reset | Done. MERL deregistered, boundary enforced by tests. |
| Phase 1 — platform safety | Done. Auth, tenancy, permissions, migrations, storage, audit. |
| Deployment | Live on the VPS: `/opt/merline` (systemd `merline-web` :3001, `merline-api` :4000, nginx for merline./field./api.jrecc.org). |
| Phase 2 — interview MVP | Live: participants, consent, interviews, offline field recording, transcripts, evidence-linked findings, AI Dialogue. Guides/questionnaires and translations are **not** built (legacy MERL modules, still deregistered). |

Branch: `phase-0/qualitative-reset` → PR #1 against `master`.

---

## Conventions

- **Never add `Co-Authored-By: Claude` or any AI attribution to commits.**
  The user asked for this explicitly and had five commits rewritten to remove it.
- Commit messages: detailed bodies explaining what changed and *why*. Those are
  wanted; only the attribution trailer is not.
- Do not commit the user's unrelated work-in-progress into a feature commit.
  Stage explicitly, never `git add -A` across `apps/frontend/src`.

---

## Things that will waste your time if you don't know them

**1. Integration tests skip silently by default.**
`npx jest` passes with 6 skipped. The database-backed suites only run with:
```
RUN_DB_TESTS=1 DATABASE_URL=... npx jest
```
A green run without that flag does **not** mean tenancy is verified.

**2. Legacy modules are deregistered, not deleted.**
Nine MERL modules still exist under `src/` and still compile, but are absent
from `app.module.ts`. Re-adding one fails the build via
`src/common/architecture/legacy-boundary.spec.ts`. That is deliberate.
Source of truth: `src/common/architecture/legacy-registry.ts`. Keep it in step
with `LEGACY.md`.

**3. The frontend has a mock API adapter.**
`src/lib/api-mock.ts` serves generated demo data. It is gated on
`NODE_ENV === 'development'`, so production builds drop it — but in dev it can
make a completely broken backend look healthy. It is how the original defects
went unnoticed for so long.

**4. AI provider failure raises; it does not fall back.**
`AiGatewayService` used to return fabricated MERL-flavoured text when no
provider answered, indistinguishable from a real reply. That is removed. With
no `OPENAI_API_KEY` / `OPENROUTER_API_KEY`, `/ai/chat` returns 503 **by design**.
Do not reintroduce a fallback that returns content.

**5. The nine "specialist AI agents" were removed from the execution path.**
They returned hard-coded templates and could not call a model. Their files
remain, unregistered. A real qualitative analysis service replaces them in
Phase 2 — one that must return evidence-linked output.

**6. Anthropic and Google providers were removed.**
Both were wired to an OpenAI-shaped `/chat/completions` they do not accept, so
they could only fail. `ANTHROPIC_API_KEY` and `GOOGLE_AI_API_KEY` are no longer
read. OpenRouter reaches those models over the OpenAI dialect.

**7. Postgres must have pgvector, not PostGIS.**
`document_chunks.embedding` is `vector(1536)`; migrations fail without the
extension. PostGIS is unused — no geometry columns, no raw SQL. See
`docs/adr/ADR-001-postgres-image-pgvector.md`.

**8. `tsconfig.build.json` excludes `prisma` and `api`.**
Both live outside `src`. Including either makes the TypeScript root the package
root, so output nests under `dist/src/` and `npm start` (`node dist/main.js`)
breaks. This has already been fixed twice.

**9. Never write `api.get<import('@/types/x').T>(url)`.**
Next's SWC compiler reads an inline `import()` type inside call type
arguments as a comparison with a dynamic import, and compiles the method
into an expression that **never sends the request** — tsc and the build both
pass. This shipped and broke every data screen except sign-in. Use the
`import type * as XTypes` namespaces at the top of `lib/api-client.ts`.
Guarded by `src/lib/api-client.test.ts`.

**10. Undecorated routes are "authenticated only".** `PermissionGuard` only
enforces routes with `@Permissions(...)`, and `TenantGuard` only checks
`:orgId`/`:organizationId` params (not `:id`). Every new route needs an
explicit permission and tenant scoping in the service.
`organizations/authorization-coverage.spec.ts` walks every controller in
`AppModule` and fails on any route without `@Permissions` that is not in its
explicit open-by-design list.

**11. Field work model.** Admins assign field workers to *projects*
(ProjectTeam, role "field") from Assignments → Field team; one access code
per person, any number of projects. Field workers meet participants on site
and create participant + consent + interview in one idempotent call
(`POST /field/interviews`, device-generated ids) — offline-capable. Scoping
is server-side: a user whose only role is `field-interviewer` sees only their
assigned projects, their own interviews, and participants they registered or
are interviewing (`common/scoping/field-scope.ts`). Service methods take an
optional trailing `viewerId`; controllers must pass `user.id`.
**New organizations** get their permission catalogue and roles from
`provisionOrganizationRoles()`; repair older ones with
`npx ts-node prisma/provision-organizations.ts [slug]`.

**12. Field offline recording** is documented in `docs/FIELD-OFFLINE.md`
(IndexedDB slices, resumable 512 KiB parts, consent re-checked per part).
Brand tokens and the asset pipeline are in `docs/BRAND.md`.

**13. Background jobs and transcription.** `src/jobs` is a database queue
(`jobs` table) run by a worker inside the API (`JOBS_WORKER=off` disables
it; never started under Jest — tests call `JobsService.drain()`). Handlers
throw `RetryableJobError` (backoff, honours retry-after) or
`PermanentJobError`; failures are mirrored onto the transcript and stay
retryable. Uploads queue transcription automatically when consent allows
(`transcripts/transcription-queue.ts`). **Timestamps:** Prisma stores UTC
in `timestamp without time zone`; raw SQL must use
`now() AT TIME ZONE 'UTC'`, never bare `now()` (the DB runs in
Europe/Berlin — bare `now()` made rescheduled jobs run immediately).
Recordings and transcripts are **administrator-only**; `/media` routes
exclude interview recordings. Segment corrections go to `editedText` (the
machine `text` is never changed); read via `segmentText()`. Whisper on
Hausa is phonetic, not accurate (~89% WER measured on FLEURS) — always
pass the language hint; auto-detect misidentifies Hausa.
Run DB tests with no local API worker on the same database (or
`JOBS_WORKER=off`): a running worker can claim a test's queued job.
Browsers download recordings through `AWS_PUBLIC_ENDPOINT` (nginx proxies
`/merline-media/` read-only to MinIO); signing for the internal
`AWS_ENDPOINT` produces links only the server itself can open.

**14. Reports, deletion and the Trash.** `src/analysis` writes AI reports
(`analysis_reports`, not the legacy `reports` table): per interview, per
project (writes any missing/out-of-date interview reports first, then
synthesises) and custom briefs from plain-language instructions. All are
jobs (`analysis-report`). Content is a rendering-neutral `ReportDocument`
(`report-document.ts`) that the web view and the Word (`docx`), Excel
(`exceljs`) and PDF (headless Chromium via `playwright-core`,
`CHROMIUM_PATH`) exports share; fonts and marks live in
`apps/backend-nestjs/assets`. Quotations are checked with `locateExcerpt`
against the segment's corrected text; project-level quotes can only come
from the verified pool (`Q-I2-3` ids). Reports are admin-only (routes also
require `view.transcripts`). Frontend report components live in
`components/analysis` — `components/reports` is the legacy MERL surface and
lint forbids importing it. **Deletion** is soft everywhere and
administrator-only (`delete.*`); a deleted project takes its interviews,
participants and reports with it (same `deletedAt`, so restore is exact);
consent records are never deleted. Deleted users are refused at every
sign-in path and their sessions end (`tokenVersion` bump). Settings ›
Trash restores. New permissions reach existing organizations on startup
(`PermissionCatalogueSync`).

---

## Invariants — do not weaken these

These encode the product's core promise and the security work of Phase 1.

1. Tenant comes from the **JWT only** — never a query string, path param, or
   request body. `TenantGuard` rejects mismatched `:orgId`.
2. Every list and detail query filters by `organizationId`.
3. Seed the permission catalogue **before** enabling `PermissionGuard`. No code
   created `Permission` rows before Phase 1; enabling the guard against an empty
   table locks out everyone including admins.
4. JWT signing and verification options come from `src/auth/jwt.constants.ts`.
   They were once defined separately, disagreed, and no token ever verified.
5. Active modules must not query legacy tables. Enforced by
   `no-legacy-queries.spec.ts`.
6. **Phase 2:** a `Finding` must be impossible to approve or publish without a
   `Quotation` resolving to a real `TranscriptSegment`. Enforce with non-nullable
   foreign keys and a check on the approval transition — not UI validation.
7. **Phase 2:** no recording without a `Consent` record; no AI analysis when
   consent scope excludes it.

---

## Getting running

```bash
# Infrastructure (Postgres + Redis + MinIO + Mailpit + nginx)
cd docker && docker compose up -d

# Backend
cd apps/backend-nestjs
npm ci
npx prisma generate
npx prisma migrate deploy          # NOT db push — that is what lost the history
SEED_ADMIN_PASSWORD=<strong> npx ts-node prisma/seed.ts
npm run start:dev

# Frontend
cd apps/frontend && npm ci && npm run dev
```

Full test run (what CI does):
```bash
cd apps/backend-nestjs
RUN_DB_TESTS=1 \
DATABASE_URL=postgresql://merline:merline@localhost:5432/merline \
JWT_SECRET=test-secret \
AWS_ENDPOINT=http://localhost:9000 AWS_ACCESS_KEY_ID=minioadmin \
AWS_SECRET_ACCESS_KEY=minioadmin AWS_BUCKET=merline-test \
npx jest
```
Expect **345 passing, 26 suites** (as of 2026-09-23; the transcription
pipeline suite also needs `ffmpeg`). Anything less means
something regressed. Use a separate database (`merline_test`); never point
this at the production `merline` database.

Frontend: `npm run typecheck`, `npm run lint`, `npx vitest run`,
`npm run build`. End-to-end (needs a local API + frontend, see
`apps/frontend/playwright.config.ts`): `E2E_ADMIN_PASSWORD=… npx playwright test`.

Environment variables are documented by name in `DEPLOYMENT.md`. `.env` is
gitignored and does not travel with the repo — recreate it from
`DEPLOYMENT.md` on a new machine.

---

## Map

| Path | What |
|---|---|
| `apps/backend-nestjs/src` | NestJS API. Active modules only in `app.module.ts`. |
| `apps/backend-nestjs/api/index.ts` | Vercel serverless entry (unused if on VPS). |
| `apps/backend-nestjs/src/configure-app.ts` | Shared config — server and serverless both use it. |
| `apps/backend-nestjs/src/common/architecture/` | The guard-rail tests. Read these to understand the boundaries. |
| `apps/frontend/src` | Next.js 14 App Router. |
| `LEGACY.md` | What is frozen, why, and the open deletion decision. |
| `DEPLOYMENT.md` | Env vars, deploy order, verification, known gaps. |
| `docs/adr/` | Architecture decisions. |
| `docs/reports/` | Original inspection and transition plan. |

---

## Open decisions blocking progress

1. **Hausa transcription quality.** Decided languages: English and Hausa.
   Groq Whisper is good on English and poor on Hausa, so Hausa transcripts
   need human correction (built) or a Hausa-capable provider.
2. **Legacy data-preservation owner and deadline** — still `TBD` in `LEGACY.md`.
   Quarantine without a deadline becomes permanent.
3. **Data residency.** Interview audio is special-category data. If participants
   are in a jurisdiction with residency rules, that constrains hosting and
   whether third-party transcription APIs are usable at all.

---

## Known gaps

- **Audio upload cannot pass through a Vercel function** (4.5 MB body cap). A
  90-minute interview is 80–170 MB. Phase 2 uploads directly to object storage
  with a presigned URL — correct on any host, and why the API is moving to a VPS.
- **No mail transport**, so password reset and invitations cannot deliver.
- **No observability** — no error tracking, metrics, or tracing.
- **Legacy routes** (`/studies`, `/questionnaires`, `/reports`, …) are still
  addressable by URL and will error. Unlinked from navigation, not deleted.
- **Field uploads run in the foreground only** (no Background Sync on iOS).
- **Interviews started offline** sync when the app next has a connection and
  is open; a device clock more than 5 minutes ahead (or consent older than
  90 days) is refused so consent times stay trustworthy.
- **Pre-existing API drift** pinned in `api-contract.spec.ts` (`KNOWN_MISSING`):
  `/auth/sessions`, `/teams/*`, `/ai/assist/*`. Shrink that list; never grow it.
