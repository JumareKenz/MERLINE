# ADR-001: PostgreSQL image — pgvector instead of PostGIS

- **Status:** Accepted
- **Date:** 2026-09-19
- **Phase:** 1 (platform safety)
- **Supersedes:** the undocumented `postgis/postgis:16-3.4` choice

## Context

Phase 1 introduced the repository's first Prisma migration. Generating it
surfaced a dependency that had never been exercised, because the schema had
only ever been applied with `prisma db push`:

`DocumentChunk.embedding` is declared as `Unsupported("vector(1536)")`, so the
generated SQL contains `vector(1536)`. On a fresh database that fails with
`type "vector" does not exist` unless the pgvector extension is installed
first.

The Docker Compose stack and both CI workflows used `postgis/postgis:16-3.4`,
which ships PostGIS but not pgvector. As written, `prisma migrate deploy`
could not succeed anywhere.

An audit of the schema and source found **no use of PostGIS**:

- No `geometry`, `geography`, or SRID column in `schema.prisma`.
- `Study.location` and `Submission.location` are plain `Json`.
- No `$queryRaw` / `$executeRaw` anywhere in the backend, so no spatial SQL.
- No spatial index or PostGIS function reference.

The PostGIS image was aspirational — chosen for geospatial features that were
designed but never built.

## Decision

Use `pgvector/pgvector:pg16` in `docker/docker-compose.yml`,
`.github/workflows/backend-ci.yml` and `.github/workflows/frontend-ci.yml`.

Add `CREATE EXTENSION IF NOT EXISTS vector;` at the top of the baseline
migration, before any use of the `vector` type.

## Consequences

**Positive**

- `prisma migrate deploy` succeeds on an empty database. Verified: 48 tables
  created, `vector` extension present.
- The image matches what the schema actually requires.
- pgvector is a prerequisite for Phase 3 RAG over transcripts. The
  `vector(1536)` column exists but is never written today; real embeddings and
  an index land in Phase 3.

**Negative**

- PostGIS is no longer available. Nothing uses it, but a future geospatial
  feature would need a change here.
- The image is less common than the official `postgres` image, so base-image
  updates track a smaller project.

**If geospatial features return**

Do not revert. Use an image that provides both extensions, or build one from
`postgres:16` installing `postgis` and `pgvector`. Both are `CREATE EXTENSION`
away once present. Record that as a superseding ADR.

## Alternatives considered

| Option | Why not |
|---|---|
| Keep PostGIS, drop the `vector` column | The column is the foundation of Phase 3 RAG. Removing and re-adding it would need two migrations and a rewrite of `DocumentChunk`. |
| Keep PostGIS, make the extension conditional | Prisma applies migrations as plain SQL with no conditional branch for a missing extension. The migration would still fail. |
| Custom image with both extensions | More correct in principle, but adds a build and registry step for a capability nothing uses. Revisit only if geospatial work is scheduled. |
| `postgres:16` plus manual extension install | `CREATE EXTENSION vector` fails unless the binary is present in the image. |

## Verification

```
docker run pgvector/pgvector:pg16
npx prisma migrate deploy          # 48 tables, exit 0
select extname from pg_extension   # -> vector
```

Kept honest by `migration-drift.spec.ts`, which asserts the extension is
created before the `vector` type is used, and by the CI drift check that
compares migrations against `schema.prisma`.
