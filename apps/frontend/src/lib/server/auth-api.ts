import "server-only";

import type { operations } from "@/lib/api-schema";
import { getServerAuthEnv } from "@/lib/env";

type LoginRequestBody =
  operations["AuthController_login"]["requestBody"]["content"]["application/json"];
type RegisterRequestBody =
  operations["AuthController_register"]["requestBody"]["content"]["application/json"];
/** ログイン 200 / 登録 201 の JSON は同形（`successResponse`） */
type AuthIssueTokensSuccessJson =
  operations["AuthController_login"]["responses"][200]["content"]["application/json"];

type AuthMeSuccessJson =
  operations["AuthController_me"]["responses"][200]["content"]["application/json"];

export type AuthApiResult =
  | { ok: true; accessToken: string }
  | { ok: false; status: number; body: unknown };

export type AuthMeApiResult =
  | { ok: true; me: AuthMeSuccessJson["data"] }
  | { ok: false; status: number; body: unknown };

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

function isAuthIssueTokensSuccessJson(json: unknown): json is AuthIssueTokensSuccessJson {
  if (!json || typeof json !== "object") {
    return false;
  }
  const root = json as Record<string, unknown>;
  if (root.status !== 200) {
    return false;
  }
  const data = root.data;
  if (!data || typeof data !== "object") {
    return false;
  }
  return typeof (data as { access_token?: unknown }).access_token === "string";
}

function isAuthMeSuccessJson(json: unknown): json is AuthMeSuccessJson {
  if (!json || typeof json !== "object") {
    return false;
  }
  const root = json as Record<string, unknown>;
  if (root.status !== 200) {
    return false;
  }
  const data = root.data;
  if (!data || typeof data !== "object") {
    return false;
  }
  const d = data as Record<string, unknown>;
  return (
    typeof d.id === "string" &&
    typeof d.email === "string" &&
    Array.isArray(d.roles) &&
    d.roles.every((r) => typeof r === "string")
  );
}

async function postAuthIssueTokens(
  endpoint: "/auth/login" | "/auth/register",
  body: LoginRequestBody | RegisterRequestBody,
): Promise<AuthApiResult> {
  const env = getServerAuthEnv();
  const res = await fetch(`${env.apiBaseUrl}${endpoint}`, {
    cache: "no-store",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.INTERNAL_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const json: unknown = await res.json().catch(() => ({}));
  if (![200, 201].includes(res.status)) {
    return { ok: false, status: res.status, body: json };
  }

  if (!isAuthIssueTokensSuccessJson(json)) {
    return { ok: false, status: res.status, body: json };
  }
  return { ok: true, accessToken: json.data.access_token };
}

export async function postAuthLogin(body: LoginRequestBody): Promise<AuthApiResult> {
  return postAuthIssueTokens("/auth/login", body);
}

export async function postAuthRegister(body: RegisterRequestBody): Promise<AuthApiResult> {
  return postAuthIssueTokens("/auth/register", body);
}

/**
 * Nest の `POST /auth/me`（X-API-Key + Bearer）をサーバーから呼ぶ。
 */
export async function postAuthMe(accessToken: string): Promise<AuthMeApiResult> {
  const env = getServerAuthEnv();
  const res = await fetch(`${env.apiBaseUrl}/auth/me`, {
    cache: "no-store",
    method: "POST",
    headers: {
      "X-API-Key": env.INTERNAL_API_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const json: unknown = await res.json().catch(() => ({}));
  if (res.status !== 200) {
    return { ok: false, status: res.status, body: json };
  }
  if (!isAuthMeSuccessJson(json)) {
    return { ok: false, status: res.status, body: json };
  }
  return { ok: true, me: json.data };
}
