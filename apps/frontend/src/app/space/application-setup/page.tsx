import { redirect } from "next/navigation";
import { buildSpaceApplicationNewHref } from "@/app/_components/applications/application-routes";
import { client } from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type { GroupsListSuccessJson } from "@/lib/schema";
import type { ApplicationSetupRedirectPageProps } from "./types";

export default async function AdminApplicationSetupPage({
  searchParams,
}: ApplicationSetupRedirectPageProps) {
  const params = (await searchParams) ?? {};
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }
  const spacesRaw = await client.GET("/groups", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const spaces =
    spacesRaw.response.ok && spacesRaw.data
      ? unwrapData<GroupsListSuccessJson["data"]>(spacesRaw.data).groups ?? []
      : [];
  const spaceId = params.spaceId ?? spaces[0]?.id ?? "";
  if (!spaceId) {
    redirect("/space");
  }
  const nextParams = new URLSearchParams();

  if (params.setupError) {
    nextParams.set("setupError", params.setupError);
  }
  if (params.setupStatus) {
    nextParams.set("setupStatus", params.setupStatus);
  }
  if (params.publishedGroupId) {
    nextParams.set("publishedGroupId", params.publishedGroupId);
  }
  if (params.publishedFormDefinitionId) {
    nextParams.set("publishedFormDefinitionId", params.publishedFormDefinitionId);
  }

  const query = nextParams.toString();
  redirect(
    `${buildSpaceApplicationNewHref(spaceId)}${query.length > 0 ? `?${query}` : ""}`,
  );
}
