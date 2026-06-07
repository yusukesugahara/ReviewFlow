"use server";

import { client } from "@/lib/server/backend-fetch";
import { parseAuthMeSuccess } from "@/lib/server/auth-response-schema";
import { getAccessTokenFromCookie } from "@/lib/server/session";

export type CurrentSessionUser = {
  id: string;
  email: string;
  tenantId: string;
  roles: string[];
};

async function getAuthMe(accessToken: string): Promise<CurrentSessionUser | null> {
  const response = await client.POST("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = parseAuthMeSuccess(response.data);
  if (!response.response.ok || !data) {
    return null;
  }
  return data.data;
}

export async function getCurrentSessionUser(): Promise<CurrentSessionUser | null> {
  const token = await getAccessTokenFromCookie();
  if (!token) {
    return null;
  }
  return getAuthMe(token);
}
