import "server-only";

import { redirect } from "next/navigation";
import { getAccessTokenFromCookie } from "@/lib/server/session";

/**
 * Cookie から認証ヘッダーを作成し、未ログイン時はログイン画面へ遷移します。
 */
export async function authHeadersOrRedirect(): Promise<{ Authorization: string }> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }
  return { Authorization: `Bearer ${accessToken}` };
}
