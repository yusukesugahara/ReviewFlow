import type { AuditEventChange, AuditLogItem } from "@/lib/schema";
import { buildSpaceApplicationDetailHrefByIds } from "../applications/routing/application-routes";
import {
  readMetadata,
  shortId,
  textValue,
  valueList,
} from "./audit-log-metadata";

type AuditRow = AuditLogItem;

export type AuditLogTargetTypeFilter =
  | "all"
  | "application"
  | "user"
  | "invitation"
  | "space"
  | "group_member";

export type AuditLogDisplayEntry = {
  label: string;
  value: string;
};

export type AuditLogSeverity = "normal" | "attention" | "critical";

export type AuditDisplayInfo = {
  actorDetail: string | null;
  actorLabel: string;
  actionLabel: string;
  categoryLabel: string;
  changeItems: string[];
  detailItems: AuditLogDisplayEntry[];
  isImportant: boolean;
  sentence: string;
  severity: AuditLogSeverity;
  severityLabel: string | null;
  summary: string | null;
  targetDetail: string | null;
  targetHref: string | null;
  targetLabel: string;
  targetTypeLabel: string;
};

export type EnrichedAuditRow = {
  display: AuditDisplayInfo;
  row: AuditRow;
};

export type AuditLogSummaryCounts = {
  accessEvents: number;
  applicationEvents: number;
  importantEvents: number;
  total: number;
};

const ACTION_LABELS: Record<string, string> = {
  "application.created": "申請を作成",
  "application.submitted": "申請を提出",
  "application.approved": "申請を承認",
  "application.returned": "申請を差し戻し",
  "application.corrected": "申請内容を修正",
  "application.resubmitted": "申請を再提出",
  "application.rejected": "申請を却下",
  "invitation.created": "ユーザーを招待",
  "invitation.accepted": "招待を受諾",
  "user.profile_updated": "プロフィールを更新",
  "user.password_changed": "パスワードを変更",
  "user.role_changed": "ユーザー権限を変更",
  "user.deactivated": "ユーザーを無効化",
  "user.restored": "ユーザーを復元",
  "space.created": "スペースを作成",
  "space.updated": "スペース情報を更新",
  "space.deleted": "スペースを削除",
  "space.member_added": "スペースにメンバーを追加",
  "space.member_removed": "スペースからメンバーを削除",
  "space.member_left": "スペースから退出",
  "space.member_role_changed": "スペースメンバー権限を変更",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  application: "申請",
  group_member: "スペースメンバー",
  invitation: "招待",
  space: "スペース",
  user: "ユーザー",
};

const ACTOR_TYPE_LABELS: Record<string, string> = {
  applicant: "申請者",
  system: "システム",
  user: "ログインユーザー",
};

const FIELD_LABELS: Record<string, string> = {
  description: "説明",
  email: "メールアドレス",
  groupRole: "スペース権限",
  isActive: "有効状態",
  name: "スペース名",
  role: "テナント権限",
  status: "状態",
  stepOrder: "承認ステップ",
  userName: "名前",
};

const DETAIL_LABELS: Record<string, string> = {
  actionType: "操作コード",
  adminUserIds: "管理者ユーザーID",
  applicantEmail: "申請者メール",
  applicationId: "申請ID",
  approvalFlowId: "承認フローID",
  comment: "コメント",
  emailFrom: "メールアドレス（変更前）",
  emailTo: "メールアドレス（変更後）",
  expiresAt: "招待期限",
  fieldIds: "差し戻し項目",
  fieldKeys: "変更項目",
  formDefinitionId: "フォームID",
  groupId: "スペースID",
  groupName: "スペース名",
  isActiveFrom: "有効状態（変更前）",
  isActiveTo: "有効状態（変更後）",
  nameFrom: "スペース名（変更前）",
  nameTo: "スペース名（変更後）",
  operation: "操作",
  outcome: "結果",
  overallComment: "全体コメント",
  passwordChanged: "パスワード変更",
  resourceId: "リソースID",
  resourceLabel: "リソース名",
  resourceType: "リソース種別",
  scopeId: "スコープID",
  scopeType: "スコープ種別",
  targetId: "対象ID",
  targetType: "対象種別",
  targetUserId: "対象ユーザーID",
  userNameFrom: "名前（変更前）",
  userNameTo: "名前（変更後）",
};

const STATUS_LABELS: Record<string, string> = {
  approved: "承認済み",
  draft: "下書き",
  in_review: "審査中",
  rejected: "却下",
  returned: "差し戻し",
  submitted: "提出済み",
};

const USER_ROLE_LABELS: Record<string, string> = {
  tenant_admin: "テナント管理者",
  tenant_user: "一般ユーザー",
};

const GROUP_ROLE_LABELS: Record<string, string> = {
  admin: "スペース管理者",
  user: "スペースメンバー",
};

const CRITICAL_ACTIONS = new Set([
  "application.rejected",
  "space.deleted",
  "space.member_removed",
  "space.member_role_changed",
  "user.deactivated",
  "user.role_changed",
]);

const ATTENTION_ACTIONS = new Set([
  "application.returned",
  "invitation.created",
  "space.member_added",
  "space.member_left",
  "user.password_changed",
  "user.restored",
]);

const legacyMetadataChangeKeys = [
  { field: "isActive", fromKey: "isActiveFrom", toKey: "isActiveTo" },
  { field: "email", fromKey: "emailFrom", toKey: "emailTo" },
  { field: "userName", fromKey: "userNameFrom", toKey: "userNameTo" },
  { field: "name", fromKey: "nameFrom", toKey: "nameTo" },
  {
    field: "description",
    fromKey: "descriptionFrom",
    toKey: "descriptionTo",
  },
];

/**
 * 監査ログ行に表示用情報を付与します。
 */
export function enrichAuditRow(row: AuditRow): EnrichedAuditRow {
  return {
    display: buildAuditDisplay(row),
    row,
  };
}

/**
 * 監査ログ行の主要表示情報を組み立てます。
 */
export function buildAuditDisplay(row: AuditRow): AuditDisplayInfo {
  const metadata = readMetadata(row.metadataJson);
  const actorLabel = describeActorLabel(row);
  const actionLabel = describeActionLabel(row);
  const targetLabel = describeTargetLabel(row);
  const severity = auditLogSeverity(row);
  return {
    actorDetail: describeActorDetail(row),
    actorLabel,
    actionLabel,
    categoryLabel: describeCategoryLabel(row),
    changeItems: describeChanges(row, metadata),
    detailItems: buildDetailItems(row, metadata),
    isImportant: severity !== "normal",
    sentence: `${actorLabel} が「${targetLabel}」で ${actionLabel}しました`,
    severity,
    severityLabel: severityLabel(severity),
    summary: row.summary ?? null,
    targetDetail: describeTargetDetail(row),
    targetHref: buildTargetHref(row, metadata),
    targetLabel,
    targetTypeLabel: targetTypeLabel(getAuditRowResourceType(row)),
  };
}

/**
 * 監査ログの action を汎用の operation ラベルに変換します。
 */
export function describeActionLabel(row: AuditRow): string {
  return ACTION_LABELS[row.actionType] ?? formatIdentifierJa(
    row.operation || operationFromActionType(row.actionType),
  );
}

/**
 * 監査ログの対象リソースを表示ラベルに変換します。
 */
export function describeTargetLabel(row: AuditRow): string {
  const resourceType = getAuditRowResourceType(row);
  const resourceId = getAuditRowResourceId(row);

  if (resourceType === "application") {
    return `申請 ${shortId(row.applicationId ?? resourceId)}`;
  }
  if (resourceType === "space") {
    const groupName = textValue(readMetadata(row.metadataJson).groupName);
    return groupName || `スペース ${shortId(resourceId ?? row.groupId)}`;
  }

  const resourceLabel =
    textValue(row.resource?.label) ||
    textValue(row.resourceLabel) ||
    textValue(row.targetEmailSnapshot);
  if (resourceLabel) {
    return resourceLabel;
  }

  const typeLabel = targetTypeLabel(resourceType);
  return resourceId
    ? `${typeLabel} ${shortId(resourceId)}`
    : typeLabel || "対象";
}

/**
 * 監査ログ行から汎用の概要件数を集計します。
 */
export function buildAuditSummaryCounts(
  rows: EnrichedAuditRow[],
): AuditLogSummaryCounts {
  let accessEvents = 0;
  let applicationEvents = 0;
  let importantEvents = 0;

  for (const item of rows) {
    const resourceType = getAuditRowResourceType(item.row);
    if (resourceType === "application") {
      applicationEvents += 1;
    }
    if (["group_member", "invitation", "space", "user"].includes(resourceType)) {
      accessEvents += 1;
    }
    if (item.display.isImportant) {
      importantEvents += 1;
    }
  }

  return {
    accessEvents,
    applicationEvents,
    importantEvents,
    total: rows.length,
  };
}

/**
 * 監査ログ行の汎用リソース種別を返します。
 */
export function getAuditRowResourceType(row: AuditRow): string {
  return row.resource?.type || row.resourceType || row.targetType;
}

/**
 * 監査ログの実行者ラベルを組み立てます。
 */
function describeActorLabel(row: AuditRow): string {
  const actorLabel =
    textValue(row.actor?.label) ||
    textValue(row.actor?.email) ||
    textValue(row.actorEmailSnapshot) ||
    textValue(row.actorEmail);
  if (actorLabel) {
    return actorLabel;
  }
  if (row.actorType === "system") {
    return "システム";
  }
  if (row.actorType === "applicant") {
    return "申請者";
  }
  return row.actorUserId
    ? `ユーザー ${shortId(row.actorUserId)}`
    : "不明な操作者";
}

/**
 * 監査ログの実行者詳細を組み立てます。
 */
function describeActorDetail(row: AuditRow): string | null {
  const actorType = row.actor?.type || row.actorType;
  const actorId = row.actor?.id || row.actorUserId;
  const parts = [ACTOR_TYPE_LABELS[actorType] ?? actorType];
  if (actorId) {
    parts.push(`ID: ${shortId(actorId)}`);
  }
  return parts.filter(Boolean).join(" / ") || null;
}

/**
 * 監査ログの対象詳細を組み立てます。
 */
function describeTargetDetail(row: AuditRow): string | null {
  const resourceType = getAuditRowResourceType(row);
  const resourceId = getAuditRowResourceId(row);
  const parts = [targetTypeLabel(resourceType)];
  if (resourceId) {
    parts.push(`リソースID: ${shortId(resourceId)}`);
  }
  if (row.scopeType || row.scopeId) {
    parts.push(
      `スコープ: ${formatIdentifierJa(row.scopeType || "-")} ${shortId(row.scopeId)}`,
    );
  }
  if (row.targetUserId && row.targetUserId !== resourceId) {
    parts.push(`対象ユーザーID: ${shortId(row.targetUserId)}`);
  }
  return parts.filter(Boolean).join(" / ") || null;
}

/**
 * 監査ログの変更内容を汎用の field/from/to 表示に変換します。
 */
function describeChanges(
  row: AuditRow,
  metadata: Record<string, unknown>,
): string[] {
  const genericChanges = normalizeChanges(row.changes);
  const changes =
    genericChanges.length > 0 ? genericChanges : legacyChanges(row, metadata);

  if (changes.length === 0) {
    return ["変更なし"];
  }
  return changes.map(
    (change) =>
      `${fieldLabel(change.field)}: ${formatAuditValue(change.field, change.from)} → ${formatAuditValue(change.field, change.to)}`,
  );
}

/**
 * 旧カラムしか持たない監査ログから汎用 changes を組み立てます。
 */
function legacyChanges(
  row: AuditRow,
  metadata: Record<string, unknown>,
): AuditEventChange[] {
  const changes: AuditEventChange[] = [];
  addChange(changes, "status", row.statusFrom, row.statusTo);
  addChange(changes, "stepOrder", row.stepOrderFrom, row.stepOrderTo);
  addChange(changes, "role", row.roleFrom, row.roleTo);
  addChange(changes, "groupRole", row.groupRoleFrom, row.groupRoleTo);

  for (const key of legacyMetadataChangeKeys) {
    if (key.fromKey in metadata || key.toKey in metadata) {
      addChange(changes, key.field, metadata[key.fromKey], metadata[key.toKey]);
    }
  }

  return changes;
}

/**
 * 監査ログのメタデータから詳細表示項目を組み立てます。
 */
function buildDetailItems(
  row: AuditRow,
  metadata: Record<string, unknown>,
): AuditLogDisplayEntry[] {
  const items: AuditLogDisplayEntry[] = [];

  addItem(items, "actionType", row.actionType);
  addItem(items, "operation", row.operation);
  addItem(items, "outcome", row.outcome);
  addItem(items, "scopeType", row.scopeType);
  addItem(items, "scopeId", row.scopeId);
  addItem(items, "resourceType", getAuditRowResourceType(row));
  addItem(items, "resourceId", getAuditRowResourceId(row));
  addItem(items, "resourceLabel", row.resource?.label || row.resourceLabel);
  addItem(items, "targetType", row.targetType);
  addItem(items, "targetId", row.targetId);
  addItem(items, "targetUserId", row.targetUserId);
  addItem(items, "applicationId", row.applicationId);
  addItem(items, "groupId", row.groupId);

  for (const [key, value] of Object.entries(metadata).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (isSensitiveMetadataKey(key)) {
      continue;
    }
    addItem(items, key, value);
  }

  return items;
}

/**
 * 監査ログ対象へ遷移する URL を組み立てます。
 */
function buildTargetHref(
  row: AuditRow,
  metadata: Record<string, unknown>,
): string | null {
  if (getAuditRowResourceType(row) !== "application") {
    return null;
  }
  const applicationId = row.applicationId ?? getAuditRowResourceId(row);
  const groupId =
    row.groupId ?? (row.scopeType === "space" ? row.scopeId : null);
  if (!groupId || !applicationId) {
    return null;
  }

  return buildSpaceApplicationDetailHrefByIds(
    groupId,
    applicationId,
    textValue(metadata.formDefinitionId) || null,
  );
}

function getAuditRowResourceId(row: AuditRow): string | null {
  return row.resource?.id || row.resourceId || row.targetId || null;
}

function operationFromActionType(actionType: string): string {
  const separatorIndex = actionType.indexOf(".");
  return separatorIndex >= 0
    ? actionType.slice(separatorIndex + 1)
    : actionType;
}

function normalizeChanges(
  value: AuditEventChange[] | null | undefined,
): AuditEventChange[] {
  return Array.isArray(value)
    ? value.filter((change) => Boolean(change.field))
    : [];
}

function addChange(
  changes: AuditEventChange[],
  field: string,
  from: unknown,
  to: unknown,
): void {
  if (!hasAuditValue(from) && !hasAuditValue(to)) {
    return;
  }
  changes.push({ field, from: from ?? null, to: to ?? null });
}

function hasAuditValue(value: unknown): boolean {
  return value !== undefined && value !== null;
}

function auditLogSeverity(row: AuditRow): AuditLogSeverity {
  if (CRITICAL_ACTIONS.has(row.actionType)) {
    return "critical";
  }
  if (ATTENTION_ACTIONS.has(row.actionType)) {
    return "attention";
  }
  return "normal";
}

function severityLabel(severity: AuditLogSeverity): string | null {
  if (severity === "critical") {
    return "重要";
  }
  if (severity === "attention") {
    return "要確認";
  }
  return null;
}

function describeCategoryLabel(row: AuditRow): string {
  const resourceType = getAuditRowResourceType(row);
  if (resourceType === "application") {
    return "申請";
  }
  if (["user", "invitation"].includes(resourceType)) {
    return "ユーザー・権限";
  }
  if (["space", "group_member"].includes(resourceType)) {
    return "スペース";
  }
  return targetTypeLabel(resourceType);
}

function targetTypeLabel(value: string): string {
  return TARGET_TYPE_LABELS[value] ?? formatIdentifierJa(value);
}

function fieldLabel(value: string): string {
  return FIELD_LABELS[value] ?? formatIdentifierJa(value);
}

function detailLabel(value: string): string {
  return DETAIL_LABELS[value] ?? formatIdentifierJa(value);
}

function formatAuditValue(field: string, value: unknown): string {
  if (value == null) {
    return "-";
  }
  if (field === "status") {
    return formatMapValue(value, STATUS_LABELS);
  }
  if (field === "role") {
    return formatMapValue(value, USER_ROLE_LABELS);
  }
  if (field === "groupRole") {
    return formatMapValue(value, GROUP_ROLE_LABELS);
  }
  if (field === "isActive") {
    return formatActive(value);
  }
  return formatDetailValue(value) || "-";
}

function formatDetailValue(value: unknown): string {
  if (value === true) {
    return "はい";
  }
  if (value === false) {
    return "いいえ";
  }
  const text = textValue(value);
  if (text) {
    return text;
  }
  const values = valueList(value);
  if (values.length > 0) {
    return values.join(", ");
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }
  return "";
}

function formatMapValue(
  value: unknown,
  labels: Record<string, string>,
): string {
  const text = textValue(value);
  return text ? (labels[text] ?? text) : "-";
}

function formatActive(value: unknown): string {
  if (value === true) {
    return "有効";
  }
  if (value === false) {
    return "無効";
  }
  return "-";
}

function formatIdentifierJa(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .trim()
    .toLowerCase();
}

function addItem(
  items: AuditLogDisplayEntry[],
  label: string,
  value: unknown,
): void {
  const formatted =
    label === "passwordChanged" && value === true
      ? "実施"
      : formatDetailValue(value);
  if (formatted) {
    items.push({ label: detailLabel(label), value: formatted });
  }
}

function isSensitiveMetadataKey(key: string): boolean {
  return /password(?!Changed)|token|secret/i.test(key);
}
