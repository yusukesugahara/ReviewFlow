import "server-only";

import { getServerAuthEnv } from "@/lib/env";
import { getApplicantAccessTokenFromCookie } from "./session";

export class ApplicantBackendHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message);
  }
}

type BackendApplicantFetchOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
};

export async function backendApplicantFetchJson(
  path: string,
  options: BackendApplicantFetchOptions = {},
): Promise<unknown> {
  const env = getServerAuthEnv();
  const token = await getApplicantAccessTokenFromCookie();
  if (!token) {
    throw new ApplicantBackendHttpError(401, {}, "applicant access token missing");
  }

  const hasBody = options.body !== undefined;
  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    cache: "no-store",
    method: options.method ?? "GET",
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      "X-API-Key": env.INTERNAL_API_KEY,
      "X-Applicant-Access-Token": token,
    },
    ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
  });

  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApplicantBackendHttpError(
      res.status,
      body,
      `applicant backend request failed: ${path}`,
    );
  }
  return body;
}
