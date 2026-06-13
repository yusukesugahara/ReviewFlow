import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminAuditLogsPagination, AdminAuditLogsViewProps } from "../types";
import { buildAuditLogsHref } from "../_view-models/audit-log-view-model";

type AuditLogPaginationControlsProps = Pick<
  AdminAuditLogsViewProps,
  "createdFrom" | "createdTo" | "query" | "targetType"
> & {
  pagination: AdminAuditLogsPagination;
};

export function AuditLogPaginationControls({
  createdFrom,
  createdTo,
  pagination,
  query,
  targetType,
}: AuditLogPaginationControlsProps) {
  const { currentPage, limit, offset, total, totalPages } = pagination;
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + limit, total);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {start}-{end}件を表示 / 全{total}件
      </p>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" disabled={!hasPrevious}>
          <Link
            href={buildAuditLogsHref({
              createdFrom,
              createdTo,
              page: currentPage - 1,
              query,
              targetType,
            })}
            aria-disabled={!hasPrevious}
            tabIndex={!hasPrevious ? -1 : undefined}
          >
            <ChevronLeft aria-hidden="true" />
            前へ
          </Link>
        </Button>
        <span className="min-w-20 text-center text-sm font-medium text-slate-700">
          {currentPage} / {totalPages}
        </span>
        <Button asChild variant="outline" size="sm" disabled={!hasNext}>
          <Link
            href={buildAuditLogsHref({
              createdFrom,
              createdTo,
              page: currentPage + 1,
              query,
              targetType,
            })}
            aria-disabled={!hasNext}
            tabIndex={!hasNext ? -1 : undefined}
          >
            次へ
            <ChevronRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
