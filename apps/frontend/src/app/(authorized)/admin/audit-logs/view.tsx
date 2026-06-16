import { Card, CardContent } from "@/components/ui/card";
import { AuditLogListCard } from "./_components/audit-log-list-card";
import { AuditLogSummaryCards } from "./_components/audit-log-summary-cards";
import type { AdminAuditLogsErrorViewProps, AdminAuditLogsViewProps } from "./types";
import { buildAdminAuditLogsViewModel } from "./_view-models/audit-log-view-model";

/**
 * 管理者向け監査ログ画面を表示します。
 */
export function AdminAuditLogsView({
  createdFrom,
  createdTo,
  pagination,
  query,
  targetType,
  rows,
}: AdminAuditLogsViewProps) {
  const {
    filteredRows,
    hasActiveFilters,
    listDescription,
    summaryCounts,
  } = buildAdminAuditLogsViewModel({
    createdFrom,
    createdTo,
    query,
    targetType,
    rows,
  });

  return (
    <div className="space-y-6">
      <AuditLogSummaryCards summaryCounts={summaryCounts} />

      <AuditLogListCard
        createdFrom={createdFrom}
        createdTo={createdTo}
        filteredRows={filteredRows}
        hasActiveFilters={hasActiveFilters}
        listDescription={listDescription}
        pagination={pagination}
        query={query}
        targetType={targetType}
      />
    </div>
  );
}

/**
 * 管理者向け監査ログ画面のエラー状態を表示します。
 */
export function AdminAuditLogsErrorView({ status }: AdminAuditLogsErrorViewProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-destructive">
          {status
            ? `監査ログの取得に失敗しました（status: ${status}）`
            : "監査ログの取得に失敗しました"}
        </p>
      </CardContent>
    </Card>
  );
}
