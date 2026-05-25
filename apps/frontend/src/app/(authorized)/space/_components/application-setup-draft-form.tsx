"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FIELD_TYPE_OPTIONS,
  FIELD_TYPES,
  fieldTypeNeedsOptions,
  fieldTypeSupportsPlaceholder,
  type FieldType,
} from "@/lib/constants/form-fields";
import {
  ApprovalStepsBuilder,
  type ApprovalStepItem,
  type ApprovalAssigneeOption,
} from "./approval-steps-builder";
import { DynamicFieldInput } from "@/app/_components/applications/dynamic-fields";
import { PublishedApplicationUrlModal } from "./published-application-url-modal";

export type { ApprovalAssigneeOption };

export type DraftField = {
  id: string;
  fieldKey?: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  placeholder: string;
  helpText: string;
  optionsText: string;
};

type ApplicationSetupDraftFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  errorMessage?: string | null;
  statusMessage?: string | null;
  publishedGroupId?: string | null;
  publishedFormDefinitionId?: string | null;
  assignees: ApprovalAssigneeOption[];
  initialFields?: DraftField[];
  initialName?: string;
  initialSteps?: ApprovalStepItem[];
  initialValues?: Record<string, unknown>;
  spaceId: string;
  returnPath?: string;
};

function createDefaultField(index: number): DraftField {
  return {
    id: `field-${index + 1}`,
    label: `フォーム${index + 1}`,
    fieldType: FIELD_TYPES.text,
    required: true,
    placeholder: "",
    helpText: "",
    optionsText: "",
  };
}

function optionLines(optionsText: string): string[] {
  return optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, all) => line.length > 0 && all.indexOf(line) === index);
}

function normalizeFieldKey(
  field: DraftField,
  index: number,
  usedKeys: Set<string>,
): string {
  const explicitKey = field.fieldKey?.trim();
  const base =
    explicitKey && /^[a-z0-9_]+$/.test(explicitKey)
      ? explicitKey
      : field.label
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "") || `field_${index + 1}`;
  let key = base;
  let suffix = 2;
  while (usedKeys.has(key)) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }
  usedKeys.add(key);
  return key;
}

function toDynamicField(
  field: DraftField,
  index: number,
  fieldKey: string,
) {
  const label = field.label.trim() || `フォーム${index + 1}`;
  return {
    id: field.id,
    fieldKey,
    label,
    fieldType: field.fieldType,
    required: field.required,
    placeholder: field.placeholder.trim() || null,
    helpText: field.helpText.trim() || null,
    options: fieldTypeNeedsOptions(field.fieldType)
      ? optionLines(field.optionsText).map((option) => ({
          label: option,
          value: option,
        }))
      : [],
  };
}

function InlineFormBuilder({
  fieldsWithKeys,
  setSelectedFieldId,
  updateField,
  insertFieldAt,
  removeField,
  initialValues,
}: {
  fieldsWithKeys: { field: DraftField; fieldKey: string }[];
  setSelectedFieldId: (id: string) => void;
  updateField: (id: string, patch: Partial<DraftField>) => void;
  insertFieldAt: (index: number) => void;
  removeField: (id: string) => void;
  initialValues?: Record<string, unknown>;
}) {
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const editingField =
    fieldsWithKeys.find(({ field }) => field.id === editingFieldId)?.field ?? null;

  return (
    <div className="bg-white">
      <div className="overflow-hidden border border-slate-400">
        <div className="border-b border-slate-400 bg-slate-100 px-3 py-2 text-center text-sm font-semibold text-slate-900">
          申請書
        </div>
        <InsertFieldButton index={0} onInsert={insertFieldAt} />
        <div>
          {fieldsWithKeys.map(({ field, fieldKey }, index) => {
            const dynamicField = toDynamicField(field, index, fieldKey);
            return (
              <div key={field.id}>
                <div
                  className="group relative grid min-h-16 grid-cols-1 divide-y divide-slate-300 border-t border-slate-300 md:grid-cols-[200px_minmax(0,1fr)] md:divide-x md:divide-y-0"
                  onFocus={() => setSelectedFieldId(field.id)}
                  onMouseEnter={() => setSelectedFieldId(field.id)}
                >
                  <div className="flex items-start gap-2 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800">
                    <span className="mt-0.5 min-w-5 text-xs text-slate-500">{index + 1}</span>
                    <span className="break-words">
                      {dynamicField.label}
                      {dynamicField.required ? <span className="ml-1 text-destructive">*</span> : null}
                    </span>
                  </div>
                  <div className="min-w-0 bg-white px-3 py-3">
                    <DynamicFieldInput
                      field={dynamicField}
                      value={initialValues?.[fieldKey]}
                      variant="table"
                    />
                  </div>
                  <div className="absolute right-2 top-2 flex gap-1 opacity-100 md:opacity-0 md:transition group-hover:opacity-100 group-focus-within:opacity-100">
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
                      className="h-8 w-8 bg-white p-0 text-red-600 hover:text-red-700"
                      aria-label={`${dynamicField.label}を削除`}
                      onClick={() => removeField(field.id)}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="フォーム項目編集モーダルを閉じる"
        className="absolute inset-0 bg-slate-950/40"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="field-content-modal-title"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="field-content-modal-title" className="text-lg font-semibold text-slate-950">
              フォーム項目を編集
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              選択中の項目に表示する内容をまとめて入力します。
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </div>

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
              <select
                id={`modal-type-${field.id}`}
                value={field.fieldType}
                onChange={(event) => updateField(field.id, { fieldType: event.target.value as FieldType })}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
              >
                {FIELD_TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(event) => updateField(field.id, { required: event.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            必須項目
          </label>

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

          <div className="flex justify-end">
            <Button type="button" onClick={() => onOpenChange(false)}>
              反映して閉じる
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ApplicationSetupDraftForm({
  action,
  errorMessage,
  statusMessage,
  publishedGroupId,
  publishedFormDefinitionId,
  assignees,
  initialFields,
  initialName,
  initialSteps,
  initialValues,
  spaceId,
  returnPath,
}: ApplicationSetupDraftFormProps) {
  const [fields, setFields] = useState<DraftField[]>(
    initialFields && initialFields.length > 0
      ? initialFields
      : [createDefaultField(0)],
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string>(
    (initialFields && initialFields[0]?.id) || "field-1",
  );

  const fieldsJson = useMemo(() => JSON.stringify(fields), [fields]);
  const fieldsWithKeys = useMemo(() => {
    const usedKeys = new Set<string>();
    return fields.map((field, index) => ({
      field,
      fieldKey: normalizeFieldKey(field, index, usedKeys),
    }));
  }, [fields]);
  const hasFields = fields.length > 0;
  const updateField = (id: string, patch: Partial<DraftField>) => {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  };

  const insertFieldAt = (index: number) => {
    setFields((prev) => {
      const next = [...prev];
      const nextField = createDefaultField(prev.length);
      setSelectedFieldId(nextField.id);
      next.splice(index, 0, nextField);
      return next;
    });
  };

  const removeField = (id: string) => {
    setFields((prev) => {
      const removedIndex = prev.findIndex((field) => field.id === id);
      const next = prev.filter((field) => field.id !== id);
      if (selectedFieldId === id) {
        setSelectedFieldId(next[Math.max(removedIndex - 1, 0)]?.id ?? next[0]?.id ?? "");
      }
      return next;
    });
  };

  return (
    <form action={action} className="space-y-6">
      <PublishedApplicationUrlModal
        open={Boolean(publishedGroupId)}
        groupId={publishedGroupId ?? undefined}
        formDefinitionId={publishedFormDefinitionId ?? undefined}
      />
      <input type="hidden" name="fieldsJson" value={fieldsJson} />
      <input type="hidden" name="spaceId" value={spaceId} />
      {returnPath ? (
        <input type="hidden" name="returnPath" value={returnPath} />
      ) : null}

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {statusMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {statusMessage}
        </p>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-2xl space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">申請フォーム作成</h2>
              <Badge variant={publishedFormDefinitionId ? "default" : "outline"}>
                {publishedFormDefinitionId ? "公開済み" : initialName ? "下書き" : "未保存"}
              </Badge>
            </div>
            <Label htmlFor="templateName">申請フォーム名</Label>
            <Input
              id="templateName"
              name="name"
              placeholder="例: 経費申請"
              required
              defaultValue={initialName ?? ""}
              className="bg-white"
            />
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-3 sm:items-end">
            <div className="flex flex-wrap justify-end gap-2">
              <Badge variant={hasFields ? "default" : "outline"}>申請項目 {hasFields ? "OK" : "未完了"}</Badge>
              <Badge variant="default">承認フロー OK</Badge>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="submit" name="intent" value="draft" variant="secondary">
                下書き保存
              </Button>
              <Button type="submit" name="intent" value="publish">
                公開
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">フォームプレビュー</CardTitle>
          <CardDescription>公開されるフォームと同じ表示です。鉛筆で編集、×で削除、行間の＋で追加できます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <InlineFormBuilder
            fieldsWithKeys={fieldsWithKeys}
            setSelectedFieldId={setSelectedFieldId}
            updateField={updateField}
            insertFieldAt={insertFieldAt}
            removeField={removeField}
            initialValues={initialValues}
          />
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">承認フロー設定</CardTitle>
          <CardDescription>申請が提出された後の承認ステップを設定します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApprovalStepsBuilder assignees={assignees} defaultSteps={initialSteps} />
        </CardContent>
      </Card>

    </form>
  );
}
