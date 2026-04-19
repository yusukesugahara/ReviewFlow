export { BaseError } from '../../utils/errors/base.error';
export { appClientError, appServerError } from './app-error';
export {
  ClientErrorCatalog,
  ClientErrorCodes,
  ClientErrorMessages,
  type ClientErrorCode,
  clientError,
} from './client-error-catalog';
export {
  ServerErrorCatalog,
  ServerErrorCodes,
  ServerErrorMessages,
  type ServerErrorCode,
  serverError,
} from './server-error-catalog';
export { internalError } from './internal-error';
