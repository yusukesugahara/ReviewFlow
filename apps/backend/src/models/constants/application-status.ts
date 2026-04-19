/** `docs/03_er_diagram.md` applications.status */
export const ApplicationStatus = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  IN_REVIEW: 'in_review',
  RETURNED: 'returned',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ApplicationStatusValue =
  (typeof ApplicationStatus)[keyof typeof ApplicationStatus];
