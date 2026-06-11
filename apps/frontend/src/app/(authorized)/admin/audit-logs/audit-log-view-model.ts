import { buildAuditDisplay, type AuditDisplayInfo } from "./audit-log-display";
import { readMetadata, type AuditMetadata } from "./audit-log-metadata";
import {
  buildAuditRiskReasons,
  classifyAuditRisk,
  type RiskLevel,
} from "./audit-log-risk";
import type { AdminAuditLogsViewProps } from "./types";

export type EnrichedAuditRow = {
  display: AuditDisplayInfo;
  metadata: AuditMetadata;
  reasons: string[];
  risk: RiskLevel;
  row: AdminAuditLogsViewProps["rows"][number];
};

export type AuditLogSummaryCounts = {
  failed: number;
  highRisk: number;
  mediumRisk: number;
};

export type AdminAuditLogsViewModel = {
  filteredRows: EnrichedAuditRow[];
  hasActiveFilters: boolean;
  highRiskHref: string;
  isHighRiskFilterActive: boolean;
  listDescription: string;
  summaryCounts: AuditLogSummaryCounts;
};

export function enrichAuditRow(row: AdminAuditLogsViewProps["rows"][number]): EnrichedAuditRow {
  const metadata = readMetadata(row.metadataJson);
  const reasons = buildAuditRiskReasons(row, metadata);
  const risk = classifyAuditRisk(row, metadata);
  const display = buildAuditDisplay(row, metadata);

  return { display, metadata, reasons, risk, row };
}

export function buildAdminAuditLogsViewModel({
  createdFrom,
  createdTo,
  outcome,
  query,
  risk,
  rows,
}: AdminAuditLogsViewProps): AdminAuditLogsViewModel {
  const enrichedRows = rows.map(enrichAuditRow);

  return {
    filteredRows: filterAuditRows(enrichedRows, { outcome, risk }),
    hasActiveFilters: hasAuditLogFilters({
      createdFrom,
      createdTo,
      outcome,
      query,
      risk,
    }),
    highRiskHref: buildAuditLogsHref({
      createdFrom,
      createdTo,
      outcome,
      query,
      risk: "high",
    }),
    isHighRiskFilterActive: risk === "high",
    listDescription: describeAuditLogList({ query, risk }),
    summaryCounts: buildAuditSummaryCounts(enrichedRows),
  };
}

export function filterAuditRows(
  rows: EnrichedAuditRow[],
  filters: Pick<AdminAuditLogsViewProps, "outcome" | "risk">,
): EnrichedAuditRow[] {
  return rows.filter((item) => {
    if (filters.outcome === "failed" && item.metadata.success !== false) {
      return false;
    }
    if (filters.outcome === "success" && item.metadata.success === false) {
      return false;
    }
    if (filters.risk !== "all" && item.risk !== filters.risk) {
      return false;
    }
    return true;
  });
}

export function buildAuditSummaryCounts(
  rows: EnrichedAuditRow[],
): AuditLogSummaryCounts {
  return {
    failed: rows.filter((item) => item.metadata.success === false).length,
    highRisk: rows.filter((item) => item.risk === "high").length,
    mediumRisk: rows.filter((item) => item.risk === "medium").length,
  };
}

export function buildAuditLogsHref({
  createdFrom,
  createdTo,
  outcome,
  query,
  risk,
}: Pick<
  AdminAuditLogsViewProps,
  "createdFrom" | "createdTo" | "outcome" | "query" | "risk"
>): string {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (createdFrom) {
    params.set("createdFrom", createdFrom);
  }
  if (createdTo) {
    params.set("createdTo", createdTo);
  }
  if (outcome !== "all") {
    params.set("outcome", outcome);
  }
  if (risk !== "all") {
    params.set("risk", risk);
  }
  const search = params.toString();
  return search ? `/admin/audit-logs?${search}` : "/admin/audit-logs";
}

function hasAuditLogFilters({
  createdFrom,
  createdTo,
  outcome,
  query,
  risk,
}: Pick<
  AdminAuditLogsViewProps,
  "createdFrom" | "createdTo" | "outcome" | "query" | "risk"
>): boolean {
  return (
    query.length > 0 ||
    risk !== "all" ||
    outcome !== "all" ||
    createdFrom.length > 0 ||
    createdTo.length > 0
  );
}

function describeAuditLogList({
  query,
  risk,
}: Pick<AdminAuditLogsViewProps, "query" | "risk">): string {
  const hasSearch = query.length > 0;
  if (risk === "high") {
    return hasSearch
      ? `高リスクの操作のうち「${query}」に一致する最新200件`
      : "高リスクの操作履歴のみを表示しています";
  }
  return hasSearch ? `「${query}」に一致する最新200件` : "最新200件を新しい順に表示しています";
}
