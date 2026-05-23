"use server";

import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type { AuthMeSuccessJson } from "@/lib/schema";

export type CurrentSessionUser = {
  id: string;
  email: string;
  tenantId: string;
  roles: string[];
};

function isAuthMeSuccessJson(json: unknown): json is AuthMeSuccessJson {
  if (!json || typeof json !== "object") {
    return false;
  }
  const root = json as Record<string, unknown>;
  const data = root.data;
  if (root.status !== 200 || !data || typeof data !== "object") {
    return false;
  }
  const d = data as Record<string, unknown>;
  return (
    typeof d.id === "string" &&
    typeof d.email === "string" &&
    typeof d.tenantId === "string" &&
    Array.isArray(d.roles) &&
    d.roles.every((role) => typeof role === "string")
  );
}

async function getAuthMe(accessToken: string): Promise<CurrentSessionUser | null> {
  const response = await client.POST("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.response.ok || !isAuthMeSuccessJson(response.data)) {
    return null;
  }
  return response.data.data;
}

export async function getCurrentSessionUser(): Promise<CurrentSessionUser | null> {
  const token = await getAccessTokenFromCookie();
  if (!token) {
    return null;
  }
  return getAuthMe(token);
}
