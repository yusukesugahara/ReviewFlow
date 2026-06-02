"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { DynamicFieldsTable } from "@/app/_components/applications/dynamic-fields";
import { submitPublicApplicationAction } from "./actions";
import type { PublicApplicationFormDefinition, PublicApplicationSubmitState } from "./types";

type PublicApplicationFormProps = {
  definition: PublicApplicationFormDefinition;
  initialFormError?: string;
};

const initialState: PublicApplicationSubmitState = {};

export function PublicApplicationForm({
  definition,
  initialFormError,
}: PublicApplicationFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitPublicApplicationAction,
    initialFormError ? { formError: initialFormError } : initialState,
  );
  const fields = definition.fields ?? [];

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="groupId" value={definition.groupId} />
      <input type="hidden" name="formDefinitionId" value={definition.id} />
      <input type="hidden" name="fieldsJson" value={JSON.stringify(fields)} />
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
        fields={fields}
        getFieldError={(field) => state.fieldErrors?.[field.fieldKey]}
      />
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "送信中..." : "申請を送信"}
      </Button>
    </form>
  );
}
