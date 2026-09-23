# Deployment — Vercel

Target: **Vercel**, two projects, already linked.

| Project | Directory | Vercel project |
|---|---|---|
| API | `apps/backend-nestjs` | `backend-nestjs` |
| Web | `apps/frontend` | `merline-frontend` |

External services required: **PostgreSQL with pgvector** and **S3-compatible
object storage**. Neither can be Vercel's own filesystem — functions have no
durable disk.

---

## What was missing before this could deploy at all

Recorded because each was a silent blocker, not a preference:

1. **No serverless entry point.** `main.ts` calls `app.listen()`, which
   produces nothing routable on Vercel. `api/` existed but was empty. Added
   `api/index.ts`, which wraps the same Nest app in Express and caches it
   across warm invocations.
2. **No `vercel.json`.** Nothing told Vercel how to build or route.
3. **`npm start` pointed at a file that was never emitted.**
   `tsconfig.build.json` did not exclude `prisma/`, so the seed scripts were
   compiled, the TypeScript root became the package root, and output landed at
   `dist/src/main.js` while `start` expected `dist/main.js`.
4. **No health endpoint**, though Compose, both CI workflows and the deploy
   smoke tests all probed one.
5. **`deploy.yml` deployed to EKS via Helm charts that do not exist**, and CI
   triggered on `main` while the default branch is `master`, so it had never
   run.

---

## Required environment variables

Names only. Set these in the Vercel dashboard or with `vercel env add`.

### API project (`backend-nestjs`)

**Required — the app refuses to start in production without these:**

| Variable | Notes |
|---|---|
| `DATABASE_URL` | **Pooled** connection string. Serverless opens a connection per container; a direct connection exhausts Postgres quickly. Use Neon's pooled endpoint or PgBouncer. |
| `JWT_SECRET` | Long random value. Rotating it invalidates every session. |
| `NODE_ENV` | `production` |

**Required for the app to be usable:**

| Variable | Notes |
|---|---|
| `APP_URL` | Public API URL. Used as the CORS origin fallback. |
| `CORS_ORIGINS` | Comma-separated. Must include **both** frontend domains - `https://merline.jrecc.org,https://field.jrecc.org` - or every browser call from the missing one fails (the field app then reports it cannot connect). |
| `JWT_EXPIRES_IN` | e.g. `7d`. Omitted is fine — defaults to `7d`. |
| `AWS_REGION` | |
| `AWS_ACCESS_KEY_ID` | |
| `AWS_SECRET_ACCESS_KEY` | |
| `AWS_BUCKET` | |
| `AWS_ENDPOINT` | **Only** for S3-compatible services (R2, MinIO). Leave unset for real AWS S3. |

**Optional:**

| Variable | Notes |
|---|---|
| `STORAGE_SSE` | `AES256` or `off`. Defaults: on for real S3, off when `AWS_ENDPOINT` is set, because MinIO rejects SSE without KMS. Set to `AES256` explicitly if your S3-compatible provider supports it. |
| `MAX_UPLOAD_BYTES` | See the body-size constraint below. |
| `SIGNED_URL_TTL_SECONDS` | Default 900. |
| `OPENAI_API_KEY` | Without at least one AI key, `/ai/chat` returns 503 by design — it no longer fabricates a reply. |
| `OPENROUTER_API_KEY` | Alternative to the above. |
| `GROQ_API_KEY` | Transcription (Whisper) and transcript translation. Without it, transcription jobs fail visibly with "GROQ_API_KEY is not set" and can be retried once it is set. Server-side only. |
| `GROQ_STT_MODEL` | Default `whisper-large-v3`. `whisper-large-v3-turbo` is faster but measured markedly worse on Hausa. |
| `GROQ_TRANSLATION_MODEL` | Default `openai/gpt-oss-120b` (falls back to `GROQ_MODEL`). |
| `JOBS_WORKER` | `on` (default) or `off`. The job worker runs inside the API process; turn it off on extra instances that should only serve requests. |
| `JOBS_POLL_MS`, `JOBS_CONCURRENCY` | Defaults 3000 and 2. |
| `TRANSCRIPTION_CHUNK_SECONDS`, `TRANSCRIPTION_MAX_DIRECT_BYTES` | Defaults 600 and 20 MB: larger recordings are split at pauses with ffmpeg. |

**System package:** `ffmpeg` (with `ffprobe`) on the API host. Needed to
split recordings over 20 MB and to detect silent recordings; smaller files
still transcribe without it.

`ANTHROPIC_API_KEY` and `GOOGLE_AI_API_KEY` are **no longer read**. Those
providers were removed in Phase 1: both were wired to an OpenAI-shaped
endpoint they do not accept. OpenRouter reaches the same models.

### Web project (`merline-frontend`)

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Full API base including `/api/v1`. |

Do **not** set `NEXT_PUBLIC_USE_MOCK`. It is ignored outside development —
`NODE_ENV` is inlined at build time, so a production build drops the mock
adapter entirely.

### GitHub Actions secrets (for `deploy.yml`)

`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_API`,
`VERCEL_PROJECT_ID_WEB`, `DATABASE_URL_DIRECT`.

`DATABASE_URL_DIRECT` is the **unpooled** connection string. Prisma migrations
must not run through a transaction pooler.

---

## Constraint: request body size

**Vercel Functions cap request bodies at 4.5 MB.**

This does not block Phase 1 — no audio is recorded yet. It does block the
Phase 2 interview flow: a 90-minute recording is 80–170 MB and cannot pass
through the function at all.

The fix is not a bigger limit; it is not to route audio through the function.
Phase 2 issues a presigned `PUT` and the browser uploads straight to object
storage. That is the correct architecture on any host, and the
`StorageService` already has the pieces.

Until then, set `MAX_UPLOAD_BYTES` to something below 4.5 MB (e.g. `4000000`)
so oversized uploads fail with a clear application error rather than an opaque
platform rejection.

---

## Deployment order

Order matters — the app will not start correctly otherwise.

1. **Provision Postgres with pgvector.** Neon supports it. See
   `docs/adr/ADR-001-postgres-image-pgvector.md` for why pgvector rather than
   PostGIS.
2. **Provision object storage** (S3, R2, or another S3-compatible service) and
   create the bucket.
3. **Set API environment variables**, then **Web**.
4. **Apply migrations** from a machine that can reach the database directly:
   ```
   cd apps/backend-nestjs
   DATABASE_URL="<unpooled>" npx prisma migrate deploy
   ```
   Not part of the build: builds run on every deployment including rollbacks,
   may run concurrently, and may have no database access.
5. **Seed the first organization.** The permission catalogue must exist before
   `PermissionGuard` can allow anything:
   ```
   DATABASE_URL="<unpooled>" SEED_ADMIN_PASSWORD="<strong>" npx ts-node prisma/seed.ts
   ```
   **Always set `SEED_ADMIN_PASSWORD`.** It defaults to a well-known
   development value.
6. **Deploy API**, then **Web**.
7. **Verify** (below).

---

## Post-deploy verification

```bash
API=https://<api-domain>

curl -fsS $API/api/v1/health     # {"data":{"status":"ok"}}
curl -fsS $API/api/v1/ready      # {"data":{"status":"ready","database":"up"}}
curl -sS  $API/api/v1/projects   # 401 — unauthenticated is rejected

curl -sS -X POST $API/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"<admin>","password":"<password>"}'
# 200 with data.token.accessToken

curl -sS $API/api/v1/projects -H "Authorization: Bearer <token>"
# 200 with the seeded project
```

Then in the browser: load the frontend, sign in, confirm `/projects` lists the
seeded project, and confirm the Network tab shows calls going to the API
domain rather than being served from mock data.

All of the above was verified locally against Postgres 16 + pgvector through
the serverless handler before this document was written.

---

## Known gaps at first deploy

| Gap | Impact |
|---|---|
| Audio upload through the function | Blocked by the 4.5 MB cap. Phase 2 presigned uploads. |
| No background jobs | Transcription needs a queue. Vercel Functions are not long-running; Phase 2 needs a worker host or a queue service. |
| No observability | No error tracking or tracing. Vercel logs only. |
| Mail transport | Not configured, so password reset and invitations cannot deliver. |
| Legacy routes | `/studies`, `/questionnaires` etc. are still addressable and will error — unlinked from navigation but not deleted. See LEGACY.md. |
| Redis | Provisioned in Compose, unused in code. Not needed on Vercel yet. |
