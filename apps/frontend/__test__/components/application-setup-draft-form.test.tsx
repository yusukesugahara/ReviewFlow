import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationSetupDraftForm } from "@/components/application-setup/form-builder/application-setup-draft-form";

const assignees = [{ id: "user-1", label: "承認者 <approver@example.com>" }];

describe("ApplicationSetupDraftForm", () => {
  // テスト内容: フォーム情報、警告、hidden値、公開操作が表示されることを確認する
  it("renders form metadata, alerts, hidden values, and publish controls", () => {
    render(
      <ApplicationSetupDraftForm
        action={jest.fn()}
        assignees={assignees}
        errorMessage="入力エラー"
        initialName="経費申請"
        publishedFormDefinitionId="definition-1"
        publishedGroupId="space-1"
        returnPath="/return"
        spaceId="space-1"
        statusMessage="公開しました"
      />,
    );

    expect(screen.getByText("入力エラー")).toBeInTheDocument();
    expect(screen.getByText("公開しました")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "申請フォーム" })).toBeInTheDocument();
    expect(screen.getByLabelText("申請フォーム名")).toHaveValue("経費申請");
    expect(screen.getByText("公開済み")).toBeInTheDocument();
    expect(screen.getByDisplayValue("space-1")).toHaveAttribute("name", "spaceId");
    expect(screen.getByDisplayValue("/return")).toHaveAttribute("name", "returnPath");
    const draftButtons = screen.getAllByRole("button", { name: "下書き保存" });
    const publishButtons = screen.getAllByRole("button", { name: "公開" });
    expect(draftButtons).toHaveLength(1);
    expect(publishButtons).toHaveLength(1);
    draftButtons.forEach((button) => {
      expect(button).toHaveAttribute("value", "draft");
    });
    publishButtons.forEach((button) => {
      expect(button).toHaveAttribute("value", "publish");
    });
    expect(screen.getByRole("heading", { name: "申請URLを発行しました" })).toBeInTheDocument();
  });

  // テスト内容: 項目編集モーダルを開き、項目名を更新できることを確認する
  it("opens the field edit modal and updates the field label", async () => {
    const user = userEvent.setup();
    render(
      <ApplicationSetupDraftForm
        action={jest.fn()}
        assignees={assignees}
        initialFields={[
          {
            id: "field-1",
            fieldKey: "amount",
            label: "金額",
            fieldType: "text",
            required: true,
            placeholder: "",
            helpText: "",
            optionsText: "",
          },
        ]}
        spaceId="space-1"
      />,
    );

    await user.click(screen.getByRole("button", { name: "金額を編集" }));
    await user.clear(screen.getByLabelText("項目名"));
    await user.type(screen.getByLabelText("項目名"), "申請金額");
    await user.click(screen.getByRole("button", { name: "反映して閉じる" }));

    expect(screen.getAllByText("申請金額").length).toBeGreaterThan(0);
  });

  // テスト内容: 公開送信中は公開ボタンにローディングアイコンが表示されることを確認する
  it("shows a loading icon while publishing", async () => {
    const user = userEvent.setup();
    let resolveAction: () => void = () => undefined;
    const action = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
    );
    const { container } = render(
      <ApplicationSetupDraftForm
        action={action}
        assignees={assignees}
        initialName="経費申請"
        spaceId="space-1"
      />,
    );

    const topPublishButton = screen.getAllByRole("button", { name: "公開" })[0];
    if (!topPublishButton) {
      throw new Error("公開ボタンが見つかりません");
    }
    await user.click(topPublishButton);

    expect(action).toHaveBeenCalledTimes(1);
    const publishButtons = await screen.findAllByRole("button", { name: "公開中" });
    expect(publishButtons).toHaveLength(1);
    publishButtons.forEach((button) => {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-busy", "true");
    });
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();

    resolveAction();

    await waitFor(() => {
      const enabledPublishButton = screen.getAllByRole("button", { name: "公開" })[0];
      if (!enabledPublishButton) {
        throw new Error("公開ボタンが見つかりません");
      }
      expect(enabledPublishButton).toBeEnabled();
    });
  });
});
