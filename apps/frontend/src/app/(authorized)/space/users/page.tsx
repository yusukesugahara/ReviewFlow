import { isApiFailure } from "@/lib/server/api-failure";
import { SpaceEmptyState } from "@/components/space/space-empty-state";
import { getSpaceUsersPageData } from "./page-data";
import type { SpaceUsersPageProps } from "./types";
import { SpaceUsersErrorView, SpaceUsersView } from "./view";

export default async function SpaceUsersPage({ searchParams }: SpaceUsersPageProps) {
  try {
    const params = (await searchParams) ?? {};
    const data = await getSpaceUsersPageData({
      querySpaceId: params.spaceId,
    });

    if (data.kind === "empty") {
      return <SpaceEmptyState userRoles={data.userRoles} />;
    }

    return (
      <SpaceUsersView
        availableUsers={data.availableUsers}
        currentUserId={data.currentUserId}
        error={params.error}
        formError={params.formError}
        isTenantAdmin={data.isTenantAdmin}
        members={data.members}
        spaceId={data.spaceId}
      />
    );
  } catch (error) {
    return (
      <SpaceUsersErrorView
        status={isApiFailure(error) ? error.status : undefined}
      />
    );
  }
}
