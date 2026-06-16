import type { ExportJobResponse } from "@/lib/schema";

/**
 * CSV 出力ジョブ状態取得用の内部 Route Handler URL を組み立てます。
 */
export function buildSubmissionCsvExportJobUrl(
  spaceId: string,
  jobId: string,
): string {
  return `/space/${encodeURIComponent(spaceId)}/submissions/export-jobs/${encodeURIComponent(jobId)}`;
}

/**
 * CSV 出力ジョブのダウンロード用内部 Route Handler URL を組み立てます。
 */
export function buildSubmissionCsvExportDownloadUrl(
  spaceId: string,
  jobId: string,
): string {
  return `${buildSubmissionCsvExportJobUrl(spaceId, jobId)}/download`;
}

/**
 * 内部 Route Handler から CSV 出力ジョブの最新状態を取得します。
 */
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

/**
 * 取得した JSON が CSV 出力ジョブレスポンスとして扱えるかを判定します。
 */
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
