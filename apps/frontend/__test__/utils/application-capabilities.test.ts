import { getApplicationCapabilities } from "@/components/applications/application-capabilities";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";

const actor = {
  id: "user-1",
  email: "applicant@example.com",
  tenantId: "tenant-1",
  roles: ["tenant_user"],
};

describe("getApplicationCapabilities", () => {
  // テスト内容: 申請者が下書きを編集・提出できる判定を確認する
  it("allows applicants to edit and submit drafts", () => {
    expect(
      getApplicationCapabilities(
        {
          id: "app-1",
          status: APPLICATION_STATUSES.draft,
          applicantEmail: "Applicant@Example.com",
          values: {},
        },
        actor,
      ),
    ).toMatchObject({
      canEditApplication: true,
      canSubmitApplication: true,
      canResubmitApplication: false,
    });
  });

  // テスト内容: 申請者が差し戻し申請を編集・再提出できる判定を確認する
  it("allows applicants to edit and resubmit returned applications", () => {
    expect(
      getApplicationCapabilities(
        {
          id: "app-1",
          status: APPLICATION_STATUSES.returned,
          applicantEmail: actor.email,
          values: {},
        },
        actor,
      ),
    ).toMatchObject({
      canEditApplication: true,
      canSubmitApplication: false,
      canResubmitApplication: true,
    });
  });

  // テスト内容: レビュー中申請にレビュー操作が許可される判定を確認する
  it("allows review actions for in-review applications", () => {
    expect(
      getApplicationCapabilities(
        {
          id: "app-1",
          status: APPLICATION_STATUSES.inReview,
          applicantEmail: "other@example.com",
          currentStepCanReturn: true,
          values: {},
        },
        actor,
      ),
    ).toMatchObject({
      canApproveApplication: true,
      canRejectApplication: true,
      canReturnApplication: true,
    });
  });

  // テスト内容: 操作ユーザーがない場合に申請者専用操作が拒否されることを確認する
  it("denies applicant-only actions when actor is missing", () => {
    expect(
      getApplicationCapabilities(
        {
          id: "app-1",
          status: APPLICATION_STATUSES.draft,
          applicantEmail: actor.email,
          values: {},
        },
        null,
      ),
    ).toMatchObject({
      canEditApplication: false,
      canSubmitApplication: false,
    });
  });
});
