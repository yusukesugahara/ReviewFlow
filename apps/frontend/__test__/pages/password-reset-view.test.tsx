import { render, screen } from "@testing-library/react";
import { PasswordResetView } from "@/app/(authorized)/password-reset/view";

jest.mock("@/app/(authorized)/password-reset/actions", () => ({
  confirmPasswordResetAction: jest.fn(),
}));

describe("PasswordResetView", () => {
  // テスト内容: トークンがある場合にパスワード再設定フォームが表示されることを確認する
  it("renders the reset form when a token is available", () => {
    render(<PasswordResetView formError="パスワードが短すぎます" token="reset-token" />);

    expect(
      screen.getByRole("heading", { name: "新しいパスワードを設定" }),
    ).toBeInTheDocument();
    expect(screen.getByText("パスワードが短すぎます")).toBeInTheDocument();
    expect(screen.getByDisplayValue("reset-token")).toHaveAttribute("name", "token");
    expect(screen.getByLabelText("新しいパスワード")).toHaveAttribute("minlength", "8");
    expect(screen.getByRole("button", { name: "パスワードを再設定" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ログインへ戻る" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  // テスト内容: トークンがない場合にフォームではなく警告が表示されることを確認する
  it("shows the missing token message instead of the form", () => {
    render(<PasswordResetView token="" />);

    expect(screen.getByText("再設定トークンが見つかりません")).toBeInTheDocument();
    expect(screen.queryByLabelText("新しいパスワード")).not.toBeInTheDocument();
  });
});
