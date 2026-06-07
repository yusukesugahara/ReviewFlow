import {
  APPLICATION_SETUP_ERROR_MESSAGES,
  APPLICATION_SETUP_ERRORS,
  APPLICATION_SETUP_STATUS_MESSAGES,
  APPLICATION_SETUP_STATUSES,
} from "@/lib/constants/application-setup";

describe("application setup constants", () => {
  // テスト内容: 各セットアップエラーがユーザ向けメッセージへ対応することを確認する
  it("maps every setup error to a user-facing message", () => {
    for (const error of Object.values(APPLICATION_SETUP_ERRORS)) {
      expect(APPLICATION_SETUP_ERROR_MESSAGES[error]).toEqual(expect.any(String));
      expect(APPLICATION_SETUP_ERROR_MESSAGES[error].length).toBeGreaterThan(0);
    }
  });

  // テスト内容: セットアップ状態がユーザ向けメッセージへ対応することを確認する
  it("maps setup statuses to user-facing messages", () => {
    expect(APPLICATION_SETUP_STATUS_MESSAGES[APPLICATION_SETUP_STATUSES.draftSaved]).toBe(
      "下書きを保存しました。",
    );
    expect(APPLICATION_SETUP_STATUS_MESSAGES[APPLICATION_SETUP_STATUSES.published]).toBe(
      "申請を公開しました。",
    );
  });
});
