import "server-only";

import type { ApplicationRow } from "@/components/space/space-applications.types";
import type {
  ApplicationsListSuccessJson,
  AuthMeSuccessJson,
  ExportJobResponse,
  GetExportJobSuccessJson,
} from "@/lib/schema";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/server/backend-fetch";

export type SpaceSubmissionsPageData = {
  applications: ApplicationRow[];
  currentUserId: string | null;
  latestExportJob: ExportJobResponse | null;
};

/**
 * スペースの提出一覧画面に必要な申請、現在ユーザー、CSV ジョブ情報を読み込みます。
 */
export async function getSpaceSubmissionsPageData({
  jobId,
  spaceId,
}: {
  jobId?: string;
  spaceId: string;
}): Promise<SpaceSubmissionsPageData> {
  const authHeaders = await authHeadersOrRedirect();
  const [applicationsRaw, jobRaw, meRaw] = await Promise.all([
    client.GET("/applications", {
      params: { query: { groupId: spaceId } },
      headers: authHeaders,
    }),
    jobId
      ? client.GET("/export-jobs/{id}", {
          params: { path: { id: jobId } },
          headers: authHeaders,
        })
      : Promise.resolve(null),
    client.POST("/auth/me", { headers: authHeaders }),
  ]);

  return {
    applications: unwrapResponseData<ApplicationsListSuccessJson["data"]>(
      applicationsRaw,
    ).applications as ApplicationRow[],
    currentUserId:
      meRaw.response.ok && meRaw.data
        ? unwrapResponseData<AuthMeSuccessJson["data"]>(meRaw).id
        : null,
    latestExportJob:
      jobRaw?.response.ok && jobRaw.data
        ? unwrapResponseData<ExportJobResponse>(
            jobRaw as typeof jobRaw & { data: GetExportJobSuccessJson },
          )
        : null,
  };
}
