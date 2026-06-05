"use client";

import { useMemo, useState } from "react";
import { Menu, Pencil, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
                      className="h-8 w-8 bg-white p-0 text-red-600 hover:text-red-700"
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
                    className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 cursor-grab bg-white/90 text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:cursor-grabbing"
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
                onValueChange={(value) =>
                  updateField(field.id, { fieldType: value as FieldType })
                }
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

          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)}>
              反映して閉じる
            </Button>
          </DialogFooter>
        </div>
    </DialogContent>
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

  const moveFieldTo = (id: string, targetIndex: number) => {
    setFields((prev) => {
      const currentIndex = prev.findIndex((field) => field.id === id);
      if (
        currentIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= prev.length ||
        currentIndex === targetIndex
      ) {
        return prev;
      }
      const next = [...prev];
      const [target] = next.splice(currentIndex, 1);
      if (!target) {
        return prev;
      }
      next.splice(targetIndex, 0, target);
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
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {statusMessage ? (
        <Alert variant="success">
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full max-w-2xl space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">申請フォーム</CardTitle>
                <Badge variant={publishedFormDefinitionId ? "default" : "outline"}>
                  {publishedFormDefinitionId ? "公開済み" : initialName ? "下書き" : "未保存"}
                </Badge>
              </div>
              <CardDescription>
                フォーム名と、利用者が入力する申請項目を設定します。
              </CardDescription>
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
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div>
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-base font-semibold text-slate-950">フォーム入力画面</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                公開されるフォームと同じ表示です。鉛筆で編集、×で削除、行間の＋で追加できます。
              </p>
            </div>
          </div>
          <InlineFormBuilder
            fieldsWithKeys={fieldsWithKeys}
            setSelectedFieldId={setSelectedFieldId}
            updateField={updateField}
            insertFieldAt={insertFieldAt}
            removeField={removeField}
            moveFieldTo={moveFieldTo}
            initialValues={initialValues}
          />
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="text-xl">承認フロー設定</CardTitle>
          <CardDescription>申請が提出された後の承認ステップを設定します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <ApprovalStepsBuilder assignees={assignees} defaultSteps={initialSteps} />
        </CardContent>
      </Card>

    </form>
  );
}
