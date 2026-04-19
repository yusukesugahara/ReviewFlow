import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export type RequestWithContext = Request & {
  requestId?: string;
  id?: string | number;
  user?: { id?: string; roles?: string[] };
};

export function requestContextMiddleware(
  req: RequestWithContext,
  res: Response,
  next: NextFunction,
) {
  const incoming = req.header('x-request-id');
  const requestId = incoming && incoming.trim() ? incoming : randomUUID();
  req.requestId = requestId;
  if (req.id === undefined) {
    req.id = requestId;
  }
  res.setHeader('X-Request-Id', requestId);
  next();
}
