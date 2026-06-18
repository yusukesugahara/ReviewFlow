import "server-only";

import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import type { SpaceDashboardSuccessJson } from "@/lib/schema";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/relay/client";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type { SpaceDashboardSummary } from "../types";

export type AdminDashboardPageData =
  | {
      kind: "empty";
      userRoles: string[];
    }
  | {
      kind: "ready";
      selectedSpaceId: string;
      spaces: SpaceDashboardSummary[];
    };

/**
 * スペースダッシュボード画面に必要な集計データを読み込みます。
 */
export async function getAdminDashboardPageData({
  selectedSpaceId,
}: {
  selectedSpaceId?: string;
}): Promise<AdminDashboardPageData> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` };
  const [dashboardRaw, me] = await Promise.all([
    client.spaceDashboard( { headers: authHeaders }),
    getCurrentSessionUser(),
  ]);
  const spaces =
    unwrapResponseData<SpaceDashboardSuccessJson["data"]>(dashboardRaw)
      .spaces ?? [];
  const resolvedSelectedSpaceId = selectedSpaceId ?? spaces[0]?.id ?? "";

  if (!resolvedSelectedSpaceId) {
    return {
      kind: "empty",
      userRoles: me?.roles ?? [],
    };
  }

  return {
    kind: "ready",
    selectedSpaceId: resolvedSelectedSpaceId,
    spaces,
  };
}
