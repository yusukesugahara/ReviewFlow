"use client";

import { useMemo, useState } from "react";
import {
  clearRemovedGroupSelections,
  createApprovalGroup,
  createApprovalStep,
  initialApprovalSteps,
  moveApprovalStep,
  uniqueAssigneeIds,
  updateApprovalGroup,
  updateApprovalStep,
  type ApprovalGroupItem,
} from "./approval-steps-state";
import { ApprovalGroupsSection } from "./approval-groups-section";
import { ApprovalStepsSection } from "./approval-steps-section";
import type { ApprovalAssigneeOption, ApprovalStepItem } from "./approval-steps.types";
export type { ApprovalAssigneeOption, ApprovalStepItem };

type ApprovalStepsBuilderProps = {
  defaultSteps?: ApprovalStepItem[];
  assignees: ApprovalAssigneeOption[];
};

/**
 * 承認ステップを追加・編集するビルダーを表示します。
 */
export function ApprovalStepsBuilder({ defaultSteps, assignees }: ApprovalStepsBuilderProps) {
  const [steps, setSteps] = useState<ApprovalStepItem[]>(
    initialApprovalSteps(defaultSteps),
  );
  const [approvalGroups, setApprovalGroups] = useState<ApprovalGroupItem[]>([]);
  const [selectedGroupIdByStep, setSelectedGroupIdByStep] = useState<Record<string, string>>({});

  const serializedStepLines = useMemo(
    () => JSON.stringify(steps),
    [steps]
  );

  const addStep = () => {
    setSteps((prev) => [...prev, createApprovalStep(prev.length + 1)]);
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const moveStep = (fromIndex: number, toIndex: number) => {
    setSteps((prev) => moveApprovalStep(prev, fromIndex, toIndex));
  };

  const setStepAssignees = (stepId: string, assigneeUserIds: string[]) => {
    setSteps((prev) =>
      updateApprovalStep(prev, stepId, {
        assigneeUserIds: uniqueAssigneeIds(assigneeUserIds),
      }),
    );
  };

  const addApprovalGroup = () => {
    setApprovalGroups((prev) => [...prev, createApprovalGroup(prev.length + 1)]);
  };

  const patchApprovalGroup = (id: string, patch: Partial<ApprovalGroupItem>) => {
    setApprovalGroups((prev) => updateApprovalGroup(prev, id, patch));
  };

  const removeApprovalGroup = (id: string) => {
    setApprovalGroups((prev) => prev.filter((group) => group.id !== id));
    setSelectedGroupIdByStep((prev) => clearRemovedGroupSelections(prev, id));
  };

  const setGroupAssignees = (groupId: string, assigneeUserIds: string[]) => {
    setApprovalGroups((prev) =>
      updateApprovalGroup(prev, groupId, {
        assigneeUserIds: uniqueAssigneeIds(assigneeUserIds),
      }),
    );
  };

  const applyApprovalGroupToStep = (stepId: string, groupId: string) => {
    const group = approvalGroups.find((item) => item.id === groupId);
    setSelectedGroupIdByStep((prev) => ({ ...prev, [stepId]: groupId }));
    if (!group) {
      return;
    }
    setSteps((prev) =>
      updateApprovalStep(prev, stepId, {
        assigneeUserIds: uniqueAssigneeIds(group.assigneeUserIds),
      }),
    );
  };

  return (
    <div className="space-y-4">
      <input type="hidden" name="stepsJson" value={serializedStepLines} />
      <ApprovalGroupsSection
        assignees={assignees}
        groups={approvalGroups}
        onAddGroup={addApprovalGroup}
        onRemoveGroup={removeApprovalGroup}
        onSetGroupAssignees={setGroupAssignees}
        onUpdateGroup={patchApprovalGroup}
      />
      <ApprovalStepsSection
        approvalGroups={approvalGroups}
        assignees={assignees}
        onAddStep={addStep}
        onApplyApprovalGroupToStep={applyApprovalGroupToStep}
        onMoveStep={moveStep}
        onRemoveStep={removeStep}
        onSetStepAssignees={setStepAssignees}
        onUpdateStep={(stepId, patch) =>
          setSteps((prev) => updateApprovalStep(prev, stepId, patch))
        }
        selectedGroupIdByStep={selectedGroupIdByStep}
        steps={steps}
      />
    </div>
  );
}
