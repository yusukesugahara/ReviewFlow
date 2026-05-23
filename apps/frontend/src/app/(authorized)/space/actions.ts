"use server";

import { client } from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type { AppSidebarSpace } from "@/components/app-sidebar";
import type { GroupsListSuccessJson } from "@/lib/schema";

export async function getSpaceLayoutSpaces(): Promise<AppSidebarSpace[]> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return [];
  }
  try {
    const response = await client.GET("/groups", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.response.ok || !response.data) {
      return [];
    }
    return unwrapData<GroupsListSuccessJson["data"]>(response.data).groups ?? [];
  } catch {
    return [];
  }
}
