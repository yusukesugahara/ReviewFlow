import type {
  AdminSpacesAvailableUsersData,
  AdminSpacesGroupsData,
  AdminSpacesMembersData,
  AdminSpacesUsersData,
  AvailableUserSummary,
  GroupMemberSummary,
  GroupSummary,
  TenantUserSummary,
} from "../types";

/**
 * 管理者向けスペース画面へ渡す前にグループ概要を正規化します。
 */
export function normalizeGroups(
  groups: AdminSpacesGroupsData["groups"],
): GroupSummary[] {
  return groups.map((group) => ({
    ...group,
    description: normalizeName(group.description),
  }));
}

/**
 * テーブル表示へ渡す前にグループメンバー概要を正規化します。
 */
export function normalizeMembers(
  members: AdminSpacesMembersData["members"],
): GroupMemberSummary[] {
  return members.map((member) => ({
    ...member,
    name: normalizeName(member.name),
  }));
}

/**
 * ダイアログへ渡す前に追加可能ユーザー概要を正規化します。
 */
export function normalizeAvailableUsers(
  users: AdminSpacesAvailableUsersData["users"],
): AvailableUserSummary[] {
  return users.map((user) => ({
    ...user,
    name: normalizeName(user.name),
  }));
}

/**
 * 管理者操作へ渡す前にテナントユーザー概要を正規化します。
 */
export function normalizeTenantUsers(
  users: AdminSpacesUsersData["users"],
): TenantUserSummary[] {
  return users.map((user) => ({
    ...user,
    name: normalizeName(user.name),
  }));
}

/**
 * 文字列以外の表示名を null に変換し、表示用 props の形に揃えます。
 */
function normalizeName(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
