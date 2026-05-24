export type SpaceSubmissionsPageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams?: Promise<{
    applicant?: string;
    createdFrom?: string;
    createdTo?: string;
    page?: string;
    status?: string;
  }>;
};

export type SpaceSubmissionsApiFailure = { status: number };
