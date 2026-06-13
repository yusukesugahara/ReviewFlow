"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplicationSetupFieldContentModal } from "../dialogs/application-setup-field-content-modal";
import { InlineFormFieldRow } from "./application-setup-inline-field-row";
import { InlineInsertFieldButton } from "./application-setup-inline-insert-button";
import type { DraftField } from "../fields/application-setup-fields";

export function InlineFormBuilder({
  fieldsWithKeys,
  setSelectedFieldId,
  updateField,
  insertFieldAt,
  removeField,
  moveFieldTo,
  initialValues,
}: {
  fieldsWithKeys: { field: DraftField; fieldKey: string }[];
  setSelectedFieldId: (id: string) => void;
  updateField: (id: string, patch: Partial<DraftField>) => void;
  insertFieldAt: (index: number) => void;
  removeField: (id: string) => void;
  moveFieldTo: (id: string, targetIndex: number) => void;
  initialValues?: Record<string, unknown>;
}) {
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null);
  const editingField =
    fieldsWithKeys.find(({ field }) => field.id === editingFieldId)?.field ?? null;

  return (
    <div className="rounded-lg bg-white">
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-3 text-center text-sm font-semibold text-slate-900">
          申請書
        </div>
        <InlineInsertFieldButton index={0} onInsert={insertFieldAt} />
        <div>
          {fieldsWithKeys.map(({ field, fieldKey }, index) => {
            return (
              <div key={field.id}>
                <InlineFormFieldRow
                  dragOverFieldId={dragOverFieldId}
                  draggingFieldId={draggingFieldId}
                  field={field}
                  fieldKey={fieldKey}
                  index={index}
                  initialValue={initialValues?.[fieldKey]}
                  moveFieldTo={moveFieldTo}
                  removeField={removeField}
                  setDragOverFieldId={setDragOverFieldId}
                  setDraggingFieldId={setDraggingFieldId}
                  setEditingFieldId={setEditingFieldId}
                  setSelectedFieldId={setSelectedFieldId}
                />
                <InlineInsertFieldButton index={index + 1} onInsert={insertFieldAt} />
              </div>
            );
          })}
        </div>
        {fieldsWithKeys.length === 0 ? (
          <div className="border-t border-slate-300 px-4 py-10 text-center">
            <Button type="button" variant="outline" onClick={() => insertFieldAt(0)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              フォームを追加
            </Button>
          </div>
        ) : null}
      </div>
      {editingField ? (
        <ApplicationSetupFieldContentModal
          field={editingField}
          open={Boolean(editingField)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingFieldId(null);
            }
          }}
          updateField={updateField}
        />
      ) : null}
    </div>
  );
}
