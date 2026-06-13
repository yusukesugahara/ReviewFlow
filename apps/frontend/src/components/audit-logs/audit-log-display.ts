import type { AuditLogItem } from "@/lib/schema";
import { readMetadata, shortId, textValue, valueList } from "./audit-log-metadata";

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

export type AuditDisplayInfo = {
  actorDetail: string | null;
  actorLabel: string;
  actionLabel: string;
  changeItems: string[];
  detailItems: AuditLogDisplayEntry[];
  summary: string | null;
  targetDetail: string | null;
  targetLabel: string;
};

export type EnrichedAuditRow = {
  display: AuditDisplayInfo;
  row: AuditRow;
};

export type AuditLogSummaryCounts = {
  applicationEvents: number;
  identityEvents: number;
  spaceEvents: number;
  total: number;
};

const ACTION_LABELS: Record<string, string> = {
  "application.created": "申請を作成",
  "application.submitted": "申請を提出",
  "application.approved": "申請を承認",
  "application.returned": "申請を差し戻し",
  "application.corrected": "申請を修正",
  "application.resubmitted": "申請を再提出",
  "application.rejected": "申請を却下",
  "invitation.created": "ユーザを招待",
  "invitation.accepted": "招待を受諾",
  "user.role_changed": "ユーザ権限を変更",
  "user.deactivated": "ユーザを無効化",
  "user.restored": "ユーザを復元",
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
  user: "ユーザ",
};

const ACTOR_TYPE_LABELS: Record<string, string> = {
  applicant: "申請者",
  system: "システム",
  user: "ログインユーザ",
};

const STATUS_LABELS: Record<string, string> = {
  approved: "承認済み",
  draft: "下書き",
  in_review: "レビュー中",
  published: "公開済み",
  rejected: "却下",
  returned: "差し戻し",
  submitted: "提出済み",
};

const USER_ROLE_LABELS: Record<string, string> = {
  tenant_admin: "テナント管理者",
  tenant_user: "テナントユーザ",
};

const GROUP_ROLE_LABELS: Record<string, string> = {
  admin: "スペース管理者",
  user: "スペースユーザ",
};

export function enrichAuditRow(row: AuditRow): EnrichedAuditRow {
  return {
    display: buildAuditDisplay(row),
    row,
  };
}

export function buildAuditDisplay(row: AuditRow): AuditDisplayInfo {
  const metadata = readMetadata(row.metadataJson);
  return {
    actorDetail: describeActorDetail(row),
    actorLabel: describeActorLabel(row),
    actionLabel: describeActionLabel(row),
    changeItems: describeChanges(row, metadata),
    detailItems: buildDetailItems(row, metadata),
    summary: row.summary ?? null,
    targetDetail: describeTargetDetail(row),
    targetLabel: describeTargetLabel(row, metadata),
  };
}

export function describeActionLabel(row: AuditRow): string {
  return ACTION_LABELS[row.actionType] ?? row.actionType;
}

export function describeTargetLabel(
  row: AuditRow,
  metadata = readMetadata(row.metadataJson),
): string {
  if (row.targetEmailSnapshot) {
    return row.targetEmailSnapshot;
  }
  if (row.targetType === "application") {
    return `申請 ${shortId(row.applicationId ?? row.targetId)}`;
  }
  if (row.targetType === "space") {
    const groupName = textValue(metadata.groupName);
    return groupName || `スペース ${shortId(row.targetId ?? row.groupId)}`;
  }
  const label = targetTypeLabel(row.targetType);
  return row.targetId ? `${label} ${shortId(row.targetId)}` : label;
}

export function buildAuditSummaryCounts(
  rows: EnrichedAuditRow[],
): AuditLogSummaryCounts {
  return {
    applicationEvents: rows.filter((item) => item.row.targetType === "application")
      .length,
    identityEvents: rows.filter((item) =>
      ["invitation", "user"].includes(item.row.targetType),
    ).length,
    spaceEvents: rows.filter((item) =>
      ["group_member", "space"].includes(item.row.targetType),
    ).length,
    total: rows.length,
  };
}

function describeActorLabel(row: AuditRow): string {
  if (row.actorEmailSnapshot) {
    return row.actorEmailSnapshot;
  }
  if (row.actorEmail) {
    return row.actorEmail;
  }
  if (row.actorType === "system") {
    return "システム";
  }
  if (row.actorType === "applicant") {
    return "申請者";
  }
  return row.actorUserId ? `ユーザ ${shortId(row.actorUserId)}` : "不明な操作者";
}

function describeActorDetail(row: AuditRow): string | null {
  const parts = [ACTOR_TYPE_LABELS[row.actorType] ?? row.actorType];
  if (row.actorUserId) {
    parts.push(`ID: ${shortId(row.actorUserId)}`);
  }
  return parts.filter(Boolean).join(" / ");
}

function describeTargetDetail(row: AuditRow): string | null {
  const parts = [targetTypeLabel(row.targetType)];
  if (row.applicationId) {
    parts.push(`申請ID: ${shortId(row.applicationId)}`);
  }
  if (row.targetUserId) {
    parts.push(`ユーザID: ${shortId(row.targetUserId)}`);
  }
  if (
    row.targetId &&
    row.targetId !== row.applicationId &&
    row.targetId !== row.targetUserId
  ) {
    parts.push(`対象ID: ${shortId(row.targetId)}`);
  }
  return parts.filter(Boolean).join(" / ");
}

function describeChanges(
  row: AuditRow,
  metadata: Record<string, unknown>,
): string[] {
  const changes: string[] = [];

  if (row.statusFrom || row.statusTo) {
    changes.push(`状態: ${formatStatus(row.statusFrom)} -> ${formatStatus(row.statusTo)}`);
  }
  if (row.stepOrderFrom != null || row.stepOrderTo != null) {
    changes.push(
      `ステップ: ${formatNumber(row.stepOrderFrom)} -> ${formatNumber(row.stepOrderTo)}`,
    );
  }
  if (row.roleFrom || row.roleTo) {
    changes.push(`権限: ${formatUserRole(row.roleFrom)} -> ${formatUserRole(row.roleTo)}`);
  }
  if (row.groupRoleFrom || row.groupRoleTo) {
    changes.push(
      `スペース権限: ${formatGroupRole(row.groupRoleFrom)} -> ${formatGroupRole(row.groupRoleTo)}`,
    );
  }
  if (
    typeof metadata.isActiveFrom === "boolean" ||
    typeof metadata.isActiveTo === "boolean"
  ) {
    changes.push(
      `有効状態: ${formatActive(metadata.isActiveFrom)} -> ${formatActive(metadata.isActiveTo)}`,
    );
  }
  const nameChange = formatTextChange(metadata.nameFrom, metadata.nameTo);
  if (nameChange) {
    changes.push(`スペース名: ${nameChange}`);
  }
  const descriptionChange = formatTextChange(
    metadata.descriptionFrom,
    metadata.descriptionTo,
  );
  if (descriptionChange) {
    changes.push(`説明: ${descriptionChange}`);
  }

  return changes.length > 0 ? changes : ["変更なし"];
}

function buildDetailItems(
  row: AuditRow,
  metadata: Record<string, unknown>,
): AuditLogDisplayEntry[] {
  const items: AuditLogDisplayEntry[] = [];
  addItem(items, "actionType", row.actionType);
  addItem(items, "申請ID", row.applicationId);
  addItem(items, "スペースID", row.groupId);
  addItem(items, "対象ID", row.targetId);
  addItem(items, "対象ユーザID", row.targetUserId);
  addItem(items, "申請者メール", metadata.applicantEmail);
  addItem(items, "フォームID", metadata.formDefinitionId);
  addItem(items, "承認フローID", metadata.approvalFlowId);
  addItem(items, "スペース名", metadata.groupName);
  addItem(items, "スペース名（変更前）", metadata.nameFrom);
  addItem(items, "スペース名（変更後）", metadata.nameTo);
  addItem(items, "説明（変更前）", metadata.descriptionFrom);
  addItem(items, "説明（変更後）", metadata.descriptionTo);
  addItem(items, "招待期限", metadata.expiresAt);
  addItem(items, "コメント", metadata.comment);
  addItem(items, "全体コメント", metadata.overallComment);
  addListItem(items, "変更項目", metadata.fieldKeys);
  addListItem(items, "差し戻し項目", metadata.fieldIds);
  addListItem(items, "管理者ユーザID", metadata.adminUserIds);
  return items;
}

function addItem(
  items: AuditLogDisplayEntry[],
  label: string,
  value: unknown,
): void {
  const text = textValue(value);
  if (text) {
    items.push({ label, value: text });
  }
}

function addListItem(
  items: AuditLogDisplayEntry[],
  label: string,
  value: unknown,
): void {
  const values = valueList(value);
  if (values.length > 0) {
    items.push({ label, value: values.join(", ") });
  }
}

function targetTypeLabel(value: string): string {
  return TARGET_TYPE_LABELS[value] ?? value;
}

function formatStatus(value: string | null | undefined): string {
  return value ? (STATUS_LABELS[value] ?? value) : "-";
}

function formatUserRole(value: string | null | undefined): string {
  return value ? (USER_ROLE_LABELS[value] ?? value) : "-";
}

function formatGroupRole(value: string | null | undefined): string {
  return value ? (GROUP_ROLE_LABELS[value] ?? value) : "-";
}

function formatNumber(value: number | null | undefined): string {
  return typeof value === "number" ? String(value) : "-";
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

function formatTextChange(from: unknown, to: unknown): string | null {
  const fromText = textValue(from);
  const toText = textValue(to);
  if (!fromText && !toText) {
    return null;
  }
  if (fromText === toText) {
    return null;
  }
  return `${fromText || "-"} -> ${toText || "-"}`;
}
