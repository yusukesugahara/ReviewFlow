import "server-only";

import { cookies } from "next/headers";
import createClient from "openapi-fetch";
import type { paths } from "@/lib/api-schema";
import { getServerAuthEnv } from "@/lib/env";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  APPLICANT_ACCESS_TOKEN_COOKIE_NAME,
} from "@/lib/constants/auth.constants";

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
  headers?: Record<string, string>;
};

type OpenApiFetchOptions = {
  body?: unknown;
  cache?: RequestCache;
  headers?: Record<string, string>;
  params?: { query?: Record<string, string> };
};

type OpenApiFetchResult = {
  data?: unknown;
  error?: unknown;
  response: Response;
};

type OpenApiMethod = (
  path: string,
  options: OpenApiFetchOptions,
) => Promise<OpenApiFetchResult>;

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
  const client = createClient<paths>({ baseUrl: env.apiBaseUrl });
  const method = options.method ?? "GET";
  const [pathname, rawQuery] = path.split("?", 2);
  const query = rawQuery
    ? Object.fromEntries(new URLSearchParams(rawQuery).entries())
    : undefined;
  const headers = {
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    "X-API-Key": env.INTERNAL_API_KEY,
    ...(options.headers ?? {}),
  };
  const requestOptions: OpenApiFetchOptions = {
    cache: "no-store",
    headers,
    ...(query ? { params: { query } } : {}),
    ...(hasBody ? { body: options.body } : {}),
  };
  const request = client[method] as OpenApiMethod;
  const { data, error, response } = await request(
    pathname ?? path,
    requestOptions,
  );

  if (!response.ok) {
    throw new BackendHttpError(
      response.status,
      error ?? {},
      `backend request failed: ${path}`,
    );
  }
  return data ?? {};
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

export async function backendApplicantFetchJson(
  path: string,
  options: BackendFetchOptions = {},
): Promise<unknown> {
  const store = await cookies();
  const token = store.get(APPLICANT_ACCESS_TOKEN_COOKIE_NAME)?.value ?? null;
  if (!token) {
    throw new BackendHttpError(401, {}, "applicant access token missing");
  }

  return backendFetchJson(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      "X-Applicant-Access-Token": token,
    },
  });
}
