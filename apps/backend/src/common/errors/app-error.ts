import { BaseError } from '../../utils/errors/base.error';
import type { ClientErrorCode } from './client-error-catalog';
import { ClientErrorCatalog } from './client-error-catalog';
import type { ServerErrorCode } from './server-error-catalog';
import { ServerErrorCatalog } from './server-error-catalog';

/**
 * `HttpException` を使わずドメイン層から投げる用。
 * `clientError` / `serverError` と同じ `BaseError` インスタンスを返す。
 */
export function appClientError(
  code: ClientErrorCode,
  message?: string,
): BaseError {
  const def = ClientErrorCatalog[code];
  return new BaseError(def.status, code, message ?? def.message);
}

export function appServerError(
  code: ServerErrorCode,
  message?: string,
): BaseError {
  const def = ServerErrorCatalog[code];
  return new BaseError(def.status, code, message ?? def.message);
}
