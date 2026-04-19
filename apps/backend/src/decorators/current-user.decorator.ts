import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthUserPayload = {
  id: string;
  email: string;
  roles: string[];
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUserPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUserPayload }>();
    return request.user;
  },
);
