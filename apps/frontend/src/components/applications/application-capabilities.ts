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

function isCurrentStepAssignee(
  application: ApplicationDetailViewModel,
  actor: CurrentSessionUser,
): boolean {
  if (application.currentStepAssigneeUserIds?.includes(actor.id)) {
    return true;
  }

  const currentStep = application.approvalProgress?.find(
    (step) => step.status === "current",
  );
  if (!currentStep) {
    return false;
  }

  return currentStep.assignees.some((assignee) => assignee.id === actor.id);
}

function canActOnReview(
  application: ApplicationDetailViewModel,
  actor: CurrentSessionUser | null,
): boolean {
  if (!actor || application.status !== APPLICATION_STATUSES.inReview) {
    return false;
  }
  return isCurrentStepAssignee(application, actor);
}

export function getApplicationCapabilities(
  application: ApplicationDetailViewModel,
  actor: CurrentSessionUser | null,
): ApplicationCapabilities {
  const isApplicant =
    actor !== null &&
    actor.email.toLowerCase() === application.applicantEmail?.toLowerCase();
  const canReview = canActOnReview(application, actor);
  const canReturn =
    canReview && application.currentStepCanReturn === true;

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
    canApproveApplication: canReview,
    canRejectApplication: canReview,
    canReturnApplication: canReturn,
  };
}
