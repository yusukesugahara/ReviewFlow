/** `docs/03_er_diagram.md` application_approvals.action */
export const ApplicationApprovalAction = {
  APPROVED: 'approved',
  RETURNED: 'returned',
  REJECTED: 'rejected',
} as const;

export type ApplicationApprovalActionValue =
  (typeof ApplicationApprovalAction)[keyof typeof ApplicationApprovalAction];
