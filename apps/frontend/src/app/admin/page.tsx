import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ダッシュボード</h2>
          <p className="text-muted-foreground">
            テナント全体の利用状況を確認できます
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                申請件数
              </CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalApplications}</div>
              <p className="text-xs text-muted-foreground">
                全ての申請数
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                平均差し戻し数
              </CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgReturns.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                1申請あたりの平均
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                再提出件数
              </CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resubmitCount}</div>
              <p className="text-xs text-muted-foreground">
                差し戻し後レビュー中
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              ダッシュボードの取得に失敗しました（status: {error.status}）
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">ダッシュボードの取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }
}
