import { UserRole } from './user-role';

/** 招待で付与できるロール（`docs/03_er_diagram.md` invitations.role） */
export const InvitationAssignableRole = {
  PLATFORM_ADMIN: UserRole.PLATFORM_ADMIN,
  USER: UserRole.APPLICANT,
} as const;

export type InvitationAssignableRoleValue =
  (typeof InvitationAssignableRole)[keyof typeof InvitationAssignableRole];

export const INVITATION_ASSIGNABLE_ROLES: InvitationAssignableRoleValue[] = [
  InvitationAssignableRole.PLATFORM_ADMIN,
  InvitationAssignableRole.USER,
];
