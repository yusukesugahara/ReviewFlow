/** `docs/03_er_diagram.md` の users.role に合わせる */
export const UserRole = {
  PLATFORM_ADMIN: 'platform_admin',
  TENANT_ADMIN: 'tenant_admin',
  APPROVER: 'approver',
  APPLICANT: 'applicant',
} as const;

export type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];
