import { SpaceApplicationsPageContent } from "../../_components/space-applications-page-content";

type PageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams?: Promise<{ status?: string }>;
};

export default async function SpaceApplicationsPage({
  params,
  searchParams,
}: PageProps) {
  const [{ spaceId }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as { status?: string }),
  ]);

  return (
    <SpaceApplicationsPageContent
      spaceId={spaceId}
      status={query.status}
    />
  );
}
