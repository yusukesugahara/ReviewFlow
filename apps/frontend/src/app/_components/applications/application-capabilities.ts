import type { CurrentSessionUser } from "@/app/(authorized)/session/actions";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import type { ApplicationDetailViewModel } from "./application-detail.types";

export type ApplicationCapabilities = {
  canEditApplication: boolean;
  canSubmitApplication: boolean;
  canResubmitApplication: boolean;
  canApproveApplication: boolean;
  canRejectApplication: boolean;
  canReturnApplication: boolean;
};

export function getApplicationCapabilities(
  application: ApplicationDetailViewModel,
  actor: CurrentSessionUser | null,
): ApplicationCapabilities {
  const isApplicant =
    actor !== null && actor.email.toLowerCase() === application.applicantEmail?.toLowerCase();
  const isInReview = application.status === APPLICATION_STATUSES.inReview;

  return {
    canEditApplication:
      isApplicant &&
      (application.status === APPLICATION_STATUSES.draft ||
        application.status === APPLICATION_STATUSES.published ||
        application.status === APPLICATION_STATUSES.returned),
    canSubmitApplication:
      isApplicant &&
      (application.status === APPLICATION_STATUSES.draft ||
        application.status === APPLICATION_STATUSES.published),
    canResubmitApplication:
      isApplicant && application.status === APPLICATION_STATUSES.returned,
    canApproveApplication: isInReview,
    canRejectApplication: isInReview,
    canReturnApplication: isInReview && application.currentStepCanReturn === true,
  };
}
