"use server";

import { client } from "@/lib/server/backend-fetch";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type { AppSidebarSpace } from "@/components/app-sidebar.types";
import type { GroupsListSuccessJson } from "@/lib/schema";

export async function getAdminLayoutSpaces(): Promise<AppSidebarSpace[]> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return [];
  }
  try {
    const response = await client.GET("/groups", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return unwrapResponseData<GroupsListSuccessJson["data"]>(response).groups ?? [];
  } catch {
    return [];
  }
}
