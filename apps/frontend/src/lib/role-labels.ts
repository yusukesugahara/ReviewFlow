export function userRoleLabel(role: string): string {
  switch (role) {
    case "platform_admin":
    case "tenant_admin":
      return "システム管理者";
    case "approver":
    case "applicant":
      return "ユーザー";
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
