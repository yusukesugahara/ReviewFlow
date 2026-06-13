import {
  actionLabel,
  displayUser,
  getFieldCorrectionItems,
  mapCorrectionsToReturnedActions,
  progressStatusMeta,
} from "@/components/applications/approval-progress/approval-progress.helpers";
import type {
  ApplicationCorrection,
  ApplicationProgressStep,
} from "@/components/applications/detail/application-detail.types";

const reviewer = {
  id: "user-1",
  email: "reviewer@example.com",
  name: "承認 太郎",
};

function createStep(
  overrides: Partial<ApplicationProgressStep>,
): ApplicationProgressStep {
  return {
    id: "step-1",
    stepOrder: 1,
    stepName: "一次承認",
    canReturn: true,
    status: "pending",
    assignees: [reviewer],
    actions: [],
    ...overrides,
  };
}

describe("approval progress helpers", () => {
  // テスト内容: ステータスと操作名が表示用ラベルへ変換されることを確認する
  it("returns display metadata and action labels", () => {
    expect(progressStatusMeta("current")).toMatchObject({ label: "現在" });
    expect(progressStatusMeta("rejected")).toMatchObject({ label: "却下" });
    expect(actionLabel("approved")).toBe("承認");
    expect(actionLabel("unknown")).toBe("unknown");
  });

  // テスト内容: ユーザー表示名は名前優先、未設定時はメールアドレスになることを確認する
  it("displays users by name or email", () => {
    expect(displayUser(reviewer)).toBe("承認 太郎");
    expect(displayUser({ ...reviewer, name: " " })).toBe("reviewer@example.com");
  });

  // テスト内容: 差し戻し action と correction を時系列で対応付けることを確認する
  it("maps corrections to returned actions in chronological order", () => {
    const steps = [
      createStep({
        id: "step-2",
        stepOrder: 2,
        actions: [
          {
            id: "action-2",
            action: "returned",
            actedAt: "2026-06-08T00:00:00.000Z",
            actedBy: reviewer,
            comment: null,
          },
        ],
      }),
      createStep({
        id: "step-1",
        stepOrder: 1,
        actions: [
          {
            id: "action-1",
            action: "returned",
            actedAt: "2026-06-07T00:00:00.000Z",
            actedBy: reviewer,
            comment: null,
          },
        ],
      }),
    ];
    const corrections: ApplicationCorrection[] = [
      {
        id: "correction-2",
        status: "open",
        overallComment: null,
        createdAt: "2026-06-08T00:01:00.000Z",
        items: [],
      },
      {
        id: "correction-1",
        status: "resolved",
        overallComment: null,
        createdAt: "2026-06-07T00:01:00.000Z",
        items: [],
      },
    ];

    const mapped = mapCorrectionsToReturnedActions(steps, corrections);

    expect(mapped.get("action-1")?.id).toBe("correction-1");
    expect(mapped.get("action-2")?.id).toBe("correction-2");
  });

  // テスト内容: field id と field key のどちらでも補正対象項目を検出できることを確認する
  it("finds correction items by field id or field key", () => {
    const corrections: ApplicationCorrection[] = [
      {
        id: "correction-1",
        status: "open",
        overallComment: null,
        createdAt: "2026-06-07T00:01:00.000Z",
        items: [
          { formFieldId: "field-1", fieldKey: "legacy_key", comment: null },
          { fieldKey: "purpose", comment: "目的を確認してください" },
        ],
      },
    ];

    expect(
      getFieldCorrectionItems(corrections, {
        id: "field-1",
        fieldKey: "purpose",
      }),
    ).toHaveLength(2);
  });
});
