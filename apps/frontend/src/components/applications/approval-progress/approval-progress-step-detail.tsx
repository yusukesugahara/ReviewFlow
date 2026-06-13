"use client";

import { Badge } from "@/components/ui/badge";
import {
  DynamicFieldInput,
  DynamicFieldsTable,
  type DynamicFormField,
} from "../dynamic-fields/dynamic-fields";
import {
  formatDateTime,
  getFieldCorrectionItems,
  isSelectableProgressStep,
  mapCorrectionsToReturnedActions,
  progressStatusMeta,
  type FieldCorrectionItem,
} from "./approval-progress.helpers";
import type {
  ApplicationCorrection,
  ApplicationDetailViewModel,
  ApplicationFormField,
  ApplicationProgressStep,
} from "../detail/application-detail.types";

type SelectedProgressStepApplicationProps = {
  application: ApplicationDetailViewModel;
  corrections: ApplicationCorrection[];
  fields: ApplicationFormField[];
  selectedStepId: string;
  steps: ApplicationProgressStep[];
};

export function SelectedProgressStepApplication({
  application,
  corrections,
  fields,
  selectedStepId,
  steps,
}: SelectedProgressStepApplicationProps) {
  const selectedStep = steps.find((step) => step.id === selectedStepId) ?? steps[0];
  if (!selectedStep || !isSelectableProgressStep(selectedStep)) {
    return null;
  }

  const statusMeta = progressStatusMeta(selectedStep.status);
  const correctionsByReturnedActionId = mapCorrectionsToReturnedActions(
    steps,
    corrections,
  );
  const stepCorrections = selectedStep.actions
    .filter((action) => action.action === "returned")
    .map((action) => correctionsByReturnedActionId.get(action.id))
    .filter((correction): correction is ApplicationCorrection => !!correction);

  return (
    <div className="space-y-4 border-t border-slate-200 pt-5">
      <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">
              STEP {selectedStep.stepOrder}
            </p>
            <h3 className="mt-1 text-base font-semibold text-slate-950">
              {selectedStep.stepName} の申請
            </h3>
          </div>
          <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
        </div>

        {stepCorrections.map((correction) => (
          <StepOverallCorrectionComment
            key={correction.id}
            correction={correction}
          />
        ))}

        <DynamicFieldsTable
          disabled
          fields={fields.map((field) => ({
            ...field,
            required: field.required ?? false,
          }))}
          getRowClassName={(field) =>
            getFieldCorrectionItems(stepCorrections, field).length > 0
              ? "bg-amber-50"
              : undefined
          }
          renderValue={(field, value) => (
            <StepFieldValue
              corrections={getFieldCorrectionItems(stepCorrections, field)}
              field={field}
              value={value}
            />
          )}
          title="申請内容"
          values={application.values}
        />
      </div>
    </div>
  );
}

function StepFieldValue({
  corrections,
  field,
  value,
}: {
  corrections: FieldCorrectionItem[];
  field: DynamicFormField;
  value: unknown;
}) {
  return (
    <div className="space-y-3">
      <DynamicFieldInput
        disabled
        field={field}
        readOnly
        value={value}
        variant="table"
      />
      {corrections.length > 0 ? (
        <div className="space-y-2">
          {corrections.map(({ correction, item }) => (
            <div
              key={`${correction.id}-${item.formFieldId ?? item.fieldKey}`}
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-amber-800">
                  差し戻し内容
                </p>
                <span className="text-xs text-amber-700">
                  {formatDateTime(correction.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-800">
                {item.comment || "（コメントなし）"}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StepOverallCorrectionComment({
  correction,
}: {
  correction: ApplicationCorrection;
}) {
  if (!correction.overallComment) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-amber-950">差し戻し全体コメント</p>
        <span className="text-sm text-amber-800">
          {formatDateTime(correction.createdAt)}
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-800">
        {correction.overallComment}
      </p>
    </div>
  );
}
