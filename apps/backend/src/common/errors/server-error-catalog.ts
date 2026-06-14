import { HttpStatus } from '@nestjs/common';
import { BaseError } from '../../utils/errors/base.error';

/**
 * サーバー側・境界向けエラー定義。
 * キーが errorCode、同じブロックに HTTP status とメッセージをまとめる。
 */
export const ServerErrorCatalog = {
  INTERNAL_ERROR: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
  },
  UNHANDLED_EXCEPTION: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'An unexpected error occurred',
  },
  DATABASE_ERROR: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'A data store error occurred',
  },
  EXTERNAL_SERVICE_ERROR: {
    status: HttpStatus.BAD_GATEWAY,
    message: 'An external service request failed',
  },
  SERVICE_UNAVAILABLE: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: 'Service temporarily unavailable',
  },
  CONFIGURATION_ERROR: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Server configuration error',
  },
} as const satisfies Record<string, { status: HttpStatus; message: string }>;

export type ServerErrorCode = keyof typeof ServerErrorCatalog;

/** `ServerErrorCodes.*` はカタログのキーと同じ文字列 */
export const ServerErrorCodes = Object.fromEntries(
  (Object.keys(ServerErrorCatalog) as ServerErrorCode[]).map((code) => [
    code,
    code,
  ]),
) as { readonly [K in ServerErrorCode]: K };

export const ServerErrorMessages = Object.fromEntries(
  (Object.keys(ServerErrorCatalog) as ServerErrorCode[]).map((code) => [
    code,
    ServerErrorCatalog[code].message,
  ]),
) as Record<ServerErrorCode, string>;

/**
 * 設定不備・外部サービス失敗など、サーバー側要因のエラーを `BaseError` に変換する。
 *
 * client error と同じ形式に揃え、`GlobalExceptionFilter` で API response へ正規化する。
 */
export function serverError(
  code: ServerErrorCode,
  message?: string,
): BaseError {
  const def = ServerErrorCatalog[code];
  return new BaseError(def.status, code, message ?? def.message);
}
