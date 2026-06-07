import { render, screen } from "@testing-library/react";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";

describe("ApplicationStatusBadge", () => {
  // テスト内容: ローカライズされたステータスラベルが表示されることを確認する
  it("renders the localized status label", () => {
    render(<ApplicationStatusBadge status={APPLICATION_STATUSES.inReview} />);

    expect(screen.getByText("レビュー中")).toBeInTheDocument();
  });

  // テスト内容: レビュー中ステータスにも他ステータスと同じく枠が表示されることを確認する
  it("renders a visible border for in-review status", () => {
    render(<ApplicationStatusBadge status={APPLICATION_STATUSES.inReview} />);

    expect(screen.getByText("レビュー中")).toHaveClass("border-blue-200");
  });

  // テスト内容: 未知のステータスがそのまま表示されることを確認する
  it("renders unknown statuses as-is", () => {
    render(<ApplicationStatusBadge status="custom_status" />);

    expect(screen.getByText("custom_status")).toBeInTheDocument();
  });
});
