"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormActionResponse } from "@/lib/baseTypes";
import { authCredentialsSchema, type AuthCredentials } from "@/lib/auth-schema";
import { client } from "@/lib/server/backend-fetch";
import { errorMessageFromBody, toApiFailure } from "@/lib/server/api-failure";
import { parseAuthLoginSuccess } from "@/lib/server/auth-response-schema";
import { persistAccessTokenCookie } from "@/lib/server/session";
import type { LoginRequestBody } from "@/lib/schema";

export type LoginSchema = AuthCredentials & { next?: string };

const LOGIN_FAILED_MESSAGE = "ログインに失敗しました";
const LOGIN_REQUEST_FAILED_MESSAGE =
  "ログインに失敗しました。時間をおいて再度お試しください。";
const INVALID_CREDENTIALS_MESSAGE =
  "メールアドレスまたはパスワードが違います。";
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
    const failure = toApiFailure(response);
    return {
      ok: false,
      status: failure.status,
      body: failure.body,
    };
  }
  return { ok: true, accessToken: data.data.access_token };
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
