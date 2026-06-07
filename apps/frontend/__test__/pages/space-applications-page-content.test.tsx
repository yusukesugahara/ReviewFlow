import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpaceApplicationsPageContent } from "@/app/(authorized)/space/[spaceId]/applications/_components/space-applications-page-content";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";

jest.mock("@/app/(authorized)/space/[spaceId]/applications/actions", () => ({
  archiveFormDefinitionAction: jest.fn(),
  restoreFormDefinitionAction: jest.fn(),
}));

const definition = {
  id: "definition-1",
  groupId: "space-1",
  name: "稟議フォーム",
  status: APPLICATION_STATUSES.published,
  fields: [],
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

const setupApplication = {
  id: "setup-1",
  groupId: "space-1",
  formDefinitionId: "definition-1",
  formDefinitionName: "稟議フォーム",
  applicationName: "稟議フォーム",
  status: APPLICATION_STATUSES.published,
  applicantEmail: "admin@example.com",
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

describe("SpaceApplicationsPageContent", () => {
  // テスト内容: 取得エラーが表示されることを確認する
  it("renders fetch errors", () => {
    render(
      <SpaceApplicationsPageContent
        applications={[]}
        fetchErrorStatus={500}
        formDefinitions={[]}
        showArchived={false}
        spaceId="space-1"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("申請フォーム一覧の取得に失敗しました");
    expect(screen.getByText("status: 500")).toBeInTheDocument();
  });

  // テスト内容: 有効なフォーム一覧が表示され、削除確認ダイアログが開くことを確認する
  it("renders active forms and opens the archive dialog", async () => {
    const user = userEvent.setup();
    render(
      <SpaceApplicationsPageContent
        applications={[
          setupApplication,
          {
            ...setupApplication,
            id: "submitted-1",
            status: APPLICATION_STATUSES.submitted,
          },
          {
            ...setupApplication,
            id: "approved-1",
            status: APPLICATION_STATUSES.approved,
          },
        ]}
        formDefinitions={[definition]}
        showArchived={false}
        spaceId="space-1"
      />,
    );

    expect(screen.getByRole("heading", { name: "申請フォーム" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "申請フォームを新規作成" })).toHaveAttribute(
      "href",
      "/space/space-1/applications/new",
    );
    const formRow = screen.getByRole("row", { name: /稟議フォーム/ });
    expect(within(formRow).getByText("稟議フォーム")).toBeInTheDocument();
    expect(within(formRow).getByText("公開済み")).toBeInTheDocument();
    expect(within(formRow).getAllByText("1")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /詳細/ })).toHaveAttribute(
      "href",
      "/space/space-1/applications/setup-1?definitionId=definition-1&view=form",
    );

    await user.click(screen.getByRole("button", { name: "削除" }));

    expect(screen.getByRole("heading", { name: "申請フォームを削除しますか" })).toBeInTheDocument();
    expect(screen.getByText(/稟議フォーム を削除済みに移動します/)).toBeInTheDocument();
  });

  // テスト内容: 削除済みフォーム一覧が表示され、復元確認ダイアログが開くことを確認する
  it("renders archived forms and opens the restore dialog", async () => {
    const user = userEvent.setup();
    render(
      <SpaceApplicationsPageContent
        applications={[]}
        formDefinitions={[
          {
            ...definition,
            status: APPLICATION_STATUSES.archived,
          },
        ]}
        showArchived
        spaceId="space-1"
      />,
    );

    expect(screen.getByRole("heading", { name: "削除済み申請フォーム" })).toBeInTheDocument();
    const formRow = screen.getByRole("row", { name: /稟議フォーム/ });
    expect(within(formRow).getByText("削除済み")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "復元" }));

    expect(screen.getByRole("heading", { name: "申請フォームを復元しますか" })).toBeInTheDocument();
    expect(screen.getByText(/稟議フォーム を申請フォーム一覧へ戻します/)).toBeInTheDocument();
  });

  // テスト内容: 有効一覧と削除済み一覧の空状態が表示されることを確認する
  it("renders empty states for active and archived views", () => {
    const { rerender } = render(
      <SpaceApplicationsPageContent
        applications={[]}
        formDefinitions={[]}
        showArchived={false}
        spaceId="space-1"
      />,
    );

    expect(screen.getByText("作成した申請フォームはまだありません")).toBeInTheDocument();

    rerender(
      <SpaceApplicationsPageContent
        applications={[]}
        formDefinitions={[]}
        showArchived
        spaceId="space-1"
      />,
    );

    expect(screen.getByText("削除済みの申請フォームはありません")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "申請フォームへ戻る" })).toHaveAttribute(
      "href",
      "/space/space-1/applications",
    );
  });
});
