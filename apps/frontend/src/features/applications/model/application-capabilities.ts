import type { CurrentSessionUser } from "@/lib/server/session";
import type { ApplicationDetailViewModel } from "../components/application-detail-view";

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
  const isInReview = application.status === "in_review";

  return {
    canEditApplication:
      isApplicant && (application.status === "draft" || application.status === "returned"),
    canSubmitApplication: isApplicant && application.status === "draft",
    canResubmitApplication: isApplicant && application.status === "returned",
    canApproveApplication: isInReview,
    canRejectApplication: isInReview,
    canReturnApplication: isInReview,
  };
}
