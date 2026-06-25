import { redirect } from "next/navigation";
import { buildSpaceApplicationsHref } from "@/components/applications/routing/application-routes";
import { SpaceEmptyState } from "@/components/space/space-empty-state";
import { getFallbackSpaceContext } from "./applications/_data/page-data";

/**
 * スペース入口を既定スペースの申請フォーム一覧へリダイレクトします。
 */
export default async function SpaceEntryPage() {
  const { spaceId, userRoles } = await getFallbackSpaceContext();
  if (!spaceId) {
    return <SpaceEmptyState userRoles={userRoles} />;
  }

  redirect(buildSpaceApplicationsHref(spaceId));
}
