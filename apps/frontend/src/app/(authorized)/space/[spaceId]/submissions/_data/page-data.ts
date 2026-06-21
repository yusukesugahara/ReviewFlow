import "server-only";

import type {
  AuthMeSuccessJson,
  ExportJobResponse,
  GetExportJobSuccessJson,
} from "@/lib/schema";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/relay/client";

export type SpaceSubmissionsPageData = {
  currentUserId: string | null;
  latestExportJob: ExportJobResponse | null;
};

/**
 * スペースの提出一覧画面に必要な現在ユーザー、CSV ジョブ情報を読み込みます。
 */
export async function getSpaceSubmissionsPageData({
  jobId,
}: {
  jobId?: string;
}): Promise<SpaceSubmissionsPageData> {
  const authHeaders = await authHeadersOrRedirect();
  const [jobRaw, meRaw] = await Promise.all([
    jobId
      ? client.exportJob( {
          params: { path: { id: jobId } },
          headers: authHeaders,
        })
      : Promise.resolve(null),
    client.me( { headers: authHeaders }),
  ]);

  return {
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
