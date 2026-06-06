import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordInput } from "@/components/ui/password-input";

describe("PasswordInput", () => {
  // テスト内容: パスワード表示/非表示を切り替えられることを確認する
  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="パスワード" />);

    const input = screen.getByLabelText("パスワード");
    expect(input).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "パスワードを表示" }));
    expect(input).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "パスワードを隠す" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  // テスト内容: 入力欄と表示切替ボタンが同時に無効化されることを確認する
  it("disables the input and toggle together", () => {
    render(<PasswordInput aria-label="パスワード" disabled />);

    expect(screen.getByLabelText("パスワード")).toBeDisabled();
    expect(screen.getByRole("button", { name: "パスワードを表示" })).toBeDisabled();
  });
});
