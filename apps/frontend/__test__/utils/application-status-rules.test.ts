import {
  isApprovedApplicationStatus,
  isFormSetupStatus,
  isInReviewApplicationStatus,
  isPendingApplicationStatus,
  isProcessedApplicationStatus,
  isRejectedApplicationStatus,
  isReturnedApplicationStatus,
  isSpaceNeedsActionStatus,
} from "@/components/applications/status/application-status-rules";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";

describe("application status rules", () => {
  // テスト内容: フォーム管理用ステータスを共通ルールで判定できることを確認する
  it("detects form setup statuses", () => {
    expect(isFormSetupStatus(APPLICATION_STATUSES.draft)).toBe(true);
    expect(isFormSetupStatus(APPLICATION_STATUSES.published)).toBe(true);
    expect(isFormSetupStatus(APPLICATION_STATUSES.submitted)).toBe(false);
  });

  // テスト内容: 申請一覧のサマリー分類で使うステータス集合を判定できることを確認する
  it("detects submission status groups", () => {
    expect(isPendingApplicationStatus(APPLICATION_STATUSES.submitted)).toBe(true);
    expect(isPendingApplicationStatus(APPLICATION_STATUSES.inReview)).toBe(true);
    expect(isPendingApplicationStatus(APPLICATION_STATUSES.returned)).toBe(true);
    expect(isInReviewApplicationStatus(APPLICATION_STATUSES.inReview)).toBe(true);
    expect(isSpaceNeedsActionStatus(APPLICATION_STATUSES.returned)).toBe(false);
    expect(isReturnedApplicationStatus(APPLICATION_STATUSES.returned)).toBe(true);
    expect(isApprovedApplicationStatus(APPLICATION_STATUSES.approved)).toBe(true);
    expect(isRejectedApplicationStatus(APPLICATION_STATUSES.rejected)).toBe(true);
    expect(isProcessedApplicationStatus(APPLICATION_STATUSES.approved)).toBe(true);
    expect(isProcessedApplicationStatus(APPLICATION_STATUSES.rejected)).toBe(true);
  });
});
