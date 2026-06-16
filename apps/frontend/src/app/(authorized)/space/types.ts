import type { SpaceDashboardSummary as ApiSpaceDashboardSummary } from "@/lib/schema";

export type AdminDashboardPageProps = {
  searchParams?: Promise<{ spaceId?: string }>;
};

export type AdminDashboardApiFailure = { status: number };

export type SpaceDashboardSummary = ApiSpaceDashboardSummary;

export type AdminDashboardViewProps = {
  fetchErrorStatus?: number;
  selectedSpaceId: string;
  spaces: SpaceDashboardSummary[];
};
