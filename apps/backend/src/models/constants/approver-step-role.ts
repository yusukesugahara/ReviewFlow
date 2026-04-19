import { UserRole } from './user-role';

/** `docs/03_er_diagram.md` approval_steps.approver_role */
export const ApproverStepRole = {
  TENANT_ADMIN: UserRole.TENANT_ADMIN,
  APPROVER: UserRole.APPROVER,
} as const;

export type ApproverStepRoleValue =
  (typeof ApproverStepRole)[keyof typeof ApproverStepRole];

export const APPROVER_STEP_ROLES: ApproverStepRoleValue[] = [
  ApproverStepRole.TENANT_ADMIN,
  ApproverStepRole.APPROVER,
];
