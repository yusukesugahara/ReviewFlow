import "server-only";

import { redirect } from "next/navigation";
import { getAccessTokenFromCookie } from "@/lib/server/session";

export async function authHeadersOrRedirect(): Promise<{ Authorization: string }> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }
  return { Authorization: `Bearer ${accessToken}` };
}
