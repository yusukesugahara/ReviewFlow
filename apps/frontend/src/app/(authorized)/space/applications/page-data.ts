import "server-only";

import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import type { GroupsListSuccessJson } from "@/lib/schema";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import { redirect } from "next/navigation";
import type { FallbackSpaceContext } from "./types";

export async function getFallbackSpaceContext(): Promise<FallbackSpaceContext> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }

  const [spacesRaw, me] = await Promise.all([
    client.GET("/groups", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    getCurrentSessionUser(),
  ]);
  const spaces =
    spacesRaw.response.ok && spacesRaw.data
      ? unwrapResponseData<GroupsListSuccessJson["data"]>(spacesRaw).groups ?? []
      : [];

  return { spaceId: spaces[0]?.id ?? "", userRoles: me?.roles ?? [] };
}
