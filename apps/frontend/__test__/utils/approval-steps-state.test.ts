import {
  clearRemovedGroupSelections,
  createApprovalGroup,
  createApprovalStep,
  initialApprovalSteps,
  moveApprovalStep,
  uniqueAssigneeIds,
  updateApprovalGroup,
  updateApprovalStep,
} from "@/components/application-setup/approval-flow/approval-steps-state";
import type { ApprovalStepItem } from "@/components/application-setup/approval-flow/approval-steps.types";

const steps: ApprovalStepItem[] = [
  {
    id: "step-1",
    stepName: "一次承認",
    assigneeUserIds: ["user-1"],
    canReturn: true,
  },
  {
    id: "step-2",
    stepName: "最終承認",
    assigneeUserIds: ["user-2"],
    canReturn: false,
  },
];

describe("approval steps state", () => {
  // テスト内容: 初期ステップと新規ステップ/グループの既定値を確認する
  it("creates default steps and groups", () => {
    expect(initialApprovalSteps([])).toHaveLength(2);
    expect(initialApprovalSteps(steps)).toBe(steps);
    expect(createApprovalStep(3)).toMatchObject({
      id: "step-3",
      stepName: "承認ステップ3",
      canReturn: true,
    });
    expect(createApprovalGroup(1)).toEqual({
      id: "approval-group-1",
      name: "承認グループ1",
      assigneeUserIds: [],
    });
  });

  // テスト内容: ステップ移動と範囲外指定の扱いを確認する
  it("moves approval steps by index", () => {
    expect(moveApprovalStep(steps, 0, 1).map((step) => step.id)).toEqual([
      "step-2",
      "step-1",
    ]);
    expect(moveApprovalStep(steps, 0, 4)).toBe(steps);
  });

  // テスト内容: ステップとグループの更新、承認者ID重複排除を確認する
  it("updates steps and groups", () => {
    expect(uniqueAssigneeIds(["user-1", "user-1", "user-2"])).toEqual([
      "user-1",
      "user-2",
    ]);
    expect(updateApprovalStep(steps, "step-1", { stepName: "課長承認" })[0]).toMatchObject({
      stepName: "課長承認",
    });
    expect(
      updateApprovalGroup(
        [{ id: "approval-group-1", name: "承認グループ1", assigneeUserIds: [] }],
        "approval-group-1",
        { name: "経理" },
      )[0],
    ).toMatchObject({ name: "経理" });
  });

  // テスト内容: 削除した承認グループを参照するステップ選択を取り除くことを確認する
  it("clears removed group selections", () => {
    expect(
      clearRemovedGroupSelections(
        {
          "step-1": "approval-group-1",
          "step-2": "approval-group-2",
        },
        "approval-group-1",
      ),
    ).toEqual({ "step-2": "approval-group-2" });
  });
});
