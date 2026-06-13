import { isApiFailure } from "@/lib/server/api-failure";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { getSpaceOverviewPageData } from "./_data/page-data";
import type { SpaceOverviewPageProps } from "./types";
import { SpaceOverviewView } from "./view";

export default async function SpaceOverviewPage({
  params,
}: SpaceOverviewPageProps) {
  const { spaceId } = await params;
  const authHeaders = await authHeadersOrRedirect();

  try {
    const data = await getSpaceOverviewPageData({ authHeaders, spaceId });
    return <SpaceOverviewView {...data} spaceId={spaceId} />;
  } catch (error) {
    return (
      <SpaceOverviewView
        applications={[]}
        canManageSpace={false}
        currentUserId={null}
        fetchErrorStatus={isApiFailure(error) ? error.status : 500}
        formDefinitions={[]}
        isTenantAdmin={false}
        members={[]}
        space={null}
        spaceId={spaceId}
      />
    );
  }
}
