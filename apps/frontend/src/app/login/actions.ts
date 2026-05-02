"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { FormActionResponse } from "@/lib/baseTypes";
import { authCredentialsSchema, type AuthCredentials } from "@/lib/auth-schema";
import { ACCESS_TOKEN_COOKIE_NAME } from "@/lib/constants/auth.constants";
import { isProduction } from "@/lib/env";
import { errorMessageFromBody, postAuthLogin } from "@/lib/server/auth-api";

export type LoginSchema = AuthCredentials & { next?: string };

function authCredentialsFromFormData(formData: FormData): LoginSchema {
  const email = formData.get("email");
  const password = formData.get("password");
  const next = formData.get("next");
  return {
    email: typeof email === "string" ? email : "",
    password: typeof password === "string" ? password : "",
    ...(typeof next === "string" ? { next } : {}),
  };
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

function authErrorMessage(result: { ok: false; status: number; body: unknown }): string {
  return errorMessageFromBody(result.body);
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

  const auth = await postAuthLogin(parsed.data);
  if (!auth.ok) {
    return { error: { message: authErrorMessage(auth) } };
  }

  await persistAccessTokenCookie(auth.accessToken);
  redirect(resolveSafeNextPath(params.next));
}
