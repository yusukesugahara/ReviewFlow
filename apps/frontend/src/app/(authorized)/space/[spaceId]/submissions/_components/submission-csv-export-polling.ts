import type { ExportJobResponse } from "@/lib/schema";

export function buildSubmissionCsvExportJobUrl(
  spaceId: string,
  jobId: string,
): string {
  return `/space/${encodeURIComponent(spaceId)}/submissions/export-jobs/${encodeURIComponent(jobId)}`;
}

export function buildSubmissionCsvExportDownloadUrl(
  spaceId: string,
  jobId: string,
): string {
  return `${buildSubmissionCsvExportJobUrl(spaceId, jobId)}/download`;
}

export async function fetchSubmissionCsvExportJob(
  spaceId: string,
  jobId: string,
): Promise<ExportJobResponse | null> {
  const response = await fetch(buildSubmissionCsvExportJobUrl(spaceId, jobId), {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const body: unknown = await response.json();
  return isExportJobResponse(body) ? body : null;
}

function isExportJobResponse(value: unknown): value is ExportJobResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const job = value as Partial<Record<keyof ExportJobResponse, unknown>>;
  return (
    typeof job.id === "string" &&
    typeof job.groupId === "string" &&
    typeof job.status === "string" &&
    typeof job.createdAt === "string"
  );
}
