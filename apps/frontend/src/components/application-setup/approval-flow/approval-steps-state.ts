import type { ApprovalStepItem } from "./approval-steps.types";

export type ApprovalGroupItem = {
  id: string;
  name: string;
  assigneeUserIds: string[];
};

const defaultApprovalSteps: ApprovalStepItem[] = [
  {
    id: "step-1",
    stepName: "一次承認",
    assigneeUserIds: [],
    canReturn: true,
  },
  {
    id: "step-2",
    stepName: "最終承認",
    assigneeUserIds: [],
    canReturn: false,
  },
];

/**
 * 初期表示用の承認ステップ配列を作成します。
 */
export function initialApprovalSteps(
  defaultSteps?: ApprovalStepItem[],
): ApprovalStepItem[] {
  return defaultSteps && defaultSteps.length > 0
    ? defaultSteps
    : defaultApprovalSteps;
}

/**
 * 指定位置の新しい承認ステップを作成します。
 */
export function createApprovalStep(index: number): ApprovalStepItem {
  return {
    id: `step-${index}`,
    stepName: `承認ステップ${index}`,
    assigneeUserIds: [],
    canReturn: true,
  };
}

/**
 * 指定位置の新しい承認グループを作成します。
 */
export function createApprovalGroup(index: number): ApprovalGroupItem {
  return {
    id: `approval-group-${index}`,
    name: `承認グループ${index}`,
    assigneeUserIds: [],
  };
}

/**
 * 承認担当者 ID 配列から重複を取り除きます。
 */
export function uniqueAssigneeIds(assigneeUserIds: string[]): string[] {
  return Array.from(new Set(assigneeUserIds));
}

/**
 * 指定した承認ステップを部分更新します。
 */
export function updateApprovalStep(
  steps: ApprovalStepItem[],
  stepId: string,
  patch: Partial<ApprovalStepItem>,
): ApprovalStepItem[] {
  return steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step));
}

/**
 * 承認ステップを指定方向へ移動します。
 */
export function moveApprovalStep(
  steps: ApprovalStepItem[],
  fromIndex: number,
  toIndex: number,
): ApprovalStepItem[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    fromIndex >= steps.length ||
    toIndex < 0 ||
    toIndex >= steps.length
  ) {
    return steps;
  }

  const next = [...steps];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) {
    return steps;
  }
  next.splice(toIndex, 0, moved);
  return next;
}

/**
 * 承認グループの担当者選択を更新します。
 */
export function updateApprovalGroup(
  groups: ApprovalGroupItem[],
  groupId: string,
  patch: Partial<ApprovalGroupItem>,
): ApprovalGroupItem[] {
  return groups.map((group) =>
    group.id === groupId ? { ...group, ...patch } : group,
  );
}

/**
 * 削除された承認グループの選択状態をクリアします。
 */
export function clearRemovedGroupSelections(
  selectedGroupIdByStep: Record<string, string>,
  removedGroupId: string,
): Record<string, string> {
  const next = { ...selectedGroupIdByStep };
  for (const [stepId, groupId] of Object.entries(next)) {
    if (groupId === removedGroupId) {
      delete next[stepId];
    }
  }
  return next;
}
