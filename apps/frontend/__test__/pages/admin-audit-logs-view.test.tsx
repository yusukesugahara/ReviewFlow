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
    id: "audit-1",
    actorEmail: "admin@example.com",
    actorUserId: "user-1",
    actionType: "DELETE:/users/:id",
    targetType: "users",
    targetId: "target-user-1234567890",
    metadataJson: metadata({
      durationMs: 3500,
      errorCode: "FORBIDDEN",
      ip: "127.0.0.1",
      path: "/users/user-1",
      statusCode: 403,
      success: false,
      userAgent: "Jest",
    }),
    createdAt: "2026-06-06T00:00:00.000Z",
  },
  {
    id: "audit-2",
    actorEmail: "member@example.com",
    actionType: "GET:/applications",
    targetType: "applications",
    targetId: "application-1234567890",
    metadataJson: metadata({
      durationMs: 120,
      ip: "10.0.0.1",
      path: "/applications",
      statusCode: 200,
      success: true,
    }),
    createdAt: "2026-06-05T00:00:00.000Z",
  },
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
  // テスト内容: 監査ログの集計、フィルタ、拡張行情報が表示されることを確認する
  it("renders summary counts, filters, and enriched audit rows", () => {
    render(<AdminAuditLogsView {...baseProps} />);

    expect(screen.getAllByText("高リスク").length).toBeGreaterThan(0);
    expect(screen.getAllByText("要確認").length).toBeGreaterThan(0);
    expect(screen.getByText("失敗操作")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "監査ログ" })).toBeInTheDocument();
    expect(screen.getByLabelText("検索キーワード")).toHaveAttribute(
      "placeholder",
      "操作、対象、ID、操作者メールで検索",
    );
    expect(screen.getByRole("link", { name: "クリア" })).toHaveAttribute(
      "href",
      "/admin/audit-logs",
    );

    const failedRow = screen.getByRole("row", { name: /admin@example.com/ });
    expect(within(failedRow).getByText("高")).toBeInTheDocument();
    expect(within(failedRow).getByText("FORBIDDEN")).toBeInTheDocument();
    expect(within(failedRow).getByText("users")).toBeInTheDocument();
    expect(within(failedRow).getByText("target-u...")).toBeInTheDocument();
    expect(within(failedRow).getByText("127.0.0.1")).toBeInTheDocument();
    expect(within(failedRow).getByText("失敗: FORBIDDEN")).toBeInTheDocument();
    expect(within(failedRow).getByText("認証・ユーザ管理")).toBeInTheDocument();
    expect(within(failedRow).getByText("変更・削除操作")).toBeInTheDocument();
    expect(within(failedRow).getByText("HTTP 403")).toBeInTheDocument();
    expect(within(failedRow).getByText("処理時間が長い")).toBeInTheDocument();

    const successRow = screen.getByRole("row", { name: /member@example.com/ });
    expect(within(successRow).getByText("低")).toBeInTheDocument();
    expect(within(successRow).getByText("成功")).toBeInTheDocument();
    expect(within(successRow).getByText("通常操作")).toBeInTheDocument();
  });

  // テスト内容: 失敗かつ高リスク条件で行が絞り込まれることを確認する
  it("filters rows by failed outcome and high risk", () => {
    render(<AdminAuditLogsView {...baseProps} outcome="failed" risk="high" />);

    expect(screen.getByRole("row", { name: /admin@example.com/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /member@example.com/ })).not.toBeInTheDocument();
  });

  // テスト内容: 有効なフィルタで一致行がない場合の空状態を確認する
  it("renders an empty state for active filters with no matching rows", () => {
    render(<AdminAuditLogsView {...baseProps} outcome="success" risk="high" />);

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
