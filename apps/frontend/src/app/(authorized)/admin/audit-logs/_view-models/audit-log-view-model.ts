import {
  buildAuditDisplay,
  buildAuditSummaryCounts,
  describeActionLabel,
  describeTargetLabel,
  enrichAuditRow,
  type AuditDisplayInfo,
  type AuditLogDisplayEntry,
  type AuditLogSummaryCounts,
  type AuditLogTargetTypeFilter,
  type EnrichedAuditRow,
} from "@/components/audit-logs/audit-log-display";
import type { AdminAuditLogsViewProps } from "../types";

export type {
  AuditDisplayInfo,
  AuditLogDisplayEntry,
  AuditLogSummaryCounts,
  AuditLogTargetTypeFilter,
  EnrichedAuditRow,
};

export {
  buildAuditDisplay,
  buildAuditSummaryCounts,
  describeActionLabel,
  describeTargetLabel,
  enrichAuditRow,
};

export type AdminAuditLogsViewModel = {
  filteredRows: EnrichedAuditRow[];
  hasActiveFilters: boolean;
  listDescription: string;
  summaryCounts: AuditLogSummaryCounts;
};

const TARGET_FILTER_LABELS: Record<AuditLogTargetTypeFilter, string> = {
  all: "すべて",
  application: "申請",
  user: "ユーザ",
  invitation: "招待",
  space: "スペース",
  group_member: "スペースメンバー",
};

export function buildAdminAuditLogsViewModel({
  createdFrom,
  createdTo,
  query,
  rows,
  targetType,
}: AdminAuditLogsViewProps): AdminAuditLogsViewModel {
  const enrichedRows = rows.map(enrichAuditRow);
  const filteredRows = filterAuditRows(enrichedRows, { targetType });

  return {
    filteredRows,
    hasActiveFilters: hasAuditLogFilters({
      createdFrom,
      createdTo,
      query,
      targetType,
    }),
    listDescription: describeAuditLogList({ query, targetType }),
    summaryCounts: buildAuditSummaryCounts(enrichedRows),
  };
}

export function filterAuditRows(
  rows: EnrichedAuditRow[],
  filters: Pick<AdminAuditLogsViewProps, "targetType">,
): EnrichedAuditRow[] {
  if (filters.targetType === "all") {
    return rows;
  }
  return rows.filter((item) => item.row.targetType === filters.targetType);
}

export function buildAuditLogsHref({
  createdFrom,
  createdTo,
  query,
  targetType,
}: Pick<
  AdminAuditLogsViewProps,
  "createdFrom" | "createdTo" | "query" | "targetType"
>): string {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (targetType !== "all") {
    params.set("targetType", targetType);
  }
  if (createdFrom) {
    params.set("createdFrom", createdFrom);
  }
  if (createdTo) {
    params.set("createdTo", createdTo);
  }
  const search = params.toString();
  return search ? `/admin/audit-logs?${search}` : "/admin/audit-logs";
}

function hasAuditLogFilters({
  createdFrom,
  createdTo,
  query,
  targetType,
}: Pick<
  AdminAuditLogsViewProps,
  "createdFrom" | "createdTo" | "query" | "targetType"
>): boolean {
  return (
    query.length > 0 ||
    targetType !== "all" ||
    createdFrom.length > 0 ||
    createdTo.length > 0
  );
}

function describeAuditLogList({
  query,
  targetType,
}: Pick<AdminAuditLogsViewProps, "query" | "targetType">): string {
  const targetLabel =
    TARGET_FILTER_LABELS[targetType as AuditLogTargetTypeFilter] ?? targetType;
  if (targetType !== "all" && query) {
    return `${targetLabel}の監査ログのうち「${query}」に一致する最新200件`;
  }
  if (targetType !== "all") {
    return `${targetLabel}の監査ログを新しい順に表示しています`;
  }
  return query
    ? `「${query}」に一致する最新200件`
    : "最新200件を新しい順に表示しています";
}
