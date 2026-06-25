"use client";

import { useActionState, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ApplicationFormSubmitButton,
  type ApplicationFormClientValidationState,
} from "@/components/applications/actions/application-form-submit-button";
import {
  DynamicFieldInput,
  DynamicFieldsTable,
} from "@/components/applications/dynamic-fields/dynamic-fields";
import { fieldTypeStoresValue } from "@/lib/constants/form-fields";
import { cn } from "@/lib/utils";
import { submitPublicCorrectionAction } from "../actions";
import type {
  PublicCorrectionResponse,
  PublicCorrectionSubmitState,
  PublicCorrectionTarget,
} from "../types";

type PublicCorrectionFormProps = {
  applicationId: string;
  fields: PublicCorrectionTarget[];
  formFields: Parameters<typeof DynamicFieldsTable>[0]["fields"];
  initialFormError?: string;
  openCorrection: NonNullable<PublicCorrectionResponse["openCorrection"]>;
  values: Record<string, unknown>;
};

const initialState: PublicCorrectionSubmitState = {};
const FORM_ID = "public-correction-form";

/**
 * 公開差戻し修正フォームの入力 UI を表示します。
 */
export function PublicCorrectionForm({
  applicationId,
  fields,
  formFields,
  initialFormError,
  openCorrection,
  values,
}: PublicCorrectionFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitPublicCorrectionAction,
    initialFormError ? { formError: initialFormError } : initialState,
  );
  const [clientValidation, setClientValidation] =
    useState<ApplicationFormClientValidationState>({});
  const [showAllFields, setShowAllFields] = useState(false);
  const [extraEditableFieldKeys, setExtraEditableFieldKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const targetByFieldKey = useMemo(
    () => new Map(fields.map((field) => [field.fieldKey, field])),
    [fields],
  );
  const currentValues = useMemo(
    () => ({
      ...Object.fromEntries(
        fields.map((field) => [field.fieldKey, field.currentValue]),
      ),
      ...values,
    }),
    [fields, values],
  );
  const targetFieldKeys = useMemo(
    () => new Set(fields.map((field) => field.fieldKey)),
    [fields],
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
  const formError = state.formError ?? clientValidation.formError;
  const fieldErrors = {
    ...clientValidation.fieldErrors,
    ...state.fieldErrors,
  };
  const missingFieldLabels = state.missingFieldLabels ?? clientValidation.missingFieldLabels;
  const showAllButtonLabel = showAllFields ? "対象項目のみ" : "すべて表示";

  const addEditableField = (fieldKey: string) => {
    setExtraEditableFieldKeys((prev) => {
      const next = new Set(prev);
      next.add(fieldKey);
      return next;
    });
  };

  return (
    <form id={FORM_ID} action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="fieldsJson" value={JSON.stringify(editableFields)} />

      {openCorrection.overallComment ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">差し戻しコメント</p>
          <p className="mt-2 whitespace-pre-wrap leading-6">
            {openCorrection.overallComment}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {fields.map((field) => (
          <Badge key={field.itemId} variant="outline" className="bg-white">
            {field.label}
          </Badge>
        ))}
      </div>

      {formError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium text-red-800">{formError}</p>
          {missingFieldLabels?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-red-700">
              {missingFieldLabels.map((label) => (
                <li key={label} className="text-red-700 marker:text-red-700">
                  {label}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <DynamicFieldsTable
        fields={visibleFields}
        values={currentValues}
        getFieldError={(field) => fieldErrors[field.fieldKey]}
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
                afterInput={
                  fieldErrors[field.fieldKey] ? (
                    <p className="text-sm font-medium text-red-700">
                      {fieldErrors[field.fieldKey]}
                    </p>
                  ) : null
                }
                variant="table"
              />
            </div>
          );
        }}
      />

      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <Label htmlFor="public-correction-message">メッセージ（任意）</Label>
        <Textarea
          id="public-correction-message"
          name="message"
          placeholder="修正内容について補足があれば入力してください"
          rows={4}
          className="bg-white"
        />
      </div>

      <ApplicationFormSubmitButton
        formId={FORM_ID}
        submitLabel="修正して再提出"
        pendingLabel="送信中..."
        confirmTitle="修正内容の確認"
        confirmDescription="修正内容を確認し、問題なければ再提出してください。"
        confirmButtonLabel="再提出する"
        isPending={isPending}
        editableFieldKeys={editableFieldKeys}
        onClientValidationChange={setClientValidation}
        fields={editableFields}
        submitForm={formAction}
      />
    </form>
  );
}
