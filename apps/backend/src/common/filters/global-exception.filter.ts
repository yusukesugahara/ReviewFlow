import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { BaseError } from '../../utils/errors/base.error';
import {
  ServerErrorCatalog,
  ServerErrorCodes,
} from '../errors/server-error-catalog';

/** 実行時に返すエラー JSON（OpenAPI の `ErrorResponseDto` は statusCode / message のみを契約とする） */
export type ApiErrorResponse = {
  statusCode: number;
  errorCode?: string;
  message: string | string[];
  path: string;
  timestamp: string;
};

/**
 * 未処理例外を一箇所で JSON に正規化する。
 * 判定順: BaseError → HttpException → その他 Error → non-Error
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const path = request.originalUrl ?? request.url ?? '';

    const payload = this.normalize(exception, path);
    response.status(payload.statusCode).json(payload);
  }

  private normalize(exception: unknown, path: string): ApiErrorResponse {
    const timestamp = new Date().toISOString();

    if (exception instanceof BaseError) {
      this.logBaseError(exception);
      return {
        statusCode: exception.statusCode,
        errorCode: exception.errorCode,
        message: exception.message,
        path,
        timestamp,
      };
    }

    if (exception instanceof HttpException) {
      return this.fromHttpException(exception, path, timestamp);
    }

    const unhandled = ServerErrorCatalog[ServerErrorCodes.UNHANDLED_EXCEPTION];
    if (exception instanceof Error) {
      this.logger.error(exception.stack ?? exception.message);
      return {
        statusCode: unhandled.status,
        errorCode: ServerErrorCodes.UNHANDLED_EXCEPTION,
        message: unhandled.message,
        path,
        timestamp,
      };
    }

    this.logger.error(exception);
    return {
      statusCode: unhandled.status,
      errorCode: ServerErrorCodes.UNHANDLED_EXCEPTION,
      message: unhandled.message,
      path,
      timestamp,
    };
  }

  private logBaseError(e: BaseError): void {
    if (e.statusCode >= 500) {
      this.logger.error(e.stack ?? e.message);
    } else {
      this.logger.warn(`[${e.errorCode}] ${e.message}`);
    }
  }

  private fromHttpException(
    exception: HttpException,
    path: string,
    timestamp: string,
  ): ApiErrorResponse {
    const statusCode = exception.getStatus();
    const body = exception.getResponse();

    if (typeof body === 'string') {
      return {
        statusCode,
        message: body,
        path,
        timestamp,
      };
    }

    if (typeof body === 'object' && body !== null) {
      const b = body as Record<string, unknown>;
      const errorCode =
        typeof b.errorCode === 'string'
          ? b.errorCode
          : typeof b.code === 'string'
            ? b.code
            : undefined;
      const message =
        b.message !== undefined
          ? (b.message as string | string[])
          : exception.message;

      const resolvedErrorCode =
        errorCode ??
        (statusCode === 400 && Array.isArray(message)
          ? 'VALIDATION_FAILED'
          : undefined);

      return {
        statusCode,
        ...(resolvedErrorCode !== undefined
          ? { errorCode: resolvedErrorCode }
          : {}),
        message,
        path,
        timestamp,
      };
    }

    return {
      statusCode,
      message: exception.message,
      path,
      timestamp,
    };
  }
}
