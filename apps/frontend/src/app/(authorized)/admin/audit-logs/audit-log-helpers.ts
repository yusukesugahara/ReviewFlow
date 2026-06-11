import type { AdminAuditLogsViewProps } from "./types";

export type AuditMetadata = {
  durationMs?: unknown;
  errorCode?: unknown;
  ip?: unknown;
  method?: unknown;
  path?: unknown;
  role?: unknown;
  statusCode?: unknown;
  success?: unknown;
  userAgent?: unknown;
};

export type RiskLevel = "high" | "medium" | "low";

export type AuditDisplayInfo = {
  actorLabel: string;
  actorDetail: string | null;
  actionLabel: string;
  targetLabel: string;
  summary: string;
  resultLabel: string;
  isSuccess: boolean;
};

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

export function shortId(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? `${value.slice(0, 8)}...` : "-";
}

export function enrichAuditRow(row: AdminAuditLogsViewProps["rows"][number]): EnrichedAuditRow {
  const metadata = readMetadata(row.metadataJson);
  const reasons = buildReasons(row, metadata);
  const risk = classifyRisk(row, metadata);
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

function normalizeAuditPath(path: string): string {
  const withoutQuery = path.split("?")[0] ?? "";
  const trimmed = withoutQuery.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : "/";
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
  if (cleanPath.includes("/form-definitions/") && cleanPath.includes("/fields/") && cleanPath.includes("/delete")) {
    return "申請フォームの項目を削除しました";
  }
  if (cleanPath.includes("/form-definitions/") && cleanPath.includes("/fields/") && cleanPath.includes("/move")) {
    return "申請フォームの項目順を変更しました";
  }
  if (cleanPath.includes("/form-definitions/") && cleanPath.includes("/fields/") && cleanPath.includes("/settings")) {
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

function buildReasons(
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

function classifyRisk(row: AdminAuditLogsViewProps["rows"][number], metadata: AuditMetadata): RiskLevel {
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
