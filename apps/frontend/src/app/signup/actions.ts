"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormActionResponse } from "@/lib/baseTypes";
import { authCredentialsSchema, type AuthCredentials } from "@/lib/auth-schema";
import { client } from "@/lib/server/backend-fetch";
import { errorMessageFromBody, toApiFailure } from "@/lib/server/api-failure";
import { parseAuthRegisterSuccess } from "@/lib/server/auth-response-schema";
import type { RegisterRequestBody } from "@/lib/schema";
import { persistAccessTokenCookie } from "../login/actions";

export type SignupSchema = AuthCredentials & { next?: string };

const signupFormSchema = z.object({
  email: z.string().catch(""),
  password: z.string().catch(""),
  next: z.string().optional(),
});

function authCredentialsFromFormData(formData: FormData): SignupSchema {
  return signupFormSchema.parse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
}

/**
 * 認証エラーメッセージを取得する
 * @param result - 認証エラーメッセージを取得する結果
 * @returns 認証エラーメッセージ
 */
function authErrorMessage(result: { ok: false; status: number; body: unknown }): string {
  return errorMessageFromBody(result.body, "登録に失敗しました");
}

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
