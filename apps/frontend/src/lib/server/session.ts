import "server-only";

import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE_NAME } from "@/lib/constants/auth.constants";
import { postAuthMe } from "@/lib/server/auth-api";

export type CurrentSessionUser = {
  id: string;
  email: string;
  tenantId: string;
  roles: string[];
};

export async function getAccessTokenFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? null;
}

export async function getCurrentSessionUser(): Promise<CurrentSessionUser | null> {
  const token = await getAccessTokenFromCookie();
  if (!token) {
    return null;
  }
  const me = await postAuthMe(token);
  if (!me.ok) {
    return null;
  }
  return me.me;
}
