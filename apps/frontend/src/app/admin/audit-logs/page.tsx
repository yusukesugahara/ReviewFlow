import { client } from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type { AuditLogsListSuccessJson } from "@/lib/schema";
import { AdminAuditLogsErrorView, AdminAuditLogsView } from "./view";

export default async function AdminAuditLogsPage() {
  try {
    const accessToken = await getAccessTokenFromCookie();
    if (!accessToken) {
      throw 401;
    }

    const response = await client.GET("/audit-logs", {
      params: { query: { limit: 50 } },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data: AuditLogsListSuccessJson | undefined = response.data;
    if (!response.response.ok || !data) {
      throw response.response.status;
    }

    const rows = unwrapData<AuditLogsListSuccessJson["data"]>(data).logs ?? [];
    return <AdminAuditLogsView rows={rows} />;
  } catch (error) {
    return (
      <AdminAuditLogsErrorView
        status={typeof error === "number" ? error : undefined}
      />
    );
  }
}
