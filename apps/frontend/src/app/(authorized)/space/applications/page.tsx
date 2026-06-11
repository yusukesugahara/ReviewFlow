import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import { buildSpaceApplicationsHref } from "@/components/applications/application-routes";
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
  redirect(buildSpaceApplicationsHref(resolvedSpaceId, { status: query.status }));
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
      ? unwrapResponseData<GroupsListSuccessJson["data"]>(spacesRaw).groups ?? []
      : [];
  return { spaceId: spaces[0]?.id ?? "", userRoles: me?.roles ?? [] };
}
