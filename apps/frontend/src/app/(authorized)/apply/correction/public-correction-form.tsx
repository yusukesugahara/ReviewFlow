"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DynamicFieldInput,
  DynamicFieldsTable,
} from "@/components/applications/dynamic-fields";
import { submitPublicCorrectionAction } from "./actions";
import type {
  PublicCorrectionResponse,
  PublicCorrectionSubmitState,
  PublicCorrectionTarget,
} from "./types";

type PublicCorrectionFormProps = {
  applicationId: string;
  fields: PublicCorrectionTarget[];
  formFields: Parameters<typeof DynamicFieldsTable>[0]["fields"];
  initialFormError?: string;
  openCorrection: NonNullable<PublicCorrectionResponse["openCorrection"]>;
};

const initialState: PublicCorrectionSubmitState = {};

export function PublicCorrectionForm({
  applicationId,
  fields,
  formFields,
  initialFormError,
  openCorrection,
}: PublicCorrectionFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitPublicCorrectionAction,
    initialFormError ? { formError: initialFormError } : initialState,
  );
  const targetByFieldKey = new Map(fields.map((field) => [field.fieldKey, field]));
  const values = Object.fromEntries(
    fields.map((field) => [field.fieldKey, field.currentValue]),
  );

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="fieldsJson" value={JSON.stringify(formFields)} />

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

      {state.formError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium text-red-800">{state.formError}</p>
          {state.missingFieldLabels?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-red-700">
              {state.missingFieldLabels.map((label) => (
                <li key={label} className="text-red-700 marker:text-red-700">
                  {label}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <DynamicFieldsTable
        fields={formFields}
        values={values}
        getFieldError={(field) => state.fieldErrors?.[field.fieldKey]}
        renderValue={(field, value) => {
          const target = targetByFieldKey.get(field.fieldKey);
          return (
            <div className="space-y-3">
              {target?.comment ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                  {target.comment}
                </p>
              ) : null}
              <DynamicFieldInput
                field={field}
                value={value}
                afterInput={
                  state.fieldErrors?.[field.fieldKey] ? (
                    <p className="text-sm font-medium text-red-700">
                      {state.fieldErrors[field.fieldKey]}
                    </p>
                  ) : null
                }
                variant="table"
              />
            </div>
          );
        }}
      />

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "送信中..." : "修正して再提出"}
      </Button>
    </form>
  );
}
