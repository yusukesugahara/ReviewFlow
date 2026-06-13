import { APPLICATION_STATUSES } from "@/lib/constants/applications";

export type ApplicationStatusSource = {
  status: string;
};

export function isDraftApplicationStatus(status: string): boolean {
  return status === APPLICATION_STATUSES.draft;
}

export function isPublishedApplicationStatus(status: string): boolean {
  return status === APPLICATION_STATUSES.published;
}

export function isInReviewApplicationStatus(status: string): boolean {
  return status === APPLICATION_STATUSES.inReview;
}

export function isApprovedApplicationStatus(status: string): boolean {
  return status === APPLICATION_STATUSES.approved;
}

export function isRejectedApplicationStatus(status: string): boolean {
  return status === APPLICATION_STATUSES.rejected;
}

export function isFormSetupStatus(status: string): boolean {
  return isDraftApplicationStatus(status) || isPublishedApplicationStatus(status);
}

export function isFormSetupApplication(
  application: ApplicationStatusSource,
): boolean {
  return isFormSetupStatus(application.status);
}

export function isPendingApplicationStatus(status: string): boolean {
  return (
    status === APPLICATION_STATUSES.submitted ||
    status === APPLICATION_STATUSES.inReview ||
    status === APPLICATION_STATUSES.returned
  );
}

export function isPendingApplication(
  application: ApplicationStatusSource,
): boolean {
  return isPendingApplicationStatus(application.status);
}

export function isSpaceNeedsActionStatus(status: string): boolean {
  return (
    status === APPLICATION_STATUSES.submitted ||
    isInReviewApplicationStatus(status)
  );
}

export function isSpaceNeedsActionApplication(
  application: ApplicationStatusSource,
): boolean {
  return isSpaceNeedsActionStatus(application.status);
}

export function isReturnedApplicationStatus(status: string): boolean {
  return status === APPLICATION_STATUSES.returned;
}

export function isReturnedApplication(
  application: ApplicationStatusSource,
): boolean {
  return isReturnedApplicationStatus(application.status);
}

export function isProcessedApplicationStatus(status: string): boolean {
  return (
    isApprovedApplicationStatus(status) || isRejectedApplicationStatus(status)
  );
}

export function isProcessedApplication(
  application: ApplicationStatusSource,
): boolean {
  return isProcessedApplicationStatus(application.status);
}
