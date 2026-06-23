import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AdminAuditLogsErrorView,
  AdminAuditLogsView,
} from "@/app/(authorized)/admin/audit-logs/view";
import { formatDateTimeJa } from "@/lib/date-format";
import type { AuditLogItem } from "@/lib/schema";

function metadata(value: Record<string, unknown>): Record<string, never> {
  return value as unknown as Record<string, never>;
}

const rows: AuditLogItem[] = [
  {
    id: "audit-application",
    actorType: "user",
    actorUserId: "reviewer-1234567890",
    actorEmailSnapshot: "reviewer@example.com",
    actionType: "application.approved",
    targetType: "application",
    targetId: "application-1234567890",
    applicationId: "application-1234567890",
    groupId: "group-1234567890",
    statusFrom: "in_review",
    statusTo: "approved",
    stepOrderFrom: 1,
    stepOrderTo: null,
    summary: "reviewer@example.com approved application",
    metadataJson: metadata({
      applicantEmail: "applicant@example.com",
      comment: "ok",
      formDefinitionId: "form-1",
    }),
    createdAt: "2026-06-06T00:00:00.000Z",
  },
  {
    id: "audit-user",
    actorType: "user",
    actorEmailSnapshot: "admin@example.com",
    actionType: "user.role_changed",
    targetType: "user",
    targetId: "target-user-1234567890",
    targetUserId: "target-user-1234567890",
    targetEmailSnapshot: "member@example.com",
    roleFrom: "tenant_user",
    roleTo: "tenant_admin",
    summary: "admin@example.com changed member@example.com role",
    createdAt: "2026-06-05T00:00:00.000Z",
  },
  {
    id: "audit-invitation",
    actorType: "user",
    actorEmailSnapshot: "admin@example.com",
    actionType: "invitation.created",
    targetType: "invitation",
    targetId: "invitation-1234567890",
    targetEmailSnapshot: "new@example.com",
    roleTo: "tenant_user",
    groupRoleTo: "user",
    metadataJson: metadata({ expiresAt: "2026-06-13T00:00:00.000Z" }),
    createdAt: "2026-06-04T00:00:00.000Z",
  },
  {
    id: "audit-member",
    actorType: "user",
    actorEmailSnapshot: "space-admin@example.com",
    actionType: "space.member_removed",
    targetType: "group_member",
    targetId: "member-row-1234567890",
    targetUserId: "member-user-1234567890",
    targetEmailSnapshot: "removed@example.com",
    groupId: "group-1234567890",
    groupRoleFrom: "admin",
    summary: "space-admin@example.com removed removed@example.com",
    createdAt: "2026-06-03T00:00:00.000Z",
  },
];

const baseProps = {
  createdFrom: "",
  createdTo: "",
  pagination: {
    currentPage: 2,
    limit: 4,
    offset: 4,
    total: 12,
    totalPages: 3,
  },
  query: "",
  targetType: "all",
  rows,
};

describe("AdminAuditLogsView", () => {
  // テスト内容: 業務監査ログの集計、フィルタ、状態/権限変更が表示されることを確認する
  it("renders summary counts, filters, and business audit rows", async () => {
    const user = userEvent.setup();

    render(<AdminAuditLogsView {...baseProps} />);

    expect(screen.getByText("全イベント")).toBeInTheDocument();
    expect(screen.getByText("重要操作")).toBeInTheDocument();
    expect(screen.getAllByText("申請").length).toBeGreaterThan(0);
    expect(screen.getByText("ユーザー・スペース")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "監査ログ" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("誰が、いつ、どんな操作をしたかを確認できます。"),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("検索キーワード")).toHaveAttribute(
      "placeholder",
      "操作者、対象メール、申請ID、操作内容で検索",
    );
    expect(screen.getByRole("link", { name: "クリア" })).toHaveAttribute(
      "href",
      "/admin/audit-logs",
    );
    expect(screen.getByText("5-8件を表示 / 全12件")).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /前へ/ })).toHaveAttribute(
      "href",
      "/admin/audit-logs",
    );
    expect(screen.getByRole("link", { name: /次へ/ })).toHaveAttribute(
      "href",
      "/admin/audit-logs?page=3",
    );

    const applicationRow = screen.getByRole("row", {
      name: /reviewer@example.com.*申請を承認/,
    });
    const applicationTargetLink = within(applicationRow).getByRole("link", {
      name: "申請 applicat...",
    });
    expect(applicationTargetLink).toHaveAttribute(
      "href",
      "/space/group-1234567890/applications/application-1234567890?definitionId=form-1",
    );
    expect(applicationTargetLink).toHaveAttribute("target", "_blank");
    expect(applicationTargetLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      within(applicationRow).getByText("状態: 審査中 → 承認済み"),
    ).toBeInTheDocument();
    expect(
      within(applicationRow).getByText("承認ステップ: 1 → -"),
    ).toBeInTheDocument();
    expect(within(applicationRow).getByText("詳細")).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "申請 applicat... の詳細" }),
    ).not.toBeInTheDocument();

    const detailButton = within(applicationRow).getByRole("button", {
      name: "申請 applicat... の詳細を表示",
    });
    expect(detailButton).toHaveAttribute("aria-expanded", "false");

    await user.click(detailButton);

    const detailRegion = screen.getByRole("region", {
      name: "申請 applicat... の詳細",
    });
    expect(detailButton).toHaveAttribute("aria-expanded", "true");
    expect(detailRegion.closest("tr")?.previousElementSibling).toBe(
      applicationRow,
    );
    expect(within(detailRegion).getByText("監査サマリー")).toBeInTheDocument();
    expect(within(detailRegion).getByText("いつ")).toBeInTheDocument();
    expect(
      within(detailRegion).getByText(formatDateTimeJa(rows[0]?.createdAt ?? "")),
    ).toBeInTheDocument();
    expect(within(detailRegion).getByText("だれが")).toBeInTheDocument();
    expect(
      within(detailRegion).getByText("reviewer@example.com"),
    ).toBeInTheDocument();
    expect(within(detailRegion).getByText("どんな操作")).toBeInTheDocument();
    expect(within(detailRegion).getByText("申請を承認")).toBeInTheDocument();
    expect(
      within(detailRegion).getByText("操作コード: application.approved"),
    ).toBeInTheDocument();
    expect(within(detailRegion).getByText("何に対して")).toBeInTheDocument();
    expect(
      within(detailRegion).getByRole("link", { name: "申請 applicat..." }),
    ).toHaveAttribute(
      "href",
      "/space/group-1234567890/applications/application-1234567890?definitionId=form-1",
    );
    expect(within(detailRegion).getByText("変更内容")).toBeInTheDocument();
    expect(
      within(detailRegion).getByText("reviewer@example.com approved application"),
    ).toBeInTheDocument();
    expect(within(detailRegion).queryByText("追加情報")).not.toBeInTheDocument();
    expect(within(detailRegion).queryByText("コメント")).not.toBeInTheDocument();

    const userRow = screen.getByRole("row", {
      name: /admin@example.com.*member@example.com.*ユーザー権限を変更/,
    });
    expect(
      within(userRow).getByText("テナント権限: 一般ユーザー → テナント管理者"),
    ).toBeInTheDocument();

    const invitationRow = screen.getByRole("row", {
      name: /admin@example.com.*new@example.com.*ユーザーを招待/,
    });
    expect(
      within(invitationRow).getByText("テナント権限: - → 一般ユーザー"),
    ).toBeInTheDocument();
    expect(
      within(invitationRow).getByText("スペース権限: - → スペースメンバー"),
    ).toBeInTheDocument();

    const memberRow = screen.getByRole("row", {
      name: /space-admin@example.com.*removed@example.com.*スペースからメンバーを削除/,
    });
    expect(
      within(memberRow).getByText("スペース権限: スペース管理者 → -"),
    ).toBeInTheDocument();
  });

  // テスト内容: 対象種別フィルタで表示行が絞られることを確認する
  it("filters rows by target type", () => {
    render(<AdminAuditLogsView {...baseProps} targetType="user" />);

    expect(
      screen.getByText("ユーザーの監査ログを新しい順に表示しています"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: /ユーザー権限を変更/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("row", { name: /申請を承認/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("row", { name: /ユーザーを招待/ }),
    ).not.toBeInTheDocument();
  });

  // テスト内容: 有効なフィルタで一致行がない場合の空状態を確認する
  it("renders an empty state for active filters with no matching rows", () => {
    render(
      <AdminAuditLogsView {...baseProps} rows={[]} targetType="application" />,
    );

    expect(
      screen.getByText("条件に一致する監査ログはありません"),
    ).toBeInTheDocument();
  });

  // テスト内容: 取得エラーが表示されることを確認する
  it("renders fetch errors", () => {
    const { rerender } = render(<AdminAuditLogsErrorView status={500} />);

    expect(
      screen.getByText("監査ログの取得に失敗しました（status: 500）"),
    ).toBeInTheDocument();

    rerender(<AdminAuditLogsErrorView />);

    expect(
      screen.getByText("監査ログの取得に失敗しました"),
    ).toBeInTheDocument();
  });
});
