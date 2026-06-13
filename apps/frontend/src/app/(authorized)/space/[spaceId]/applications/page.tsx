import { isApiFailure } from "@/lib/server/api-failure";
import { getSpaceApplicationsPageData } from "./_data/page-data";
import type { SpaceApplicationsPageProps } from "./types";
import { SpaceApplicationsView } from "./view";

export default async function SpaceApplicationsPage({
  params,
  searchParams,
}: SpaceApplicationsPageProps) {
  const [{ spaceId }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as Awaited<NonNullable<SpaceApplicationsPageProps["searchParams"]>>),
  ]);
  const showArchived = query.archived === "true";

  try {
    const data = await getSpaceApplicationsPageData({ showArchived, spaceId });
    return (
      <SpaceApplicationsView
        applications={data.applications}
        formDefinitions={data.formDefinitions}
        showArchived={showArchived}
        spaceId={spaceId}
      />
    );
  } catch (error) {
    return (
      <SpaceApplicationsView
        applications={[]}
        formDefinitions={[]}
        fetchErrorStatus={isApiFailure(error) ? error.status : 500}
        showArchived={showArchived}
        spaceId={spaceId}
      />
    );
  }
}
