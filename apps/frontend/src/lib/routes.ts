/**
 * PHASE 0 — QUALITATIVE RESET
 *
 * Canonical application routes.
 *
 * `APP_HOME` moved from `/dashboard` to `/projects`. The dashboard page reads
 * only MERL metrics (study, indicator, submission and assignment counts) from
 * `DashboardsModule`, which is deregistered in Phase 0, so it can no longer
 * load. Projects is the root of the qualitative hierarchy and is the correct
 * landing surface for the new product.
 *
 * The `/dashboard` route file is retained on disk, unlinked from navigation,
 * and returns to service in Phase 2 with interview metrics (throughput,
 * transcription backlog, approval queue depth).
 */
export const APP_HOME = '/projects';

export const ROUTES = {
  home: APP_HOME,
  login: '/login',
  projects: '/projects',
  profile: '/profile',
} as const;

/**
 * Self-interview links (/r/<token>): open to anyone holding the link,
 * signed in or not. Neither the middleware nor the auth provider may
 * redirect them — not to /login, and not a signed-in admin testing their
 * own link away to the app.
 */
export const RESPONDENT_PREFIX = '/r/';

export function isRespondentPath(pathname: string | null | undefined): boolean {
  return !!pathname && pathname.startsWith(RESPONDENT_PREFIX);
}
