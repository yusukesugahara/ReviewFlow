import "server-only";

import { cookies } from "next/headers";
import { getServerAuthEnv } from "@/lib/env";
import { ACCESS_TOKEN_COOKIE_NAME } from "@/lib/constants/auth.constants";

export class BackendHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message);
  }
}

type BackendFetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
};

export function errorMessageFromBody(body: unknown): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
    if (Array.isArray(message)) {
      return message.join(", ");
    }
  }
  return "リクエストに失敗しました";
}

export async function backendFetchJson(
  path: string,
  options: BackendFetchOptions = {},
): Promise<unknown> {
  const env = getServerAuthEnv();
  const hasBody = options.body !== undefined;
  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    cache: "no-store",
    method: options.method ?? "GET",
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      "X-API-Key": env.INTERNAL_API_KEY,
      ...(options.headers ?? {}),
    },
    ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
  });

  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new BackendHttpError(
      res.status,
      body,
      `backend request failed: ${path}`,
    );
  }
  return body;
}

export async function backendAuthFetchJson(
  path: string,
  options: BackendFetchOptions = {},
): Promise<unknown> {
  const store = await cookies();
  const token = store.get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? null;
  if (!token) {
    throw new BackendHttpError(401, {}, "access token missing");
  }

  return backendFetchJson(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}
