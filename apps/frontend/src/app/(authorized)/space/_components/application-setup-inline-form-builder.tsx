"use client";

import { useState } from "react";
import { Menu, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FIELD_TYPE_OPTIONS,
  fieldTypeNeedsOptions,
  fieldTypeStoresValue,
  fieldTypeSupportsPlaceholder,
  type FieldType,
} from "@/lib/constants/form-fields";
import { DynamicFieldInput } from "@/app/_components/applications/dynamic-fields";
import {
  toDynamicField,
  type DraftField,
} from "./application-setup-fields";

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
        <InsertFieldButton index={0} onInsert={insertFieldAt} />
        <div>
          {fieldsWithKeys.map(({ field, fieldKey }, index) => {
            const dynamicField = toDynamicField(field, index, fieldKey);
            const isDragging = draggingFieldId === field.id;
            const isDragOver = dragOverFieldId === field.id && draggingFieldId !== field.id;
            return (
              <div key={field.id}>
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
                    setDragOverFieldId((current) => (current === field.id ? null : current));
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const draggedId =
                      event.dataTransfer.getData("text/plain") || draggingFieldId;
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
                      value={initialValues?.[fieldKey]}
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
                <InsertFieldButton index={index + 1} onInsert={insertFieldAt} />
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
        <FieldContentModal
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

function InsertFieldButton({
  index,
  onInsert,
}: {
  index: number;
  onInsert: (index: number) => void;
}) {
  return (
    <div className="group relative h-4 bg-white">
      <div className="absolute inset-x-0 top-1/2 border-t border-transparent group-hover:border-slate-300" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-7 rounded-full bg-white p-0 shadow-sm"
          aria-label="フォームを追加"
          onClick={() => onInsert(index)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function FieldContentModal({
  field,
  open,
  onOpenChange,
  updateField,
}: {
  field: DraftField;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateField: (id: string, patch: Partial<DraftField>) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <DialogContent
      titleId="field-content-modal-title"
      onClose={() => onOpenChange(false)}
      className="max-h-[90vh] max-w-2xl overflow-y-auto"
    >
      <DialogHeader>
        <DialogTitle id="field-content-modal-title">
          フォーム項目を編集
        </DialogTitle>
        <DialogDescription>
          選択中の項目に表示する内容をまとめて入力します。
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`modal-label-${field.id}`}>項目名</Label>
            <Input
              id={`modal-label-${field.id}`}
              value={field.label}
              onChange={(event) => updateField(field.id, { label: event.target.value })}
              placeholder="例: 申請理由"
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`modal-type-${field.id}`}>入力形式</Label>
            <Select
              value={field.fieldType}
              onValueChange={(value) => {
                const nextFieldType = value as FieldType;
                updateField(field.id, {
                  fieldType: nextFieldType,
                  required: fieldTypeStoresValue(nextFieldType) ? field.required : false,
                });
              }}
            >
              <SelectTrigger id={`modal-type-${field.id}`} className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPE_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {fieldTypeStoresValue(field.fieldType) ? (
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(event) => updateField(field.id, { required: event.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            必須項目
          </label>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor={`modal-help-${field.id}`}>説明文</Label>
          <Textarea
            id={`modal-help-${field.id}`}
            value={field.helpText}
            onChange={(event) => updateField(field.id, { helpText: event.target.value })}
            rows={3}
            placeholder="例: 申請理由を具体的に記入してください"
            className="bg-white"
          />
        </div>

        {fieldTypeSupportsPlaceholder(field.fieldType) ? (
          <div className="space-y-2">
            <Label htmlFor={`modal-placeholder-${field.id}`}>入力例</Label>
            <Input
              id={`modal-placeholder-${field.id}`}
              value={field.placeholder}
              onChange={(event) => updateField(field.id, { placeholder: event.target.value })}
              placeholder="例: 交通費精算"
              className="bg-white"
            />
          </div>
        ) : null}

        {fieldTypeNeedsOptions(field.fieldType) ? (
          <div className="space-y-2">
            <Label htmlFor={`modal-options-${field.id}`}>選択肢</Label>
            <Textarea
              id={`modal-options-${field.id}`}
              value={field.optionsText}
              onChange={(event) => updateField(field.id, { optionsText: event.target.value })}
              rows={6}
              placeholder={"選択肢を1行ずつ入力\n例: 承認する\n差し戻す\n却下する"}
              className="bg-white"
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            反映して閉じる
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  );
}
