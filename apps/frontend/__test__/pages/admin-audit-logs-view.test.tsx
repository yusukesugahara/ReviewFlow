import { render, screen, within } from "@testing-library/react";
import {
  AdminAuditLogsErrorView,
  AdminAuditLogsView,
} from "@/app/(authorized)/admin/audit-logs/view";
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
  it("renders summary counts, filters, and business audit rows", () => {
    render(<AdminAuditLogsView {...baseProps} />);

    expect(screen.getByText("全イベント")).toBeInTheDocument();
    expect(screen.getAllByText("申請").length).toBeGreaterThan(0);
    expect(screen.getByText("ユーザ/招待")).toBeInTheDocument();
    expect(screen.getByText("スペース/メンバー")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "監査ログ" })).toBeInTheDocument();
    expect(screen.getByText("誰が、いつ、どんな操作をしたかを確認できます。")).toBeInTheDocument();
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
    expect(within(applicationRow).getByText("状態: レビュー中 -> 承認済み")).toBeInTheDocument();
    expect(within(applicationRow).getByText("ステップ: 1 -> -")).toBeInTheDocument();
    expect(within(applicationRow).getByText("詳細")).toBeInTheDocument();

    const userRow = screen.getByRole("row", {
      name: /admin@example.com.*member@example.com.*ユーザ権限を変更/,
    });
    expect(within(userRow).getByText("権限: テナントユーザ -> テナント管理者")).toBeInTheDocument();

    const invitationRow = screen.getByRole("row", {
      name: /admin@example.com.*new@example.com.*ユーザを招待/,
    });
    expect(within(invitationRow).getByText("権限: - -> テナントユーザ")).toBeInTheDocument();
    expect(within(invitationRow).getByText("スペース権限: - -> スペースユーザ")).toBeInTheDocument();

    const memberRow = screen.getByRole("row", {
      name: /space-admin@example.com.*removed@example.com.*スペースからメンバーを削除/,
    });
    expect(within(memberRow).getByText("スペース権限: スペース管理者 -> -")).toBeInTheDocument();
  });

  // テスト内容: 対象種別フィルタで表示行が絞られることを確認する
  it("filters rows by target type", () => {
    render(<AdminAuditLogsView {...baseProps} targetType="user" />);

    expect(screen.getByText("ユーザの監査ログを新しい順に表示しています")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /ユーザ権限を変更/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /申請を承認/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /ユーザを招待/ })).not.toBeInTheDocument();
  });

  // テスト内容: 有効なフィルタで一致行がない場合の空状態を確認する
  it("renders an empty state for active filters with no matching rows", () => {
    render(<AdminAuditLogsView {...baseProps} rows={[]} targetType="application" />);

    expect(screen.getByText("条件に一致する監査ログはありません")).toBeInTheDocument();
  });

  // テスト内容: 取得エラーが表示されることを確認する
  it("renders fetch errors", () => {
    const { rerender } = render(<AdminAuditLogsErrorView status={500} />);

    expect(screen.getByText("監査ログの取得に失敗しました（status: 500）")).toBeInTheDocument();

    rerender(<AdminAuditLogsErrorView />);

    expect(screen.getByText("監査ログの取得に失敗しました")).toBeInTheDocument();
  });
});
