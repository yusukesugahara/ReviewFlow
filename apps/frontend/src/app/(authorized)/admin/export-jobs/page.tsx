import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type {
  ExportJobResponse,
  GetExportJobSuccessJson,
  GroupsListSuccessJson,
} from "@/lib/schema";
import { ExportJobsView } from "./view";
import type { ExportJobsPageProps } from "./types";

export default async function ExportJobsPage({ searchParams }: ExportJobsPageProps) {
  const params = (await searchParams) ?? {};
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` };
  const spacesResponse = await client.GET("/groups", { headers: authHeaders });
  const spacesData: GroupsListSuccessJson | undefined = spacesResponse.data;
  const spaces =
    spacesResponse.response.ok && spacesData
      ? unwrapData<GroupsListSuccessJson["data"]>(spacesData).groups ?? []
      : [];
  const groupId = spaces[0]?.id ?? "";
  const jobId = params.jobId;
  let latestJob: ExportJobResponse | null = null;
  let errorText: string | null = null;

  if (jobId) {
    try {
      const response = await client.GET("/export-jobs/{id}", {
        params: { path: { id: jobId } },
        headers: authHeaders,
      });
      const data: GetExportJobSuccessJson | undefined = response.data;
      if (!response.response.ok || !data) {
        throw response.response.status;
      }
      latestJob = unwrapData<ExportJobResponse>(data);
    } catch (error) {
      errorText =
        typeof error === "number"
          ? `CSVジョブ取得に失敗しました（status: ${error}）`
          : "CSVジョブ取得に失敗しました";
    }
  }

  return (
    <ExportJobsView
      groupId={groupId}
      latestJob={latestJob}
      errorText={errorText}
      formError={params.formError}
    />
  );
}
