"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssigneeSearchPicker } from "./approval-assignee-search-picker";
import type { ApprovalAssigneeOption, ApprovalStepItem } from "./approval-steps.types";
import type { ApprovalGroupItem } from "./approval-steps-state";
import { OrderMoveButtons } from "../fields/order-move-buttons";

type ApprovalStepsSectionProps = {
  approvalGroups: ApprovalGroupItem[];
  assignees: ApprovalAssigneeOption[];
  onAddStep: () => void;
  onApplyApprovalGroupToStep: (stepId: string, groupId: string) => void;
  onMoveStep: (fromIndex: number, toIndex: number) => void;
  onRemoveStep: (id: string) => void;
  onSetStepAssignees: (stepId: string, assigneeUserIds: string[]) => void;
  onUpdateStep: (id: string, patch: Partial<ApprovalStepItem>) => void;
  selectedGroupIdByStep: Record<string, string>;
  steps: ApprovalStepItem[];
};

export function ApprovalStepsSection({
  approvalGroups,
  assignees,
  onAddStep,
  onApplyApprovalGroupToStep,
  onMoveStep,
  onRemoveStep,
  onSetStepAssignees,
  onUpdateStep,
  selectedGroupIdByStep,
  steps,
}: ApprovalStepsSectionProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const onDropTo = (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      return;
    }
    const fromIndex = steps.findIndex((step) => step.id === draggingId);
    const toIndex = steps.findIndex((step) => step.id === targetId);
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }
    onMoveStep(fromIndex, toIndex);
    setDraggingId(null);
  };

  return (
    <>
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">ステップ一覧</p>
        {steps.length === 0 ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            ステップがありません。最低1つ以上追加してください。
          </p>
        ) : (
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                draggable
                onDragStart={() => setDraggingId(step.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onDropTo(step.id)}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="grid gap-3 md:grid-cols-[120px_1fr_minmax(240px,1.2fr)_120px] md:items-start">
                  <div className="space-y-2">
                    <Label>順序</Label>
                    <div className="flex h-9 items-center gap-2">
                      <Badge variant="secondary">STEP {index + 1}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>ステップ名</Label>
                    <Input
                      value={step.stepName}
                      onChange={(event) =>
                        onUpdateStep(step.id, { stepName: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>承認者</Label>
                    {approvalGroups.length > 0 ? (
                      <Select
                        value={selectedGroupIdByStep[step.id] ?? "none"}
                        onValueChange={(value) =>
                          onApplyApprovalGroupToStep(
                            step.id,
                            value === "none" ? "" : value,
                          )
                        }
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="承認グループを選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">承認グループを選択</SelectItem>
                          {approvalGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name || "名称未設定のグループ"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    <AssigneeSearchPicker
                      assignees={assignees}
                      selectedIds={step.assigneeUserIds}
                      onChange={(ids) => onSetStepAssignees(step.id, ids)}
                      placeholder="承認者を検索"
                    />
                    {step.assigneeUserIds.length === 0 ? (
                      <p className="text-xs text-destructive">
                        承認者を1人以上選択してください。
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label>差し戻し</Label>
                    <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={step.canReturn}
                        onChange={(event) =>
                          onUpdateStep(step.id, { canReturn: event.target.checked })
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      有効
                    </label>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <OrderMoveButtons
                    canMoveUp={index !== 0}
                    canMoveDown={index !== steps.length - 1}
                    onMoveUp={() => onMoveStep(index, index - 1)}
                    onMoveDown={() => onMoveStep(index, index + 1)}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => onRemoveStep(step.id)}
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={onAddStep}>
          ステップ追加
        </Button>
      </div>
    </>
  );
}
