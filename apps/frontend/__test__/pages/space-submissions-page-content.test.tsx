import { render, screen, within } from "@testing-library/react";
import { SpaceSubmissionsPageContent } from "@/app/(authorized)/space/[spaceId]/submissions/_components/space-submissions-page-content";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";

jest.mock(
  "@/app/(authorized)/space/[spaceId]/submissions/_components/submission-csv-export-controls",
  () => ({
    SubmissionCsvExportControls: ({
      exportFormOptions,
    }: {
      exportFormOptions: Array<{ id: string; name: string }>;
    }) => (
      <div data-testid="csv-export-controls">
        {exportFormOptions.map((option) => option.name).join(",") || "no-options"}
      </div>
    ),
  }),
);

const baseFilters = {
  applicant: "",
  createdFrom: "",
  createdTo: "",
  form: "",
  page: 1,
  status: "",
  summary: "" as const,
};

const application = {
  id: "application-1",
  groupId: "space-1",
  formDefinitionId: "definition-1",
  formDefinitionName: "経費申請",
  applicationName: "経費申請",
  status: APPLICATION_STATUSES.submitted,
  applicantEmail: "member@example.com",
  currentStepAssigneeUserIds: ["user-1"],
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

describe("SpaceSubmissionsPageContent", () => {
  // テスト内容: 取得エラーが表示されることを確認する
  it("renders fetch errors", () => {
    render(
      <SpaceSubmissionsPageContent
        applications={[]}
        currentUserId={null}
        fetchErrorStatus={500}
        filters={baseFilters}
        latestExportJob={null}
        spaceId="space-1"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("申請一覧の取得に失敗しました");
    expect(screen.getByText("status: 500")).toBeInTheDocument();
  });

  // テスト内容: サマリー、フィルタ、CSV出力候補、申請一覧が表示されることを確認する
  it("renders summary cards, filters, export options, and submitted applications", () => {
    render(
      <SpaceSubmissionsPageContent
        applications={[
          application,
          {
            ...application,
            id: "application-2",
            status: APPLICATION_STATUSES.approved,
            applicantEmail: "approved@example.com",
          },
          {
            ...application,
            id: "setup-1",
            status: APPLICATION_STATUSES.published,
          },
        ]}
        currentUserId="user-1"
        filters={baseFilters}
        latestExportJob={null}
        spaceId="space-1"
      />,
    );

    expect(screen.getByRole("link", { name: /あなたの対応が必要/ })).toHaveAttribute(
      "href",
      "/space/space-1/submissions?summary=myNeedsAction",
    );
    expect(screen.getByRole("link", { name: /スペース内で対応が必要/ })).toHaveAttribute(
      "href",
      "/space/space-1/submissions?summary=spaceNeedsAction",
    );
    expect(screen.getByRole("link", { name: /差し戻し後、再申請待ち/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /直近7日間に対応/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "すべての申請" })).toBeInTheDocument();
    expect(screen.getByLabelText("申請者")).toHaveAttribute(
      "placeholder",
      "メールアドレスで検索",
    );
    expect(screen.getByLabelText("申請フォーム")).toHaveAttribute(
      "placeholder",
      "フォーム名で検索",
    );
    expect(screen.getByTestId("csv-export-controls")).toHaveTextContent("経費申請");

    const row = screen.getByRole("row", { name: /member@example.com/ });
    expect(within(row).getByText("提出済み")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: /詳細/ })).toHaveAttribute(
      "href",
      "/space/space-1/submissions/application-1?definitionId=definition-1",
    );
    expect(screen.getByText("1-2件を表示 / 全2件")).toBeInTheDocument();
  });

  // テスト内容: フィルタで全件除外された場合の空状態が表示されることを確認する
  it("renders the filtered empty state when filters remove all rows", () => {
    render(
      <SpaceSubmissionsPageContent
        applications={[application]}
        currentUserId={null}
        filters={{ ...baseFilters, applicant: "missing@example.com" }}
        latestExportJob={null}
        spaceId="space-1"
      />,
    );

    expect(screen.getByText("条件に一致する申請はありません")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "クリア" })).toHaveAttribute(
      "href",
      "/space/space-1/submissions",
    );
  });

  // テスト内容: 自分の担当申請が0件でも「あなたの対応が必要」が表示されることを確認する
  it("renders my needs action summary even when the count is zero", () => {
    render(
      <SpaceSubmissionsPageContent
        applications={[application]}
        currentUserId="user-2"
        filters={baseFilters}
        latestExportJob={null}
        spaceId="space-1"
      />,
    );

    const card = screen.getByRole("link", { name: /あなたの対応が必要/ });
    expect(card).toHaveAttribute(
      "href",
      "/space/space-1/submissions?summary=myNeedsAction",
    );
    expect(within(card).getByText("0")).toBeInTheDocument();
  });
});
