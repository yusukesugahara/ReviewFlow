export const TenantPlan = {
  FREE: 'free',
  STANDARD: 'standard',
  PRO: 'pro',
} as const;

export type TenantPlanValue = (typeof TenantPlan)[keyof typeof TenantPlan];

export const TenantStatus = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
} as const;

export type TenantStatusValue =
  (typeof TenantStatus)[keyof typeof TenantStatus];
