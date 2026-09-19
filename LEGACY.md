# Legacy (MERL) Inventory

**Status:** Frozen — deregistered, not deleted
**Created:** Phase 0, qualitative reset
**Deletion decision due:** _TBD — see "Open decision" below_

Merline is being converted from a general MERL platform into a qualitative
interview platform. This file is the inventory of the MERL functionality that
has been taken out of service but deliberately left on disk.

---

## What "frozen" means

| | |
|---|---|
| **Removed from navigation** | Yes — no legacy entry appears in the sidebar |
| **Removed from application registration** | Yes — no legacy module is in `app.module.ts` |
| **Moved on disk** | **No** — every file is where it was |
| **Deleted** | **No** |
| **Database schema changed** | **No** — `schema.prisma` is untouched; no table dropped. Phase 1 added a baseline migration covering the schema as-is, legacy tables included. |
| **Compiles** | Yes — legacy code still typechecks and builds |
| **Reachable at runtime** | No — providers are not in the application graph; routes are not registered |

Deregistration rather than relocation was deliberate. Moving directories in the
same change that removes them from the application graph makes a failure hard to
attribute, and this repository has path-based dependencies that a move would
break silently: `prisma/seed.ts`, the `docker-compose.yml` bind mounts of `src`
and `prisma`, and the legacy API declarations in `api-client.ts`.

**Rules while frozen**

1. No new features in legacy code.
2. Bug fixes only if they block the qualitative path.
3. Do not re-register a legacy module — the boundary test fails the build.
4. Do not import legacy code from qualitative code — the boundary is one-way.

---

## The boundary

One-way. Legacy code may still import shared foundations (`common/`, `config/`,
`database/`); qualitative code must never import legacy code.

**Enforced by:**

| Mechanism | Scope | Location |
|---|---|---|
| Import-graph test (transitive) | Backend | `apps/backend-nestjs/src/common/architecture/legacy-boundary.spec.ts` |
| `app.module.ts` registration check | Backend | same file |
| `no-restricted-imports` | Backend | `apps/backend-nestjs/eslint.config.mjs` |
| `no-restricted-imports` | Frontend | `apps/frontend/.eslintrc.js` |
| Active-endpoint contract check | Both | `apps/backend-nestjs/src/common/architecture/api-contract.spec.ts` |

Machine-readable source of truth: `src/common/architecture/legacy-registry.ts`.
**Keep this file and that file in step.**

Both guards were verified by introducing a deliberate violation and confirming
the build fails — a guard rail that has never been seen to fail is not a guard
rail.

---

## Frozen backend modules

All under `apps/backend-nestjs/src/`. Each module file carries a
`LEGACY — FROZEN` header banner.

| Module | Reason | Replacement |
|---|---|---|
| `studies/` | MERL study lifecycle; 22-value study-type enum and data-collection phases do not fit interviews | `Project` becomes the qualitative container; its state-machine pattern is copied, not inherited |
| `logframes/` | Logical framework — out of scope | None |
| `indicators/` | Quantitative indicators, values, targets — out of scope | None |
| `questionnaires/` | Structured survey instruments with typed answers | `InterviewGuide` + `GuideVersion` (Phase 2). **Extract first:** versioning, publish/archive, clone, translations, JSON import/export are directly reusable patterns |
| `submissions/` | Form-answer JSON blobs; no place for timecoded text | `Interview` + `Transcript` (Phase 2). The approve/reject/flag review UX is a good template |
| `assignments/` | Points at a study and an enumerator; no participant, site, schedule, language or guide version | `InterviewAssignment` (Phase 2), modelled on this service |
| `sync/` | JSON delta sync cannot carry audio; `push` 500s after committing writes; no client ever called it | Resumable upload outbox (Phase 2) |
| `reports/` | Generator interpolates study counts into a fixed three-section template and ignores `config`; export validates `pdf\|csv\|excel` then returns JSON | Qualitative report engine over approved findings (Phase 2). Table shapes retained |
| `dashboards/` | Every implemented query is a MERL count (study, indicator, submission, assignment) | Interview metrics — throughput, transcription backlog, approval queue depth (Phase 2). Widget framework is reusable |

## Frozen frontend surface

Route files remain on disk and are still addressable by URL, but their backend
modules are deregistered, so they no longer load data.

**Routes:** `/dashboard`, `/studies/**`, `/questionnaires/**`, `/indicators/**`,
`/submissions/**`, `/assignments/**`, `/reports/**`, `/data-collection/**`,
`/projects/[projectId]/logframe`

**Components:** `studies/`, `study-workspace/`, `questionnaires/`, `forms/`,
`indicators/`, `logframe/`, `submissions/`, `assignments/`,
`data-collection/`, `reports/`, `dashboard/`

**Hooks:** `use-studies`, `use-study-design`, `use-questionnaires`,
`use-indicators`, `use-logframe`, `use-submissions`, `use-assignments`,
`use-sync`, `use-reports`, `use-dashboard`

**Stores:** `form-builder-store`

### Landing route moved

`APP_HOME` changed from `/dashboard` to `/projects` (`src/lib/routes.ts`).
The dashboard reads only MERL metrics from the deregistered `DashboardsModule`,
so it can no longer load. Projects is the root of the qualitative hierarchy.

---

## Retained deliberately (do not delete yet)

### Legacy API declarations in `api-client.ts`

The full legacy API surface is still declared and marked `LEGACY (Phase 0)` in
place. Deleting it now would combine product isolation with API redesign in one
change, and the data-preservation decision may require these calls for export
tooling. They return 404 today. Deleted progressively in Phase 2+.

### `prisma/seed-legacy.ts`

MERL demo fixtures (study, questionnaire) split out of the core seed so that
`npm run prisma:seed` no longer depends on legacy tables. Run with
`npm run prisma:seed:legacy` if the old fixtures are needed. Requires the core
seed to have run first.

### The entire database schema

No model removed, no table dropped, no relation altered. Legacy rows are
readable via Prisma but are served by no registered endpoint.

---

## Known debt — Phase 1 status

### Cleared in Phase 1

Phase 0 recorded three places where an active module still queried legacy
tables. Deregistration does not prevent this, because the schema is untouched
and the whole Prisma client is still generated. All three are now removed and
kept removed by `no-legacy-queries.spec.ts`:

| Where | Was reading | Resolution |
|---|---|---|
| `projects.getStats` | `study`, `questionnaire`, `submission` | Now reports team, activity and tag counts. Interview metrics arrive in Phase 2. |
| `media` | `submission` | `GET /submissions/:id/media` removed from MediaController; recordings replace it in Phase 2. |
| `ai` — 4 specialist agents | `study`, `indicator`, `report`, `submission` | Context lookups and the PrismaService dependency removed. |

### AI specialist agents: deregistered

**Resolved during Phase 1 verification.** The nine agents returned hard-coded
template text and could not call a model — `SpecialistAgent` has no gateway
dependency. They are now:

- removed from `AiController` (the nine `POST /ai/agents/*` routes),
- removed from `AiModule` providers, along with `AgentOrchestratorService`,
- removed from the frontend (`AiAgentSelector` no longer rendered),
- marked `LEGACY` in `api-client.ts` and excluded from the contract check.

Source files remain on disk and unregistered, consistent with the Phase 0
deregistration discipline.

Two related fixes came out of the same work:

- `AiService.chat` previously wrapped the user's message around
  `orchestrator.dispatchToAgent(...)`, injecting static MERL advice into every
  prompt. It now sends the real question with RAG context and a qualitative
  system prompt.
- `AiService.chat` also had **a second fabrication fallback**:
  `catch { finalResponse = agentResponse; }` returned the static agent template
  when the gateway failed — the same defect as the gateway's simulated
  response, one layer up. Removed; errors propagate.

A real qualitative analysis service, required to return evidence-linked
findings, replaces this surface in Phase 2. It is flagged here because it was the same class of problem as the
gateway fallback: output that reads as analysis but is not.

**Pre-existing API drift** remains pinned in the `KNOWN_MISSING` ratchet in
`api-contract.spec.ts`: `/auth/sessions`, `/teams/*`, `/ai/assist/*`,
`GET /ai/prompts/:id`, `DELETE /ai/rag/documents/:id`,
`POST /workspaces/:id/set-default`.

### Sync: retired

The sync module stays deregistered and is now formally retired rather than
scheduled for repair. Its `push` handler updated `SyncBatch` by the wrong key
and returned 500 after committing its writes, its conflict handling was
last-write-wins on a client-supplied timestamp, and no client ever called it.
Its JSON payload format cannot carry audio in any case. The offline story for
recordings is a resumable upload outbox, which is different machinery and is
Phase 2 work.

## Open decision

**Must existing MERL data be preserved?**

No evidence of production data was found: there is no `prisma/migrations`
directory, the schema has only ever been applied with `db push`, and the only
seeded content is demo data. If that holds, legacy tables can be dropped
outright.

Until this is confirmed and dated, nothing is deleted.

| | |
|---|---|
| **Decision owner** | _TBD_ |
| **Due date** | _TBD_ |
| **Outcome** | _TBD_ |

Once confirmed, deletion proceeds progressively in Phase 2+: one module per
commit, boundary test green before and after, schema changes last.

> Set the due date. Quarantine without a deadline becomes permanent, which is
> the known failure mode of this strategy.
