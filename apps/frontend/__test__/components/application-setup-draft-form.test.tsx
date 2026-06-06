import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationSetupDraftForm } from "@/components/application-setup/application-setup-draft-form";

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
    expect(screen.getByRole("button", { name: "下書き保存" })).toHaveAttribute(
      "value",
      "draft",
    );
    expect(screen.getByRole("button", { name: "公開" })).toHaveAttribute("value", "publish");
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
});
