export type SpaceSubmissionsPageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams?: Promise<{
    applicant?: string;
    createdFrom?: string;
    createdTo?: string;
    form?: string;
    jobId?: string;
    page?: string;
    status?: string;
    summary?: string;
  }>;
};

export type SpaceSubmissionsApiFailure = { status: number };
