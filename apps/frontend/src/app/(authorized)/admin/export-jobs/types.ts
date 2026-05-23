import type { ExportJobResponse } from "@/lib/schema";

export type ExportJobsPageProps = {
  searchParams?: Promise<{ jobId?: string; formError?: string }>;
};

export type ExportJobsViewProps = {
  groupId: string;
  latestJob: ExportJobResponse | null;
  errorText: string | null;
  formError?: string;
};
