"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
        <DialogContent
          titleId="submission-csv-export-title"
          descriptionId="submission-csv-export-description"
          className="max-w-md"
          onClose={() => setIsOpen(false)}
        >
          <DialogHeader>
            <DialogTitle id="submission-csv-export-title">CSV出力</DialogTitle>
            <DialogDescription id="submission-csv-export-description">
              申請フォームを選択して、申請内容のCSVを作成します。
            </DialogDescription>
          </DialogHeader>

            <form
              action={createSubmissionCsvExportAction.bind(null, spaceId)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="csvFormDefinitionId">申請フォーム</Label>
                <Select name="formDefinitionId" required>
                  <SelectTrigger
                    id="csvFormDefinitionId"
                    className="bg-transparent"
                  >
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {exportFormOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
        </DialogContent>
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
