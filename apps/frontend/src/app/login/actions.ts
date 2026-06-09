"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import type { FormActionResponse } from "@/lib/baseTypes";
import { authCredentialsSchema, type AuthCredentials } from "@/lib/auth-schema";
import { ACCESS_TOKEN_COOKIE_NAME } from "@/lib/constants/auth.constants";
import { isProduction } from "@/lib/env";
import { client } from "@/lib/server/backend-fetch";
import { errorMessageFromBody } from "@/lib/server/api-failure";
import { parseAuthLoginSuccess } from "@/lib/server/auth-response-schema";
import type { LoginRequestBody } from "@/lib/schema";

export type LoginSchema = AuthCredentials & { next?: string };

const LOGIN_FAILED_MESSAGE = "ログインに失敗しました";
const LOGIN_REQUEST_FAILED_MESSAGE =
  "ログインに失敗しました。時間をおいて再度お試しください。";
const INVALID_CREDENTIALS_MESSAGE =
  "メールアドレスまたはパスワードが正しくありません。";
const TENANT_REQUIRED_MESSAGE =
  "同じメールアドレスのアカウントが複数あります。管理者にお問い合わせください。";

const apiErrorCodeSchema = z.object({
  errorCode: z.string().optional(),
});

const loginFormSchema = z.object({
  email: z.string().catch(""),
  password: z.string().catch(""),
  next: z.string().optional(),
});

function authCredentialsFromFormData(formData: FormData): LoginSchema {
  return loginFormSchema.parse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
}

function resolveSafeNextPath(next?: string): string {
  if (!next || !next.startsWith("/")) {
    return "/";
  }
  if (next.startsWith("//")) {
    return "/";
  }
  return next;
}

function errorCodeFromBody(body: unknown): string | undefined {
  const parsed = apiErrorCodeSchema.safeParse(body);
  return parsed.success ? parsed.data.errorCode : undefined;
}

function authErrorMessage(result: { ok: false; status: number; body: unknown }): string {
  const errorCode = errorCodeFromBody(result.body);
  if (errorCode === "AUTH_INVALID_CREDENTIALS") {
    return INVALID_CREDENTIALS_MESSAGE;
  }
  if (errorCode === "AUTH_TENANT_REQUIRED") {
    return TENANT_REQUIRED_MESSAGE;
  }
  return errorMessageFromBody(result.body, LOGIN_FAILED_MESSAGE);
}

async function postAuthLogin(
  body: LoginRequestBody,
): Promise<
  | { ok: true; accessToken: string }
  | { ok: false; status: number; body: unknown }
> {
  const response = await client.POST("/auth/login", { body });
  const data = parseAuthLoginSuccess(response.data);
  if (!response.response.ok || !data) {
    return {
      ok: false,
      status: response.response.status,
      body: response.error ?? response.data,
    };
  }
  return { ok: true, accessToken: data.data.access_token };
}

const FALLBACK_MAX_AGE_SEC = 60 * 60 * 24 * 7;

/**
 * accessToken の有効期限を秒単位で取得する
 * @param accessToken - 有効期限を取得する accessToken
 * @returns 有効期限（秒）
 */
function maxAgeSecondsFromJwt(accessToken: string): number {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) {
      return FALLBACK_MAX_AGE_SEC;
    }
    const payloadB64 = parts[1];
    if (payloadB64 === undefined) {
      return FALLBACK_MAX_AGE_SEC;
    }
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as { exp?: number };
    if (typeof payload.exp !== "number") {
      return FALLBACK_MAX_AGE_SEC;
    }
    return Math.max(60, payload.exp - Math.floor(Date.now() / 1000));
  } catch {
    return FALLBACK_MAX_AGE_SEC;
  }
}

/**
 * accessToken をクッキーに保存する
 * @param accessToken - 保存する accessToken
 */
export async function persistAccessTokenCookie(accessToken: string): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: maxAgeSecondsFromJwt(accessToken),
  });
}


/**
 * ログインする
 * @param params - ログインするパラメータ
 * @returns ログイン API のレスポンス
 */
export async function login(formData: FormData): Promise<FormActionResponse<void>> {
  const params = authCredentialsFromFormData(formData);
  const parsed = authCredentialsSchema.safeParse(params);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let auth: Awaited<ReturnType<typeof postAuthLogin>>;
  try {
    auth = await postAuthLogin(parsed.data);
  } catch {
    return { error: { message: LOGIN_REQUEST_FAILED_MESSAGE } };
  }

  if (!auth.ok) {
    return { error: { message: authErrorMessage(auth) } };
  }

  await persistAccessTokenCookie(auth.accessToken);
  redirect(resolveSafeNextPath(params.next));
}
