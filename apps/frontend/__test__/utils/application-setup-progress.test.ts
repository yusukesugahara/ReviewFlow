import { initialApprovalSteps } from "@/components/application-setup/approval-flow/approval-steps-state";
import type { ApprovalStepItem } from "@/components/application-setup/approval-flow/approval-steps.types";
import { createDefaultField } from "@/components/application-setup/fields/application-setup-fields";
import {
  buildSetupProgress,
  setupStatusLabel,
} from "@/components/application-setup/form-builder/application-setup-progress";

describe("application setup progress", () => {
  const defaultFields = [createDefaultField(0)];
  const defaultSteps = initialApprovalSteps();

  // テスト内容: 新規フォームの既定表示だけでは入力済みとして数えないことを確認する
  it("keeps an untouched new setup at zero percent", () => {
    expect(
      buildSetupProgress({
        approvalSteps: defaultSteps,
        fields: defaultFields,
        formName: "",
        isPublished: false,
      }),
    ).toEqual({
      completedCount: 0,
      percent: 0,
      totalCount: 5,
    });
  });

  // テスト内容: フォーム名だけ入力した場合は基本情報だけ進捗に反映する
  it("counts the form name independently from default rows", () => {
    expect(
      buildSetupProgress({
        approvalSteps: defaultSteps,
        fields: defaultFields,
        formName: "経費申請",
        isPublished: false,
      }).percent,
    ).toBe(20);
  });

  // テスト内容: ユーザーが変更した入力項目と承認者を進捗に反映する
  it("counts configured fields and approval assignees", () => {
    const steps: ApprovalStepItem[] = [
      {
        ...defaultSteps[0]!,
        assigneeUserIds: ["user-1"],
      },
      defaultSteps[1]!,
    ];

    expect(
      buildSetupProgress({
        approvalSteps: steps,
        fields: [{ ...createDefaultField(0), label: "金額" }],
        formName: "経費申請",
        isPublished: false,
      }),
    ).toEqual({
      completedCount: 5,
      percent: 100,
      totalCount: 5,
    });
  });

  // テスト内容: 公開済みの場合は進捗を完了扱いにする
  it("treats published setup as complete", () => {
    expect(
      buildSetupProgress({
        approvalSteps: defaultSteps,
        fields: defaultFields,
        formName: "",
        isPublished: true,
      }).percent,
    ).toBe(100);
  });

  // テスト内容: 保存状態ラベルで空白のフォーム名を未保存として扱う
  it("builds setup status labels", () => {
    expect(setupStatusLabel({ initialName: " ", publishedFormDefinitionId: null })).toBe(
      "未保存",
    );
    expect(setupStatusLabel({ initialName: "経費申請", publishedFormDefinitionId: null })).toBe(
      "下書き",
    );
    expect(setupStatusLabel({ initialName: "", publishedFormDefinitionId: "form-1" })).toBe(
      "公開済み",
    );
  });
});
