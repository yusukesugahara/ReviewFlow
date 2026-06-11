import {
  buildAdminAuditLogsViewModel,
  buildAuditDisplay,
  buildAuditLogsHref,
  describeActionLabel,
  enrichAuditRow,
  shortId,
  textValue,
} from "@/app/(authorized)/admin/audit-logs/audit-log-helpers";
import type { AuditLogItem } from "@/lib/schema";

function metadata(value: Record<string, unknown>): Record<string, never> {
  return value as unknown as Record<string, never>;
}

describe("audit log helpers", () => {
  // テスト内容: 高リスク対象外の失敗操作は要確認として分類されることを確認する
  it("classifies failed user deletion as medium risk", () => {
    const row: AuditLogItem = {
      id: "audit-1",
      actionType: "DELETE:users",
      targetType: "users",
      targetId: "target-1",
      actorEmail: "admin@example.com",
      metadataJson: metadata({
        success: false,
        errorCode: "FORBIDDEN",
        statusCode: 403,
        durationMs: 3000,
        path: "/users/target-1",
        method: "DELETE",
        role: "tenant_admin",
      }),
      createdAt: "2026-06-06T00:00:00.000Z",
    };

    expect(enrichAuditRow(row)).toMatchObject({
      risk: "medium",
      display: {
        actorLabel: "admin@example.com",
        actionLabel: "ユーザを削除しました",
        targetLabel: "ユーザ target-1...",
        isSuccess: false,
      },
      reasons: [
        "失敗: FORBIDDEN",
        "認証・ユーザ管理",
        "変更・削除操作",
        "HTTP 403",
        "処理時間が長い",
      ],
    });
  });

  // テスト内容: 申請承認の操作内容が日本語で説明されることを確認する
  it("describes application approval actions in Japanese", () => {
    const row: AuditLogItem = {
      id: "audit-approve",
      actionType: "POST:applications",
      targetType: "applications",
      targetId: "app-12345678",
      actorEmail: "reviewer@example.com",
      metadataJson: metadata({
        success: true,
        path: "/applications/app-12345678/approve",
        method: "POST",
      }),
      createdAt: "2026-06-06T00:00:00.000Z",
    };

    expect(describeActionLabel("POST", "/applications/app-12345678/approve", row)).toBe(
      "申請を承認しました",
    );
    expect(buildAuditDisplay(row).summary).toBe(
      "reviewer@example.comが申請を承認しました（申請 app-1234...）",
    );
  });

  // テスト内容: テナント管理のユーザ権限変更が高リスクとして分類されることを確認する
  it("classifies tenant user role changes as high risk", () => {
    const row: AuditLogItem = {
      id: "audit-role",
      actionType: "PATCH:users",
      targetType: "users",
      targetId: "user-12345678",
      actorEmail: "admin@example.com",
      metadataJson: metadata({
        success: true,
        path: "/users/user-12345678/role",
        method: "PATCH",
        statusCode: 200,
      }),
      createdAt: "2026-06-06T00:00:00.000Z",
    };

    expect(enrichAuditRow(row)).toMatchObject({
      risk: "high",
      display: {
        actionLabel: "ユーザの権限を変更しました",
      },
      reasons: expect.arrayContaining([
        "テナントユーザ権限変更",
        "認証・ユーザ管理",
        "変更・削除操作",
      ]),
    });
  });

  // テスト内容: テナント管理のユーザ招待が高リスクとして分類されることを確認する
  it("classifies tenant user invitations as high risk", () => {
    const row: AuditLogItem = {
      id: "audit-invite",
      actionType: "POST:invitations",
      targetType: "invitations",
      targetId: null,
      actorEmail: "admin@example.com",
      metadataJson: metadata({
        success: true,
        path: "/invitations",
        method: "POST",
        statusCode: 201,
      }),
      createdAt: "2026-06-06T00:00:00.000Z",
    };

    expect(enrichAuditRow(row)).toMatchObject({
      risk: "high",
      display: {
        actionLabel: "ユーザを招待しました",
      },
      reasons: expect.arrayContaining(["ユーザ招待", "認証・ユーザ管理"]),
    });
  });

  // テスト内容: スペースメンバー権限変更は高リスクにしないことを確認する
  it("does not classify group member role changes as high risk", () => {
    const row: AuditLogItem = {
      id: "audit-member-role",
      actionType: "PATCH:groups",
      targetType: "groups",
      targetId: "group-12345678",
      actorEmail: "admin@example.com",
      metadataJson: metadata({
        success: true,
        path: "/groups/group-12345678/members/user-12345678/role",
        method: "PATCH",
        statusCode: 200,
      }),
      createdAt: "2026-06-06T00:00:00.000Z",
    };

    expect(enrichAuditRow(row)).toMatchObject({
      risk: "medium",
      display: {
        actionLabel: "スペースメンバーの権限を変更しました",
      },
      reasons: expect.arrayContaining(["変更・削除操作"]),
    });
  });

  // テスト内容: 申請フォームの作成と編集が高リスクとして分類されることを確認する
  it("classifies form definition create and edit as high risk", () => {
    const publishRow: AuditLogItem = {
      id: "audit-publish",
      actionType: "POST:form-definitions",
      targetType: "form-definitions",
      targetId: "form-12345678",
      actorEmail: "editor@example.com",
      metadataJson: metadata({
        success: true,
        path: "/form-definitions/form-12345678/publish",
        method: "POST",
        statusCode: 200,
      }),
      createdAt: "2026-06-06T00:00:00.000Z",
    };
    const createRow: AuditLogItem = {
      id: "audit-create-form",
      actionType: "POST:form-definitions",
      targetType: "form-definitions",
      targetId: null,
      actorEmail: "editor@example.com",
      metadataJson: metadata({
        success: true,
        path: "/form-definitions",
        method: "POST",
        statusCode: 201,
      }),
      createdAt: "2026-06-06T00:00:00.000Z",
    };

    expect(enrichAuditRow(publishRow)).toMatchObject({
      risk: "high",
      display: { actionLabel: "申請フォームを公開しました" },
      reasons: expect.arrayContaining(["申請フォーム編集"]),
    });
    expect(enrichAuditRow(createRow)).toMatchObject({
      risk: "high",
      display: { actionLabel: "申請フォームを作成しました" },
      reasons: expect.arrayContaining(["申請フォーム作成"]),
    });
  });

  // テスト内容: 申請フォーム参照は高リスクにしないことを確認する
  it("keeps form definition reads as low risk", () => {
    expect(
      enrichAuditRow({
        id: "audit-read-form",
        actionType: "GET:form-definitions",
        targetType: "form-definitions",
        targetId: "form-12345678",
        metadataJson: metadata({
          success: true,
          path: "/form-definitions/form-12345678",
          method: "GET",
          statusCode: 200,
        }),
        createdAt: "2026-06-06T00:00:00.000Z",
      }).risk,
    ).toBe("low");
  });

  // テスト内容: 失敗した権限変更も高リスクとして分類されることを確認する
  it("classifies failed role changes as high risk", () => {
    expect(
      enrichAuditRow({
        id: "audit-role-failed",
        actionType: "PATCH:users",
        targetType: "users",
        targetId: "user-12345678",
        actorEmail: "admin@example.com",
        metadataJson: metadata({
          success: false,
          errorCode: "FORBIDDEN",
          path: "/users/user-12345678/role",
          method: "PATCH",
          statusCode: 403,
        }),
        createdAt: "2026-06-06T00:00:00.000Z",
      }).risk,
    ).toBe("high");
  });

  // テスト内容: 招待受諾と公開申請アクセス要求は高リスクにしないことを確認する
  it("does not classify invitation accept or request-access as high risk", () => {
    expect(
      enrichAuditRow({
        id: "audit-accept",
        actionType: "POST:invitations",
        targetType: "invitations",
        metadataJson: metadata({
          success: true,
          path: "/invitations/accept",
          method: "POST",
          statusCode: 200,
        }),
        createdAt: "2026-06-06T00:00:00.000Z",
      }).risk,
    ).toBe("low");
    expect(
      enrichAuditRow({
        id: "audit-request-access",
        actionType: "POST:form-definitions",
        targetType: "form-definitions",
        metadataJson: metadata({
          success: true,
          path: "/form-definitions/groups/group-12345678/request-access",
          method: "POST",
          statusCode: 200,
        }),
        createdAt: "2026-06-06T00:00:00.000Z",
      }).risk,
    ).toBe("low");
  });

  // テスト内容: 末尾スラッシュ付きの申請フォーム作成も高リスクとして分類されることを確認する
  it("classifies form creation with trailing slash as high risk", () => {
    expect(
      enrichAuditRow({
        id: "audit-create-form-slash",
        actionType: "POST:form-definitions",
        targetType: "form-definitions",
        metadataJson: metadata({
          success: true,
          path: "/form-definitions/",
          method: "POST",
          statusCode: 201,
        }),
        createdAt: "2026-06-06T00:00:00.000Z",
      }).risk,
    ).toBe("high");
  });

  // テスト内容: 通常操作の監査ログに低リスクと通常操作理由が付くことを確認する
  it("enriches normal audit rows as low risk", () => {
    expect(
      enrichAuditRow({
        id: "audit-2",
        actionType: "GET:applications",
        targetType: "applications",
        metadataJson: metadata({ success: true, statusCode: 200, path: "/applications", method: "GET" }),
        createdAt: "2026-06-06T00:00:00.000Z",
      }).risk,
    ).toBe("low");
  });

  // テスト内容: 表示用の短縮識別子と文字列変換が行われることを確認する
  it("formats small metadata values for display", () => {
    expect(shortId("1234567890")).toBe("12345678...");
    expect(shortId(null)).toBe("-");
    expect(textValue(200)).toBe("200");
    expect(textValue(false)).toBe("false");
  });

  // テスト内容: 監査ログ一覧のフィルタURLが空値を除外して組み立てられることを確認する
  it("builds audit log filter hrefs", () => {
    expect(
      buildAuditLogsHref({
        createdFrom: "",
        createdTo: "",
        outcome: "all",
        query: "",
        risk: "high",
      }),
    ).toBe("/admin/audit-logs?risk=high");
    expect(
      buildAuditLogsHref({
        createdFrom: "2026-06-01",
        createdTo: "2026-06-30",
        outcome: "failed",
        query: "admin@example.com",
        risk: "medium",
      }),
    ).toBe(
      "/admin/audit-logs?q=admin%40example.com&createdFrom=2026-06-01&createdTo=2026-06-30&outcome=failed&risk=medium",
    );
  });

  // テスト内容: 監査ログ一覧用の集計とフィルタ済み行を表示ロジック外で作れることを確認する
  it("builds audit log view model with summary counts and filtered rows", () => {
    const highRiskRow: AuditLogItem = {
      id: "audit-role",
      actionType: "PATCH:users",
      targetType: "users",
      targetId: "user-12345678",
      actorEmail: "admin@example.com",
      metadataJson: metadata({
        success: true,
        path: "/users/user-12345678/role",
        method: "PATCH",
        statusCode: 200,
      }),
      createdAt: "2026-06-06T00:00:00.000Z",
    };
    const failedRow: AuditLogItem = {
      id: "audit-failed",
      actionType: "DELETE:users",
      targetType: "users",
      targetId: "user-23456789",
      actorEmail: "admin@example.com",
      metadataJson: metadata({
        success: false,
        path: "/users/user-23456789",
        method: "DELETE",
        statusCode: 403,
      }),
      createdAt: "2026-06-06T00:00:00.000Z",
    };
    const lowRiskRow: AuditLogItem = {
      id: "audit-read",
      actionType: "GET:applications",
      targetType: "applications",
      targetId: "application-12345678",
      actorEmail: "member@example.com",
      metadataJson: metadata({
        success: true,
        path: "/applications",
        method: "GET",
        statusCode: 200,
      }),
      createdAt: "2026-06-06T00:00:00.000Z",
    };

    const viewModel = buildAdminAuditLogsViewModel({
      createdFrom: "",
      createdTo: "",
      outcome: "all",
      query: "",
      risk: "high",
      rows: [highRiskRow, failedRow, lowRiskRow],
    });

    expect(viewModel.filteredRows.map((item) => item.row.id)).toEqual([
      "audit-role",
    ]);
    expect(viewModel.summaryCounts).toEqual({
      failed: 1,
      highRisk: 1,
      mediumRisk: 1,
    });
    expect(viewModel.highRiskHref).toBe("/admin/audit-logs?risk=high");
    expect(viewModel.hasActiveFilters).toBe(true);
    expect(viewModel.isHighRiskFilterActive).toBe(true);
    expect(viewModel.listDescription).toBe(
      "高リスクの操作履歴のみを表示しています",
    );
  });
});
