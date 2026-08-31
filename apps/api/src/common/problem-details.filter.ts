import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';

interface ValidationMessage {
  property?: string;
  constraints?: Record<string, string>;
}

function statusToCode(status: number, fallback: string, response: any): string {
  if (response?.code) {
    return response.code;
  }
  if (status === HttpStatus.BAD_REQUEST) return 'VALIDATION_ERROR';
  if (status === HttpStatus.UNAUTHORIZED) return 'UNAUTHENTICATED';
  if (status === HttpStatus.FORBIDDEN) return 'FORBIDDEN';
  if (status === HttpStatus.NOT_FOUND) return 'NOT_FOUND';
  if (status === HttpStatus.CONFLICT) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMITED';
  return fallback;
}

function defaultTitle(status: number): string {
  if (status === HttpStatus.BAD_REQUEST) return 'Validation Error';
  if (status === HttpStatus.UNAUTHORIZED) return 'Unauthorized';
  if (status === HttpStatus.FORBIDDEN) return 'Forbidden';
  if (status === HttpStatus.NOT_FOUND) return 'Not Found';
  if (status === HttpStatus.CONFLICT) return 'Conflict';
  if (status === 429) return 'Too Many Requests';
  return 'Internal Server Error';
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = '服务器内部错误';
    let code = 'INTERNAL_ERROR';
    let errors: Array<{ field: string; code: string; message: string }> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      title = defaultTitle(status);
      const body = exception.getResponse();
      if (typeof body === 'string') {
        detail = body;
      } else if (body && typeof body === 'object') {
        const data = body as Record<string, any>;
        detail = typeof data.detail === 'string' ? data.detail : String(data.message ?? '请求失败');
        if (Array.isArray(data.message)) {
          errors = data.message.map((item: ValidationMessage) => ({
            field: item.property ?? 'unknown',
            code: 'INVALID_FORMAT',
            message: Object.values(item.constraints ?? {}).join('; '),
          }));
        }
        code = statusToCode(status, code, data);
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
    }

    response.status(status).json({
      type: `https://api.nodusfall.wiki/errors/${code.toLowerCase()}`,
      title,
      status,
      detail,
      code,
      requestId: randomUUID(),
      ...(errors ? { errors } : {}),
    });
  }
}
