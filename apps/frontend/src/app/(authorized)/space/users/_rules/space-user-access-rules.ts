import { TENANT_ROLES } from "@/lib/constants/roles";
import type { CurrentSessionUser } from "@/app/(authorized)/session/actions";

/**
 * 現在のセッションユーザーがテナント管理者権限を持つかを判定します。
 */
export function isTenantAdminUser(user: CurrentSessionUser | null): boolean {
  return user?.roles.includes(TENANT_ROLES.admin) ?? false;
}
