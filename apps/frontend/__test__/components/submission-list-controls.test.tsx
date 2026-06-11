import { render, screen } from "@testing-library/react";
import { SubmissionFiltersForm } from "@/app/(authorized)/space/[spaceId]/submissions/_components/submission-filters-form";
import { SubmissionPaginationControls } from "@/app/(authorized)/space/[spaceId]/submissions/_components/submission-pagination-controls";
import { SubmissionSummaryCards } from "@/app/(authorized)/space/[spaceId]/submissions/_components/submission-summary-cards";
import type { SubmissionFilters } from "@/app/(authorized)/space/[spaceId]/submissions/_components/space-submissions.helpers";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";

const filters: SubmissionFilters = {
  applicant: "member@example.com",
  createdFrom: "2026-06-01",
  createdTo: "2026-06-30",
  form: "経費",
  page: 2,
  status: APPLICATION_STATUSES.submitted,
  summary: "spaceNeedsAction",
};

describe("submission list controls", () => {
  // テスト内容: サマリーカードのリンクと件数が表示されることを確認する
  it("renders summary links and counts", () => {
    render(
      <SubmissionSummaryCards
        activeSummary="spaceNeedsAction"
        counts={{
          myNeedsAction: 1,
          recentProcessed: 2,
          returned: 3,
          spaceNeedsAction: 4,
        }}
        spaceId="space-1"
      />,
    );

    const spaceNeedsAction = screen.getByRole("link", {
      name: /スペース内で対応が必要/,
    });
    expect(spaceNeedsAction).toHaveAttribute(
      "href",
      "/space/space-1/submissions?summary=spaceNeedsAction",
    );
    expect(spaceNeedsAction).toHaveTextContent("4");
    expect(screen.getByRole("link", { name: /直近7日間に対応/ })).toHaveTextContent(
      "2",
    );
  });

  // テスト内容: フィルタフォームの初期値、hidden summary、クリアリンクを確認する
  it("renders filter inputs and hidden summary state", () => {
    const { container } = render(
      <SubmissionFiltersForm filters={filters} spaceId="space-1" />,
    );

    expect(screen.getByLabelText("申請者")).toHaveValue("member@example.com");
    expect(screen.getByLabelText("申請フォーム")).toHaveValue("経費");
    expect(container.querySelector('input[name="summary"]')).toHaveValue(
      "spaceNeedsAction",
    );
    expect(screen.getByRole("link", { name: "クリア" })).toHaveAttribute(
      "href",
      "/space/space-1/submissions",
    );
  });

  // テスト内容: ページネーションの表示範囲と前後リンクを確認する
  it("renders pagination ranges and links with filters", () => {
    render(
      <SubmissionPaginationControls
        currentPage={2}
        filters={filters}
        pageSize={10}
        spaceId="space 1"
        totalCount={24}
        totalPages={3}
      />,
    );

    expect(screen.getByText("11-20件を表示 / 全24件")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /前へ/ })).toHaveAttribute(
      "href",
      "/space/space%201/submissions?applicant=member%40example.com&status=submitted&form=%E7%B5%8C%E8%B2%BB&createdFrom=2026-06-01&createdTo=2026-06-30&summary=spaceNeedsAction",
    );
    expect(screen.getByRole("link", { name: /次へ/ })).toHaveAttribute(
      "href",
      "/space/space%201/submissions?applicant=member%40example.com&status=submitted&form=%E7%B5%8C%E8%B2%BB&createdFrom=2026-06-01&createdTo=2026-06-30&summary=spaceNeedsAction&page=3",
    );
  });
});
