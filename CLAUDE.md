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
| Deployment | In progress. Frontend → Vercel, API → Contabo VPS (4 vCPU / 8 GB / 100 GB). |
| Phase 2 — interview MVP | **Not started.** Do not start until deployment is verified. |

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
Expect **88 passing, 10 suites**. Anything less means something regressed.

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

1. **Which languages must be transcribed.** Gates the transcription provider and
   may force a human-correction tier into the MVP. Blocks the Phase 2
   transcription slice; nothing else.
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
- **No background jobs yet.** Redis is in `docker-compose.yml` and unused.
  Transcription needs a queue and a worker.
- **No mail transport**, so password reset and invitations cannot deliver.
- **No observability** — no error tracking, metrics, or tracing.
- **Legacy routes** (`/studies`, `/questionnaires`, …) are still addressable by
  URL and will error. Unlinked from navigation, not deleted.
- **Pre-existing API drift** pinned in `api-contract.spec.ts` (`KNOWN_MISSING`):
  `/auth/sessions`, `/teams/*`, `/ai/assist/*`. Shrink that list; never grow it.
