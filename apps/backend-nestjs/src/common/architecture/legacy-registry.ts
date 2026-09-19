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
  'auth',
  'media',
  'notifications',
  'organizations',
  'projects',
  'users',
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
 * Known Prisma-level coupling from active modules into legacy tables.
 *
 * Deregistering a module does not stop other code from querying its tables,
 * because `schema.prisma` is deliberately untouched in Phase 0. These are
 * tracked as debt rather than fixed here, so that Phase 0 stays a pure
 * isolation change. Each is scheduled in LEGACY.md.
 */
export const KNOWN_PRISMA_COUPLING: ReadonlyArray<{
  module: string;
  legacyTables: readonly string[];
  resolvedIn: string;
}> = [
  {
    module: 'projects',
    legacyTables: ['study', 'questionnaire', 'submission'],
    resolvedIn: 'Phase 1',
  },
  { module: 'media', legacyTables: ['submission'], resolvedIn: 'Phase 2' },
  {
    module: 'ai',
    legacyTables: ['study', 'indicator', 'submission'],
    resolvedIn: 'Phase 2',
  },
];

export type LegacyModuleDirectory = (typeof LEGACY_MODULE_DIRECTORIES)[number];
export type ActiveModuleDirectory = (typeof ACTIVE_MODULE_DIRECTORIES)[number];
