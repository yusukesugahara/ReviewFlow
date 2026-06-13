import "server-only";

import { buildSpaceApplicationNewHref } from "@/components/applications/routing/application-routes";
import type { GroupsListSuccessJson } from "@/lib/schema";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import { redirect } from "next/navigation";
import type { ApplicationSetupRedirectPageProps } from "./types";

type ApplicationSetupRedirectParams = Awaited<
  NonNullable<ApplicationSetupRedirectPageProps["searchParams"]>
>;

export async function getApplicationSetupRedirectTarget(
  params: ApplicationSetupRedirectParams,
): Promise<string> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }

  const spacesRaw = await client.GET("/groups", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const spaces =
    spacesRaw.response.ok && spacesRaw.data
      ? unwrapResponseData<GroupsListSuccessJson["data"]>(spacesRaw).groups ?? []
      : [];
  const spaceId = params.spaceId ?? spaces[0]?.id ?? "";
  if (!spaceId) {
    redirect("/space");
  }

  const query = buildApplicationSetupRedirectQuery(params);
  return `${buildSpaceApplicationNewHref(spaceId)}${
    query.length > 0 ? `?${query}` : ""
  }`;
}

function buildApplicationSetupRedirectQuery(
  params: ApplicationSetupRedirectParams,
): string {
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

  return nextParams.toString();
}
