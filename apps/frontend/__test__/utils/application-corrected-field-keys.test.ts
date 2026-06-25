import {
  getApplicationResubmissionMessages,
  getLatestCorrectionCycleFieldKeys,
} from "@/components/applications/detail/application-corrected-field-keys";
import type { AuditLogItem } from "@/lib/schema";

function log(
  actionType: string,
  metadataJson?: Record<string, unknown> | null,
): AuditLogItem {
  return {
    id: `${actionType}-${Math.random()}`,
    actorType: "user",
    actionType,
    targetType: "application",
    metadataJson,
    createdAt: "2026-06-06T00:00:00.000Z",
  };
}

describe("application corrected field keys", () => {
  // テスト内容: 最新の再提出に紐づく差戻し修正 fieldKey を複数保存分まとめて取得することを確認する
  it("collects corrected field keys in the latest correction cycle", () => {
    const keys = getLatestCorrectionCycleFieldKeys([
      log("application.resubmitted"),
      log("application.corrected", { fieldKeys: ["memo"] }),
      log("application.corrected", { fieldKeys: ["amount", "memo"] }),
      log("application.returned"),
      log("application.corrected", { fieldKeys: ["old_field"] }),
    ]);

    expect(keys).toEqual(["memo", "amount"]);
  });

  // テスト内容: まだ再提出前でも、現在の差戻し修正サイクルの fieldKey を取得することを確認する
  it("collects current returned correction keys before resubmission", () => {
    const keys = getLatestCorrectionCycleFieldKeys([
      log("application.corrected", { fieldKeys: ["purpose"] }),
      log("application.returned"),
    ]);

    expect(keys).toEqual(["purpose"]);
  });

  // テスト内容: 最新の差戻しで修正保存がまだ無い場合は、過去サイクルの fieldKey を拾わないことを確認する
  it("does not reuse older correction keys after a newer return", () => {
    const keys = getLatestCorrectionCycleFieldKeys([
      log("application.returned"),
      log("application.resubmitted"),
      log("application.corrected", { fieldKeys: ["old_field"] }),
    ]);

    expect(keys).toEqual([]);
  });

  // テスト内容: metadata が不正な監査ログを無視することを確認する
  it("ignores invalid correction metadata", () => {
    const keys = getLatestCorrectionCycleFieldKeys([
      log("application.resubmitted"),
      log("application.corrected", { fieldKeys: ["amount", 1, null] }),
      log("application.corrected", { fieldKeys: "memo" }),
      log("application.returned"),
    ]);

    expect(keys).toEqual(["amount"]);
  });

  // テスト内容: 再提出時の申請者メッセージを監査ログ metadata から取得することを確認する
  it("collects resubmission messages from metadata", () => {
    const messages = getApplicationResubmissionMessages([
      log("application.resubmitted", { message: " 修正しました " }),
      log("application.resubmitted", { message: "" }),
      log("application.corrected", { message: "ignored" }),
    ]);

    expect(messages).toEqual([
      expect.objectContaining({ message: "修正しました" }),
    ]);
  });
});
