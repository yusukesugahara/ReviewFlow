import { TENANT_ROLES } from "@/lib/constants/roles";
import type { AdminSpacesMe, GroupMemberSummary } from "../types";

export function isSystemAdminUser(user: Pick<AdminSpacesMe, "roles">): boolean {
  return user.roles.includes(TENANT_ROLES.admin);
}

export function canCreateSpace(user: Pick<AdminSpacesMe, "roles">): boolean {
  return isSystemAdminUser(user);
}

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
