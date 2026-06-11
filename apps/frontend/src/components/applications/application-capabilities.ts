import type { CurrentSessionUser } from "@/app/(authorized)/session/actions";
import type { ApplicationDetailViewModel } from "./application-detail.types";
import {
  isFormSetupStatus,
  isInReviewApplicationStatus,
  isReturnedApplicationStatus,
} from "./application-status-rules";

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
  if (!actor || !isInReviewApplicationStatus(application.status)) {
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
      (isFormSetupStatus(application.status) ||
        isReturnedApplicationStatus(application.status)),
    canSubmitApplication:
      isApplicant && isFormSetupStatus(application.status),
    canResubmitApplication:
      isApplicant && isReturnedApplicationStatus(application.status),
    canApproveApplication: canReview,
    canRejectApplication: canReview,
    canReturnApplication: canReturn,
  };
}
