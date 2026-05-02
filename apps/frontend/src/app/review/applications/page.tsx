import { redirect } from "next/navigation";
import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { Card, CardContent } from "@/components/ui/card";
import { buildSpaceApplicationsHref } from "@/features/applications/application-routes";

type Space = {
  id: string;
};

type PageProps = {
  searchParams?: Promise<{ spaceId?: string }>;
};

export default async function LegacyReviewApplicationsPage({ searchParams }: PageProps) {
  try {
    const params = (await searchParams) ?? {};
    const spacesRaw = await backendAuthFetchJson("/groups");
    const spaces = unwrapData<{ groups?: Space[] }>(spacesRaw).groups ?? [];
    const spaceId = params.spaceId ?? spaces[0]?.id;
    if (spaceId) {
      redirect(buildSpaceApplicationsHref(spaceId));
    }

    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">参加スペースがありません</p>
        </CardContent>
      </Card>
    );
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              レビュー一覧の取得に失敗しました（status: {error.status}）
            </p>
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
