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

export function initialApprovalSteps(
  defaultSteps?: ApprovalStepItem[],
): ApprovalStepItem[] {
  return defaultSteps && defaultSteps.length > 0
    ? defaultSteps
    : defaultApprovalSteps;
}

export function createApprovalStep(index: number): ApprovalStepItem {
  return {
    id: `step-${index}`,
    stepName: `承認ステップ${index}`,
    assigneeUserIds: [],
    canReturn: true,
  };
}

export function createApprovalGroup(index: number): ApprovalGroupItem {
  return {
    id: `approval-group-${index}`,
    name: `承認グループ${index}`,
    assigneeUserIds: [],
  };
}

export function uniqueAssigneeIds(assigneeUserIds: string[]): string[] {
  return Array.from(new Set(assigneeUserIds));
}

export function updateApprovalStep(
  steps: ApprovalStepItem[],
  stepId: string,
  patch: Partial<ApprovalStepItem>,
): ApprovalStepItem[] {
  return steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step));
}

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

export function updateApprovalGroup(
  groups: ApprovalGroupItem[],
  groupId: string,
  patch: Partial<ApprovalGroupItem>,
): ApprovalGroupItem[] {
  return groups.map((group) =>
    group.id === groupId ? { ...group, ...patch } : group,
  );
}

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
