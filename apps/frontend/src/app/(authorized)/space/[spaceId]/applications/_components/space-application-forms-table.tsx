"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Copy, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import type { ApplicationFormListRow } from "./space-applications.helpers";

type SpaceApplicationFormsTableProps = {
  onArchive: (row: ApplicationFormListRow) => void;
  onRestore: (row: ApplicationFormListRow) => void;
  rows: ApplicationFormListRow[];
  showArchived: boolean;
};

export function SpaceApplicationFormsTable({
  onArchive,
  onRestore,
  rows,
  showArchived,
}: SpaceApplicationFormsTableProps) {
  const [copiedPublicHref, setCopiedPublicHref] = useState<string | null>(null);

  function copyPublicHref(publicHref: string): void {
    const publicUrl = `${window.location.origin}${publicHref}`;
    void navigator.clipboard
      .writeText(publicUrl)
      .then(() => {
        setCopiedPublicHref(publicHref);
        toast.success("公開URLをコピーしました");
        window.setTimeout(() => setCopiedPublicHref(null), 1200);
      })
      .catch(() => {
        toast.error("公開URLのコピーに失敗しました");
      });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>申請タイトル</TableHead>
          <TableHead>状態</TableHead>
          <TableHead className="text-right">未処理</TableHead>
          <TableHead className="text-right">処理済み</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.definitionId}>
            <TableCell className="font-medium">{row.title}</TableCell>
            <TableCell>
              <FormDefinitionStatusBadge status={row.status} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.pendingCount}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.processedCount}
            </TableCell>
            <TableCell className="text-right">
              <TooltipProvider>
                <div className="flex flex-wrap justify-end gap-2">
                  {!showArchived && row.detailHref ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={row.detailHref} title="フォーム詳細">
                        詳細
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                  {!showArchived && row.publicHref ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="公開URLをコピー"
                          onClick={() => copyPublicHref(row.publicHref ?? "")}
                        >
                          <Copy aria-hidden="true" />
                          <span className="sr-only">
                            {copiedPublicHref === row.publicHref ? "コピー済み" : ""}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>公開URLをコピー</TooltipContent>
                    </Tooltip>
                  ) : !showArchived ? (
                    <span className="self-center text-sm text-muted-foreground">
                      未公開
                    </span>
                  ) : null}
                  {showArchived ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRestore(row)}
                    >
                      <RotateCcw aria-hidden="true" />
                      復元
                    </Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          aria-label="削除"
                          onClick={() => onArchive(row)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>削除</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function FormDefinitionStatusBadge({ status }: { status: string }) {
  const isPublished = status === APPLICATION_STATUSES.published;
  const isArchived = status === APPLICATION_STATUSES.archived;
  const label = isPublished
    ? "公開済み"
    : isArchived
      ? "削除済み"
      : status === APPLICATION_STATUSES.draft
        ? "下書き"
        : status;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${
        isArchived
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : isPublished
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      {label}
    </span>
  );
}
