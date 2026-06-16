import { unstable_rethrow } from "next/navigation";
import { SpaceEmptyState } from "@/components/space/space-empty-state";
import { isApiFailure } from "@/lib/server/api-failure";
import { getAdminDashboardPageData } from "./_data/dashboard-page-data";
import { AdminDashboardView } from "./view";
import type { AdminDashboardPageProps } from "./types";

/**
 * スペースダッシュボード画面のデータを読み込んで表示します。
 */
export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  try {
    const params = (await searchParams) ?? {};
    const data = await getAdminDashboardPageData({
      selectedSpaceId: params.spaceId,
    });

    if (data.kind === "empty") {
      return <SpaceEmptyState userRoles={data.userRoles} />;
    }

    return (
      <AdminDashboardView
        selectedSpaceId={data.selectedSpaceId}
        spaces={data.spaces}
      />
    );
  } catch (error) {
    unstable_rethrow(error);
    return (
      <AdminDashboardView
        fetchErrorStatus={isApiFailure(error) ? error.status : 500}
        selectedSpaceId=""
        spaces={[]}
      />
    );
  }
}
