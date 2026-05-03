import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SpaceEmptyState } from "@/features/spaces/space-empty-state";
import { getCurrentSessionUser } from "@/lib/server/session";
import { MetricCard } from "./_components/metric-card";

type AppSummary = { id: string; status: string; applicantEmail: string };
type CorrectionEntry = { id: string };

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

type PageProps = {
  searchParams?: Promise<{ spaceId?: string }>;
};

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  try {
    const params = (await searchParams) ?? {};
    const [spacesRaw, me] = await Promise.all([
      backendAuthFetchJson("/groups"),
      getCurrentSessionUser(),
    ]);
    const spaces = unwrapData<{ groups?: { id: string }[] }>(spacesRaw).groups ?? [];
    const spaceId = params.spaceId ?? spaces[0]?.id ?? "";
    if (!spaceId) {
      return <SpaceEmptyState userRoles={me?.roles ?? []} />;
    }
    const appsRaw = await backendAuthFetchJson(
      `/applications?groupId=${encodeURIComponent(spaceId)}`,
    );
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
      <div className="space-y-10">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">ダッシュボード</h2>
          <p className="max-w-2xl text-[15px] leading-6 text-slate-600 md:text-[16px]">
            テナント全体の利用状況を確認できます
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">主要アクション</h3>
              <p className="text-sm text-slate-600">主要業務へ1クリックで移動できます。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/space/application-setup">申請作成</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/space/applications?spaceId=${encodeURIComponent(spaceId)}`}>
                  申請一覧を見る
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-5 md:grid-cols-3">
          <MetricCard
            title="申請件数"
            value={totalApplications}
            description="全ての申請数"
            toneClassName="bg-violet-100"
            iconClassName="text-violet-600"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-full w-full"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
          <MetricCard
            title="平均差し戻し数"
            value={avgReturns.toFixed(2)}
            description="1申請あたりの平均"
            toneClassName="bg-indigo-100"
            iconClassName="text-indigo-600"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-full w-full"
              >
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <path d="M2 10h20" />
              </svg>
            }
          />
          <MetricCard
            title="再提出件数"
            value={resubmitCount}
            description="差し戻し後レビュー中"
            toneClassName="bg-sky-100"
            iconClassName="text-sky-700"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-full w-full"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            }
          />
        </div>
      </div>
    );
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-rose-700">
              ダッシュボードの取得に失敗しました（status: {error.status}）
            </p>
            <p className="mt-1 text-xs text-rose-600">
              通信状況を確認してから再読み込みしてください。
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="border-rose-200 bg-rose-50">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-rose-700">ダッシュボードの取得に失敗しました</p>
          <p className="mt-1 text-xs text-rose-600">
            時間を置いて再度お試しください。
          </p>
        </CardContent>
      </Card>
    );
  }
}
