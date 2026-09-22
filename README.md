# Merline

A qualitative interview platform for field research.

Merline helps research teams create interview guides, assign interviews,
capture consent, record in the field, work offline, upload audio safely,
transcribe, review transcripts, generate evidence-linked insights, approve
findings, and produce structured reports.

Its guiding rule: **a finding must be impossible to approve or publish without
supporting transcript evidence.** Every insight traces back to a quotation, a
transcript segment, a recording, an interview, and a project.

---

## Status

Merline began as a general MERL platform (monitoring, evaluation, research,
learning). It is being converted into a focused qualitative interview product.
The MERL domain is frozen — deregistered from the application, kept on disk,
and enforced by tests. See [`LEGACY.md`](LEGACY.md).

| Phase | What | Status |
|---|---|---|
| 0 | Qualitative reset — isolate MERL | **Done** |
| 1 | Platform safety — auth, tenancy, permissions, migrations, storage, audit | **Done** |
| — | Deployment: frontend → Vercel, API → VPS | In progress |
| 2 | Interview MVP — guides, consent, recording, transcription, findings | Not started |
| 3 | Research intelligence — themes, cross-interview analysis, RAG | Planned |
| 4 | Scale and compliance — retention, withdrawal, PII redaction, SSO | Planned |

**Not production ready.** No interview features exist yet. Phase 1 fixed the
defects that made the platform unsafe to collect real data on; Phase 2 builds
the product itself.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind, Radix, TanStack Query |
| Backend | NestJS 11, TypeScript, Prisma 6 |
| Database | PostgreSQL 16 **with pgvector** ([why](docs/adr/ADR-001-postgres-image-pgvector.md)) |
| Object storage | S3-compatible (MinIO locally, S3/R2 deployed) |
| Auth | JWT (HS256) with per-user token revocation |
| Local infra | Docker Compose — Postgres, Redis, MinIO, Mailpit, nginx |

There is no mobile app. Field recording will be a PWA, built in Phase 2.

---

## Quick start

```bash
# 1. Infrastructure
cd docker && docker compose up -d

# 2. Backend
cd apps/backend-nestjs
npm install
npx prisma generate
npx prisma migrate deploy
SEED_ADMIN_PASSWORD=<choose-a-strong-one> npx ts-node prisma/seed.ts
npm run start:dev                      # http://localhost:4000/api/v1

# 3. Frontend
cd apps/frontend
npm install
npm run dev                            # http://localhost:3000
```

Create `apps/backend-nestjs/.env` from the variables documented in
[`DEPLOYMENT.md`](DEPLOYMENT.md). It is gitignored and does not travel with the
repository.

Health check: `curl http://localhost:4000/api/v1/health`

---

## Architecture

```
Organization
└── Project
    ├── Interview Guide → Guide Version → Guide Question   (Phase 2)
    ├── Participant → Consent                              (Phase 2)
    └── Interview Assignment
        └── Interview
            └── Recording
                └── Transcript → Segment → Speaker         (Phase 2)
                    └── Quotation → Finding → Report       (Phase 2)
```

Today the platform provides organizations, users, roles and permissions,
projects, media storage and an audit trail. Everything below `Interview` is
Phase 2.

### Security model

- The tenant comes from the **JWT only** — never a query string, path
  parameter, or request body.
- Every list and detail query is scoped by organization.
- Permissions are seeded per organization and enforced server-side.
- Media reads are tenant-checked before any signed URL is issued.

---

## Repository layout

| Path | What |
|---|---|
| `apps/backend-nestjs` | NestJS API |
| `apps/frontend` | Next.js web application |
| `docker/` | Local development stack |
| `docs/adr/` | Architecture decision records |
| `docs/reports/` | Original inspection and transition plan |
| [`CLAUDE.md`](CLAUDE.md) | Working context, invariants, and pitfalls — **read first** |
| [`LEGACY.md`](LEGACY.md) | What is frozen, why, and the open deletion decision |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Environment variables, deploy order, verification |

The many planning directories at the repository root (`product/`,
`architecture/`, `mobile/`, `Staff/`, and others) predate the current product
direction and describe a system that was largely never built. Treat them as
historical intent, not documentation.

---

## Deployment

Frontend on Vercel, API on a VPS. Object storage and PostgreSQL are external —
neither can live on a serverless filesystem, and interview audio is
irreplaceable.

Full instructions, required environment variables and post-deploy verification
are in [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## Open decisions

These block or shape Phase 2 and cannot be inferred from the code:

1. **Which languages must be transcribed.** Determines the provider, and may
   require a human correction tier in the MVP.
2. **Data residency.** Interview audio is special-category personal data.
   Residency rules would constrain hosting and third-party transcription.
3. **Consent model** — written, verbal-recorded, or both; and what withdrawal
   must delete.
4. **Retention** — whether audio is kept after transcription. Deleting it cuts
   cost and risk but removes the ability to verify a quotation against the
   recording.
