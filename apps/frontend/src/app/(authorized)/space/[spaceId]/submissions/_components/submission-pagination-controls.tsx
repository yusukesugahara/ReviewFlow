import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildSubmissionsPageHref,
  type SubmissionFilters,
} from "../_utils/space-submissions.helpers";

type SubmissionPaginationControlsProps = {
  currentPage: number;
  filters: SubmissionFilters;
  pageSize: number;
  spaceId: string;
  totalCount: number;
  totalPages: number;
};

export function SubmissionPaginationControls({
  currentPage,
  filters,
  pageSize,
  spaceId,
  totalCount,
  totalPages,
}: SubmissionPaginationControlsProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {start}-{end}件を表示 / 全{totalCount}件
      </p>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" disabled={currentPage <= 1}>
          <Link
            href={buildSubmissionsPageHref(spaceId, filters, currentPage - 1)}
            aria-disabled={currentPage <= 1}
            tabIndex={currentPage <= 1 ? -1 : undefined}
          >
            <ChevronLeft aria-hidden="true" />
            前へ
          </Link>
        </Button>
        <span className="min-w-20 text-center text-sm font-medium text-slate-700">
          {currentPage} / {totalPages}
        </span>
        <Button asChild variant="outline" size="sm" disabled={currentPage >= totalPages}>
          <Link
            href={buildSubmissionsPageHref(spaceId, filters, currentPage + 1)}
            aria-disabled={currentPage >= totalPages}
            tabIndex={currentPage >= totalPages ? -1 : undefined}
          >
            次へ
            <ChevronRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
