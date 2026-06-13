import type { AdminAuditLogsViewProps } from "../types";
import {
  normalizeAuditPath,
  readMetadata,
  shortId,
  textValue,
  type AuditMetadata,
} from "./audit-log-metadata";

export type AuditDisplayInfo = {
  actorLabel: string;
  actorDetail: string | null;
  actionLabel: string;
  targetLabel: string;
  summary: string;
  resultLabel: string;
  isSuccess: boolean;
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  applications: "申請",
  "form-definitions": "申請フォーム",
  groups: "スペース",
  users: "ユーザ",
  invitations: "招待",
  "audit-logs": "監査ログ",
  "export-jobs": "CSV出力",
  "approval-flows": "承認フロー",
  auth: "認証",
  public: "公開申請",
  health: "ヘルスチェック",
};

const ROLE_LABELS: Record<string, string> = {
  tenant_admin: "テナント管理者",
  tenant_user: "テナントユーザ",
};

export function buildAuditDisplay(
  row: AdminAuditLogsViewProps["rows"][number],
  metadata: AuditMetadata = readMetadata(row.metadataJson),
): AuditDisplayInfo {
  const path = textValue(metadata.path);
  const method = textValue(metadata.method) || row.actionType.split(":")[0] || "GET";
  const actionLabel = describeActionLabel(method, path, row);
  const targetLabel = describeTargetLabel(row, path);
  const actor = describeActor(row, metadata);
  const isSuccess = metadata.success !== false;
  const resultLabel = isSuccess
    ? "成功"
    : `失敗${textValue(metadata.errorCode) ? `（${textValue(metadata.errorCode)}）` : ""}`;

  return {
    actorLabel: actor.primary,
    actorDetail: actor.secondary,
    actionLabel,
    targetLabel,
    summary: `${actor.primary}が${actionLabel}${targetLabel ? `（${targetLabel}）` : ""}`,
    resultLabel,
    isSuccess,
  };
}

export function describeActionLabel(
  method: string,
  path: string,
  row: AdminAuditLogsViewProps["rows"][number],
): string {
  const cleanPath = normalizeAuditPath(path);
  const normalizedMethod = method.toUpperCase();

  if (cleanPath.includes("/auth/login")) return "ログインしました";
  if (cleanPath.includes("/auth/register")) return "ユーザ登録しました";
  if (cleanPath.includes("/auth/password-reset/request")) return "パスワード再設定を要求しました";
  if (cleanPath.includes("/auth/password-reset/confirm")) return "パスワードを再設定しました";
  if (cleanPath.includes("/auth/me")) return "ログイン状態を確認しました";
  if (cleanPath === "/invitations" && normalizedMethod === "POST") {
    return "ユーザを招待しました";
  }
  if (cleanPath.includes("/invitations/accept")) return "招待を受諾しました";
  if (cleanPath.includes("/approve")) return "申請を承認しました";
  if (cleanPath.includes("/reject")) return "申請を却下しました";
  if (cleanPath.includes("/return-email/resend")) return "差し戻しメールを再送しました";
  if (cleanPath.includes("/return")) return "申請を差し戻しました";
  if (cleanPath.includes("/resubmit")) return "申請を再提出しました";
  if (cleanPath.includes("/submit")) return "申請を提出しました";
  if (cleanPath.includes("/correction-targets")) return "差し戻し対象を確認しました";
  if (cleanPath.includes("/corrections")) return "差し戻し履歴を確認しました";
  if (cleanPath.includes("/publish")) return "申請フォームを公開しました";
  if (cleanPath.includes("/archive")) return "申請フォームを削除しました";
  if (cleanPath.includes("/restore")) return "申請フォームを復元しました";
  if (cleanPath.includes("/request-access")) return "公開申請のアクセスを要求しました";
  if (cleanPath.includes("/download")) return "CSVをダウンロードしました";
  if (cleanPath.includes("/users/") && cleanPath.endsWith("/role")) {
    return "ユーザの権限を変更しました";
  }
  if (cleanPath.includes("/members/me")) return "スペースから退出しました";
  if (cleanPath.includes("/members") && cleanPath.includes("/role")) {
    return "スペースメンバーの権限を変更しました";
  }
  if (cleanPath.includes("/form-definitions/") && cleanPath.endsWith("/description")) {
    return "申請フォームの説明を更新しました";
  }
  if (
    cleanPath.includes("/form-definitions/") &&
    cleanPath.includes("/fields/") &&
    cleanPath.includes("/delete")
  ) {
    return "申請フォームの項目を削除しました";
  }
  if (
    cleanPath.includes("/form-definitions/") &&
    cleanPath.includes("/fields/") &&
    cleanPath.includes("/move")
  ) {
    return "申請フォームの項目順を変更しました";
  }
  if (
    cleanPath.includes("/form-definitions/") &&
    cleanPath.includes("/fields/") &&
    cleanPath.includes("/settings")
  ) {
    return "申請フォームの項目設定を変更しました";
  }
  if (
    cleanPath.includes("/form-definitions/") &&
    cleanPath.includes("/fields") &&
    normalizedMethod === "POST" &&
    !cleanPath.includes("/move") &&
    !cleanPath.includes("/delete") &&
    !cleanPath.includes("/settings")
  ) {
    return "申請フォームに項目を追加しました";
  }
  if (cleanPath === "/form-definitions" && normalizedMethod === "POST") {
    return "申請フォームを作成しました";
  }
  if (cleanPath.includes("/members")) {
    return normalizedMethod === "DELETE"
      ? "スペースメンバーを削除しました"
      : "スペースメンバーを追加しました";
  }

  const resourceLabel = resolveResourceLabel(cleanPath, row.targetType);

  switch (normalizedMethod) {
    case "GET":
      return `${resourceLabel}を参照しました`;
    case "POST":
      return `${resourceLabel}を作成しました`;
    case "PATCH":
      return `${resourceLabel}を更新しました`;
    case "DELETE":
      return `${resourceLabel}を削除しました`;
    default:
      return `${resourceLabel}に対して操作しました`;
  }
}

export function describeTargetLabel(
  row: AdminAuditLogsViewProps["rows"][number],
  path: string,
): string {
  const cleanPath = normalizeAuditPath(path);
  const segments = cleanPath.split("/").filter(Boolean);
  const resourceId = segments[1] && !isActionSegment(segments[1]) ? segments[1] : row.targetId;

  if (cleanPath.startsWith("/public/applications")) {
    const applicationId = segments[2] ?? row.targetId;
    return applicationId ? `公開申請 ${shortId(applicationId)}` : "公開申請";
  }

  const resourceLabel = resolveResourceLabel(cleanPath, row.targetType);
  if (resourceId) {
    return `${resourceLabel} ${shortId(resourceId)}`;
  }
  if (row.groupId) {
    return `${resourceLabel} / スペース ${shortId(row.groupId)}`;
  }
  return resourceLabel;
}

export function describeActor(
  row: AdminAuditLogsViewProps["rows"][number],
  metadata: AuditMetadata,
): { primary: string; secondary: string | null } {
  const role = textValue(metadata.role);
  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : null;

  if (row.actorEmail) {
    return {
      primary: row.actorEmail,
      secondary: roleLabel,
    };
  }
  if (row.actorUserId) {
    return {
      primary: "ユーザ",
      secondary: roleLabel ? `${roleLabel} / ${shortId(row.actorUserId)}` : shortId(row.actorUserId),
    };
  }
  return {
    primary: "未ログイン",
    secondary: roleLabel,
  };
}

function resolveResourceLabel(path: string, targetType: string): string {
  if (path.startsWith("/public/applications")) {
    return TARGET_TYPE_LABELS["public"] ?? "公開申請";
  }
  const firstSegment = path.split("/").filter(Boolean)[0] ?? targetType;
  return TARGET_TYPE_LABELS[firstSegment] ?? TARGET_TYPE_LABELS[targetType] ?? targetType;
}

function isActionSegment(segment: string): boolean {
  return [
    "approve",
    "reject",
    "return",
    "resubmit",
    "submit",
    "publish",
    "archive",
    "restore",
    "members",
    "corrections",
    "correction-targets",
    "download",
    "accept",
    "login",
    "register",
  ].includes(segment);
}
