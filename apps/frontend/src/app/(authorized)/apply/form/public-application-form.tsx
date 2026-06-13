"use client";

import { useActionState, useState } from "react";
import {
  ApplicationFormSubmitButton,
  type ApplicationFormClientValidationState,
} from "@/components/applications/actions/application-form-submit-button";
import { DynamicFieldsTable } from "@/components/applications/dynamic-fields/dynamic-fields";
import { submitPublicApplicationAction } from "./actions";
import type { PublicApplicationFormDefinition, PublicApplicationSubmitState } from "./types";

type PublicApplicationFormProps = {
  definition: PublicApplicationFormDefinition;
  initialFormError?: string;
};

const initialState: PublicApplicationSubmitState = {};
const FORM_ID = "public-application-form";

export function PublicApplicationForm({
  definition,
  initialFormError,
}: PublicApplicationFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitPublicApplicationAction,
    initialFormError ? { formError: initialFormError } : initialState,
  );
  const [clientValidation, setClientValidation] =
    useState<ApplicationFormClientValidationState>({});
  const fields = definition.fields ?? [];
  const formError = state.formError ?? clientValidation.formError;
  const fieldErrors = {
    ...clientValidation.fieldErrors,
    ...state.fieldErrors,
  };
  const missingFieldLabels = state.missingFieldLabels ?? clientValidation.missingFieldLabels;

  return (
    <form id={FORM_ID} action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="groupId" value={definition.groupId} />
      <input type="hidden" name="formDefinitionId" value={definition.id} />
      <input type="hidden" name="fieldsJson" value={JSON.stringify(fields)} />
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
        fields={fields}
        getFieldError={(field) => fieldErrors[field.fieldKey]}
      />
      <ApplicationFormSubmitButton
        formId={FORM_ID}
        fields={fields}
        submitLabel="申請を送信"
        pendingLabel="送信中..."
        confirmTitle="申請内容の確認"
        confirmDescription="入力内容を確認し、問題なければ申請してください。"
        confirmButtonLabel="申請する"
        isPending={isPending}
        onClientValidationChange={setClientValidation}
        submitForm={formAction}
      />
    </form>
  );
}
