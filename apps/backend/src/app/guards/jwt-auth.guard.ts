import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { SKIP_JWT_KEY } from '../../common/constants';
import {
  ClientErrorCodes,
  ClientErrorMessages,
  clientError,
} from '../../common/errors';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const skipJwt = this.reflector.getAllAndOverride<boolean>(SKIP_JWT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipJwt) {
      return true;
    }
    return super.canActivate(context);
  }

  override handleRequest<TUser>(
    err: Error | undefined,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
    status?: unknown,
  ): TUser {
    void context;
    void status;
    if (err) {
      throw clientError(
        ClientErrorCodes.AUTH_JWT_UNAUTHORIZED,
        err.message ||
          ClientErrorMessages[ClientErrorCodes.AUTH_JWT_UNAUTHORIZED],
      );
    }
    if (!user) {
      const hint =
        typeof info === 'string'
          ? info
          : info instanceof Error
            ? info.message
            : undefined;
      throw clientError(
        ClientErrorCodes.AUTH_JWT_UNAUTHORIZED,
        hint ?? ClientErrorMessages[ClientErrorCodes.AUTH_JWT_UNAUTHORIZED],
      );
    }
    return user;
  }
}
