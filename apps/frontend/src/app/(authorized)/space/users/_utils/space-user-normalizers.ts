import type {
  GroupAvailableUsersSuccessJson,
  GroupMembersListSuccessJson,
} from "@/lib/schema";
import type { SpaceUsersAvailableUser, SpaceUsersMember } from "../types";

/**
 * バックエンドから返されたスペースメンバーをユーザー管理画面用に正規化します。
 */
export function normalizeSpaceMembers(
  members: GroupMembersListSuccessJson["data"]["members"],
): SpaceUsersMember[] {
  return members.map((member) => ({
    ...member,
    name: normalizeName(member.name),
  }));
}

/**
 * スペースへ追加できるテナントユーザーを正規化します。
 */
export function normalizeAvailableUsers(
  users: GroupAvailableUsersSuccessJson["data"]["users"],
): SpaceUsersAvailableUser[] {
  return users.map((user) => ({
    ...user,
    name: normalizeName(user.name),
  }));
}

/**
 * 未知の name 値を UI で使う nullable string の形に変換します。
 */
function normalizeName(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
