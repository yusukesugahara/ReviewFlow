import {
  enrichAuditRow,
  shortId,
  textValue,
} from "@/app/(authorized)/admin/audit-logs/audit-log-helpers";
import type { AuditLogItem } from "@/lib/schema";

function metadata(value: Record<string, unknown>): Record<string, never> {
  return value as unknown as Record<string, never>;
}

describe("audit log helpers", () => {
  // テスト内容: 監査ログ行から高リスク理由が組み立てられることを確認する
  it("enriches high-risk failed audit rows", () => {
    const row: AuditLogItem = {
      id: "audit-1",
      actionType: "DELETE:/users/:id",
      targetType: "users",
      targetId: "target-1",
      metadataJson: metadata({
        success: false,
        errorCode: "FORBIDDEN",
        statusCode: 403,
        durationMs: 3000,
      }),
      createdAt: "2026-06-06T00:00:00.000Z",
    };

    expect(enrichAuditRow(row)).toMatchObject({
      risk: "high",
      reasons: [
        "失敗: FORBIDDEN",
        "認証・ユーザ管理",
        "変更・削除操作",
        "HTTP 403",
        "処理時間が長い",
      ],
    });
  });

  // テスト内容: 通常操作の監査ログに低リスクと通常操作理由が付くことを確認する
  it("enriches normal audit rows as low risk", () => {
    expect(
      enrichAuditRow({
        id: "audit-2",
        actionType: "GET:/applications",
        targetType: "applications",
        metadataJson: metadata({ success: true, statusCode: 200 }),
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
});
