import { render, screen } from "@testing-library/react";
import {
  PublicSubmissionErrorView,
  PublicSubmissionView,
} from "@/app/(authorized)/apply/submission/view";

const application = {
  id: "application-1",
  groupId: "space-1",
  status: "in_review",
  approvalFlowId: "flow-1",
  formDefinitionId: "definition-1",
  formDefinitionName: "経費申請",
  applicationName: "経費申請",
  applicantEmail: "applicant@example.com",
  applicantUserId: null,
  currentStepOrder: 1,
  currentStepAssigneeUserIds: [],
  submittedAt: "2026-06-06T00:00:00.000Z",
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
  capabilities: {
    canEditApplication: false,
    canSubmitApplication: false,
    canResubmitApplication: false,
    canApproveApplication: false,
    canRejectApplication: false,
    canReturnApplication: false,
  },
  currentStepCanReturn: false,
  approvalProgress: [],
  values: { memo: "提出時メモ" },
};

const definition = {
  id: "definition-1",
  groupId: "space-1",
  name: "経費申請",
  status: "published" as const,
  createdByUserId: "user-1",
  fields: [
    {
      id: "field-1",
      fieldKey: "memo",
      label: "メモ",
      fieldType: "textarea",
      required: true,
      sortOrder: 1,
      createdAt: "2026-06-06T00:00:00.000Z",
    },
  ],
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

describe("PublicSubmission views", () => {
  // テスト内容: 申請者向け画面には申請内容と申請日時のみ表示されることを確認する
  it("renders only the submitted application values and submitted date", () => {
    render(
      <PublicSubmissionView
        application={application}
        definition={definition}
      />,
    );

    expect(screen.getByRole("heading", { name: "申請内容" })).toBeInTheDocument();
    expect(screen.queryByText("経費申請")).not.toBeInTheDocument();
    expect(screen.getByText("申請日時")).toBeInTheDocument();
    expect(screen.getByText(/2026\/6\/6.*09:00/)).toBeInTheDocument();
    expect(screen.getByText("メモ")).toBeInTheDocument();
    expect(screen.getByText("提出時メモ")).toBeInTheDocument();
    expect(screen.queryByText("基本情報")).not.toBeInTheDocument();
    expect(screen.queryByText("申請サマリー")).not.toBeInTheDocument();
    expect(screen.queryByText("現在のステップ")).not.toBeInTheDocument();
  });

  // テスト内容: 申請内容取得エラーが表示されることを確認する
  it("renders submission fetch errors", () => {
    render(<PublicSubmissionErrorView status={401} />);

    expect(screen.getByRole("heading", { name: "申請内容を表示できません" })).toBeInTheDocument();
    expect(
      screen.getByText("申請内容の取得に失敗しました（status: 401）"),
    ).toBeInTheDocument();
  });
});
