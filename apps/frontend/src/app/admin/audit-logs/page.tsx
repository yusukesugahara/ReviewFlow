import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";

type AuditLogItem = {
  id: string;
  actionType: string;
  targetType: string;
  targetId: string | null;
  actorUserId: string | null;
  createdAt: string;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

export default async function AdminAuditLogsPage() {
  try {
    const raw = await backendAuthFetchJson("/audit-logs?limit=50");
    const rows = unwrapData<{ logs?: AuditLogItem[] }>(raw).logs ?? [];
    return (
      <section style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>監査ログ</h2>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th align="left">Time</th>
              <th align="left">Action</th>
              <th align="left">Target</th>
              <th align="left">Target ID</th>
              <th align="left">Actor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
                <td>{row.actionType}</td>
                <td>{row.targetType}</td>
                <td>{row.targetId ?? "-"}</td>
                <td>{row.actorUserId ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return <p>監査ログの取得に失敗しました（status: {error.status}）</p>;
    }
    return <p>監査ログの取得に失敗しました</p>;
  }
}
