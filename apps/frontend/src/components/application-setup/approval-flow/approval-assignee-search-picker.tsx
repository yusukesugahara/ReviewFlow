"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import type { ApprovalAssigneeOption } from "./approval-steps.types";

type AssigneeSearchPickerProps = {
  assignees: ApprovalAssigneeOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
};

/**
 * 承認担当者を検索して選択する UI を表示します。
 */
export function AssigneeSearchPicker({
  assignees,
  selectedIds,
  onChange,
  placeholder,
}: AssigneeSearchPickerProps) {
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
