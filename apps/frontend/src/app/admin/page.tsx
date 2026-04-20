import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";

type AppSummary = { id: string; status: string; applicantUserId: string };
type CorrectionEntry = { id: string };

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

export default async function AdminDashboardPage() {
  try {
    const appsRaw = await backendAuthFetchJson("/applications");
    const apps = unwrapData<{ applications?: AppSummary[] }>(appsRaw).applications ?? [];

    let correctionCount = 0;
    let resubmitCount = 0;
    for (const app of apps) {
      const cRaw = await backendAuthFetchJson(`/applications/${app.id}/corrections`);
      const corrections =
        unwrapData<{ corrections?: CorrectionEntry[] }>(cRaw).corrections ?? [];
      correctionCount += corrections.length;
      if (corrections.length > 0 && app.status === "in_review") {
        resubmitCount += 1;
      }
    }

    const totalApplications = apps.length;
    const avgReturns =
      totalApplications > 0 ? correctionCount / totalApplications : 0;

    return (
      <section style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>利用状況</h2>
        <div>申請件数: {totalApplications}</div>
        <div>平均差し戻し数: {avgReturns.toFixed(2)}</div>
        <div>再申請（再提出後 in_review）件数: {resubmitCount}</div>
      </section>
    );
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return (
        <p>
          ダッシュボードの取得に失敗しました（status: {error.status}）
        </p>
      );
    }
    return <p>ダッシュボードの取得に失敗しました</p>;
  }
}
