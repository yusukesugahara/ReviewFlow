export type AdminDashboardPageProps = {
  searchParams?: Promise<{ spaceId?: string }>;
};

export type AdminDashboardApiFailure = { status: number };

export type AdminDashboardViewProps = {
  avgReturns: string;
  fetchErrorStatus?: number;
  resubmitCount: number;
  spaceId: string;
  totalApplications: number;
};
