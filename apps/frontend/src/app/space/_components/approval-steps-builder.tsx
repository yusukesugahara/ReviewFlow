"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { OrderMoveButtons } from "./order-move-buttons";

export type ApprovalStepItem = {
  id: string;
  stepName: string;
  assigneeUserIds: string[];
  canReturn: boolean;
};

export type ApprovalAssigneeOption = {
  id: string;
  label: string;
};

type ApprovalStepsBuilderProps = {
  defaultSteps?: ApprovalStepItem[];
  assignees: ApprovalAssigneeOption[];
};

export function ApprovalStepsBuilder({ defaultSteps, assignees }: ApprovalStepsBuilderProps) {
  const defaultAssigneeId = assignees[0]?.id ?? "";
  const [steps, setSteps] = useState<ApprovalStepItem[]>(
    defaultSteps && defaultSteps.length > 0
      ? defaultSteps
      : [
          {
            id: "step-1",
            stepName: "一次承認",
            assigneeUserIds: defaultAssigneeId ? [defaultAssigneeId] : [],
            canReturn: true,
          },
          {
            id: "step-2",
            stepName: "最終承認",
            assigneeUserIds: defaultAssigneeId ? [defaultAssigneeId] : [],
            canReturn: false,
          },
        ]
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const serializedStepLines = useMemo(
    () => JSON.stringify(steps),
    [steps]
  );

  const addStep = () => {
    const nextIndex = steps.length + 1;
    setSteps((prev) => [
      ...prev,
      {
        id: `step-${nextIndex}`,
        stepName: `承認ステップ${nextIndex}`,
        assigneeUserIds: defaultAssigneeId ? [defaultAssigneeId] : [],
        canReturn: true,
      },
    ]);
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const moveStep = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= steps.length) return;
    setSteps((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return prev;
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const onDropTo = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const fromIndex = steps.findIndex((s) => s.id === draggingId);
    const toIndex = steps.findIndex((s) => s.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    moveStep(fromIndex, toIndex);
    setDraggingId(null);
  };

  const toggleAssignee = (stepId: string, assigneeId: string, checked: boolean) => {
    setSteps((prev) =>
      prev.map((step) => {
        if (step.id !== stepId) {
          return step;
        }
        const nextIds = checked
          ? [...step.assigneeUserIds, assigneeId]
          : step.assigneeUserIds.filter((id) => id !== assigneeId);
        return { ...step, assigneeUserIds: Array.from(new Set(nextIds)) };
      })
    );
  };

  return (
    <div className="space-y-4">
      <input type="hidden" name="stepsJson" value={serializedStepLines} />

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
                onDragOver={(e) => e.preventDefault()}
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
                      onChange={(e) =>
                        setSteps((prev) =>
                          prev.map((s) => (s.id === step.id ? { ...s, stepName: e.target.value } : s))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>承認者</Label>
                    <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-input bg-background p-3">
                      {assignees.map((assignee) => (
                        <label key={assignee.id} className="flex items-start gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={step.assigneeUserIds.includes(assignee.id)}
                            onChange={(event) =>
                              toggleAssignee(step.id, assignee.id, event.target.checked)
                            }
                            className="mt-0.5 h-4 w-4 rounded border-gray-300"
                          />
                          <span>{assignee.label}</span>
                        </label>
                      ))}
                    </div>
                    {step.assigneeUserIds.length === 0 ? (
                      <p className="text-xs text-destructive">承認者を1人以上選択してください。</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label>差し戻し</Label>
                    <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={step.canReturn}
                        onChange={(e) =>
                          setSteps((prev) =>
                            prev.map((s) => (s.id === step.id ? { ...s, canReturn: e.target.checked } : s))
                          )
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
                    onMoveUp={() => moveStep(index, index - 1)}
                    onMoveDown={() => moveStep(index, index + 1)}
                  />
                  <Button type="button" variant="destructive" size="sm" onClick={() => removeStep(step.id)}>
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={addStep}>
          ステップ追加
        </Button>
      </div>
    </div>
  );
}
