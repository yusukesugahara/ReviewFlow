"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Download, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createSubmissionCsvExportAction } from "@/app/(authorized)/space/[spaceId]/submissions/actions";
import type { ExportJobResponse } from "@/lib/schema";

type SubmissionCsvExportControlsProps = {
  exportFormOptions: Array<{ id: string; name: string }>;
  latestExportJob: ExportJobResponse | null;
  spaceId: string;
};

type ExportJobStatus = ExportJobResponse["status"];

const ACTIVE_STATUSES = new Set<ExportJobStatus>(["queued", "processing"]);

export function SubmissionCsvExportControls({
  exportFormOptions,
  latestExportJob,
  spaceId,
}: SubmissionCsvExportControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<ExportJobStatus | null>(
    latestExportJob?.status ?? null,
  );
  const downloadedJobIdRef = useRef<string | null>(null);

  const jobId = latestExportJob?.id ?? null;
  const isJobActive = status !== null && ACTIVE_STATUSES.has(status);
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
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="CSV出力"
              onClick={() => setIsOpen(true)}
            >
              <Download aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>CSV出力</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isOpen ? (
        <div
          aria-labelledby="submission-csv-export-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  id="submission-csv-export-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  CSV出力
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  申請フォームを選択して、申請内容のCSVを作成します。
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="閉じる"
                onClick={() => setIsOpen(false)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>

            <form
              action={createSubmissionCsvExportAction.bind(null, spaceId)}
              className="mt-5 space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="csvFormDefinitionId">申請フォーム</Label>
                <select
                  id="csvFormDefinitionId"
                  name="formDefinitionId"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">選択してください</option>
                  {exportFormOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              {exportFormOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  CSV出力できる申請フォームへの申請はまだありません。
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  キャンセル
                </Button>
                <CsvExportSubmitButton
                  disabled={exportFormOptions.length === 0}
                  isJobActive={isJobActive}
                />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CsvExportSubmitButton({
  disabled,
  isJobActive,
}: {
  disabled: boolean;
  isJobActive: boolean;
}) {
  const { pending } = useFormStatus();
  const isActive = pending || isJobActive;

  return (
    <Button
      type="submit"
      disabled={disabled || isActive}
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
