import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";

type ApplicationRow = {
  id: string;
  status: string;
  formTemplateId: string;
  createdAt: string;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

export default async function ApplicantApplicationsPage() {
  try {
    const raw = await backendAuthFetchJson("/applications");
    const rows =
      unwrapData<{ applications?: ApplicationRow[] }>(raw).applications ?? [];
    return (
      <section style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>自分の申請</h2>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th align="left">ID</th>
              <th align="left">Status</th>
              <th align="left">Template</th>
              <th align="left">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.status}</td>
                <td>{r.formTemplateId}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return <p>申請一覧の取得に失敗しました（status: {error.status}）</p>;
    }
    return <p>申請一覧の取得に失敗しました</p>;
  }
}
