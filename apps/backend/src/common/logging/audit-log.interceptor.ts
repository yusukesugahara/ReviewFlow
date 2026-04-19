import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { BaseError } from '../../utils/errors/base.error';
import { ServerErrorCodes } from '../errors/server-error-catalog';
import type { RequestWithContext } from './request-context.middleware';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AuditLogInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithContext>();
    const res = http.getResponse<{ statusCode: number }>();
    const startedAt = Date.now();

    if (this.shouldSkip(req.url)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        this.writeLog({
          req,
          res,
          startedAt,
          success: true,
        });
      }),
      catchError((error: unknown) => {
        this.writeLog({
          req,
          res,
          startedAt,
          success: false,
          errorCode: this.resolveErrorCode(error),
        });
        return throwError(() => error);
      }),
    );
  }

  private resolveErrorCode(error: unknown): string {
    if (error instanceof BaseError) {
      return error.errorCode;
    }
    if (error instanceof HttpException) {
      const body = error.getResponse();
      if (typeof body === 'object' && body !== null) {
        const o = body as { errorCode?: unknown; code?: unknown };
        if (typeof o.errorCode === 'string') {
          return o.errorCode;
        }
        if (typeof o.code === 'string') {
          return o.code;
        }
      }
    }
    return ServerErrorCodes.UNHANDLED_EXCEPTION;
  }

  private shouldSkip(path: string): boolean {
    return (
      path.startsWith('/docs') ||
      path.startsWith('/docs-json') ||
      path.startsWith('/favicon.ico')
    );
  }

  private writeLog(params: {
    req: RequestWithContext;
    res: { statusCode: number };
    startedAt: number;
    success: boolean;
    errorCode?: string;
  }) {
    const { req, res, startedAt, success, errorCode } = params;
    const userId = req.user?.id ?? null;
    const role = req.user?.roles?.[0] ?? null;
    const ip = req.ip ?? null;
    const userAgent = req.header('user-agent') ?? null;
    const log = {
      event: 'http.request',
      requestId:
        req.requestId ?? (req.id !== undefined ? String(req.id) : null),
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl ?? req.url,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      success,
      userId,
      role,
      ip,
      userAgent,
      ...(success ? {} : { errorCode }),
    };
    if (success) {
      this.logger.info(log, 'audit');
      return;
    }

    this.logger.warn(log, 'audit');
  }
}
