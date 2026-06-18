"use server";

import { client } from "@/lib/relay/client";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type { AppSidebarSpace } from "@/components/layout/app-sidebar.types";
import type { GroupsListSuccessJson } from "@/lib/schema";

/**
 * 管理レイアウトのサイドバーに表示するスペース一覧を取得します。
 */
export async function getAdminLayoutSpaces(): Promise<AppSidebarSpace[]> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return [];
  }
  try {
    const response = await client.groups( {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return unwrapResponseData<GroupsListSuccessJson["data"]>(response).groups ?? [];
  } catch {
    return [];
  }
}
