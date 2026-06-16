"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type FieldType } from "@/lib/constants/form-fields";
import { asFieldType, optionsToLines } from "./form-field-editor.helpers";
import { FormFieldPreview } from "./form-field-preview";
import { FormFieldTypeInputs } from "./form-field-type-inputs";
import { FormFieldTypeSelect } from "./form-field-type-select";
import { OrderMoveButtons } from "./order-move-buttons";

type FormField = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options?: unknown[] | null;
  sortOrder: number;
};

type ServerAction = (formData: FormData) => void | Promise<void>;

type FieldEditorProps = {
  field: FormField;
  index: number;
  total: number;
  disabled: boolean;
  updateAction: ServerAction;
  deleteAction: ServerAction;
  moveUpAction: ServerAction;
  moveDownAction: ServerAction;
};

type AddFieldFormProps = {
  action: ServerAction;
  nextSortOrder: number;
  disabled: boolean;
};

/**
 * フォーム項目の編集 UI を表示します。
 */
export function FormFieldEditor({
  field,
  index,
  total,
  disabled,
  updateAction,
  deleteAction,
  moveUpAction,
  moveDownAction,
}: FieldEditorProps) {
  const [fieldType, setFieldType] = useState<FieldType>(asFieldType(field.fieldType));
  const optionLines = useMemo(() => optionsToLines(field.options), [field.options]);
  const [label, setLabel] = useState(field.label);
  const [required, setRequired] = useState(field.required);
  const [placeholder, setPlaceholder] = useState(field.placeholder ?? "");
  const [helpText, setHelpText] = useState(field.helpText ?? "");
  const [optionsText, setOptionsText] = useState(optionLines);

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-500">#{index + 1}</span>
            <span className="font-medium text-slate-900">{field.label}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={moveUpAction}>
            <OrderMoveButtons
              canMoveUp={!disabled && index !== 0}
              canMoveDown={false}
              moveUpType="submit"
              moveDownLabel=""
            />
          </form>
          <form action={moveDownAction}>
            <OrderMoveButtons
              canMoveUp={false}
              canMoveDown={!disabled && index !== total - 1}
              moveDownType="submit"
              moveUpLabel=""
            />
          </form>
          <form action={deleteAction}>
            <Button type="submit" formNoValidate variant="destructive" size="sm" disabled={disabled}>
              削除
            </Button>
          </form>
        </div>
      </div>
      <form action={updateAction} className="mt-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`label-${field.id}`}>タイトル</Label>
            <Input
              id={`label-${field.id}`}
              name="label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              required
              disabled={disabled}
              placeholder="例: 申請理由"
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label>タイプ</Label>
            <FormFieldTypeSelect value={fieldType} onChange={setFieldType} disabled={disabled} />
          </div>
        </div>
        <div className="flex justify-end">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="required"
              checked={required}
              onChange={(event) => setRequired(event.target.checked)}
              disabled={disabled}
              className="h-4 w-4 rounded border-gray-300"
            />
            必須
          </label>
        </div>
        <FormFieldTypeInputs
          fieldType={fieldType}
          placeholder={placeholder}
          helpText={helpText}
          optionsText={optionsText}
          onPlaceholderChange={setPlaceholder}
          onHelpTextChange={setHelpText}
          onOptionsTextChange={setOptionsText}
          disabled={disabled}
        />
        <FormFieldPreview
          fieldType={fieldType}
          label={label}
          required={required}
          placeholder={placeholder}
          helpText={helpText}
          optionsText={optionsText}
        />
        <div className="flex justify-end">
          <Button type="submit" variant="outline" disabled={disabled}>
            保存
          </Button>
        </div>
      </form>
    </div>
  );
}

/**
 * 新しいフォーム項目を追加するフォームを表示します。
 */
export function AddFieldForm({ action, nextSortOrder, disabled }: AddFieldFormProps) {
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(true);
  const [placeholder, setPlaceholder] = useState("");
  const [helpText, setHelpText] = useState("");
  const [optionsText, setOptionsText] = useState("");

  return (
    <form action={action} className="space-y-4 rounded-lg border border-dashed p-4">
      <input type="hidden" name="sortOrder" value={nextSortOrder} />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newFieldLabel">ラベル</Label>
          <Input
            id="newFieldLabel"
            name="label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={`例: 承認結果（空欄ならフォーム${nextSortOrder + 1}）`}
            disabled={disabled}
            className="bg-white"
          />
        </div>
        <div className="space-y-2">
          <Label>タイプ</Label>
          <FormFieldTypeSelect value={fieldType} onChange={setFieldType} disabled={disabled} />
        </div>
        <label className="flex items-end gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            name="required"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
            disabled={disabled}
            className="mb-2 h-4 w-4 rounded border-gray-300"
          />
          <span className="mb-1.5">必須</span>
        </label>
      </div>
      <FormFieldTypeInputs
        fieldType={fieldType}
        placeholder={placeholder}
        helpText={helpText}
        optionsText={optionsText}
        onPlaceholderChange={setPlaceholder}
        onHelpTextChange={setHelpText}
        onOptionsTextChange={setOptionsText}
        disabled={disabled}
      />
      <FormFieldPreview
        fieldType={fieldType}
        label={label || `フォーム${nextSortOrder + 1}`}
        required={required}
        placeholder={placeholder}
        helpText={helpText}
        optionsText={optionsText}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={disabled}>
          追加
        </Button>
      </div>
    </form>
  );
}
