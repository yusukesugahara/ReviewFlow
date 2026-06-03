export type SpaceApplicationsPageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams?: Promise<{ archived?: string }>;
};

export type SpaceApplicationsApiFailure = { status: number };
