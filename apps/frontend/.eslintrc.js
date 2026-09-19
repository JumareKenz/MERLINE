/**
 * PHASE 0 — QUALITATIVE RESET
 *
 * The repository had no frontend ESLint config, so `next lint` had nothing to
 * enforce. This adds the Next.js baseline plus the legacy import boundary.
 *
 * The boundary is ONE-WAY. Active qualitative code must not import the legacy
 * MERL surface; legacy code may still import itself so that it keeps compiling
 * until it is deleted. That is what the `overrides` block below expresses.
 *
 * The backend equivalent is enforced by a test
 * (`common/architecture/legacy-boundary.spec.ts`). The frontend gets a
 * test-level check when Vitest is configured in Phase 1; until then this lint
 * rule is the gate, and `next lint` runs in CI.
 *
 * Keep the pattern list in step with LEGACY.md.
 */

/** Legacy component directories and hooks, addressed via the `@/` alias. */
const LEGACY_IMPORT_PATTERNS = [
  '@/components/studies/*',
  '@/components/study-workspace/*',
  '@/components/questionnaires/*',
  '@/components/forms/*',
  '@/components/indicators/*',
  '@/components/logframe/*',
  '@/components/submissions/*',
  '@/components/assignments/*',
  '@/components/data-collection/*',
  '@/components/reports/*',
  '@/hooks/use-studies',
  '@/hooks/use-study-design',
  '@/hooks/use-questionnaires',
  '@/hooks/use-indicators',
  '@/hooks/use-logframe',
  '@/hooks/use-submissions',
  '@/hooks/use-assignments',
  '@/hooks/use-sync',
  '@/hooks/use-reports',
  '@/hooks/use-dashboard',
  '@/stores/form-builder-store',
];

/** Files that make up the legacy surface itself, exempt from the rule above. */
const LEGACY_FILES = [
  'src/app/(dashboard)/studies/**',
  'src/app/(dashboard)/questionnaires/**',
  'src/app/(dashboard)/indicators/**',
  'src/app/(dashboard)/submissions/**',
  'src/app/(dashboard)/assignments/**',
  'src/app/(dashboard)/reports/**',
  'src/app/(dashboard)/data-collection/**',
  'src/app/(dashboard)/dashboard/**',
  // NOTE: written as a wildcard, not `projects/[projectId]/logframe/**`.
  // ESLint globs treat `[projectId]` as a character class, so the literal
  // Next.js dynamic-segment directory never matches.
  'src/app/**/logframe/**',
  'src/components/studies/**',
  'src/components/study-workspace/**',
  'src/components/questionnaires/**',
  'src/components/forms/**',
  'src/components/indicators/**',
  'src/components/logframe/**',
  'src/components/submissions/**',
  'src/components/assignments/**',
  'src/components/data-collection/**',
  'src/components/reports/**',
  'src/components/dashboard/**',
  'src/hooks/use-studies.ts',
  'src/hooks/use-study-design.ts',
  'src/hooks/use-questionnaires.ts',
  'src/hooks/use-indicators.ts',
  'src/hooks/use-logframe.ts',
  'src/hooks/use-submissions.ts',
  'src/hooks/use-assignments.ts',
  'src/hooks/use-sync.ts',
  'src/hooks/use-reports.ts',
  'src/hooks/use-dashboard.ts',
  'src/stores/form-builder-store.ts',
];

module.exports = {
  extends: ['next/core-web-vitals'],
  // Registered explicitly so that pre-existing inline
  // `eslint-disable-next-line @typescript-eslint/...` comments resolve.
  // Without this, ESLint reports "Definition for rule ... was not found".
  plugins: ['@typescript-eslint'],
  rules: {
    // Matches the backend config. Tightening this is Phase 1 work, tracked
    // alongside the `@CurrentUser() user: any` cleanup.
    '@typescript-eslint/no-explicit-any': 'off',
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: LEGACY_IMPORT_PATTERNS,
            message:
              'Legacy MERL surface (Phase 0). Its backend module is deregistered; active qualitative code must not import it. See LEGACY.md.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: LEGACY_FILES,
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
};
