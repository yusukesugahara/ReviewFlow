import { render, screen } from "@testing-library/react";
import { SpaceEmptyState } from "@/components/space/space-empty-state";
import { TENANT_ROLES } from "@/lib/constants/roles";

describe("SpaceEmptyState", () => {
  // テスト内容: テナント管理者向けにスペース管理リンクが表示されることを確認する
  it("links tenant admins to space administration", () => {
    render(<SpaceEmptyState userRoles={[TENANT_ROLES.admin]} />);

    expect(screen.getByRole("heading", { name: "スペースがありません" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "スペース管理へ" })).toHaveAttribute(
      "href",
      "/admin/spaces",
    );
  });

  // テスト内容: 管理者以外には待機メッセージが表示されることを確認する
  it("shows a waiting message for non-admin users", () => {
    render(<SpaceEmptyState userRoles={[TENANT_ROLES.user]} />);

    expect(
      screen.getByRole("heading", { name: "ワークスペースに招待されていません" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
