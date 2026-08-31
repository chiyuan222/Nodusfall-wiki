import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, finalize, of, tap } from 'rxjs';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

interface CachedResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly responses = new Map<string, CachedResponse>();
  private readonly inflight = new Map<string, any>();

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    if (!WRITE_METHODS.has(req.method)) {
      return next.handle();
    }

    const key = req.headers['idempotency-key'] as string | undefined;
    if (!key) {
      return next.handle();
    }

    const cacheKey = `${req.method}:${req.originalUrl}:${key}`;
    const cached = this.responses.get(cacheKey);
    if (cached) {
      const res = context.switchToHttp().getResponse();
      res.status(cached.status);
      for (const [name, value] of Object.entries(cached.headers)) {
        res.setHeader(name, value);
      }
      return of(cached.body);
    }

    const inFlight = this.inflight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const handler = next.handle().pipe(
      tap((body) => {
        const res = context.switchToHttp().getResponse();
        this.responses.set(cacheKey, {
          status: res.statusCode,
          headers: {},
          body,
        });
      }),
      catchError((error) => {
        throw error;
      }),
      finalize(() => {
        this.inflight.delete(cacheKey);
      }),
    );

    this.inflight.set(cacheKey, handler);
    return handler;
  }
}
