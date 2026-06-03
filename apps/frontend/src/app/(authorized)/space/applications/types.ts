export type LegacySpaceApplicationsPageProps = {
  searchParams?: Promise<{ status?: string; spaceId?: string }>;
};

export type FallbackSpaceContext = {
  spaceId: string;
  userRoles: string[];
};
