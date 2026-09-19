/**
 * PHASE 1 — PLATFORM SAFETY
 *
 * Guards the migration history that Phase 1 established.
 *
 * Before Phase 1 there was no `prisma/migrations` directory at all: the schema
 * had only ever been applied with `db push`, while `deploy.yml` ran
 * `prisma migrate deploy`, which therefore applied nothing. There was no
 * reproducible schema and no rollback path.
 *
 * These checks are structural and need no database. Detecting *semantic* drift
 * between schema.prisma and the migrations requires a shadow database and runs
 * in CI via `prisma migrate diff --exit-code` (see backend-ci.yml).
 */
import * as fs from 'fs';
import * as path from 'path';

const PRISMA_DIR = path.resolve(__dirname, '..', '..', '..', 'prisma');
const MIGRATIONS_DIR = path.join(PRISMA_DIR, 'migrations');

function migrationDirectories(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

describe('migration history', () => {
  it('has a migrations directory', () => {
    expect(fs.existsSync(MIGRATIONS_DIR)).toBe(true);
  });

  it('has a migration_lock.toml declaring the provider', () => {
    const lock = path.join(MIGRATIONS_DIR, 'migration_lock.toml');
    expect(fs.existsSync(lock)).toBe(true);
    expect(fs.readFileSync(lock, 'utf8')).toContain('postgresql');
  });

  it('has at least one migration', () => {
    expect(migrationDirectories().length).toBeGreaterThan(0);
  });

  it('gives every migration a migration.sql', () => {
    const missing = migrationDirectories().filter(
      (dir) => !fs.existsSync(path.join(MIGRATIONS_DIR, dir, 'migration.sql')),
    );
    expect(missing).toEqual([]);
  });

  it('creates the pgvector extension before using the vector type', () => {
    // `document_chunks.embedding` is `vector(1536)`. Without the extension the
    // migration fails on a fresh database with `type "vector" does not exist`.
    const sql = migrationDirectories()
      .map((dir) => fs.readFileSync(path.join(MIGRATIONS_DIR, dir, 'migration.sql'), 'utf8'))
      .join('\n')
      // Strip `--` comments: the header explains the vector type in prose,
      // which would otherwise match before the statement that enables it.
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('--'))
      .join('\n');

    const extensionAt = sql.indexOf('CREATE EXTENSION IF NOT EXISTS vector');
    const vectorTypeAt = sql.indexOf('vector(1536)');

    expect(extensionAt).toBeGreaterThanOrEqual(0);
    expect(vectorTypeAt).toBeGreaterThanOrEqual(0);
    expect(extensionAt).toBeLessThan(vectorTypeAt);
  });

  it('does not leave `db push` as a documented workflow step', () => {
    // `db push` is what produced a schema with no history. Keeping it in the
    // scripts invites the same situation again.
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(PRISMA_DIR, '..', 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> };

    expect(Object.keys(pkg.scripts ?? {})).not.toContain('prisma:push');
  });
});
