import { isApiFailure } from "@/lib/server/api-failure";
import { getAdminAuditLogsPageData } from "./_data/page-data";
import { AdminAuditLogsErrorView, AdminAuditLogsView } from "./view";

type AdminAuditLogsPageProps = {
  searchParams?: Promise<{
    createdFrom?: string;
    createdTo?: string;
    page?: string;
    q?: string;
    targetType?: string;
  }>;
};

/**
 * 管理者向け監査ログ画面のデータを読み込んで表示します。
 */
export default async function AdminAuditLogsPage({
  searchParams,
}: AdminAuditLogsPageProps) {
  try {
    const data = await getAdminAuditLogsPageData(await searchParams);
    return <AdminAuditLogsView {...data} />;
  } catch (error) {
    return (
      <AdminAuditLogsErrorView
        status={isApiFailure(error) ? error.status : undefined}
      />
    );
  }
}
