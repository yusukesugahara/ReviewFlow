import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { buildSpaceApplicationNewHref } from "@/features/applications/application-routes";
import {
  backendAuthFetchJson,
  BackendHttpError,
} from "@/lib/server/backend-auth-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { SpaceEmptyState } from "@/features/spaces/space-empty-state";
import { getCurrentSessionUser } from "@/lib/server/session";

type Space = {
  id: string;
};

export default async function LegacyNewApplicationPage() {
  try {
    const [spacesRaw, me] = await Promise.all([
      backendAuthFetchJson("/groups"),
      getCurrentSessionUser(),
    ]);
    const spaces = unwrapData<{ groups?: Space[] }>(spacesRaw).groups ?? [];
    const spaceId = spaces[0]?.id;
    if (spaceId) {
      redirect(buildSpaceApplicationNewHref(spaceId));
    }

    return <SpaceEmptyState userRoles={me?.roles ?? []} />;
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              申請作成画面の取得に失敗しました（status: {error.status}）
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">申請作成画面の取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }
}
