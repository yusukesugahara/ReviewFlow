import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { SKIP_INTERNAL_API_KEY } from '../../common/constants';
import { ClientErrorCodes, clientError } from '../../common/errors';

/**
 * Next.js などサーバー間連携用。ブラウザに INTERNAL_API_KEY を出さないこと。
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method === 'OPTIONS') {
      return true;
    }

    const skipApiKey = this.reflector.getAllAndOverride<boolean>(
      SKIP_INTERNAL_API_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipApiKey) {
      return true;
    }

    const expected = this.config.get<string>('INTERNAL_API_KEY');
    if (!expected) {
      throw new ServiceUnavailableException(
        'INTERNAL_API_KEY is not configured',
      );
    }

    const header = request.headers['x-api-key'];
    const key = Array.isArray(header) ? header[0] : header;
    if (!key) {
      throw clientError(ClientErrorCodes.AUTH_API_KEY_MISSING);
    }
    if (key !== expected) {
      throw clientError(ClientErrorCodes.AUTH_API_KEY_INVALID);
    }

    return true;
  }
}
