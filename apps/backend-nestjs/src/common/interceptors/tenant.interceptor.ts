import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const tenantId =
      request.headers['x-tenant-id'] ||
      request.user?.organizationId;

    if (tenantId) {
      request.tenantId = tenantId;
    }

    return next.handle();
  }
}
