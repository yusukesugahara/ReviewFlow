import { isApiFailure } from "@/lib/server/api-failure";
import { normalizeSubmissionSearchParams } from "./_components/space-submissions.helpers";
import { getSpaceSubmissionsPageData } from "./page-data";
import type { SpaceSubmissionsPageProps } from "./types";
import { SpaceSubmissionsView } from "./view";

export default async function SpaceSubmissionsPage({
  params,
  searchParams,
}: SpaceSubmissionsPageProps) {
  const { spaceId } = await params;
  const query = await searchParams;
  const { filters, jobId } = normalizeSubmissionSearchParams(query);

  try {
    const data = await getSpaceSubmissionsPageData({ jobId, spaceId });

    return (
      <SpaceSubmissionsView
        applications={data.applications}
        filters={filters}
        latestExportJob={data.latestExportJob}
        currentUserId={data.currentUserId}
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
