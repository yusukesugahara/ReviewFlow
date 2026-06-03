import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type { GroupsListSuccessJson } from "@/lib/schema";
import type { FallbackSpaceContext, LegacySpaceApplicationsPageProps } from "./types";
import { LegacySpaceApplicationsEmptyView } from "./view";

export default async function LegacySpaceApplicationsPage({
  searchParams,
}: LegacySpaceApplicationsPageProps) {
  const query = (await searchParams) ?? {};
  const { spaceId, userRoles } = await getFallbackSpaceContext();
  const resolvedSpaceId = query.spaceId ?? spaceId;
  if (!resolvedSpaceId) {
    return <LegacySpaceApplicationsEmptyView userRoles={userRoles} />;
  }
  const params = new URLSearchParams();

  if (query.status) {
    params.set("status", query.status);
  }

  redirect(
    `/space/${encodeURIComponent(resolvedSpaceId)}/applications${
      params.size > 0 ? `?${params.toString()}` : ""
    }`,
  );
}

async function getFallbackSpaceContext(): Promise<FallbackSpaceContext> {
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
      ? unwrapData<GroupsListSuccessJson["data"]>(spacesRaw.data).groups ?? []
      : [];
  return { spaceId: spaces[0]?.id ?? "", userRoles: me?.roles ?? [] };
}
