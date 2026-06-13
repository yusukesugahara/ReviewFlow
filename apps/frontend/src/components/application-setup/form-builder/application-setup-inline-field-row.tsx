"use client";

import { Menu, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DynamicFieldInput } from "@/components/applications/dynamic-fields/dynamic-fields";
import {
  toDynamicField,
  type DraftField,
} from "../fields/application-setup-fields";

type InlineFormFieldRowProps = {
  dragOverFieldId: string | null;
  draggingFieldId: string | null;
  field: DraftField;
  fieldKey: string;
  index: number;
  initialValue?: unknown;
  moveFieldTo: (id: string, targetIndex: number) => void;
  removeField: (id: string) => void;
  setDragOverFieldId: (id: string | null) => void;
  setDraggingFieldId: (id: string | null) => void;
  setEditingFieldId: (id: string) => void;
  setSelectedFieldId: (id: string) => void;
};

export function InlineFormFieldRow({
  dragOverFieldId,
  draggingFieldId,
  field,
  fieldKey,
  index,
  initialValue,
  moveFieldTo,
  removeField,
  setDragOverFieldId,
  setDraggingFieldId,
  setEditingFieldId,
  setSelectedFieldId,
}: InlineFormFieldRowProps) {
  const dynamicField = toDynamicField(field, index, fieldKey);
  const isDragging = draggingFieldId === field.id;
  const isDragOver = dragOverFieldId === field.id && draggingFieldId !== field.id;

  return (
    <div
      className={`group relative grid min-h-16 grid-cols-1 divide-y divide-slate-200 border-t border-slate-200 md:grid-cols-[220px_minmax(0,1fr)] md:divide-x md:divide-y-0 ${
        isDragging ? "opacity-50" : ""
      } ${isDragOver ? "ring-2 ring-blue-400 ring-inset" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (draggingFieldId && draggingFieldId !== field.id) {
          event.dataTransfer.dropEffect = "move";
          setDragOverFieldId(field.id);
        }
      }}
      onDragLeave={() => {
        if (isDragOver) {
          setDragOverFieldId(null);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        const draggedId = event.dataTransfer.getData("text/plain") || draggingFieldId;
        setDraggingFieldId(null);
        setDragOverFieldId(null);
        if (!draggedId || draggedId === field.id) {
          return;
        }
        setSelectedFieldId(draggedId);
        moveFieldTo(draggedId, index);
      }}
      onFocus={() => setSelectedFieldId(field.id)}
      onMouseEnter={() => setSelectedFieldId(field.id)}
    >
      <div className="flex items-start gap-2 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-800">
        <span className="mt-0.5 min-w-5 text-xs text-slate-500">{index + 1}</span>
        <span className="break-words">
          {dynamicField.label}
          {dynamicField.required ? <span className="ml-1 text-destructive">*</span> : null}
        </span>
      </div>
      <div className="min-w-0 bg-white px-4 py-4 pr-14">
        <DynamicFieldInput
          field={dynamicField}
          value={initialValue}
          variant="table"
        />
      </div>
      <div className="absolute right-12 top-2 flex gap-1 opacity-100 md:opacity-0 md:transition group-hover:opacity-100 group-focus-within:opacity-100">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 bg-white p-0"
          aria-label={`${dynamicField.label}を編集`}
          onClick={() => {
            setSelectedFieldId(field.id);
            setEditingFieldId(field.id);
          }}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="bg-white text-red-600"
          aria-label={`${dynamicField.label}を削除`}
          onClick={() => removeField(field.id)}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-grab bg-white/90 text-slate-500 active:cursor-grabbing"
        aria-label={`${dynamicField.label}をドラッグして並び替え`}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", field.id);
          setSelectedFieldId(field.id);
          setDraggingFieldId(field.id);
        }}
        onDragEnd={() => {
          setDraggingFieldId(null);
          setDragOverFieldId(null);
        }}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  );
}
