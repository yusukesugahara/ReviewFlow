import { TENANT_ROLES } from "@/lib/constants/roles";
import type { CurrentSessionUser } from "@/app/(authorized)/session/actions";

export function isTenantAdminUser(user: CurrentSessionUser | null): boolean {
  return user?.roles.includes(TENANT_ROLES.admin) ?? false;
}
