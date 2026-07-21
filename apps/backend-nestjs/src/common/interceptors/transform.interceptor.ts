import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface WrappedResponse<T> {
  status: 'success';
  message: string;
  data: T;
  meta: {
    timestamp: string;
    version: string;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, WrappedResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<WrappedResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (data && data.__raw) {
          return data.value;
        }
        return {
          status: 'success',
          message: data?.message ?? 'Operation successful',
          data: data?.data ?? data,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        };
      }),
    );
  }
}
