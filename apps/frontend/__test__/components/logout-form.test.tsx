import { render, screen } from "@testing-library/react";
import { LogoutForm } from "@/app/(authorized)/logout/logout-form";

jest.mock("@/app/(authorized)/logout/actions", () => ({
  logout: jest.fn(),
}));

describe("LogoutForm", () => {
  // テスト内容: ログアウト送信ボタンが表示されることを確認する
  it("renders a logout submit button", () => {
    render(<LogoutForm />);

    expect(screen.getByRole("button", { name: "ログアウト" })).toHaveAttribute(
      "type",
      "submit",
    );
  });
});
