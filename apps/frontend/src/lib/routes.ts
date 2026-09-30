/**
 * Canonical application routes.
 *
 * `APP_HOME` is the Dashboard: what needs attention now (transcripts waiting
 * for review, enumerators without codes, approved evidence). Phase 0 had moved
 * home to `/projects` because the old dashboard read only MERL metrics from a
 * deregistered module; the dashboard now reads qualitative review counts.
 */
export const APP_HOME = '/dashboard';

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
