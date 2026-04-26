import { UserRole } from './user-role';

/** 招待で付与できるロール（`docs/03_er_diagram.md` invitations.role） */
export const InvitationAssignableRole = {
  TENANT_ADMIN: UserRole.TENANT_ADMIN,
  APPROVER: UserRole.APPROVER,
} as const;

export type InvitationAssignableRoleValue =
  (typeof InvitationAssignableRole)[keyof typeof InvitationAssignableRole];

export const INVITATION_ASSIGNABLE_ROLES: InvitationAssignableRoleValue[] = [
  InvitationAssignableRole.TENANT_ADMIN,
  InvitationAssignableRole.APPROVER,
];
