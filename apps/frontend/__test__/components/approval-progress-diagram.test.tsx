import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApprovalProgressDiagram } from "@/components/applications/approval-progress/approval-progress-diagram";
import type {
  ApplicationCorrection,
  ApplicationDetailViewModel,
  ApplicationFormField,
  ApplicationProgressStep,
  ApplicationProgressUser,
} from "@/components/applications/detail/application-detail.types";

const reviewer: ApplicationProgressUser = {
  id: "user-1",
  email: "reviewer@example.com",
  name: "承認 太郎",
};

const application: ApplicationDetailViewModel = {
  id: "app-1",
  status: "in_review",
  applicantEmail: "applicant@example.com",
  createdAt: "2026-06-06T00:00:00.000Z",
  submittedAt: "2026-06-06T01:00:00.000Z",
  values: {
    purpose: "経費精算",
  },
};

const fields: ApplicationFormField[] = [
  {
    id: "field-purpose",
    fieldKey: "purpose",
    label: "申請目的",
    fieldType: "text",
    required: true,
  },
];

const steps: ApplicationProgressStep[] = [
  {
    id: "step-2",
    stepOrder: 2,
    stepName: "最終承認",
    canReturn: true,
    status: "current",
    assignees: [reviewer],
    actions: [],
  },
  {
    id: "step-1",
    stepOrder: 1,
    stepName: "一次承認",
    canReturn: true,
    status: "returned",
    assignees: [reviewer],
    actions: [
      {
        id: "action-returned",
        action: "returned",
        comment: "目的を確認",
        actedAt: "2026-06-07T00:00:00.000Z",
        actedBy: reviewer,
      },
    ],
  },
];

const corrections: ApplicationCorrection[] = [
  {
    id: "correction-1",
    status: "open",
    overallComment: "全体の理由",
    createdAt: "2026-06-07T00:01:00.000Z",
    items: [
      {
        formFieldId: "field-purpose",
        fieldKey: "purpose",
        comment: "目的を具体化してください",
      },
    ],
  },
];

describe("ApprovalProgressDiagram", () => {
  // テスト内容: 現在ステップを初期選択し、申請者と申請内容を表示することを確認する
  it("renders the current step as the initial selection", () => {
    render(
      <ApprovalProgressDiagram
        application={application}
        corrections={corrections}
        fields={fields}
        steps={steps}
      />,
    );

    expect(screen.getByText("承認ステップ")).toBeInTheDocument();
    expect(screen.getByText("applicant@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /最終承認/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "最終承認 の申請" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("経費精算")).toBeInTheDocument();
  });

  // テスト内容: 差し戻し済みステップへ切り替えると補正コメントが表示されることを確認する
  it("shows correction comments for a returned step", async () => {
    const user = userEvent.setup();
    render(
      <ApprovalProgressDiagram
        application={application}
        corrections={corrections}
        fields={fields}
        steps={steps}
      />,
    );

    await user.click(screen.getByRole("button", { name: /一次承認/ }));

    expect(screen.getByRole("heading", { name: "一次承認 の申請" })).toBeInTheDocument();
    expect(screen.getByText("差し戻し全体コメント")).toBeInTheDocument();
    expect(screen.getByText("全体の理由")).toBeInTheDocument();
    expect(screen.getByText("目的を具体化してください")).toBeInTheDocument();
  });
});
