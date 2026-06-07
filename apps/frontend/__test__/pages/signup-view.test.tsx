import { render, screen } from "@testing-library/react";
import { SignupView } from "@/app/signup/view";

jest.mock("@/app/signup/actions", () => ({
  signup: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  unstable_rethrow: jest.fn(),
}));

describe("SignupView", () => {
  // テスト内容: 新規登録フォームとパスワード案内が表示されることを確認する
  it("renders the signup form with password guidance", () => {
    render(<SignupView apiReachable />);

    expect(screen.getByRole("heading", { name: "新規登録" })).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeRequired();
    expect(screen.getByLabelText("パスワード")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(
      screen.getByText("8 文字以上（英数字・記号の組み合わせを推奨）"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "アカウントを作成する" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "ログイン" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  // テスト内容: バックエンドに接続できない場合に送信が無効化されることを確認する
  it("disables submission when the API is unreachable", () => {
    render(<SignupView apiReachable={false} />);

    expect(screen.getByText(/API サーバーに接続できません/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "アカウントを作成する" })).toBeDisabled();
  });
});
