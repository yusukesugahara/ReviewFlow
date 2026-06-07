"use server";

import { redirect } from "next/navigation";
import type { FormActionResponse } from "@/lib/baseTypes";
import { authCredentialsSchema, type AuthCredentials } from "@/lib/auth-schema";
import { client } from "@/lib/server/backend-fetch";
import { errorMessageFromBody } from "@/lib/server/api-error";
import type { AuthRegisterSuccessJson, RegisterRequestBody } from "@/lib/schema";
import { persistAccessTokenCookie } from "../login/actions";

export type SignupSchema = AuthCredentials & { next?: string };

function authCredentialsFromFormData(formData: FormData): SignupSchema {
  const email = formData.get("email");
  const password = formData.get("password");
  const next = formData.get("next");
  return {
    email: typeof email === "string" ? email : "",
    password: typeof password === "string" ? password : "",
    ...(typeof next === "string" ? { next } : {}),
  };
}

/**
 * 認証エラーメッセージを取得する
 * @param result - 認証エラーメッセージを取得する結果
 * @returns 認証エラーメッセージ
 */
function authErrorMessage(result: { ok: false; status: number; body: unknown }): string {
  return errorMessageFromBody(result.body, "登録に失敗しました");
}

function isAuthIssueTokensSuccessJson(json: unknown): json is AuthRegisterSuccessJson {
  if (!json || typeof json !== "object") {
    return false;
  }
  const root = json as Record<string, unknown>;
  const data = root.data;
  return (
    (root.status === 200 || root.status === 201) &&
    !!data &&
    typeof data === "object" &&
    typeof (data as { access_token?: unknown }).access_token === "string"
  );
}

async function postAuthRegister(
  body: RegisterRequestBody,
): Promise<
  | { ok: true; accessToken: string }
  | { ok: false; status: number; body: unknown }
> {
  const response = await client.POST("/auth/register", { body });
  if (!response.response.ok || !isAuthIssueTokensSuccessJson(response.data)) {
    return {
      ok: false,
      status: response.response.status,
      body: response.error ?? response.data,
    };
  }
  return { ok: true, accessToken: response.data.data.access_token };
}

/**
 * 認証登録する
 * @param params - 認証登録するパラメータ
 * @returns 認証登録 API のレスポンス
 */
export async function signup(formData: FormData): Promise<FormActionResponse<void>> {
  const params = authCredentialsFromFormData(formData);
  const parsed = authCredentialsSchema.safeParse(params);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const auth = await postAuthRegister(parsed.data);
  if (!auth.ok) {
    return { error: { message: authErrorMessage(auth) } };
  }

  await persistAccessTokenCookie(auth.accessToken);
  redirect("/");
}
