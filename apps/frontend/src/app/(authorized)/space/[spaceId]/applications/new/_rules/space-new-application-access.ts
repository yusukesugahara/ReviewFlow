import { TENANT_ROLES } from "@/lib/constants/roles";
import type { CurrentSessionUser } from "@/app/(authorized)/session/actions";
import type { SpaceNewApplicationGroup } from "../types";

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
