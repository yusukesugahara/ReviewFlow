import { TENANT_ROLES } from "@/lib/constants/roles";
import type { CurrentSessionUser } from "@/app/(authorized)/session/actions";
import type { SpaceNewApplicationGroup } from "../types";

/**
 * 現在のユーザーがスペース内の新規申請を管理できるかを判定します。
 */
export function canManageSpaceForNewApplication({
  currentGroup,
  user,
}: {
  currentGroup?: SpaceNewApplicationGroup;
  user: CurrentSessionUser | null;
}): boolean {
  return Boolean(
    user?.roles.includes(TENANT_ROLES.admin) ||
      currentGroup?.currentUserRole === "admin",
  );
}
