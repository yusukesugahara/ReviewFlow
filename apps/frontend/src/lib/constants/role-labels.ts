export function userRoleLabel(role: string): string {
  switch (role) {
    case "tenant_admin":
      return "テナント管理者";
    case "tenant_user":
      return "テナントユーザー";
    default:
      return role;
  }
}

export function spaceRoleLabel(role: string): string {
  switch (role) {
    case "admin":
      return "スペース管理者";
    case "user":
      return "スペースユーザー";
    default:
      return role;
  }
}
