"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
  FIELD_TYPES,
  fieldTypeNeedsOptions,
  fieldTypeSupportsPlaceholder,
  isFieldType,
  type FieldType,
} from "@/lib/constants/form-fields";
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

function asFieldType(value: string): FieldType {
  return isFieldType(value) ? value : FIELD_TYPES.text;
}

function optionsToLines(options: unknown[] | null | undefined): string {
  if (!Array.isArray(options)) {
    return "";
  }
  return options
    .map((option) => {
      if (option && typeof option === "object") {
        const raw = option as { label?: unknown; value?: unknown };
        if (typeof raw.label === "string" && raw.label.trim().length > 0) {
          return raw.label.trim();
        }
        if (typeof raw.value === "string" && raw.value.trim().length > 0) {
          return raw.value.trim();
        }
      }
      if (typeof option === "string") {
        return option.trim();
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function linesToOptions(optionsText: string): string[] {
  return optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, all) => line.length > 0 && all.indexOf(line) === index);
}

function TypeSelect({
  value,
  onChange,
  disabled,
}: {
  value: FieldType;
  onChange: (value: FieldType) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      name="fieldType"
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => onChange(asFieldType(nextValue))}
    >
      <SelectTrigger className="bg-white">
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
  );
}

function TypeSpecificInputs({
  fieldType,
  placeholder,
  helpText,
  optionsText,
  onPlaceholderChange,
  onHelpTextChange,
  onOptionsTextChange,
  disabled,
}: {
  fieldType: FieldType;
  placeholder: string;
  helpText: string;
  optionsText: string;
  onPlaceholderChange: (value: string) => void;
  onHelpTextChange: (value: string) => void;
  onOptionsTextChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 border-t pt-3 md:grid-cols-2">
      {fieldTypeSupportsPlaceholder(fieldType) ? (
        <div className="space-y-2">
          <Label htmlFor={`placeholder-${fieldType}`}>プレースホルダー</Label>
          <Input
            id={`placeholder-${fieldType}`}
            name="placeholder"
            value={placeholder}
            onChange={(event) => onPlaceholderChange(event.target.value)}
            disabled={disabled}
            placeholder={
              fieldType === FIELD_TYPES.select
                ? "例: 選択してください"
                : "入力例や補足"
            }
            className="bg-white"
          />
        </div>
      ) : (
        <input type="hidden" name="placeholder" value="" />
      )}
      <div className="space-y-2">
        <Label htmlFor={`helpText-${fieldType}`}>説明文</Label>
        <Input
          id={`helpText-${fieldType}`}
          name="helpText"
          value={helpText}
          onChange={(event) => onHelpTextChange(event.target.value)}
          disabled={disabled}
          placeholder="入力欄の上に表示する説明"
          className="bg-white"
        />
      </div>
      {fieldTypeNeedsOptions(fieldType) ? (
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`options-${fieldType}`}>選択肢</Label>
          <Textarea
            id={`options-${fieldType}`}
            name="optionsText"
            value={optionsText}
            onChange={(event) => onOptionsTextChange(event.target.value)}
            disabled={disabled}
            required
            rows={4}
            placeholder={"承認する\n差し戻す\n却下する"}
            className="bg-white"
          />
        </div>
      ) : (
        <input type="hidden" name="optionsText" value="" />
      )}
    </div>
  );
}

function FieldPreview({
  fieldType,
  label,
  required,
  placeholder,
  helpText,
  optionsText,
}: {
  fieldType: FieldType;
  label: string;
  required: boolean;
  placeholder: string;
  helpText: string;
  optionsText: string;
}) {
  const options = linesToOptions(optionsText);
  const previewLabel = label.trim().length > 0 ? label.trim() : "タイトル";
  const previewPlaceholder = placeholder.trim();

  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <div className="space-y-2">
        <Label>
          {previewLabel}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </Label>
        {helpText.trim().length > 0 ? <p className="text-sm text-muted-foreground">{helpText.trim()}</p> : null}
        {fieldType === "textarea" ? (
          <Textarea placeholder={previewPlaceholder} rows={7} className="min-h-40 bg-white" disabled />
        ) : null}
        {fieldType === "select" ? (
          <Select disabled defaultValue="">
            <SelectTrigger className="bg-white disabled:opacity-100">
              <SelectValue placeholder={previewPlaceholder || "選択してください"} />
            </SelectTrigger>
            <SelectContent>
              {(options.length > 0 ? options : ["選択肢1", "選択肢2"]).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {fieldType === "radio" ? (
          <div className="space-y-2">
            {(options.length > 0 ? options : ["選択肢1", "選択肢2"]).map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" disabled className="h-4 w-4" />
                {option}
              </label>
            ))}
          </div>
        ) : null}
        {fieldType === "checkbox" ? (
          <div className="space-y-2">
            {(options.length > 0 ? options : ["選択肢1", "選択肢2"]).map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" disabled className="h-4 w-4 rounded border-gray-300" />
                {option}
              </label>
            ))}
          </div>
        ) : null}
        {fieldType !== "textarea" && fieldType !== "select" && fieldType !== "radio" && fieldType !== "checkbox" ? (
          <Input
            type={fieldType === "number" ? "number" : fieldType === "date" ? "date" : "text"}
            placeholder={previewPlaceholder}
            disabled
            className="bg-white disabled:opacity-100"
          />
        ) : null}
      </div>
    </div>
  );
}

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
            <TypeSelect value={fieldType} onChange={setFieldType} disabled={disabled} />
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
        <TypeSpecificInputs
          fieldType={fieldType}
          placeholder={placeholder}
          helpText={helpText}
          optionsText={optionsText}
          onPlaceholderChange={setPlaceholder}
          onHelpTextChange={setHelpText}
          onOptionsTextChange={setOptionsText}
          disabled={disabled}
        />
        <FieldPreview
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
          <TypeSelect value={fieldType} onChange={setFieldType} disabled={disabled} />
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
      <TypeSpecificInputs
        fieldType={fieldType}
        placeholder={placeholder}
        helpText={helpText}
        optionsText={optionsText}
        onPlaceholderChange={setPlaceholder}
        onHelpTextChange={setHelpText}
        onOptionsTextChange={setOptionsText}
        disabled={disabled}
      />
      <FieldPreview
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
