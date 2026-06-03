/** `docs/03_er_diagram.md` correction_requests.status */
export const CorrectionRequestStatus = {
  OPEN: 'open',
  RESOLVED: 'resolved',
} as const;

export type CorrectionRequestStatusValue =
  (typeof CorrectionRequestStatus)[keyof typeof CorrectionRequestStatus];
