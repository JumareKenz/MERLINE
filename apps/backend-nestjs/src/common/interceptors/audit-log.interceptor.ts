import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '../../audit-log/audit-log.service';

const AUDITABLE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const ENTITY_ROUTES: Record<string, string> = {
  projects: 'Project',
  studies: 'Study',
  submissions: 'Submission',
  assignments: 'Assignment',
  questionnaires: 'Questionnaire',
  users: 'User',
  roles: 'Role',
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    if (!AUDITABLE_METHODS.includes(method)) {
      return next.handle();
    }

    const routeKey = this.getRouteKey(request.route?.path || request.url);
    if (!routeKey) {
      return next.handle();
    }

    const auditableType = ENTITY_ROUTES[routeKey] || routeKey;
    const auditableId = request.params?.id || 'unknown';
    const user = request.user;

    return next.handle().pipe(
      tap((response) => {
        const event = `${method}:${routeKey}`;
        const newValues = method === 'DELETE' ? null : this.extractValues(response);

        this.auditLogService.log({
          event,
          auditableType,
          auditableId,
          userId: user?.id,
          organizationId: user?.organizationId,
          newValues,
          ipAddress: request.ip,
          userAgent: request.headers?.['user-agent'] as string | undefined,
        })      .catch(() => { /* silent */ });
      }),
    );
  }

  private getRouteKey(path: string): string | null {
    if (!path) return null;
    const parts = path.split('/').filter(Boolean);
    const key = parts[0]?.split(':')[0]?.split('?')[0]?.toLowerCase();
    if (key && ENTITY_ROUTES[key]) {
      return key;
    }
    return null;
  }

  private extractValues(response: any): Record<string, unknown> | null {
    if (!response) return null;
    const data = response?.data || response;
    if (typeof data !== 'object') return null;
    const safe: Record<string, unknown> = {};
    for (const key of ['id', 'title', 'name', 'email', 'status', 'type']) {
      if (key in data) {
        safe[key] = data[key] as unknown;
      }
    }
    return Object.keys(safe).length > 0 ? safe : null;
  }
}
