import { APPLICATION_STATUSES } from "@/lib/constants/applications";

export type ApplicationStatusSource = {
  status: string;
};

/**
 * ステータスが下書きかを判定します。
 */
export function isDraftApplicationStatus(status: string): boolean {
  return status === APPLICATION_STATUSES.draft;
}

/**
 * ステータスが公開済みかを判定します。
 */
export function isPublishedApplicationStatus(status: string): boolean {
  return status === APPLICATION_STATUSES.published;
}

/**
 * ステータスが承認待ちかを判定します。
 */
export function isInReviewApplicationStatus(status: string): boolean {
  return status === APPLICATION_STATUSES.inReview;
}

/**
 * ステータスが承認済みかを判定します。
 */
export function isApprovedApplicationStatus(status: string): boolean {
  return status === APPLICATION_STATUSES.approved;
}

/**
 * ステータスが却下済みかを判定します。
 */
export function isRejectedApplicationStatus(status: string): boolean {
  return status === APPLICATION_STATUSES.rejected;
}

/**
 * ステータスがフォームセットアップ用かを判定します。
 */
export function isFormSetupStatus(status: string): boolean {
  return isDraftApplicationStatus(status) || isPublishedApplicationStatus(status);
}

/**
 * 申請がフォームセットアップ申請かを判定します。
 */
export function isFormSetupApplication(
  application: ApplicationStatusSource,
): boolean {
  return isFormSetupStatus(application.status);
}

/**
 * ステータスが未処理一覧に含まれるかを判定します。
 */
export function isPendingApplicationStatus(status: string): boolean {
  return (
    status === APPLICATION_STATUSES.submitted ||
    status === APPLICATION_STATUSES.inReview ||
    status === APPLICATION_STATUSES.returned
  );
}

/**
 * 申請が未処理一覧に含まれるかを判定します。
 */
export function isPendingApplication(
  application: ApplicationStatusSource,
): boolean {
  return isPendingApplicationStatus(application.status);
}

/**
 * ステータスがスペース側の対応待ちかを判定します。
 */
export function isSpaceNeedsActionStatus(status: string): boolean {
  return (
    status === APPLICATION_STATUSES.submitted ||
    isInReviewApplicationStatus(status)
  );
}

/**
 * 申請がスペース側の対応待ちかを判定します。
 */
export function isSpaceNeedsActionApplication(
  application: ApplicationStatusSource,
): boolean {
  return isSpaceNeedsActionStatus(application.status);
}

/**
 * ステータスが差戻し中かを判定します。
 */
export function isReturnedApplicationStatus(status: string): boolean {
  return status === APPLICATION_STATUSES.returned;
}

/**
 * 申請が差戻し中かを判定します。
 */
export function isReturnedApplication(
  application: ApplicationStatusSource,
): boolean {
  return isReturnedApplicationStatus(application.status);
}

/**
 * ステータスが処理済みかを判定します。
 */
export function isProcessedApplicationStatus(status: string): boolean {
  return (
    isApprovedApplicationStatus(status) || isRejectedApplicationStatus(status)
  );
}

/**
 * 申請が処理済みかを判定します。
 */
export function isProcessedApplication(
  application: ApplicationStatusSource,
): boolean {
  return isProcessedApplicationStatus(application.status);
}
