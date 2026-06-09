import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { login } from "@/app/login/actions";
import { LoginView } from "@/app/login/view";

jest.mock("@/app/login/actions", () => ({
  login: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  unstable_rethrow: jest.fn(),
}));

describe("LoginView", () => {
  beforeEach(() => {
    jest.mocked(login).mockReset();
  });

  // テスト内容: ログインフォームと関連リンクが表示されることを確認する
  it("renders the login form and related navigation", () => {
    render(<LoginView apiReachable next="/space" />);

    expect(screen.getByRole("heading", { name: "ログイン" })).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("パスワード")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByRole("button", { name: "ログインする" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "パスワードを忘れた方" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
    expect(screen.getByRole("link", { name: "新規登録" })).toHaveAttribute(
      "href",
      "/signup",
    );
  });

  // テスト内容: バックエンドに接続できない場合にフォームが無効化されることを確認する
  it("disables the form when the API is unreachable", () => {
    render(<LoginView apiReachable={false} />);

    expect(screen.getByText(/API サーバーに接続できません/)).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeDisabled();
    expect(screen.getByLabelText("パスワード")).toBeDisabled();
    expect(screen.getByRole("button", { name: "ログインする" })).toBeDisabled();
  });

  // テスト内容: ログイン action が返したフォームエラーを画面内に表示することを確認する
  it("renders a Japanese login error returned by the action", async () => {
    const user = userEvent.setup();
    jest.mocked(login).mockResolvedValueOnce({
      error: {
        message: "メールアドレスまたはパスワードが正しくありません。",
      },
    });

    render(<LoginView apiReachable />);

    await user.type(screen.getByLabelText("メールアドレス"), "user@example.com");
    await user.type(screen.getByLabelText("パスワード"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "ログインする" }));

    expect(
      await screen.findByText("メールアドレスまたはパスワードが正しくありません。"),
    ).toBeInTheDocument();
  });
});
