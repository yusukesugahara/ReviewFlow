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

  const [newStepName, setNewStepName] = useState("");
  const [newApproverRole, setNewApproverRole] = useState<ApproverRole>("approver");
  const [newCanReturn, setNewCanReturn] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const serializedStepLines = useMemo(
    () =>
      steps
        .map((s) => `${s.stepName},${s.approverRole},${String(s.canReturn)}`)
        .join("\n"),
    [steps]
  );

  const addStep = () => {
    const trimmed = newStepName.trim();
    if (!trimmed) return;
    setSteps((prev) => [
      ...prev,
      {
        id: createStepId(),
        stepName: trimmed,
        approverRole: newApproverRole,
        canReturn: newCanReturn,
      },
    ]);
    setNewStepName("");
    setNewApproverRole("approver");
    setNewCanReturn(true);
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

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">ステップを追加</p>
        <div className="grid gap-3 md:grid-cols-[1fr_180px_120px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="new-step-name">ステップ名</Label>
            <Input
              id="new-step-name"
              value={newStepName}
              onChange={(e) => setNewStepName(e.target.value)}
              placeholder="例: 部門長承認"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-step-role">ロール</Label>
            <select
              id="new-step-role"
              value={newApproverRole}
              onChange={(e) => setNewApproverRole(e.target.value as ApproverRole)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="approver">approver</option>
              <option value="tenant_admin">tenant_admin</option>
            </select>
          </div>
          <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={newCanReturn}
              onChange={(e) => setNewCanReturn(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            差し戻し可
          </label>
          <Button type="button" onClick={addStep}>
            ステップ追加
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">
          ステップ一覧（ドラッグ&ドロップで並び替え）
        </p>
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">STEP {index + 1}</Badge>
                    <span className="font-medium text-slate-900">{step.stepName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{step.approverRole}</Badge>
                    <Badge variant={step.canReturn ? "default" : "secondary"}>
                      {step.canReturn ? "差し戻し可" : "差し戻し不可"}
                    </Badge>
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

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">送信データプレビュー</p>
        <pre className="whitespace-pre-wrap text-xs text-slate-700">{serializedStepLines || "(空)"}</pre>
      </div>
    </div>
  );
}
