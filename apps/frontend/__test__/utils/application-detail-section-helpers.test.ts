import {
  descriptionForFields,
  formatApplicationDateTime,
  getCurrentStep,
} from "@/components/applications/application-detail-section-helpers";
import type { ApplicationDetailViewModel } from "@/components/applications/application-detail.types";

describe("application detail section helpers", () => {
  // テスト内容: 申請項目セクションの説明文を件数込みで組み立てることを確認する
  it("builds field section descriptions", () => {
    expect(descriptionForFields("入力内容", 3)).toBe(
      "入力内容。3項目の入力内容を確認できます。",
    );
  });

  // テスト内容: 現在の承認ステップを approvalProgress から取得することを確認する
  it("finds the current approval step", () => {
    const application: ApplicationDetailViewModel = {
      id: "app-1",
      status: "in_review",
      values: {},
      approvalProgress: [
        {
          id: "step-1",
          stepOrder: 1,
          stepName: "一次承認",
          canReturn: true,
          status: "approved",
          assignees: [],
          actions: [],
        },
        {
          id: "step-2",
          stepOrder: 2,
          stepName: "最終承認",
          canReturn: true,
          status: "current",
          assignees: [],
          actions: [],
        },
      ],
    };

    expect(getCurrentStep(application)?.stepName).toBe("最終承認");
  });

  // テスト内容: 申請詳細用の日付表示が未設定値をプレースホルダーにすることを確認する
  it("formats application dates with placeholders", () => {
    expect(formatApplicationDateTime("2026-06-06T00:00:00.000Z")).toBe(
      "2026/6/6 09:00",
    );
    expect(formatApplicationDateTime(null)).toBe("-");
  });
});
