import { render, screen, within } from "@testing-library/react";
import {
  AdminAuditLogsErrorView,
  AdminAuditLogsView,
} from "@/app/(authorized)/admin/audit-logs/view";
import type { AuditLogItem } from "@/lib/schema";

function metadata(value: Record<string, unknown>): Record<string, never> {
  return value as unknown as Record<string, never>;
}

const highRiskRow: AuditLogItem = {
  id: "audit-role",
  actorEmail: "admin@example.com",
  actorUserId: "user-1",
  actionType: "PATCH:users",
  targetType: "users",
  targetId: "target-user-1234567890",
  metadataJson: metadata({
    durationMs: 120,
    ip: "127.0.0.1",
    path: "/users/user-1/role",
    method: "PATCH",
    statusCode: 200,
    success: true,
    userAgent: "Jest",
  }),
  createdAt: "2026-06-06T00:00:00.000Z",
};

const rows: AuditLogItem[] = [
  {
    id: "audit-1",
    actorEmail: "admin@example.com",
    actorUserId: "user-1",
    actionType: "DELETE:users",
    targetType: "users",
    targetId: "target-user-1234567890",
    metadataJson: metadata({
      durationMs: 3500,
      errorCode: "FORBIDDEN",
      ip: "127.0.0.1",
      path: "/users/user-1",
      method: "DELETE",
      statusCode: 403,
      success: false,
      userAgent: "Jest",
    }),
    createdAt: "2026-06-06T00:00:00.000Z",
  },
  {
    id: "audit-2",
    actorEmail: "member@example.com",
    actionType: "GET:applications",
    targetType: "applications",
    targetId: "application-1234567890",
    metadataJson: metadata({
      durationMs: 120,
      ip: "10.0.0.1",
      path: "/applications",
      method: "GET",
      statusCode: 200,
      success: true,
    }),
    createdAt: "2026-06-05T00:00:00.000Z",
  },
  highRiskRow,
];

const baseProps = {
  createdFrom: "",
  createdTo: "",
  outcome: "all",
  query: "",
  risk: "all",
  rows,
};

describe("AdminAuditLogsView", () => {
  // テスト内容: 監査ログの集計、フィルタ、読みやすい操作説明が表示されることを確認する
  it("renders summary counts, filters, and enriched audit rows", () => {
    render(<AdminAuditLogsView {...baseProps} />);

    expect(screen.getAllByText("高リスク").length).toBeGreaterThan(0);
    expect(screen.getAllByText("要確認").length).toBeGreaterThan(0);
    expect(screen.getByText("失敗操作")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "監査ログ" })).toBeInTheDocument();
    expect(screen.getByText("誰が、いつ、どんな操作をしたかを確認できます。")).toBeInTheDocument();
    expect(screen.getByLabelText("検索キーワード")).toHaveAttribute(
      "placeholder",
      "操作者メール、対象ID、操作内容で検索",
    );
    expect(screen.getByRole("link", { name: "クリア" })).toHaveAttribute(
      "href",
      "/admin/audit-logs",
    );

    const failedRow = screen.getByRole("row", { name: /admin@example.com.*ユーザを削除しました/ });
    expect(within(failedRow).getByText("ユーザを削除しました")).toBeInTheDocument();
    expect(within(failedRow).getByText("要確認")).toBeInTheDocument();
    expect(within(failedRow).getByText("失敗（FORBIDDEN）")).toBeInTheDocument();
    expect(within(failedRow).getByText("技術情報")).toBeInTheDocument();

    const highRiskRoleRow = screen.getByRole("row", { name: /admin@example.com.*ユーザの権限を変更しました/ });
    expect(within(highRiskRoleRow).getByText("高リスク")).toBeInTheDocument();

    const successRow = screen.getByRole("row", { name: /member@example.com/ });
    expect(within(successRow).getByText("申請を参照しました")).toBeInTheDocument();
    expect(within(successRow).getByText("通常")).toBeInTheDocument();
    expect(within(successRow).getByText("成功")).toBeInTheDocument();
  });

  // テスト内容: 高リスクカードから高リスクフィルタ付きURLへ遷移できることを確認する
  it("links the high risk summary card to the high risk filter", () => {
    render(<AdminAuditLogsView {...baseProps} />);

    expect(screen.getByRole("link", { name: "高リスクの操作履歴を表示（1件）" })).toHaveAttribute(
      "href",
      "/admin/audit-logs?risk=high",
    );
  });

  // テスト内容: 高リスクフィルタ適用時に説明文とカードの選択状態が変わることを確認する
  it("shows active high risk filter state", () => {
    render(<AdminAuditLogsView {...baseProps} risk="high" />);

    expect(screen.getByText("高リスクの操作履歴のみを表示しています")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "高リスクの操作履歴を表示（1件）" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  // テスト内容: 高リスク条件で対象操作だけが絞り込まれることを確認する
  it("filters rows by high risk operations only", () => {
    render(<AdminAuditLogsView {...baseProps} risk="high" />);

    expect(screen.getByRole("row", { name: /ユーザの権限を変更しました/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /ユーザを削除しました/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /member@example.com/ })).not.toBeInTheDocument();
  });

  // テスト内容: 申請フォーム変更が高リスクフィルタで取得できることを確認する
  it("filters form definition changes by high risk", () => {
    const formChangeRows: AuditLogItem[] = [
      highRiskRow,
      {
        id: "audit-form-publish",
        actorEmail: "editor@example.com",
        actionType: "POST:form-definitions",
        targetType: "form-definitions",
        targetId: "form-12345678",
        metadataJson: metadata({
          success: true,
          path: "/form-definitions/form-12345678/publish",
          method: "POST",
          statusCode: 200,
        }),
        createdAt: "2026-06-04T00:00:00.000Z",
      },
    ];

    render(<AdminAuditLogsView {...baseProps} rows={formChangeRows} risk="high" />);

    expect(screen.getByRole("row", { name: /editor@example.com/ })).toBeInTheDocument();
    expect(screen.getByText("申請フォームを公開しました")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /ユーザの権限を変更しました/ })).toBeInTheDocument();
  });

  // テスト内容: 有効なフィルタで一致行がない場合の空状態を確認する
  it("renders an empty state for active filters with no matching rows", () => {
    render(
      <AdminAuditLogsView
        {...baseProps}
        rows={rows.filter((row) => row.id !== "audit-role")}
        risk="high"
      />,
    );

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
