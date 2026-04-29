export const UserRole = {
  TENANT_ADMIN: 'tenant_admin',
  TENANT_USER: 'tenant_user',
} as const;

export type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];
