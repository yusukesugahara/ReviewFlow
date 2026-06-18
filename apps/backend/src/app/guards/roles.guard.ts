import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, SKIP_JWT_KEY } from '../../common/constants';
import { getRequestFromExecutionContext } from '../../common/context/request-from-execution-context';
import { ClientErrorCodes, clientError } from '../../common/errors';

/**
 * ロールガード
 *
 * @param context ExecutionContext
 * @returns boolean
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skipJwt = this.reflector.getAllAndOverride<boolean>(SKIP_JWT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipJwt) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) {
      return true;
    }

    const request = getRequestFromExecutionContext<{ roles?: string[] }>(
      context,
    );
    const user = request.user;
    if (!user?.roles?.length) {
      throw clientError(ClientErrorCodes.AUTH_FORBIDDEN_ROLE);
    }

    const allowed = requiredRoles.some((role) => user.roles!.includes(role));
    if (!allowed) {
      throw clientError(ClientErrorCodes.AUTH_FORBIDDEN_ROLE);
    }

    return true;
  }
}
