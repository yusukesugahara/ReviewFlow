import { redirect } from "next/navigation";
import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";
import { Card, CardContent } from "@/components/ui/card";
import {
  type ApplicationDetailViewModel,
} from "@/app/_components/applications/application-detail-view";
import { buildSpaceApplicationDetailHref } from "@/app/_components/applications/application-routes";

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

export default async function ReviewApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const appRaw = await backendAuthFetchJson(`/applications/${id}`);
    const app = unwrapData<ApplicationDetailViewModel>(appRaw);
    const detailHref = buildSpaceApplicationDetailHref(app);
    if (detailHref) {
      redirect(detailHref);
    }

    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">レビュー詳細の遷移先を解決できませんでした</p>
        </CardContent>
      </Card>
    );
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              レビュー詳細の取得に失敗しました（status: {error.status}）
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">レビュー詳細の取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }
}
