/** `docs/03_er_diagram.md` export_jobs.status */
export const ExportJobStatus = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type ExportJobStatusValue =
  (typeof ExportJobStatus)[keyof typeof ExportJobStatus];
