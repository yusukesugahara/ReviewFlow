import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request, Response } from 'express';

export type RequestWithUser<TUser = unknown> = Request & {
  user?: TUser;
};

type GraphqlRequestContext<TUser> = {
  req?: RequestWithUser<TUser>;
  request?: RequestWithUser<TUser>;
  res?: Response;
  response?: Response;
};

/**
 * REST / GraphQL のどちらの ExecutionContext からも Express request を取り出す。
 */
export function getRequestFromExecutionContext<TUser = unknown>(
  context: ExecutionContext,
): RequestWithUser<TUser> {
  const graphqlContext = getGraphqlRequestContext(context);
  const graphqlRequest = graphqlContext?.req ?? graphqlContext?.request;
  if (graphqlRequest) {
    return graphqlRequest as RequestWithUser<TUser>;
  }

  return context.switchToHttp().getRequest<RequestWithUser<TUser>>();
}

/**
 * REST / GraphQL のどちらの ExecutionContext からも Express request/response を取り出す。
 */
export function getRequestResponseFromExecutionContext<TUser = unknown>(
  context: ExecutionContext,
): { req: RequestWithUser<TUser>; res: Response } {
  const graphqlContext = getGraphqlRequestContext(context);
  const graphqlRequest = graphqlContext?.req ?? graphqlContext?.request;
  const graphqlResponse = graphqlContext?.res ?? graphqlContext?.response;
  if (graphqlRequest && graphqlResponse) {
    return {
      req: graphqlRequest as RequestWithUser<TUser>,
      res: graphqlResponse,
    };
  }

  const http = context.switchToHttp();
  return {
    req: http.getRequest<RequestWithUser<TUser>>(),
    res: http.getResponse<Response>(),
  };
}

function getGraphqlRequestContext(
  context: ExecutionContext,
): GraphqlRequestContext<unknown> | undefined {
  const gqlContext = GqlExecutionContext.create(context).getContext<unknown>();
  if (isGraphqlRequestContext(gqlContext)) {
    return gqlContext;
  }

  const argsContext = context.getArgs()[2] as unknown;
  if (isGraphqlRequestContext(argsContext)) {
    return argsContext;
  }

  return undefined;
}

function isGraphqlRequestContext(
  value: unknown,
): value is GraphqlRequestContext<unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const maybeContext = value as GraphqlRequestContext<unknown>;
  return !!(
    maybeContext.req ||
    maybeContext.request ||
    maybeContext.res ||
    maybeContext.response
  );
}
