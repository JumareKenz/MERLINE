import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '../../audit-log/audit-log.service';

/**
 * PHASE 1 — PLATFORM SAFETY
 *
 * Audit trail for state-changing requests.
 *
 * This interceptor was registered globally but never produced a single row.
 * `getRouteKey()` took the FIRST path segment and looked it up in a small map,
 * but `main.ts` sets a global prefix of `api/v1`, so the first segment was
 * always `api` — which is not in the map — and the interceptor short-circuited
 * on every request.
 *
 * Fixed here, along with the other defects that made the trail unusable even
 * if it had fired:
 *
 *   - The global prefix is stripped before matching, and matching walks the
 *     path rather than assuming a position.
 *   - `auditableId` falls back to the id of the created resource, instead of
 *     recording the literal string 'unknown' for every create.
 *   - `checksum` is populated. It was written as `null`, leaving the
 *     tamper-evidence column decorative.
 *   - Failures are logged instead of being swallowed by `.catch(() => {})`.
 *     An audit trail that silently stops recording is worse than none, because
 *     its emptiness reads as "nothing happened".
 *   - Coverage extended to the resources the qualitative product actually
 *     needs to account for. Legacy entities are no longer listed.
 */

const AUDITABLE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Path segment -> audited entity name.
 *
 * Phase 2 adds: interviews, guides, participants, consents, recordings,
 * transcripts, findings, approvals.
 */
const ENTITY_ROUTES: Record<string, string> = {
  projects: 'Project',
  users: 'User',
  roles: 'Role',
  permissions: 'Permission',
  organizations: 'Organization',
  workspaces: 'Workspace',
  media: 'Media',
  auth: 'Auth',
  ai: 'AiSession',
  notifications: 'Notification',
};

/** Never record these, even in `newValues`. */
const REDACTED_KEYS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
]);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method: string = request.method;

    if (!AUDITABLE_METHODS.includes(method)) {
      return next.handle();
    }

    const routeKey = this.getRouteKey(request.route?.path ?? request.url ?? '');
    if (!routeKey) {
      return next.handle();
    }

    const auditableType = ENTITY_ROUTES[routeKey];
    const user = request.user;

    return next.handle().pipe(
      tap((response) => {
        const newValues = method === 'DELETE' ? null : this.extractValues(response);

        // Prefer the route param; fall back to the id of the resource the
        // handler returned, which is what a create produces.
        const auditableId =
          (request.params?.id as string | undefined) ??
          (newValues?.id as string | undefined) ??
          'unknown';

        const entry = {
          event: `${method}:${routeKey}`,
          auditableType,
          auditableId,
          userId: user?.id,
          organizationId: user?.organizationId,
          newValues,
          ipAddress: request.ip,
          userAgent: request.headers?.['user-agent'] as string | undefined,
        };

        void this.auditLogService
          .log({ ...entry, checksum: this.checksum(entry) })
          .catch((err: unknown) => {
            // Surfaced, not swallowed. If the trail is failing we need to know.
            this.logger.error(
              `Failed to write audit log for ${entry.event} ${entry.auditableId}: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          });
      }),
    );
  }

  /**
   * Finds the audited resource in the path, ignoring the global `api/v1`
   * prefix and any leading/trailing separators.
   *
   * The original implementation read `parts[0]`, which under the global prefix
   * was always `api`.
   */
  private getRouteKey(routePath: string): string | null {
    if (!routePath) return null;

    const segments = routePath
      .split('?')[0]
      .split('/')
      .map((segment) => segment.trim().toLowerCase())
      .filter(Boolean)
      // Drop the global prefix and any path parameters.
      .filter((segment) => segment !== 'api' && !/^v\d+$/.test(segment))
      .filter((segment) => !segment.startsWith(':'));

    for (const segment of segments) {
      if (ENTITY_ROUTES[segment]) {
        return segment;
      }
    }

    return null;
  }

  /**
   * Content hash of the entry, so a row cannot be edited in the database
   * without detection. Not a substitute for append-only storage, but it makes
   * silent tampering detectable, which `null` did not.
   */
  private checksum(entry: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(entry)).digest('hex');
  }

  private extractValues(response: any): Record<string, unknown> | null {
    if (!response) return null;
    const data = response?.data ?? response;
    if (typeof data !== 'object' || data === null) return null;

    const safe: Record<string, unknown> = {};
    for (const key of ['id', 'title', 'name', 'email', 'status', 'type', 'slug']) {
      if (key in data && !REDACTED_KEYS.has(key)) {
        safe[key] = (data as Record<string, unknown>)[key];
      }
    }

    return Object.keys(safe).length > 0 ? safe : null;
  }
}
