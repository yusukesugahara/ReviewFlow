import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EnrichedAuditRow } from "../audit-log-helpers";
import type { AdminAuditLogsViewProps } from "../types";
import { AuditLogFiltersForm } from "./audit-log-filters-form";
import { AuditLogTable } from "./audit-log-table";

type AuditLogListCardProps = Pick<
  AdminAuditLogsViewProps,
  "createdFrom" | "createdTo" | "outcome" | "query" | "risk"
> & {
  filteredRows: EnrichedAuditRow[];
  hasActiveFilters: boolean;
  listDescription: string;
};

export function AuditLogListCard({
  createdFrom,
  createdTo,
  filteredRows,
  hasActiveFilters,
  listDescription,
  outcome,
  query,
  risk,
}: AuditLogListCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>操作履歴</CardTitle>
        <CardDescription>{listDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <AuditLogFiltersForm
          createdFrom={createdFrom}
          createdTo={createdTo}
          outcome={outcome}
          query={query}
          risk={risk}
        />
        {filteredRows.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            {hasActiveFilters
              ? "条件に一致する監査ログはありません"
              : "監査ログはまだありません"}
          </p>
        ) : (
          <AuditLogTable rows={filteredRows} />
        )}
      </CardContent>
    </Card>
  );
}
