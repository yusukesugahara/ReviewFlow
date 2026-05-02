import Link from "next/link";
import {
  backendAuthFetchJson,
  BackendHttpError,
} from "@/lib/server/backend-auth-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApplicationEmptyState } from "@/features/applications/application-empty-state";
import { ApplicationListTable } from "@/features/applications/application-list-table";

type ApplicationRow = {
  id: string;
  status: string;
  formTemplateId: string;
  createdAt: string;
};

type Space = {
  id: string;
  name: string;
};

export default async function ApplicantApplicationsPage() {
  try {
    const spacesRaw = await backendAuthFetchJson("/groups");
    const spaces = unwrapData<{ groups?: Space[] }>(spacesRaw).groups ?? [];
    const activeSpaceId = spaces[0]?.id;
    const raw = activeSpaceId
      ? await backendAuthFetchJson(
          `/applications?groupId=${encodeURIComponent(activeSpaceId)}`,
        )
      : null;
    const rows =
      raw === null
        ? []
        : unwrapData<{ applications?: ApplicationRow[] }>(raw).applications ?? [];
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">自分の申請</h2>
            <p className="text-muted-foreground">
              あなたの申請一覧を確認できます
            </p>
          </div>
          <Button asChild>
            <Link href="/app/applications/new">新しい申請を作成</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>申請</CardTitle>
            <CardDescription>
              {rows.length}件の申請があります
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <ApplicationEmptyState
                message="まだ申請がありません"
                className="py-12"
                action={
                  <Button asChild>
                    <Link href="/app/applications/new">最初の申請を作成</Link>
                  </Button>
                }
              />
            ) : (
              <ApplicationListTable
                rows={rows}
                getDetailHref={(row) => `/app/applications/${row.id}`}
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
            <p className="text-destructive">申請一覧の取得に失敗しました（status: {error.status}）</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">申請一覧の取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }
}
