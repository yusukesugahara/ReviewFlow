import { HttpStatus } from '@nestjs/common';
import { BaseError } from '../../utils/errors/base.error';

/**
 * クライアント向けエラー定義。
 * キーが API の errorCode になり、同じブロックに HTTP status とメッセージをまとめる。
 */
export const ClientErrorCatalog = {
  AUTH_EMAIL_TAKEN: {
    status: HttpStatus.CONFLICT,
    message: 'Email is already registered',
  },
  AUTH_TENANT_REQUIRED: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Multiple accounts use this email; specify tenantId to log in',
  },
  AUTH_INVALID_CREDENTIALS: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Invalid email or password',
  },
  AUTH_API_KEY_MISSING: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Missing X-API-Key header',
  },
  AUTH_API_KEY_INVALID: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Invalid X-API-Key',
  },
  AUTH_JWT_UNAUTHORIZED: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Invalid or missing bearer token',
  },
  AUTH_FORBIDDEN_ROLE: {
    status: HttpStatus.FORBIDDEN,
    message: 'Insufficient role for this resource',
  },
} as const satisfies Record<string, { status: HttpStatus; message: string }>;

export type ClientErrorCode = keyof typeof ClientErrorCatalog;

/** `ClientErrorCodes.AUTH_*` はカタログのキーと同じ文字列（型安全なエイリアス） */
export const ClientErrorCodes = Object.fromEntries(
  (Object.keys(ClientErrorCatalog) as ClientErrorCode[]).map((code) => [
    code,
    code,
  ]),
) as { readonly [K in ClientErrorCode]: K };

export const ClientErrorMessages = Object.fromEntries(
  (Object.keys(ClientErrorCatalog) as ClientErrorCode[]).map((code) => [
    code,
    ClientErrorCatalog[code].message,
  ]),
) as Record<ClientErrorCode, string>;

export function clientError(
  code: ClientErrorCode,
  message?: string,
): BaseError {
  const def = ClientErrorCatalog[code];
  return new BaseError(def.status, code, message ?? def.message);
}
