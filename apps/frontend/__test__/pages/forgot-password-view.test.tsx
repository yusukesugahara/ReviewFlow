import { render, screen } from "@testing-library/react";
import { ForgotPasswordView } from "@/app/forgot-password/view";

jest.mock("@/app/forgot-password/actions", () => ({
  requestPasswordResetAction: jest.fn(),
}));

describe("ForgotPasswordView", () => {
  // テスト内容: 初期状態で依頼フォームが表示されることを確認する
  it("renders the request form by default", () => {
    render(<ForgotPasswordView sent={false} />);

    expect(
      screen.getByRole("heading", { name: "パスワード再設定" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeRequired();
    expect(
      screen.getByRole("button", { name: "再設定メールを送信" }),
    ).toBeInTheDocument();
  });

  // テスト内容: 送信済みの場合にフォームではなく送信メッセージが表示されることを確認する
  it("renders the sent message instead of the form", () => {
    render(<ForgotPasswordView sent />);

    expect(screen.getByText(/メールを送信しました/)).toBeInTheDocument();
    expect(screen.queryByLabelText("メールアドレス")).not.toBeInTheDocument();
  });

  // テスト内容: フォームエラーが表示されることを確認する
  it("renders form errors", () => {
    render(<ForgotPasswordView sent={false} formError="入力してください" />);

    expect(screen.getByText("入力してください")).toBeInTheDocument();
  });
});
