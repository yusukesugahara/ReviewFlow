import type { AdminAuditLogsViewProps } from "./types";

export type AuditMetadata = {
  durationMs?: unknown;
  errorCode?: unknown;
  ip?: unknown;
  path?: unknown;
  role?: unknown;
  statusCode?: unknown;
  success?: unknown;
  userAgent?: unknown;
};

export type RiskLevel = "high" | "medium" | "low";

export type EnrichedAuditRow = {
  metadata: AuditMetadata;
  reasons: string[];
  risk: RiskLevel;
  row: AdminAuditLogsViewProps["rows"][number];
};

export function shortId(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? `${value.slice(0, 8)}...` : "-";
}

export function enrichAuditRow(row: AdminAuditLogsViewProps["rows"][number]): EnrichedAuditRow {
  const metadata = readMetadata(row.metadataJson);
  const reasons: string[] = [];
  const targetType = row.targetType;
  const method = row.actionType.split(":")[0] ?? "";
  const statusCode = numberValue(metadata.statusCode);
  const durationMs = numberValue(metadata.durationMs);

  if (metadata.success === false) {
    reasons.push(`失敗: ${textValue(metadata.errorCode) || "原因不明"}`);
  }
  if (["users", "invitations", "auth"].includes(targetType)) {
    reasons.push("認証・ユーザ管理");
  }
  if (targetType === "export-jobs") {
    reasons.push("データ出力");
  }
  if (["DELETE", "PATCH"].includes(method)) {
    reasons.push("変更・削除操作");
  }
  if (statusCode !== null && statusCode >= 400) {
    reasons.push(`HTTP ${statusCode}`);
  }
  if (durationMs !== null && durationMs >= 3000) {
    reasons.push("処理時間が長い");
  }
  if (reasons.length === 0) {
    reasons.push("通常操作");
  }

  const risk: RiskLevel =
    metadata.success === false ||
    targetType === "auth" ||
    (["users", "invitations"].includes(targetType) && ["POST", "PATCH", "DELETE"].includes(method))
      ? "high"
      : targetType === "export-jobs" ||
          ["DELETE", "PATCH"].includes(method) ||
          (statusCode !== null && statusCode >= 300)
        ? "medium"
        : "low";

  return { metadata, reasons, risk, row };
}

export function readMetadata(value: unknown): AuditMetadata {
  return value && typeof value === "object" ? (value as AuditMetadata) : {};
}

export function textValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}
