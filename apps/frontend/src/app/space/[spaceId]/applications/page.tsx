import { SpaceApplicationsPageContent } from "../../_components/space-applications-page-content";

type PageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams?: Promise<{ view?: string }>;
};

export default async function SpaceApplicationsPage({
  params,
  searchParams,
}: PageProps) {
  const [{ spaceId }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as { view?: string }),
  ]);

  return <SpaceApplicationsPageContent spaceId={spaceId} view={query.view} />;
}
