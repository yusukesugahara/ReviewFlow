"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExportJobResponse } from "@/lib/schema";

type SubmissionCsvExportControlsProps = {
  exportFormCount: number;
  latestExportJob: ExportJobResponse | null;
  spaceId: string;
};

type ExportJobStatus = ExportJobResponse["status"];

const ACTIVE_STATUSES = new Set<ExportJobStatus>(["queued", "processing"]);

export function SubmissionCsvExportControls({
  exportFormCount,
  latestExportJob,
  spaceId,
}: SubmissionCsvExportControlsProps) {
  const { pending } = useFormStatus();
  const [status, setStatus] = useState<ExportJobStatus | null>(
    latestExportJob?.status ?? null,
  );
  const downloadedJobIdRef = useRef<string | null>(null);

  const jobId = latestExportJob?.id ?? null;
  const isActive = pending || (status !== null && ACTIVE_STATUSES.has(status));
  const downloadHref = useMemo(() => {
    if (!jobId) {
      return null;
    }
    return `/space/${encodeURIComponent(spaceId)}/submissions/export-jobs/${encodeURIComponent(jobId)}/download`;
  }, [jobId, spaceId]);

  useEffect(() => {
    setStatus(latestExportJob?.status ?? null);
    downloadedJobIdRef.current = null;
  }, [latestExportJob?.id, latestExportJob?.status]);

  useEffect(() => {
    if (!jobId || !status || !ACTIVE_STATUSES.has(status)) {
      return;
    }

    let cancelled = false;
    const intervalId = window.setInterval(async () => {
      try {
        const response = await fetch(
          `/space/${encodeURIComponent(spaceId)}/submissions/export-jobs/${encodeURIComponent(jobId)}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          return;
        }
        const job = (await response.json()) as ExportJobResponse;
        if (!cancelled) {
          setStatus(job.status);
        }
      } catch {
        // Keep polling; transient status fetch failures should not cancel the export.
      }
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [jobId, spaceId, status]);

  useEffect(() => {
    if (
      !jobId ||
      status !== "completed" ||
      !downloadHref ||
      downloadedJobIdRef.current === jobId ||
      window.sessionStorage.getItem(downloadedJobStorageKey(jobId)) === "true"
    ) {
      return;
    }
    downloadedJobIdRef.current = jobId;
    window.sessionStorage.setItem(downloadedJobStorageKey(jobId), "true");
    removeJobIdFromCurrentUrl();
    window.location.assign(downloadHref);
  }, [downloadHref, jobId, status]);

  return (
    <Button
      type="submit"
      disabled={exportFormCount === 0 || isActive}
      aria-busy={isActive}
    >
      {isActive ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          CSV作成中
        </>
      ) : (
        <>
          <Download aria-hidden="true" />
          CSVを作成
        </>
      )}
    </Button>
  );
}

function downloadedJobStorageKey(jobId: string): string {
  return `reviewflow:downloaded-csv-export-job:${jobId}`;
}

function removeJobIdFromCurrentUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("jobId");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
