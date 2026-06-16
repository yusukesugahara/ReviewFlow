"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AssigneeSearchPicker } from "./approval-assignee-search-picker";
import type { ApprovalAssigneeOption } from "./approval-steps.types";
import type { ApprovalGroupItem } from "./approval-steps-state";

type ApprovalGroupsSectionProps = {
  assignees: ApprovalAssigneeOption[];
  groups: ApprovalGroupItem[];
  onAddGroup: () => void;
  onRemoveGroup: (id: string) => void;
  onSetGroupAssignees: (groupId: string, assigneeUserIds: string[]) => void;
  onUpdateGroup: (id: string, patch: Partial<ApprovalGroupItem>) => void;
};

/**
 * 承認グループ編集セクションを表示します。
 */
export function ApprovalGroupsSection({
  assignees,
  groups,
  onAddGroup,
  onRemoveGroup,
  onSetGroupAssignees,
  onUpdateGroup,
}: ApprovalGroupsSectionProps) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">承認グループ</p>
          <p className="text-xs text-slate-500">
            よく使う承認者の組み合わせを作成し、各ステップに適用できます。
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onAddGroup}>
          グループ追加
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
          承認グループはまだありません。
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <div
              key={group.id}
              className="space-y-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor={`${group.id}-name`}>グループ名</Label>
                  <Input
                    id={`${group.id}-name`}
                    value={group.name}
                    onChange={(event) =>
                      onUpdateGroup(group.id, { name: event.target.value })
                    }
                    className="bg-white"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="mt-7"
                  onClick={() => onRemoveGroup(group.id)}
                >
                  ×
                </Button>
              </div>
              <div className="space-y-2">
                <Label>メンバー</Label>
                <AssigneeSearchPicker
                  assignees={assignees}
                  selectedIds={group.assigneeUserIds}
                  onChange={(ids) => onSetGroupAssignees(group.id, ids)}
                  placeholder="承認者を検索"
                />
                {group.assigneeUserIds.length === 0 ? (
                  <p className="text-xs text-destructive">
                    メンバーを1人以上選択してください。
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
