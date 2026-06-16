"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE_NAME } from "@/lib/constants/auth.constants";

/**
 * accessToken Cookie を削除します。
 */
export async function clearAccessTokenCookie(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE_NAME);
}

/**
 * 現在のセッションを破棄してログイン画面へ遷移します。
 */
export async function logout(): Promise<void> {
  await clearAccessTokenCookie();
  redirect("/login");
}
