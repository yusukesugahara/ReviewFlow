export const TENANT_ROLES = {
  admin: "tenant_admin",
  user: "tenant_user",
} as const;

export type TenantRole = (typeof TENANT_ROLES)[keyof typeof TENANT_ROLES];

export const TENANT_ROLE_OPTIONS: { value: TenantRole; label: string }[] = [
  { value: TENANT_ROLES.user, label: "テナントユーザ" },
  { value: TENANT_ROLES.admin, label: "テナント管理者" },
];

export const SPACE_ROLES = {
  admin: "admin",
  user: "user",
} as const;

export type SpaceRole = (typeof SPACE_ROLES)[keyof typeof SPACE_ROLES];

export const SPACE_ROLE_OPTIONS: { value: SpaceRole; label: string }[] = [
  { value: SPACE_ROLES.user, label: "スペースユーザ" },
  { value: SPACE_ROLES.admin, label: "スペース管理者" },
];
