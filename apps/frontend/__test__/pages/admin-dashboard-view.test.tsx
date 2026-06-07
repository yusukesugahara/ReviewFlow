import { render, screen } from "@testing-library/react";
import { AdminDashboardView } from "@/app/(authorized)/space/view";

describe("AdminDashboardView", () => {
  // テスト内容: ダッシュボード指標とナビゲーションが表示されることを確認する
  it("renders dashboard metrics and navigation", () => {
    render(
      <AdminDashboardView
        avgReturns="1.5"
        resubmitCount={2}
        spaceId="space-1"
        totalApplications={10}
      />,
    );

    expect(screen.getByRole("link", { name: "新規申請" })).toHaveAttribute(
      "href",
      "/space/space-1/applications/new",
    );
    expect(screen.getByText("申請件数")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("平均差し戻し数")).toBeInTheDocument();
    expect(screen.getByText("1.5")).toBeInTheDocument();
    expect(screen.getByText("再提出件数")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  // テスト内容: 取得エラーが表示されることを確認する
  it("renders fetch errors", () => {
    render(
      <AdminDashboardView
        avgReturns="0"
        fetchErrorStatus={500}
        resubmitCount={0}
        spaceId="space-1"
        totalApplications={0}
      />,
    );

    expect(screen.getByText("ダッシュボードの取得に失敗しました")).toBeInTheDocument();
    expect(screen.getByText(/status: 500/)).toBeInTheDocument();
  });
});
