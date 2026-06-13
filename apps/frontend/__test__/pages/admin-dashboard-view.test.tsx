import { render, screen } from "@testing-library/react";
import { AdminDashboardView } from "@/app/(authorized)/space/view";
import type { SpaceDashboardSummary } from "@/app/(authorized)/space/types";

const space: SpaceDashboardSummary = {
  id: "space-1",
  name: "市民課",
  description: "住民票や戸籍に関する申請を扱います。",
  currentUserRole: "admin",
  memberCount: 4,
  formCount: 3,
  publishedFormCount: 2,
  totalApplications: 10,
  needsActionCount: 3,
  returnedCount: 1,
  approvedCount: 5,
  rejectedCount: 1,
  correctionCount: 4,
  resubmitCount: 2,
  avgReturns: "0.40",
  latestApplicationAt: "2026-06-07T00:00:00.000Z",
};

describe("AdminDashboardView", () => {
  // テスト内容: スペースごとの概要、指標、ナビゲーションが表示されることを確認する
  it("renders space dashboard summaries and navigation", () => {
    render(
      <AdminDashboardView selectedSpaceId="space-1" spaces={[space]} />,
    );

    expect(screen.getByRole("heading", { name: "スペースダッシュボード" })).toBeInTheDocument();
    expect(screen.getByText("市民課")).toBeInTheDocument();
    expect(screen.getByText("住民票や戸籍に関する申請を扱います。")).toBeInTheDocument();
    expect(screen.getByText("メンバー")).toBeInTheDocument();
    expect(screen.getByText("4名")).toBeInTheDocument();
    expect(screen.getByText("公開フォーム")).toBeInTheDocument();
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getAllByText("対応が必要").length).toBeGreaterThan(0);
    expect(screen.getByText("再提出レビュー中 2件")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "概要" })).toHaveAttribute(
      "href",
      "/space/space-1",
    );
    expect(screen.getByRole("link", { name: "フォーム" })).toHaveAttribute(
      "href",
      "/space/space-1/applications",
    );
    expect(screen.getByRole("link", { name: "申請一覧" })).toHaveAttribute(
      "href",
      "/space/space-1/submissions",
    );
    expect(screen.queryByRole("link", { name: "新規申請" })).not.toBeInTheDocument();
  });

  // テスト内容: 取得エラーが表示されることを確認する
  it("renders fetch errors", () => {
    render(
      <AdminDashboardView
        fetchErrorStatus={500}
        selectedSpaceId="space-1"
        spaces={[]}
      />,
    );

    expect(screen.getByText("ダッシュボードの取得に失敗しました")).toBeInTheDocument();
    expect(screen.getByText(/status: 500/)).toBeInTheDocument();
  });
});
