import { render, screen } from "@testing-library/react";
import { LogoutView } from "@/app/(authorized)/logout/view";

describe("LogoutView", () => {
  // テスト内容: ログアウト案内とトップページへのリンクが表示されることを確認する
  it("renders the logout guidance and top link", () => {
    render(<LogoutView apiReachable />);

    expect(
      screen.getByText("ログアウトは画面上部のボタンから実行できます。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "トップへ" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // テスト内容: バックエンド接続エラーの警告が表示されることを確認する
  it("renders an API connectivity alert", () => {
    render(<LogoutView apiReachable={false} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "API サーバーに接続できません",
    );
  });
});
