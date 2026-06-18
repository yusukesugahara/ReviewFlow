import "server-only";

import { buildSpaceApplicationNewHref } from "@/components/applications/routing/application-routes";
import type { GroupsListSuccessJson } from "@/lib/schema";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/relay/client";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import { redirect } from "next/navigation";
import type { ApplicationSetupRedirectPageProps } from "../types";

type ApplicationSetupRedirectParams = Awaited<
  NonNullable<ApplicationSetupRedirectPageProps["searchParams"]>
>;

/**
 * 旧セットアップ URL から現在のスペース別新規申請画面への遷移先を解決します。
 */
export async function getApplicationSetupRedirectTarget(
  params: ApplicationSetupRedirectParams,
): Promise<string> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }

  const spacesRaw = await client.groups( {
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

/**
 * 旧セットアップ URL のクエリを新規申請画面へ引き継ぐ形式に変換します。
 */
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
