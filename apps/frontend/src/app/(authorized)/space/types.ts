export type AdminDashboardPageProps = {
  searchParams?: Promise<{ spaceId?: string }>;
};

export type AdminDashboardApiFailure = { status: number };

export type SpaceDashboardSummary = {
  id: string;
  name: string;
  description: string | null;
  currentUserRole: string | null;
  memberCount: number;
  formCount: number;
  publishedFormCount: number;
  totalApplications: number;
  needsActionCount: number;
  returnedCount: number;
  approvedCount: number;
  rejectedCount: number;
  correctionCount: number;
  resubmitCount: number;
  avgReturns: string;
  latestApplicationAt: string | null;
};

export type AdminDashboardViewProps = {
  fetchErrorStatus?: number;
  selectedSpaceId: string;
  spaces: SpaceDashboardSummary[];
};
