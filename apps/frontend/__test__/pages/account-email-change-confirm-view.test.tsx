import { render, screen } from "@testing-library/react";
import { AccountEmailChangeConfirmView } from "@/app/account/email-change/confirm/view";

jest.mock("@/app/account/email-change/confirm/actions", () => ({
  confirmAccountEmailChangeAction: jest.fn(),
}));

describe("AccountEmailChangeConfirmView", () => {
  // テスト内容: トークンがある場合にメールアドレス変更確定フォームが表示されることを確認する
  it("renders the email change confirmation form when a token is available", () => {
    render(
      <AccountEmailChangeConfirmView
        formError="リンクの有効期限を確認してください。"
        token="email-change-token"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "メールアドレス変更を確認" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("リンクの有効期限を確認してください。"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("email-change-token")).toHaveAttribute(
      "name",
      "token",
    );
    expect(
      screen.getByRole("button", { name: "メールアドレス変更を確定" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ログインへ戻る" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  // テスト内容: トークンがない場合にフォームではなく警告が表示されることを確認する
  it("shows the missing token message instead of the form", () => {
    render(<AccountEmailChangeConfirmView token="" />);

    expect(screen.getByText("確認トークンが見つかりません")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "メールアドレス変更を確定" }),
    ).not.toBeInTheDocument();
  });
});
