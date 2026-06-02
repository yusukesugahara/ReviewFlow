"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type ApprovalGroupItem = {
  id: string;
  name: string;
  assigneeUserIds: string[];
};

type ApprovalStepsBuilderProps = {
  defaultSteps?: ApprovalStepItem[];
  assignees: ApprovalAssigneeOption[];
};

function AssigneeSearchPicker({
  assignees,
  selectedIds,
  onChange,
  placeholder,
}: {
  assignees: ApprovalAssigneeOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const selectedSet = new Set(selectedIds);
  const selectedAssignees = selectedIds
    .map((id) => assignees.find((assignee) => assignee.id === id))
    .filter((assignee): assignee is ApprovalAssigneeOption => Boolean(assignee));
  const filteredAssignees =
    normalizedQuery.length === 0
      ? []
      : assignees
          .filter((assignee) => !selectedSet.has(assignee.id))
          .filter((assignee) => assignee.label.toLowerCase().includes(normalizedQuery))
          .slice(0, 8);

  const addAssignee = (id: string) => {
    onChange(Array.from(new Set([...selectedIds, id])));
    setQuery("");
  };

  const removeAssignee = (id: string) => {
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  };

  return (
    <div className="space-y-2">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="bg-white"
      />
      {selectedAssignees.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedAssignees.map((assignee) => (
            <span
              key={assignee.id}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
            >
              {assignee.label}
              <button
                type="button"
                className="font-semibold text-slate-500 hover:text-red-600"
                onClick={() => removeAssignee(assignee.id)}
                aria-label={`${assignee.label}を外す`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">未選択</p>
      )}
      {normalizedQuery.length > 0 ? (
        <div className="max-h-44 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
          {filteredAssignees.length > 0 ? (
            filteredAssignees.map((assignee) => (
              <button
                key={assignee.id}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => addAssignee(assignee.id)}
              >
                {assignee.label}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-slate-500">一致する承認者がいません。</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function ApprovalStepsBuilder({ defaultSteps, assignees }: ApprovalStepsBuilderProps) {
  const [steps, setSteps] = useState<ApprovalStepItem[]>(
    defaultSteps && defaultSteps.length > 0
      ? defaultSteps
      : [
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
        ]
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [approvalGroups, setApprovalGroups] = useState<ApprovalGroupItem[]>([]);
  const [selectedGroupIdByStep, setSelectedGroupIdByStep] = useState<Record<string, string>>({});

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
        assigneeUserIds: [],
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

  const setStepAssignees = (stepId: string, assigneeUserIds: string[]) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? { ...step, assigneeUserIds: Array.from(new Set(assigneeUserIds)) }
          : step,
      ),
    );
  };

  const addApprovalGroup = () => {
    const nextIndex = approvalGroups.length + 1;
    setApprovalGroups((prev) => [
      ...prev,
      {
        id: `approval-group-${nextIndex}`,
        name: `承認グループ${nextIndex}`,
        assigneeUserIds: [],
      },
    ]);
  };

  const updateApprovalGroup = (id: string, patch: Partial<ApprovalGroupItem>) => {
    setApprovalGroups((prev) =>
      prev.map((group) => (group.id === id ? { ...group, ...patch } : group)),
    );
  };

  const removeApprovalGroup = (id: string) => {
    setApprovalGroups((prev) => prev.filter((group) => group.id !== id));
    setSelectedGroupIdByStep((prev) => {
      const next = { ...prev };
      for (const [stepId, groupId] of Object.entries(next)) {
        if (groupId === id) {
          delete next[stepId];
        }
      }
      return next;
    });
  };

  const setGroupAssignees = (groupId: string, assigneeUserIds: string[]) => {
    setApprovalGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? { ...group, assigneeUserIds: Array.from(new Set(assigneeUserIds)) }
          : group,
      ),
    );
  };

  const applyApprovalGroupToStep = (stepId: string, groupId: string) => {
    const group = approvalGroups.find((item) => item.id === groupId);
    setSelectedGroupIdByStep((prev) => ({ ...prev, [stepId]: groupId }));
    if (!group) {
      return;
    }
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? { ...step, assigneeUserIds: Array.from(new Set(group.assigneeUserIds)) }
          : step,
      ),
    );
  };

  return (
    <div className="space-y-4">
      <input type="hidden" name="stepsJson" value={serializedStepLines} />

      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">承認グループ</p>
            <p className="text-xs text-slate-500">よく使う承認者の組み合わせを作成し、各ステップに適用できます。</p>
          </div>
          <Button type="button" variant="outline" onClick={addApprovalGroup}>
            グループ追加
          </Button>
        </div>

        {approvalGroups.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
            承認グループはまだありません。
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {approvalGroups.map((group) => (
              <div key={group.id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Label htmlFor={`${group.id}-name`}>グループ名</Label>
                    <Input
                      id={`${group.id}-name`}
                      value={group.name}
                      onChange={(event) => updateApprovalGroup(group.id, { name: event.target.value })}
                      className="bg-white"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mt-7"
                    onClick={() => removeApprovalGroup(group.id)}
                  >
                    ×
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>メンバー</Label>
                  <AssigneeSearchPicker
                    assignees={assignees}
                    selectedIds={group.assigneeUserIds}
                    onChange={(ids) => setGroupAssignees(group.id, ids)}
                    placeholder="承認者を検索"
                  />
                  {group.assigneeUserIds.length === 0 ? (
                    <p className="text-xs text-destructive">メンバーを1人以上選択してください。</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                    {approvalGroups.length > 0 ? (
                      <Select
                        value={selectedGroupIdByStep[step.id] ?? "none"}
                        onValueChange={(value) =>
                          applyApprovalGroupToStep(step.id, value === "none" ? "" : value)
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
                      onChange={(ids) => setStepAssignees(step.id, ids)}
                      placeholder="承認者を検索"
                    />
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
