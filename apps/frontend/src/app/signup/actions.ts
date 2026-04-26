"use server";

import { redirect } from "next/navigation";
import type { FormActionResponse } from "@/lib/baseTypes";
import { authCredentialsSchema, type AuthCredentials } from "@/lib/auth-schema";
import { errorMessageFromBody, postAuthRegister } from "@/lib/server/auth-api";
import { persistAccessTokenCookie } from "../login/actions";

export type SignupSchema = AuthCredentials & { next?: string };

/**
 * 認証エラーメッセージを取得する
 * @param result - 認証エラーメッセージを取得する結果
 * @returns 認証エラーメッセージ
 */
function authErrorMessage(result: { ok: false; status: number; body: unknown }): string {
  return errorMessageFromBody(result.body);
}

/**
 * 認証登録する
 * @param params - 認証登録するパラメータ
 * @returns 認証登録 API のレスポンス
 */
export async function signup(params: SignupSchema): Promise<FormActionResponse<void>> {
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
