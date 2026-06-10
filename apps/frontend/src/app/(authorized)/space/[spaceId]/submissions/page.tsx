import { client } from "@/lib/server/backend-fetch";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { isApiFailure } from "@/lib/server/api-failure";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import type { ApplicationRow } from "@/components/space/space-applications.types";
import type {
  ApplicationsListSuccessJson,
  AuthMeSuccessJson,
  ExportJobResponse,
  GetExportJobSuccessJson,
} from "@/lib/schema";
import { normalizeSubmissionSearchParams } from "./_components/space-submissions.helpers";
import type { SpaceSubmissionsPageProps } from "./types";
import { SpaceSubmissionsView } from "./view";

export default async function SpaceSubmissionsPage({
  params,
  searchParams,
}: SpaceSubmissionsPageProps) {
  const { spaceId } = await params;
  const query = await searchParams;
  const { filters, jobId } = normalizeSubmissionSearchParams(query);
  const authHeaders = await authHeadersOrRedirect();

  try {
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
    const latestExportJob =
      jobRaw?.response.ok && jobRaw.data
        ? unwrapResponseData<ExportJobResponse>(
            jobRaw as typeof jobRaw & { data: GetExportJobSuccessJson },
          )
        : null;
    const currentUserId =
      meRaw.response.ok && meRaw.data
        ? unwrapResponseData<AuthMeSuccessJson["data"]>(meRaw).id
        : null;

    return (
      <SpaceSubmissionsView
        applications={
          unwrapResponseData<ApplicationsListSuccessJson["data"]>(applicationsRaw)
            .applications as ApplicationRow[]
        }
        filters={filters}
        latestExportJob={latestExportJob}
        currentUserId={currentUserId}
        spaceId={spaceId}
      />
    );
  } catch (error) {
    return (
      <SpaceSubmissionsView
        applications={[]}
        fetchErrorStatus={isApiFailure(error) ? error.status : 500}
        filters={filters}
        latestExportJob={null}
        currentUserId={null}
        spaceId={spaceId}
      />
    );
  }
}
