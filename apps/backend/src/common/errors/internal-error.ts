import { ServerErrorCodes, serverError } from './server-error-catalog';

/**
 * 想定内の 5xx を `throw internalError.database()` のように投げる。
 * ステータス・code・message は `ServerErrorCatalog` に従う（第 1 引数で message を上書き可）。
 */
export const internalError = {
  internal: (message?: string) =>
    serverError(ServerErrorCodes.INTERNAL_ERROR, message),

  unhandled: (message?: string) =>
    serverError(ServerErrorCodes.UNHANDLED_EXCEPTION, message),

  database: (message?: string) =>
    serverError(ServerErrorCodes.DATABASE_ERROR, message),

  externalService: (message?: string) =>
    serverError(ServerErrorCodes.EXTERNAL_SERVICE_ERROR, message),

  unavailable: (message?: string) =>
    serverError(ServerErrorCodes.SERVICE_UNAVAILABLE, message),

  configuration: (message?: string) =>
    serverError(ServerErrorCodes.CONFIGURATION_ERROR, message),
} as const;
