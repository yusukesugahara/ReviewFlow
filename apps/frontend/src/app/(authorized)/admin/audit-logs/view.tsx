import { Card, CardContent } from "@/components/ui/card";
import { AuditLogListCard } from "./_components/audit-log-list-card";
import { AuditLogSummaryCards } from "./_components/audit-log-summary-cards";
import type { AdminAuditLogsErrorViewProps, AdminAuditLogsViewProps } from "./types";
import { buildAdminAuditLogsViewModel } from "./audit-log-helpers";

export function AdminAuditLogsView({
  createdFrom,
  createdTo,
  outcome,
  query,
  risk,
  rows,
}: AdminAuditLogsViewProps) {
  const {
    filteredRows,
    hasActiveFilters,
    highRiskHref,
    isHighRiskFilterActive,
    listDescription,
    summaryCounts,
  } = buildAdminAuditLogsViewModel({
    createdFrom,
    createdTo,
    outcome,
    query,
    risk,
    rows,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">監査ログ</h1>
        <p className="text-sm text-slate-600">
          誰が、いつ、どんな操作をしたかを確認できます。
        </p>
      </div>

      <AuditLogSummaryCards
        highRiskHref={highRiskHref}
        isHighRiskFilterActive={isHighRiskFilterActive}
        summaryCounts={summaryCounts}
      />

      <AuditLogListCard
        createdFrom={createdFrom}
        createdTo={createdTo}
        filteredRows={filteredRows}
        hasActiveFilters={hasActiveFilters}
        listDescription={listDescription}
        outcome={outcome}
        query={query}
        risk={risk}
      />
    </div>
  );
}

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
