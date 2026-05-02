import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationEmptyState } from "@/features/applications/application-empty-state";
import { ApplicationListTable } from "@/features/applications/application-list-table";

type ApplicationRow = {
  id: string;
  status: string;
  applicantEmail: string;
  formTemplateId: string;
  createdAt: string;
};

type PageProps = {
  searchParams?: Promise<{ spaceId?: string }>;
};

export default async function ReviewApplicationsPage({ searchParams }: PageProps) {
  try {
    const params = (await searchParams) ?? {};
    const spacesRaw = await backendAuthFetchJson("/groups");
    const spaces = unwrapData<{ groups?: { id: string }[] }>(spacesRaw).groups ?? [];
    const spaceId = params.spaceId ?? spaces[0]?.id ?? "";
    const raw = await backendAuthFetchJson(
      `/applications?groupId=${encodeURIComponent(spaceId)}`,
    );
    const rows =
      unwrapData<{ applications?: ApplicationRow[] }>(raw).applications ?? [];

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">レビュー待ち申請</h2>
          <p className="text-muted-foreground">
            あなたがレビューすべき申請一覧です
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>レビュー対象</CardTitle>
            <CardDescription>
              {rows.length}件の申請があります
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <ApplicationEmptyState message="レビュー待ちの申請はありません" />
            ) : (
              <ApplicationListTable
                rows={rows}
                getDetailHref={(row) => `/review/applications/${row.id}`}
                actionLabel="レビュー"
                showApplicantEmail
              />
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">レビュー一覧の取得に失敗しました（status: {error.status}）</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">レビュー一覧の取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }
}
