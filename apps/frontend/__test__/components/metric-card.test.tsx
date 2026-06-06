import { render, screen } from "@testing-library/react";
import { MetricCard } from "@/app/(authorized)/space/_components/metric-card";

describe("MetricCard", () => {
  // テスト内容: メトリクス内容とアイコンコンテナのクラスが表示されることを確認する
  it("renders metric content and icon container classes", () => {
    render(
      <MetricCard
        title="申請件数"
        value={12}
        description="全ての申請数"
        toneClassName="bg-violet-100"
        iconClassName="text-violet-600"
        icon={<svg aria-label="metric icon" />}
      />,
    );

    expect(screen.getByText("申請件数")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("全ての申請数")).toBeInTheDocument();
    expect(screen.getByLabelText("metric icon").parentElement).toHaveClass(
      "text-violet-600",
    );
  });
});
