import { redirect } from "next/navigation";
import { buildSpaceApplicationsHref } from "@/components/applications/routing/application-routes";
import { getFallbackSpaceContext } from "./_data/page-data";
import type { LegacySpaceApplicationsPageProps } from "./types";
import { LegacySpaceApplicationsEmptyView } from "./view";

/**
 * 旧申請一覧ルートからスペース別申請一覧へリダイレクトします。
 */
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
