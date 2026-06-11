import type { AdminAuditLogsViewProps } from "./types";
import {
  normalizeAuditPath,
  numberValue,
  textValue,
  type AuditMetadata,
} from "./audit-log-metadata";

export type RiskLevel = "high" | "medium" | "low";

export function buildAuditRiskReasons(
  row: AdminAuditLogsViewProps["rows"][number],
  metadata: AuditMetadata,
): string[] {
  const reasons: string[] = [];
  const targetType = row.targetType;
  const path = textValue(metadata.path);
  const method = (textValue(metadata.method) || row.actionType.split(":")[0] || "").toUpperCase();
  const statusCode = numberValue(metadata.statusCode);
  const durationMs = numberValue(metadata.durationMs);

  if (metadata.success === false) {
    reasons.push(`失敗: ${textValue(metadata.errorCode) || "原因不明"}`);
  }
  if (isTenantUserPermissionChange(path, method)) {
    reasons.push("テナントユーザ権限変更");
  }
  if (isTenantUserInvitation(path, method)) {
    reasons.push("ユーザ招待");
  }
  if (isFormDefinitionCreate(path, method)) {
    reasons.push("申請フォーム作成");
  }
  if (isFormDefinitionEdit(path, method)) {
    reasons.push("申請フォーム編集");
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

  return reasons;
}

export function classifyAuditRisk(
  row: AdminAuditLogsViewProps["rows"][number],
  metadata: AuditMetadata,
): RiskLevel {
  const targetType = row.targetType;
  const path = textValue(metadata.path);
  const method = (textValue(metadata.method) || row.actionType.split(":")[0] || "").toUpperCase();
  const statusCode = numberValue(metadata.statusCode);

  if (isHighRiskOperation(path, method)) {
    return "high";
  }
  if (
    metadata.success === false ||
    targetType === "export-jobs" ||
    ["DELETE", "PATCH"].includes(method) ||
    (statusCode !== null && statusCode >= 300)
  ) {
    return "medium";
  }
  return "low";
}

function isHighRiskOperation(path: string, method: string): boolean {
  return (
    isTenantUserPermissionChange(path, method) ||
    isTenantUserInvitation(path, method) ||
    isFormDefinitionCreate(path, method) ||
    isFormDefinitionEdit(path, method)
  );
}

function isTenantUserPermissionChange(path: string, method: string): boolean {
  const cleanPath = normalizeAuditPath(path);
  return method.toUpperCase() === "PATCH" && /\/users\/[^/]+\/role$/.test(cleanPath);
}

function isTenantUserInvitation(path: string, method: string): boolean {
  const cleanPath = normalizeAuditPath(path);
  return method.toUpperCase() === "POST" && cleanPath === "/invitations";
}

function isFormDefinitionCreate(path: string, method: string): boolean {
  const cleanPath = normalizeAuditPath(path);
  return method.toUpperCase() === "POST" && cleanPath === "/form-definitions";
}

function isFormDefinitionEdit(path: string, method: string): boolean {
  const cleanPath = normalizeAuditPath(path);
  const normalizedMethod = method.toUpperCase();
  if (!["POST", "PATCH"].includes(normalizedMethod)) {
    return false;
  }
  if (!/^\/form-definitions\/[^/]+/.test(cleanPath)) {
    return false;
  }
  return !cleanPath.includes("/request-access");
}
