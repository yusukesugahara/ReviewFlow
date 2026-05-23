"use client";

import { useMemo, useState } from "react";
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
import { OrderMoveButtons } from "./order-move-buttons";
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
  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? fields[0];
  const selectedFieldIndex = selectedField
    ? fields.findIndex((field) => field.id === selectedField.id)
    : -1;

  const updateField = (id: string, patch: Partial<DraftField>) => {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  };

  const addField = () => {
    setFields((prev) => {
      const nextField = createDefaultField(prev.length);
      setSelectedFieldId(nextField.id);
      return [...prev, nextField];
    });
  };

  const removeField = (id: string) => {
    setFields((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      const removedIndex = prev.findIndex((field) => field.id === id);
      const next = prev.filter((field) => field.id !== id);
      if (selectedFieldId === id) {
        setSelectedFieldId(next[Math.max(removedIndex - 1, 0)]?.id ?? next[0]?.id ?? "");
      }
      return next;
    });
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= fields.length) {
      return;
    }
    setFields((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) {
        return prev;
      }
      next.splice(toIndex, 0, moved);
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
            <Input id="templateName" name="name" placeholder="例: 経費申請" required defaultValue={initialName ?? ""} />
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-xl">フォーム項目</CardTitle>
                <CardDescription>項目を選択して詳細を編集します。</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={addField}>
                項目を追加
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              {fields.map((field, index) => {
                const isSelected = selectedField?.id === field.id;
                return (
                  <div
                    key={field.id}
                    className={`rounded-lg border p-3 transition ${
                      isSelected
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 text-left"
                      onClick={() => setSelectedFieldId(field.id)}
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-medium text-slate-500">#{index + 1}</span>
                        <span className="block truncate font-medium text-slate-950">
                          {field.label.trim() || `フォーム${index + 1}`}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge variant={field.required ? "default" : "outline"}>
                          {field.required ? "必須" : "任意"}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {FIELD_TYPE_OPTIONS.find((item) => item.value === field.fieldType)?.label}
                        </span>
                      </span>
                    </button>
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                      <OrderMoveButtons
                        canMoveUp={index !== 0}
                        canMoveDown={index !== fields.length - 1}
                        onMoveUp={() => moveField(index, index - 1)}
                        onMoveDown={() => moveField(index, index + 1)}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeField(field.id)}
                        disabled={fields.length <= 1}
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedField ? (
              <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h3 className="font-semibold text-slate-950">
                    #{selectedFieldIndex + 1} の詳細
                  </h3>
                  <p className="text-sm text-slate-500">申請者に表示する文言と入力形式を設定します。</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`label-${selectedField.id}`}>ラベル</Label>
                    <Input
                      id={`label-${selectedField.id}`}
                      value={selectedField.label}
                      onChange={(event) => updateField(selectedField.id, { label: event.target.value })}
                      placeholder={`例: 申請理由（空欄ならフォーム${selectedFieldIndex + 1}）`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`fieldType-${selectedField.id}`}>タイプ</Label>
                    <select
                      id={`fieldType-${selectedField.id}`}
                      value={selectedField.fieldType}
                      onChange={(event) => updateField(selectedField.id, { fieldType: event.target.value as FieldType })}
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

                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={selectedField.required}
                    onChange={(event) => updateField(selectedField.id, { required: event.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  必須
                </label>

                <div className="grid gap-3 border-t pt-3 md:grid-cols-2">
                  {fieldTypeSupportsPlaceholder(selectedField.fieldType) ? (
                    <div className="space-y-2">
                      <Label htmlFor={`placeholder-${selectedField.id}`}>プレースホルダー</Label>
                      <Input
                        id={`placeholder-${selectedField.id}`}
                        value={selectedField.placeholder}
                        onChange={(event) => updateField(selectedField.id, { placeholder: event.target.value })}
                        placeholder={
                          selectedField.fieldType === FIELD_TYPES.select
                            ? "例: 選択してください"
                            : "入力例や補足"
                        }
                      />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor={`helpText-${selectedField.id}`}>ヘルプテキスト</Label>
                    <Input
                      id={`helpText-${selectedField.id}`}
                      value={selectedField.helpText}
                      onChange={(event) => updateField(selectedField.id, { helpText: event.target.value })}
                      placeholder="入力欄の下に表示する説明"
                    />
                  </div>
                  {fieldTypeNeedsOptions(selectedField.fieldType) ? (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`options-${selectedField.id}`}>選択肢</Label>
                      <Textarea
                        id={`options-${selectedField.id}`}
                        value={selectedField.optionsText}
                        onChange={(event) => updateField(selectedField.id, { optionsText: event.target.value })}
                        required
                        rows={4}
                        placeholder={"承認する\n差し戻す\n却下する"}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="sticky top-6 border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">プレビュー</CardTitle>
              <CardDescription>申請者に表示される入力画面です。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {fieldsWithKeys.map(({ field, fieldKey }, index) => {
                const dynamicField = toDynamicField(field, index, fieldKey);
                return (
                  <DynamicFieldInput
                    key={`${field.id}-${fieldKey}`}
                    field={dynamicField}
                    value={initialValues?.[fieldKey]}
                  />
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

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
