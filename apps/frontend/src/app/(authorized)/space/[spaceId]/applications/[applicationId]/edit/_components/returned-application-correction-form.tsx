"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DynamicFieldInput,
  DynamicFieldsTable,
} from "@/components/applications/dynamic-fields/dynamic-fields";
import { fieldTypeStoresValue } from "@/lib/constants/form-fields";
import { cn } from "@/lib/utils";
import type { CorrectionTargetItem, EditableFormField } from "../types";

type ReturnedApplicationCorrectionFormProps = {
  action: (formData: FormData) => Promise<void>;
  correctionError?: string;
  fields: EditableFormField[];
  overallComment?: string | null;
  targets: CorrectionTargetItem[];
  values: Record<string, unknown>;
};

/**
 * 差し戻し申請の修正項目テーブルを表示します。
 */
export function ReturnedApplicationCorrectionForm({
  action,
  correctionError,
  fields,
  overallComment,
  targets,
  values,
}: ReturnedApplicationCorrectionFormProps) {
  const [showAllFields, setShowAllFields] = useState(false);
  const [extraEditableFieldKeys, setExtraEditableFieldKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const formFields = fields.map((field) => ({
    ...field,
    required: field.required ?? false,
  }));
  const targetByFieldKey = useMemo(
    () => new Map(targets.map((target) => [target.fieldKey, target])),
    [targets],
  );
  const targetFieldKeys = useMemo(
    () => new Set(targets.map((target) => target.fieldKey)),
    [targets],
  );
  const editableFieldKeys = useMemo(
    () => new Set([...targetFieldKeys, ...extraEditableFieldKeys]),
    [extraEditableFieldKeys, targetFieldKeys],
  );
  const visibleFields = showAllFields
    ? formFields
    : formFields.filter((field) => targetFieldKeys.has(field.fieldKey));
  const editableFields = formFields.filter((field) =>
    editableFieldKeys.has(field.fieldKey),
  );
  const hasNonTargetFields = formFields.some(
    (field) => !targetFieldKeys.has(field.fieldKey),
  );
  const showAllButtonLabel = showAllFields ? "対象項目のみ" : "すべて表示";

  const addEditableField = (fieldKey: string) => {
    setExtraEditableFieldKeys((prev) => {
      const next = new Set(prev);
      next.add(fieldKey);
      return next;
    });
  };

  if (targets.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-muted-foreground">
        現在修正できる項目はありません。
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {correctionError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {correctionError}
        </p>
      ) : null}
      {overallComment ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">
            差し戻しコメント
          </p>
          <p className="whitespace-pre-wrap text-sm leading-6 text-amber-900">
            {overallComment}
          </p>
        </div>
      ) : null}
      <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-semibold text-amber-900">
          修正対象は {targets.length} 件です
        </p>
        <div className="flex flex-wrap gap-2">
          {targets.map((target) => (
            <Badge key={target.itemId} variant="outline" className="bg-white">
              {target.label}
            </Badge>
          ))}
        </div>
      </div>

      <form action={action} className="space-y-5">
        <input
          type="hidden"
          name="fieldsJson"
          value={JSON.stringify(editableFields)}
        />
        <DynamicFieldsTable
          fields={visibleFields}
          values={values}
          title="修正内容"
          getRowClassName={(field) => {
            const isTarget = targetFieldKeys.has(field.fieldKey);
            const isEditable = editableFieldKeys.has(field.fieldKey);
            return cn(
              !isTarget && "group",
              !isTarget &&
                !isEditable &&
                "bg-slate-50/70 opacity-60 transition-opacity hover:opacity-100",
              !isTarget && isEditable && "bg-sky-50/60",
            );
          }}
          headerAction={
            hasNonTargetFields ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAllFields((current) => !current)}
                className="h-7 bg-white px-2 text-xs"
              >
                {showAllButtonLabel}
              </Button>
            ) : null
          }
          renderValue={(field, value) => {
            const target = targetByFieldKey.get(field.fieldKey);
            const isTarget = !!target;
            const isEditable = editableFieldKeys.has(field.fieldKey);
            const canEnableField =
              showAllFields && !isTarget && fieldTypeStoresValue(field.fieldType);

            return (
              <div
                className={cn(
                  "relative min-h-10 space-y-3",
                  canEnableField && !isEditable && "pr-24",
                )}
              >
                {target?.comment ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                    {target.comment}
                  </p>
                ) : null}
                {canEnableField && !isEditable ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addEditableField(field.fieldKey)}
                    className="absolute right-0 top-0 h-7 gap-1 bg-white px-2 text-xs opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    編集
                  </Button>
                ) : null}
                <DynamicFieldInput
                  field={field}
                  value={value}
                  disabled={!isEditable}
                  readOnly={!isEditable}
                  variant="table"
                />
              </div>
            );
          }}
        />
        <div className="flex justify-end border-t border-slate-200 pt-4">
          <Button type="submit">修正内容を保存</Button>
        </div>
      </form>
    </div>
  );
}
