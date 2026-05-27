export const InvitationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const;

export type InvitationStatusValue =
  (typeof InvitationStatus)[keyof typeof InvitationStatus];
