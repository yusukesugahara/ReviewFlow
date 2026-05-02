import { redirect } from "next/navigation";
import {
  backendApplicantFetchJson,
  ApplicantBackendHttpError,
} from "@/lib/server/backend-applicant-fetch";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildSpaceApplicationEditHref,
  buildSpaceApplicationDetailHref,
} from "@/features/applications/application-routes";

type ApplicationDetail = {
  id: string;
  groupId?: string | null;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

export default async function LegacyApplicationEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const appRaw = await backendApplicantFetchJson(`/public/applications/${id}`);
    const app = unwrapData<ApplicationDetail>(appRaw);
    const editHref = buildSpaceApplicationEditHref(app);
    if (editHref) {
      redirect(editHref);
    }

    const detailHref = buildSpaceApplicationDetailHref(app);
    if (detailHref) {
      redirect(detailHref);
    }

    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">申請編集画面の遷移先を解決できませんでした</p>
        </CardContent>
      </Card>
    );
  } catch (error) {
    if (error instanceof ApplicantBackendHttpError) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              申請編集画面の取得に失敗しました（status: {error.status}）
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">申請編集画面の取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }
}
