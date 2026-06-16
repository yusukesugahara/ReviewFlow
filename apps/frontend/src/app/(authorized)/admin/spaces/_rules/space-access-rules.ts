import { TENANT_ROLES } from "@/lib/constants/roles";
import type { AdminSpacesMe, GroupMemberSummary } from "../types";

/**
 * 現在のユーザーがテナント管理者権限を持つかを判定します。
 */
export function isSystemAdminUser(user: Pick<AdminSpacesMe, "roles">): boolean {
  return user.roles.includes(TENANT_ROLES.admin);
}

/**
 * 現在のユーザーがスペースを作成できるかを判定します。
 */
export function canCreateSpace(user: Pick<AdminSpacesMe, "roles">): boolean {
  return isSystemAdminUser(user);
}

/**
 * 現在のユーザーが指定スペースを管理できるかを判定します。
 */
export function canManageSpace({
  currentUserId,
  isSystemAdmin,
  members,
}: {
  currentUserId: string;
  isSystemAdmin: boolean;
  members: GroupMemberSummary[];
}): boolean {
  return (
    isSystemAdmin ||
    members.some(
      (member) => member.userId === currentUserId && member.role === "admin",
    )
  );
}
