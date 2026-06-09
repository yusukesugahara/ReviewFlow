import { render, screen } from "@testing-library/react";
import { PublicApplicationAccessView } from "@/app/(authorized)/apply/[groupId]/view";

jest.mock("@/app/(authorized)/apply/[groupId]/actions", () => ({
  requestAccessAction: jest.fn(),
}));

describe("PublicApplicationAccessView", () => {
  // テスト内容: アクセス依頼フォームにhidden識別子とメッセージが表示されることを確認する
  it("renders the access request form with hidden identifiers and messages", () => {
    render(
      <PublicApplicationAccessView
        formDefinitionId="definition-1"
        formError="メールアドレスを入力してください"
        groupId="space-1"
        message="申請フォームを特定できません。申請フォーム一覧から公開URLを開き直してください。"
        sent
        toast="error"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "申請フォームの案内を受け取る" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/案内を送信しました/)).toBeInTheDocument();
    expect(screen.getByText("メールアドレスを入力してください")).toBeInTheDocument();
    expect(
      screen.getByText(
        "申請フォームを特定できません。申請フォーム一覧から公開URLを開き直してください。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("space-1")).toHaveAttribute("name", "groupId");
    expect(screen.getByDisplayValue("definition-1")).toHaveAttribute(
      "name",
      "formDefinitionId",
    );
    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute(
      "placeholder",
      "user@example.com",
    );
    expect(screen.getByRole("button", { name: "フォーム案内を送信" })).toBeInTheDocument();
  });
});
