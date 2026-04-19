/**
 * Controller / Service での投げ方の例（AppModule から import しないこと）。
 *
 * Service — カタログ（推奨）:
 *   import { clientError, ClientErrorCodes } from '../../common/errors';
 *   throw clientError(ClientErrorCodes.AUTH_EMAIL_TAKEN);
 *
 * Service — BaseError 直接:
 *   import { HttpStatus } from '@nestjs/common';
 *   import { BaseError } from './base.error';
 *   throw new BaseError(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', '...');
 *
 * Controller:
 *   原則ビジネスロジックを持たず、Service を呼ぶだけ。try/catch で握りつぶさない。
 */

export {};
