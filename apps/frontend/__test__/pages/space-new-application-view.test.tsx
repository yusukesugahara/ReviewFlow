import { render, screen } from "@testing-library/react";
import { SpaceNewApplicationView } from "@/app/(authorized)/space/[spaceId]/applications/new/view";
import { APPLICATION_SETUP_STATUSES } from "@/lib/constants/application-setup";

jest.mock("@/app/(authorized)/space/application-setup/actions", () => ({
  submitApplicationSetupAction: jest.fn(),
}));

jest.mock("@/components/application-setup/application-setup-draft-form", () => ({
  ApplicationSetupDraftForm: ({
    errorMessage,
    publishedFormDefinitionId,
    publishedGroupId,
    returnPath,
    spaceId,
    statusMessage,
  }: {
    errorMessage?: string;
    publishedFormDefinitionId?: string | null;
    publishedGroupId?: string | null;
    returnPath?: string;
    spaceId: string;
    statusMessage?: string | null;
  }) => (
    <div data-testid="application-setup-draft-form">
      {spaceId}:{returnPath}:{errorMessage}:{statusMessage}:{publishedGroupId}:
      {publishedFormDefinitionId}
    </div>
  ),
}));

describe("SpaceNewApplicationView", () => {
  // テスト内容: セットアップ状態と公開IDが下書きフォームへ渡されることを確認する
  it("renders the draft form with mapped setup status and published identifiers", () => {
    render(
      <SpaceNewApplicationView
        assignees={[]}
        canManageSpace
        newApplicationHref="/space/space-1/applications/new"
        publishedFormDefinitionId="definition-1"
        publishedGroupId="space-1"
        setupError="invalid_fields"
        setupErrorDetail="項目名が不足しています"
        setupStatus={APPLICATION_SETUP_STATUSES.published}
        spaceId="space-1"
      />,
    );

    expect(screen.getByTestId("application-setup-draft-form")).toHaveTextContent(
      "space-1:/space/space-1/applications/new",
    );
    expect(screen.getByTestId("application-setup-draft-form")).toHaveTextContent(
      "項目名が不足しています",
    );
    expect(screen.getByTestId("application-setup-draft-form")).toHaveTextContent(
      "space-1:definition-1",
    );
  });

  // テスト内容: スペース管理権限がない場合のメッセージが表示されることを確認する
  it("renders the permission message when the user cannot manage the space", () => {
    render(
      <SpaceNewApplicationView
        assignees={[]}
        canManageSpace={false}
        newApplicationHref="/space/space-1/applications/new"
        publishedFormDefinitionId={null}
        publishedGroupId={null}
        spaceId="space-1"
      />,
    );

    expect(
      screen.getByText("申請フォームを作成するにはスペース管理者権限が必要です。"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("application-setup-draft-form")).not.toBeInTheDocument();
  });
});
