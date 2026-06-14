import {
  buildAdminAuditLogsViewModel,
  buildAuditDisplay,
  buildAuditLogsHref,
  describeActionLabel,
  describeTargetLabel,
  enrichAuditRow,
  shortId,
  textValue,
  valueList,
} from "@/app/(authorized)/admin/audit-logs/_utils/audit-log-helpers";
import type { AuditLogItem } from "@/lib/schema";

function metadata(value: Record<string, unknown>): Record<string, never> {
  return value as unknown as Record<string, never>;
}

describe("audit log helpers", () => {
  // テスト内容: 申請承認ログから業務表示情報を作れることを確認する
  it("builds application audit display information", () => {
    const row: AuditLogItem = {
      id: "audit-approve",
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
    };

    expect(enrichAuditRow(row)).toMatchObject({
      display: {
        actorLabel: "reviewer@example.com",
        actionLabel: "申請を承認",
        targetLabel: "申請 applicat...",
        changeItems: ["状態: レビュー中 -> 承認済み", "ステップ: 1 -> -"],
      },
    });
    expect(buildAuditDisplay(row).detailItems).toEqual(
      expect.arrayContaining([
        { label: "申請者メール", value: "applicant@example.com" },
        { label: "コメント", value: "ok" },
        { label: "フォームID", value: "form-1" },
      ]),
    );
  });

  // テスト内容: ユーザ権限変更の対象と変更内容が表示できることを確認する
  it("builds user role change display information", () => {
    const row: AuditLogItem = {
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
      createdAt: "2026-06-06T00:00:00.000Z",
    };

    expect(describeActionLabel(row)).toBe("ユーザ権限を変更");
    expect(describeTargetLabel(row)).toBe("member@example.com");
    expect(buildAuditDisplay(row).changeItems).toEqual([
      "権限: テナントユーザ -> テナント管理者",
    ]);
  });

  // テスト内容: 自分のプロフィール変更とパスワード変更が表示できることを確認する
  it("builds account update display information", () => {
    const profileRow: AuditLogItem = {
      id: "audit-profile",
      actorType: "user",
      actorEmailSnapshot: "old@example.com",
      actionType: "user.profile_updated",
      targetType: "user",
      targetId: "target-user-1234567890",
      targetUserId: "target-user-1234567890",
      targetEmailSnapshot: "new@example.com",
      metadataJson: metadata({
        emailFrom: "old@example.com",
        emailTo: "new@example.com",
        userNameFrom: "Old User",
        userNameTo: "New User",
      }),
      createdAt: "2026-06-06T00:00:00.000Z",
    };
    const passwordRow: AuditLogItem = {
      id: "audit-password",
      actorType: "user",
      actorEmailSnapshot: "member@example.com",
      actionType: "user.password_changed",
      targetType: "user",
      targetId: "target-user-1234567890",
      targetUserId: "target-user-1234567890",
      targetEmailSnapshot: "member@example.com",
      metadataJson: metadata({ passwordChanged: true }),
      createdAt: "2026-06-06T00:00:00.000Z",
    };

    expect(buildAuditDisplay(profileRow)).toMatchObject({
      actionLabel: "アカウント情報を更新",
      changeItems: [
        "メールアドレス: old@example.com -> new@example.com",
        "名前: Old User -> New User",
      ],
    });
    const passwordDisplay = buildAuditDisplay(passwordRow);
    expect(passwordDisplay.actionLabel).toBe("パスワードを変更");
    expect(passwordDisplay.detailItems).toEqual(
      expect.arrayContaining([{ label: "パスワード変更", value: "実施" }]),
    );
  });

  // テスト内容: スペースメンバー操作のスペース権限変更が表示できることを確認する
  it("builds group member role display information", () => {
    const row: AuditLogItem = {
      id: "audit-member",
      actorType: "user",
      actorEmailSnapshot: "space-admin@example.com",
      actionType: "space.member_role_changed",
      targetType: "group_member",
      targetId: "member-row-1234567890",
      targetUserId: "member-user-1234567890",
      targetEmailSnapshot: "member@example.com",
      groupRoleFrom: "user",
      groupRoleTo: "admin",
      groupId: "group-1234567890",
      createdAt: "2026-06-06T00:00:00.000Z",
    };

    expect(buildAuditDisplay(row).changeItems).toEqual([
      "スペース権限: スペースユーザ -> スペース管理者",
    ]);
  });

  // テスト内容: 監査ログ一覧のフィルタURLが空値を除外して組み立てられることを確認する
  it("builds audit log filter hrefs", () => {
    expect(
      buildAuditLogsHref({
        createdFrom: "",
        createdTo: "",
        query: "",
        targetType: "application",
      }),
    ).toBe("/admin/audit-logs?targetType=application");
    expect(
      buildAuditLogsHref({
        createdFrom: "2026-06-01",
        createdTo: "2026-06-30",
        page: 3,
        query: "admin@example.com",
        targetType: "user",
      }),
    ).toBe(
      "/admin/audit-logs?q=admin%40example.com&targetType=user&createdFrom=2026-06-01&createdTo=2026-06-30&page=3",
    );
  });

  // テスト内容: 監査ログ一覧用の集計とフィルタ済み行を表示ロジック外で作れることを確認する
  it("builds audit log view model with summary counts and filtered rows", () => {
    const applicationRow: AuditLogItem = {
      id: "audit-application",
      actorType: "user",
      actionType: "application.submitted",
      targetType: "application",
      targetId: "application-12345678",
      applicationId: "application-12345678",
      createdAt: "2026-06-06T00:00:00.000Z",
    };
    const userRow: AuditLogItem = {
      id: "audit-user",
      actorType: "user",
      actionType: "user.deactivated",
      targetType: "user",
      targetId: "user-23456789",
      createdAt: "2026-06-06T00:00:00.000Z",
    };
    const memberRow: AuditLogItem = {
      id: "audit-member",
      actorType: "user",
      actionType: "space.member_removed",
      targetType: "group_member",
      targetId: "member-12345678",
      createdAt: "2026-06-06T00:00:00.000Z",
    };

    const viewModel = buildAdminAuditLogsViewModel({
      createdFrom: "",
      createdTo: "",
      query: "",
      targetType: "user",
      rows: [applicationRow, userRow, memberRow],
    });

    expect(viewModel.filteredRows.map((item) => item.row.id)).toEqual(["audit-user"]);
    expect(viewModel.summaryCounts).toEqual({
      applicationEvents: 1,
      identityEvents: 1,
      spaceEvents: 1,
      total: 3,
    });
    expect(viewModel.hasActiveFilters).toBe(true);
    expect(viewModel.listDescription).toBe(
      "ユーザの監査ログを新しい順に表示しています",
    );
  });

  // テスト内容: 表示用の短縮識別子と文字列変換が行われることを確認する
  it("formats small metadata values for display", () => {
    expect(shortId("1234567890")).toBe("12345678...");
    expect(shortId(null)).toBe("-");
    expect(textValue(200)).toBe("200");
    expect(textValue(false)).toBe("false");
    expect(valueList(["a", 1, null])).toEqual(["a", "1"]);
  });
});
