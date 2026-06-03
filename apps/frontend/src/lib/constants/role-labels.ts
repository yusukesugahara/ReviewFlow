import { SPACE_ROLES, TENANT_ROLES } from "./roles";

export function userRoleLabel(role: string): string {
  switch (role) {
    case TENANT_ROLES.admin:
      return "テナント管理者";
    case TENANT_ROLES.user:
      return "テナントユーザー";
    default:
      return role;
  }
}

export function spaceRoleLabel(role: string): string {
  switch (role) {
    case SPACE_ROLES.admin:
      return "スペース管理者";
    case SPACE_ROLES.user:
      return "スペースユーザー";
    default:
      return role;
  }
}
