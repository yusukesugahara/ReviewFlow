import { SPACE_ROLES, TENANT_ROLES } from "./roles";

/**
 * テナントロールを画面表示用ラベルに変換します。
 */
export function userRoleLabel(role: string): string {
  switch (role) {
    case TENANT_ROLES.admin:
      return "テナント管理者";
    case TENANT_ROLES.user:
      return "テナントユーザ";
    default:
      return role;
  }
}

/**
 * スペースロールを画面表示用ラベルに変換します。
 */
export function spaceRoleLabel(role: string): string {
  switch (role) {
    case SPACE_ROLES.admin:
      return "スペース管理者";
    case SPACE_ROLES.user:
      return "スペースユーザ";
    default:
      return role;
  }
}
