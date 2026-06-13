import { isApiFailure } from "@/lib/server/api-failure";
import { getSpaceOverviewPageData } from "./_data/page-data";
import type { SpaceOverviewPageProps } from "./types";
import { SpaceOverviewView } from "./view";

export default async function SpaceOverviewPage({
  params,
}: SpaceOverviewPageProps) {
  const { spaceId } = await params;

  try {
    const data = await getSpaceOverviewPageData({ spaceId });
    return <SpaceOverviewView {...data} spaceId={spaceId} />;
  } catch (error) {
    return (
      <SpaceOverviewView
        applications={[]}
        auditLogs={[]}
        canManageSpace={false}
        canViewAuditLogs={false}
        currentUserId={null}
        fetchErrorStatus={isApiFailure(error) ? error.status : 500}
        formDefinitions={[]}
        members={[]}
        space={null}
        spaceId={spaceId}
      />
    );
  }
}
