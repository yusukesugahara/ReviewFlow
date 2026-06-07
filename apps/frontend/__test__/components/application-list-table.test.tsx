import { render, screen } from "@testing-library/react";
import {
  ApplicationListTable,
  type ApplicationListRow,
} from "@/components/applications/application-list-table";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";

describe("ApplicationListTable", () => {
  const rows: ApplicationListRow[] = [
    {
      id: "draft-1",
      groupId: "space-1",
      status: APPLICATION_STATUSES.draft,
      applicationName: "下書きフォーム",
      createdAt: "2026-06-06T00:00:00.000Z",
    },
    {
      id: "public-1",
      groupId: "space-1",
      status: APPLICATION_STATUSES.submitted,
      formDefinitionName: "公開申請",
      applicantUserId: null,
      applicantEmail: "outside@example.com",
      createdAt: "2026-06-06T01:00:00.000Z",
    },
    {
      id: "internal-1",
      groupId: "space-1",
      status: APPLICATION_STATUSES.approved,
      applicationName: "",
      formDefinitionName: "",
      applicantUserId: "user-1",
      createdAt: "2026-06-06T02:00:00.000Z",
    },
  ];

  // テスト内容: 申請名、種別、状態、申請者メール、リンクが表示されることを確認する
  it("renders application names, kinds, statuses, applicant email, and links", () => {
    render(
      <ApplicationListTable
        rows={rows}
        getDetailHref={(row) => `/detail/${row.id}`}
        showApplicantEmail
      />,
    );

    expect(screen.getByText("下書きフォーム")).toBeInTheDocument();
    expect(screen.getByText("公開申請")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    expect(screen.getByText("作成中（下書き）")).toBeInTheDocument();
    expect(screen.getByText("利用者申請")).toBeInTheDocument();
    expect(screen.getByText("内部申請")).toBeInTheDocument();
    expect(screen.getByText("下書き")).toBeInTheDocument();
    expect(screen.getByText("提出済み")).toBeInTheDocument();
    expect(screen.getByText("承認")).toBeInTheDocument();
    expect(screen.getByText("outside@example.com")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /詳細/ })[0]).toHaveAttribute(
      "href",
      "/detail/draft-1",
    );
  });

  // テスト内容: 指定時に詳細リンクが新しいタブで開く設定になることを確認する
  it("opens detail links in a new tab when requested", () => {
    render(
      <ApplicationListTable
        rows={[rows[0]!]}
        getDetailHref={(row) => `/detail/${row.id}`}
        actionLabel="開く"
        openDetailInNewTab
      />,
    );

    const link = screen.getByRole("link", { name: /開く/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
