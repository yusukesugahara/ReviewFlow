import { buildSpaceApplicationNewHref } from "@/components/applications/application-routes";
import { getSpaceNewApplicationPageData } from "./page-data";
import type { SpaceNewApplicationPageProps } from "./types";
import { SpaceNewApplicationView } from "./view";

export default async function SpaceNewApplicationPage({
  params,
  searchParams,
}: SpaceNewApplicationPageProps) {
  const [{ spaceId }, query] = await Promise.all([
    params,
    searchParams ??
      Promise.resolve({} as Awaited<NonNullable<SpaceNewApplicationPageProps["searchParams"]>>),
  ]);
  const newApplicationHref = buildSpaceApplicationNewHref(spaceId);
  const data = await getSpaceNewApplicationPageData({ spaceId });

  return (
    <SpaceNewApplicationView
      assignees={data.assignees}
      canManageSpace={data.canManageSpace}
      newApplicationHref={newApplicationHref}
      publishedFormDefinitionId={query.publishedFormDefinitionId ?? null}
      publishedGroupId={query.publishedGroupId ?? null}
      setupError={query.setupError}
      setupErrorDetail={query.setupErrorDetail}
      setupStatus={query.setupStatus}
      spaceId={spaceId}
    />
  );
}
