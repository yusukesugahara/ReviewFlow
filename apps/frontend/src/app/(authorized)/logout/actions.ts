"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE_NAME } from "@/lib/constants/auth.constants";

/**
 * accessToken クッキーを削除する
 */
export async function clearAccessTokenCookie(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE_NAME);
}

export async function logout(): Promise<void> {
  await clearAccessTokenCookie();
  redirect("/login");
}
