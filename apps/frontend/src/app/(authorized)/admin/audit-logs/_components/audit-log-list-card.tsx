import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { CardHeading } from "@/components/ui/card-heading";
import type { EnrichedAuditRow } from "../_view-models/audit-log-view-model";
import type { AdminAuditLogsViewProps } from "../types";
import { AuditLogFiltersForm } from "./audit-log-filters-form";
import { AuditLogPaginationControls } from "./audit-log-pagination-controls";
import { AuditLogTable } from "./audit-log-table";

type AuditLogListCardProps = Pick<
  AdminAuditLogsViewProps,
  "createdFrom" | "createdTo" | "pagination" | "query" | "targetType"
> & {
  filteredRows: EnrichedAuditRow[];
  hasActiveFilters: boolean;
  listDescription: string;
};

/**
 * 監査ログ一覧カードを表示します。
 */
export function AuditLogListCard({
  createdFrom,
  createdTo,
  filteredRows,
  hasActiveFilters,
  listDescription,
  pagination,
  query,
  targetType,
}: AuditLogListCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardHeading
          description={listDescription}
          title="操作履歴"
        />
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <AuditLogFiltersForm
          createdFrom={createdFrom}
          createdTo={createdTo}
          query={query}
          targetType={targetType}
        />
        {filteredRows.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            {hasActiveFilters
              ? "条件に一致する監査ログはありません"
              : "監査ログはまだありません"}
          </p>
        ) : (
          <>
            <AuditLogTable rows={filteredRows} />
            <AuditLogPaginationControls
              createdFrom={createdFrom}
              createdTo={createdTo}
              pagination={pagination}
              query={query}
              targetType={targetType}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
