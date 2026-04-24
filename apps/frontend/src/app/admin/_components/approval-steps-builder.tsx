"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type ApproverRole = "approver" | "tenant_admin";

type StepItem = {
  id: string;
  stepName: string;
  approverRole: ApproverRole;
  canReturn: boolean;
};

type ApprovalStepsBuilderProps = {
  defaultSteps?: StepItem[];
};

function createStepId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ApprovalStepsBuilder({ defaultSteps }: ApprovalStepsBuilderProps) {
  const [steps, setSteps] = useState<StepItem[]>(
    defaultSteps && defaultSteps.length > 0
      ? defaultSteps
      : [
          {
            id: createStepId(),
            stepName: "一次承認",
            approverRole: "approver",
            canReturn: true,
          },
          {
            id: createStepId(),
            stepName: "最終承認",
            approverRole: "tenant_admin",
            canReturn: false,
          },
        ]
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const serializedStepLines = useMemo(
    () =>
      steps
        .map((s) => `${s.stepName},${s.approverRole},${String(s.canReturn)}`)
        .join("\n"),
    [steps]
  );

  const addStep = () => {
    const nextIndex = steps.length + 1;
    setSteps((prev) => [
      ...prev,
      {
        id: createStepId(),
        stepName: `承認ステップ${nextIndex}`,
        approverRole: "approver",
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

  return (
    <div className="space-y-4">
      <input type="hidden" name="stepLines" value={serializedStepLines} />

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
                <div className="grid gap-3 md:grid-cols-[120px_1fr_180px_120px] md:items-end">
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
                    <Label>ロール</Label>
                    <select
                      value={step.approverRole}
                      onChange={(e) =>
                        setSteps((prev) =>
                          prev.map((s) =>
                            s.id === step.id ? { ...s, approverRole: e.target.value as ApproverRole } : s
                          )
                        )
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                    >
                      <option value="approver">approver</option>
                      <option value="tenant_admin">tenant_admin</option>
                    </select>
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => moveStep(index, index - 1)}
                    disabled={index === 0}
                  >
                    上へ
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => moveStep(index, index + 1)}
                    disabled={index === steps.length - 1}
                  >
                    下へ
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => removeStep(step.id)}>
                    削除
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
