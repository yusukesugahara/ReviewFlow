import "server-only";

import { getServerAuthEnv } from "@/lib/env";
import { getAccessTokenFromCookie } from "./session";

export class BackendHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message);
  }
}

type BackendAuthFetchOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
};

export async function backendAuthFetchJson(
  path: string,
  options: BackendAuthFetchOptions = {},
): Promise<unknown> {
  const env = getServerAuthEnv();
  const token = await getAccessTokenFromCookie();
  if (!token) {
    throw new BackendHttpError(401, {}, "access token missing");
  }

  const hasBody = options.body !== undefined;
  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    cache: "no-store",
    method: options.method ?? "GET",
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      "X-API-Key": env.INTERNAL_API_KEY,
      Authorization: `Bearer ${token}`,
    },
    ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
  });

  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new BackendHttpError(res.status, body, `backend request failed: ${path}`);
  }
  return body;
}
