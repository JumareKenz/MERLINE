/**
 * PHASE 0 — QUALITATIVE RESET
 *
 * Single source of truth for the legacy (MERL) / active (qualitative) boundary.
 *
 * Consumed by:
 *   - legacy-boundary.spec.ts  — enforces the one-way import rule in CI
 *   - api-contract.spec.ts     — checks the active API surface
 *   - LEGACY.md                — human-readable inventory (keep in sync)
 *
 * Legacy modules are NOT deleted and NOT moved. They are removed from
 * `app.module.ts` so their providers can no longer be injected, and their code
 * is frozen in place until the data-preservation decision is confirmed.
 *
 * The boundary is ONE-WAY:
 *   legacy -> common/database/auth   is allowed (shared foundations)
 *   active -> legacy                 is forbidden
 */

/** Directories under `src/` whose modules are deregistered from the application. */
export const LEGACY_MODULE_DIRECTORIES = [
  'assignments',
  'dashboards',
  'indicators',
  'logframes',
  'questionnaires',
  'reports',
  'studies',
  'submissions',
  'sync',
] as const;

/** Directories under `src/` that are on the qualitative product path. */
export const ACTIVE_MODULE_DIRECTORIES = [
  'ai',
  'audit-log',
  'health',
  'auth',
  'media',
  'notifications',
  'organizations',
  'projects',
  'storage',
  'users',
  // PHASE 2 — qualitative interview product
  'participants',
  'consents',
  'interviews',
  'transcripts',
  'findings',
  'field',
  'jobs',
  'trash',
  'analysis',
  'guides',
] as const;

/** Shared foundations. Importable by both sides; owned by neither. */
export const SHARED_DIRECTORIES = ['common', 'config', 'database'] as const;

/** Nest module class names that must not appear in `app.module.ts`. */
export const LEGACY_MODULE_CLASS_NAMES = [
  'AssignmentsModule',
  'DashboardsModule',
  'IndicatorsModule',
  'LogframesModule',
  'QuestionnairesModule',
  'ReportsModule',
  'StudiesModule',
  'SubmissionsModule',
  'SyncModule',
] as const;

/**
 * Prisma-level coupling from active modules into legacy tables.
 *
 * Deregistering a module removes its providers and routes but does not stop
 * other code reaching its tables, because `schema.prisma` is deliberately
 * untouched. Phase 0 tracked three such cases as debt; Phase 1 cleared all of
 * them:
 *
 *   - `projects.getStats` counted studies, questionnaires and submissions
 *   - `media` served `/submissions/:id/media`
 *   - four AI agents read study, indicator, report and submission counts
 *
 * Enforced by `no-legacy-queries.spec.ts`. Keep this list empty.
 */
export const KNOWN_PRISMA_COUPLING: ReadonlyArray<{
  module: string;
  legacyTables: readonly string[];
  resolvedIn: string;
}> = [];

export type LegacyModuleDirectory = (typeof LEGACY_MODULE_DIRECTORIES)[number];
export type ActiveModuleDirectory = (typeof ACTIVE_MODULE_DIRECTORIES)[number];
