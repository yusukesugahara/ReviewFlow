"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormActionResponse } from "@/lib/baseTypes";
import { authCredentialsSchema, type AuthCredentials } from "@/lib/auth-schema";
import { client } from "@/lib/server/backend-fetch";
import { errorMessageFromBody, toApiFailure } from "@/lib/server/api-failure";
import { parseAuthRegisterSuccess } from "@/lib/server/auth-response-schema";
import { persistAccessTokenCookie } from "@/lib/server/session";
import type { RegisterRequestBody } from "@/lib/schema";

export type SignupSchema = AuthCredentials & { next?: string };

const signupFormSchema = z.object({
  email: z.string().catch(""),
  password: z.string().catch(""),
  next: z.string().optional(),
});

/**
 * サインアップフォームの FormData を認証入力の形に変換します。
 */
function authCredentialsFromFormData(formData: FormData): SignupSchema {
  return signupFormSchema.parse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
}

/**
 * 登録 API の失敗レスポンスから画面表示用のエラーメッセージを取得します。
 */
function authErrorMessage(result: { ok: false; status: number; body: unknown }): string {
  return errorMessageFromBody(result.body, "登録に失敗しました");
}

/**
 * 登録 API を呼び出し、成功時はアクセストークンを返します。
 */
async function postAuthRegister(
  body: RegisterRequestBody,
): Promise<
  | { ok: true; accessToken: string }
  | { ok: false; status: number; body: unknown }
> {
  const response = await client.POST("/auth/register", { body });
  const data = parseAuthRegisterSuccess(response.data);
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
 * サインアップフォームを検証し、登録後にセッション Cookie を保存します。
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
