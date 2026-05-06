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
  type ApprovalAssigneeOption,
} from "./approval-steps-builder";
import { OrderMoveButtons } from "./order-move-buttons";
import { PublishedApplicationUrlModal } from "./published-application-url-modal";

export type { ApprovalAssigneeOption };

export type DraftField = {
  id: string;
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
  assignees: ApprovalAssigneeOption[];
  spaceId: string;
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

function FieldPreview({ field, index }: { field: DraftField; index: number }) {
  const label = field.label.trim() || `フォーム${index + 1}`;
  const options = optionLines(field.optionsText);

  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <div className="space-y-2">
        <Label>
          {label}
          {field.required ? <span className="ml-1 text-destructive">*</span> : null}
        </Label>
        {field.helpText.trim().length > 0 ? (
          <p className="text-sm text-muted-foreground">{field.helpText.trim()}</p>
        ) : null}
        {field.fieldType === FIELD_TYPES.textarea ? (
          <Textarea placeholder={field.placeholder.trim()} rows={5} className="min-h-32 bg-white" disabled />
        ) : null}
        {field.fieldType === FIELD_TYPES.select ? (
          <select
            className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm disabled:opacity-100"
            disabled
            defaultValue=""
          >
            <option value="">{field.placeholder.trim() || "選択してください"}</option>
            {(options.length > 0 ? options : ["選択肢1", "選択肢2"]).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : null}
        {field.fieldType === FIELD_TYPES.radio ||
        field.fieldType === FIELD_TYPES.checkbox ? (
          <div className="space-y-2">
            {(options.length > 0 ? options : ["選択肢1", "選択肢2"]).map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type={field.fieldType}
                  disabled
                  className="h-4 w-4 rounded border-gray-300"
                />
                {option}
              </label>
            ))}
          </div>
        ) : null}
        {field.fieldType !== FIELD_TYPES.textarea &&
        field.fieldType !== FIELD_TYPES.select &&
        field.fieldType !== FIELD_TYPES.radio &&
        field.fieldType !== FIELD_TYPES.checkbox ? (
          <Input
            type={
              field.fieldType === FIELD_TYPES.number
                ? "number"
                : field.fieldType === FIELD_TYPES.date
                  ? "date"
                  : "text"
            }
            placeholder={field.placeholder.trim()}
            disabled
            className="bg-white disabled:opacity-100"
          />
        ) : null}
      </div>
    </div>
  );
}

export function ApplicationSetupDraftForm({
  action,
  errorMessage,
  statusMessage,
  publishedGroupId,
  assignees,
  spaceId,
}: ApplicationSetupDraftFormProps) {
  const [fields, setFields] = useState<DraftField[]>([createDefaultField(0)]);

  const fieldsJson = useMemo(() => JSON.stringify(fields), [fields]);
  const hasFields = fields.length > 0;

  const updateField = (id: string, patch: Partial<DraftField>) => {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, ...patch } : field)));
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
    <form action={action} className="space-y-8">
      <PublishedApplicationUrlModal
        open={Boolean(publishedGroupId)}
        groupId={publishedGroupId ?? undefined}
      />
      <input type="hidden" name="fieldsJson" value={fieldsJson} />
      <input type="hidden" name="spaceId" value={spaceId} />

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

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">1. フォーム設定</CardTitle>
          <CardDescription>申請名と入力項目を設定します。ここではまだ保存されません。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="templateName">申請名</Label>
            <Input id="templateName" name="name" placeholder="例: 経費申請" required />
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-4 rounded-lg border bg-white p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-500">#{index + 1}</span>
                    <span className="font-medium text-slate-900">
                      {field.label.trim() || `フォーム${index + 1}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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
                      onClick={() => setFields((prev) => prev.filter((item) => item.id !== field.id))}
                      disabled={fields.length <= 1}
                    >
                      削除
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`label-${field.id}`}>ラベル</Label>
                    <Input
                      id={`label-${field.id}`}
                      value={field.label}
                      onChange={(event) => updateField(field.id, { label: event.target.value })}
                      placeholder={`例: 申請理由（空欄ならフォーム${index + 1}）`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`fieldType-${field.id}`}>タイプ</Label>
                    <select
                      id={`fieldType-${field.id}`}
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

                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(event) => updateField(field.id, { required: event.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  必須
                </label>

                <div className="grid gap-3 border-t pt-3 md:grid-cols-2">
                  {fieldTypeSupportsPlaceholder(field.fieldType) ? (
                    <div className="space-y-2">
                      <Label htmlFor={`placeholder-${field.id}`}>プレースホルダー</Label>
                      <Input
                        id={`placeholder-${field.id}`}
                        value={field.placeholder}
                        onChange={(event) => updateField(field.id, { placeholder: event.target.value })}
                        placeholder={
                          field.fieldType === FIELD_TYPES.select
                            ? "例: 選択してください"
                            : "入力例や補足"
                        }
                      />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor={`helpText-${field.id}`}>ヘルプテキスト</Label>
                    <Input
                      id={`helpText-${field.id}`}
                      value={field.helpText}
                      onChange={(event) => updateField(field.id, { helpText: event.target.value })}
                      placeholder="入力欄の下に表示する説明"
                    />
                  </div>
                  {fieldTypeNeedsOptions(field.fieldType) ? (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`options-${field.id}`}>選択肢</Label>
                      <Textarea
                        id={`options-${field.id}`}
                        value={field.optionsText}
                        onChange={(event) => updateField(field.id, { optionsText: event.target.value })}
                        required
                        rows={4}
                        placeholder={"承認する\n差し戻す\n却下する"}
                      />
                    </div>
                  ) : null}
                </div>

                <FieldPreview field={field} index={index} />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFields((prev) => [...prev, createDefaultField(prev.length)])}
            >
              フォーム項目を追加
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">2. 承認フロー設定</CardTitle>
          <CardDescription>承認ステップを設定します。ここではまだ保存されません。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApprovalStepsBuilder assignees={assignees} />
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">3. 保存</CardTitle>
          <CardDescription>ここで初めてバックエンドに送信します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant={hasFields ? "default" : "outline"}>フォーム項目 {hasFields ? "OK" : "未完了"}</Badge>
            <Badge variant="default">承認フロー OK</Badge>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="submit" name="intent" value="draft" variant="secondary">
              下書き保存
            </Button>
            <Button type="submit" name="intent" value="publish" variant="outline">
              申請公開
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
