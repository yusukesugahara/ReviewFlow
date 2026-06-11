import { isApiFailure } from "@/lib/server/api-failure";
import { getAdminAuditLogsPageData } from "./page-data";
import { AdminAuditLogsErrorView, AdminAuditLogsView } from "./view";

type AdminAuditLogsPageProps = {
  searchParams?: Promise<{
    createdFrom?: string;
    createdTo?: string;
    outcome?: string;
    q?: string;
    risk?: string;
  }>;
};

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
