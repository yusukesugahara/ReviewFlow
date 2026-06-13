import { getApplicationCapabilities } from "@/components/applications/actions/application-capabilities";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";

const actor = {
  id: "user-1",
  email: "applicant@example.com",
  tenantId: "tenant-1",
  roles: ["tenant_user"],
};

const currentStep = {
  id: "step-1",
  stepOrder: 1,
  stepName: "課長承認",
  canReturn: true,
  status: "current" as const,
  assignees: [{ id: "user-1", email: "applicant@example.com", name: null }],
  actions: [],
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

  // テスト内容: 現在ステップの担当者だけがレビュー操作できることを確認する
  it("allows review actions only for current step assignees", () => {
    expect(
      getApplicationCapabilities(
        {
          id: "app-1",
          status: APPLICATION_STATUSES.inReview,
          applicantEmail: "other@example.com",
          currentStepCanReturn: true,
          currentStepAssigneeUserIds: ["user-1"],
          approvalProgress: [currentStep],
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

  // テスト内容: 承認フロー外のユーザにはレビュー操作を表示しない
  it("denies review actions for users outside the current approval step", () => {
    expect(
      getApplicationCapabilities(
        {
          id: "app-1",
          status: APPLICATION_STATUSES.inReview,
          applicantEmail: "other@example.com",
          currentStepCanReturn: true,
          approvalProgress: [
            {
              ...currentStep,
              assignees: [
                { id: "reviewer-1", email: "reviewer@example.com", name: null },
              ],
            },
          ],
          values: {},
        },
        actor,
      ),
    ).toMatchObject({
      canApproveApplication: false,
      canRejectApplication: false,
      canReturnApplication: false,
    });
  });

  // テスト内容: スペース管理者でも承認フロー外にはレビュー操作を表示しない
  it("denies review actions for space admins outside the current approval step", () => {
    expect(
      getApplicationCapabilities(
        {
          id: "app-1",
          status: APPLICATION_STATUSES.inReview,
          applicantEmail: "other@example.com",
          currentStepCanReturn: true,
          approvalProgress: [
            {
              ...currentStep,
              assignees: [
                { id: "reviewer-1", email: "reviewer@example.com", name: null },
              ],
            },
          ],
          values: {},
        },
        actor,
      ),
    ).toMatchObject({
      canApproveApplication: false,
      canRejectApplication: false,
      canReturnApplication: false,
    });
  });

  // テスト内容: テナント管理者でも承認フロー外にはレビュー操作を表示しない
  it("denies review actions for tenant admins outside the current approval step", () => {
    expect(
      getApplicationCapabilities(
        {
          id: "app-1",
          status: APPLICATION_STATUSES.inReview,
          applicantEmail: "other@example.com",
          currentStepCanReturn: true,
          currentStepAssigneeUserIds: ["reviewer-1"],
          approvalProgress: [
            {
              ...currentStep,
              assignees: [
                { id: "reviewer-1", email: "reviewer@example.com", name: null },
              ],
            },
          ],
          values: {},
        },
        {
          ...actor,
          roles: ["tenant_admin"],
        },
      ),
    ).toMatchObject({
      canApproveApplication: false,
      canRejectApplication: false,
      canReturnApplication: false,
    });
  });

  // テスト内容: 操作ユーザがない場合に申請者専用操作が拒否されることを確認する
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
