import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthUserPayload = {
  id: string;
  email: string;
  name?: string | null;
  tenantId: string;
  roles: string[];
};

/**
 * JWT 認証済みリクエストのユーザー情報を controller 引数へ注入する。
 *
 * `JwtStrategy` が `request.user` に載せた値を返すため、`@AuthApi()` または
 * JWT guard が有効な route で使う。
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUserPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUserPayload }>();
    return request.user;
  },
);
