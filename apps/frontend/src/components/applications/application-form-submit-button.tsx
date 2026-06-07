"use client";

import { startTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fieldTypeStoresValue } from "@/lib/constants/form-fields";
import { renderFieldValue } from "@/lib/form-field-value";
import { readDynamicValuesFromFormData } from "./dynamic-field-form-data";
import { validateRequiredDynamicFields } from "./dynamic-field-validation";
import type { DynamicFormField } from "./dynamic-fields.types";

export type ApplicationFormClientValidationState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
  missingFieldLabels?: string[];
};

type ApplicationFormSubmitButtonProps = {
  formId: string;
  fields: DynamicFormField[];
  submitLabel: string;
  pendingLabel: string;
  confirmTitle: string;
  confirmDescription: string;
  confirmButtonLabel: string;
  isPending: boolean;
  editableFieldKeys?: Set<string>;
  onClientValidationChange: (state: ApplicationFormClientValidationState) => void;
  submitForm: (formData: FormData) => void;
};

export function ApplicationFormSubmitButton({
  formId,
  fields,
  submitLabel,
  pendingLabel,
  confirmTitle,
  confirmDescription,
  confirmButtonLabel,
  isPending,
  editableFieldKeys,
  onClientValidationChange,
  submitForm,
}: ApplicationFormSubmitButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmValues, setConfirmValues] = useState<Record<string, unknown>>({});
  const valueFields = fields.filter((field) => fieldTypeStoresValue(field.fieldType));

  const handlePrepareSubmit = () => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    const values = readDynamicValuesFromFormData(fields, new FormData(form), editableFieldKeys);
    const { fieldErrors, missingFieldLabels } = validateRequiredDynamicFields(fields, values);
    if (Object.keys(fieldErrors).length > 0) {
      onClientValidationChange({
        formError: "未入力の必須項目があります",
        fieldErrors,
        missingFieldLabels,
      });
      return;
    }
    onClientValidationChange({});
    setConfirmValues(values);
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = () => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    const formData = new FormData(form);
    setConfirmOpen(false);
    startTransition(() => {
      submitForm(formData);
    });
  };

  return (
    <>
      <Button
        type="button"
        className="w-full"
        disabled={isPending}
        onClick={handlePrepareSubmit}
      >
        {isPending ? pendingLabel : submitLabel}
      </Button>

      {confirmOpen ? (
        <DialogContent
          className="max-w-2xl"
          titleId="application-submit-confirm-title"
          descriptionId="application-submit-confirm-description"
          onClose={() => setConfirmOpen(false)}
        >
          <DialogHeader>
            <DialogTitle id="application-submit-confirm-title">
              {confirmTitle}
            </DialogTitle>
            <DialogDescription id="application-submit-confirm-description">
              {confirmDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200">
            <dl className="divide-y divide-slate-200">
              {valueFields.map((field) => (
                <div
                  key={field.id}
                  className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4"
                >
                  <dt className="text-sm font-medium text-slate-700">{field.label}</dt>
                  <dd className="whitespace-pre-wrap text-sm text-slate-900">
                    {renderFieldValue(field, confirmValues[field.fieldKey])}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              戻る
            </Button>
            <Button type="button" onClick={handleConfirmSubmit} disabled={isPending}>
              {confirmButtonLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </>
  );
}
