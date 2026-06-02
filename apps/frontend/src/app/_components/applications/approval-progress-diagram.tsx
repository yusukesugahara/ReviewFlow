"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DynamicFieldInput,
  DynamicFieldsTable,
  type DynamicFormField,
} from "./dynamic-fields";
import {
  actionLabel,
  displayUser,
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
  ApplicationProgressAction,
  ApplicationProgressStep,
  ApplicationProgressUser,
} from "./application-detail.types";

type ApprovalProgressDiagramProps = {
  application: ApplicationDetailViewModel;
  corrections: ApplicationCorrection[];
  fields: ApplicationFormField[];
  steps: ApplicationProgressStep[];
};

export function ApprovalProgressDiagram({
  application,
  corrections,
  fields,
  steps,
}: ApprovalProgressDiagramProps) {
  const visualSteps = useMemo(
    () => [...steps].sort((a, b) => a.stepOrder - b.stepOrder),
    [steps],
  );
  const selectableSteps = visualSteps.filter(isSelectableProgressStep);
  const [selectedStepId, setSelectedStepId] = useState(
    selectableSteps.find((step) => step.status === "current")?.id ??
      selectableSteps[0]?.id ??
      "",
  );

  if (visualSteps.length === 0) {
    return null;
  }

  const gridColumns = `repeat(${visualSteps.length + 1}, minmax(0, 1fr))`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>承認ステップ</CardTitle>
        <CardDescription>左から右に向かって承認が進みます</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div
            className="grid w-full gap-3"
            style={{ gridTemplateColumns: gridColumns }}
          >
            <ApplicationStartCard
              application={application}
            />
            {visualSteps.map((step) => {
              const isSelectable = isSelectableProgressStep(step);
              return (
                <ProgressStepCard
                  key={step.id}
                  isSelected={step.id === selectedStepId}
                  onSelect={isSelectable ? () => setSelectedStepId(step.id) : undefined}
                  step={step}
                />
              );
            })}
          </div>
          <SelectedStepApplication
            application={application}
            corrections={corrections}
            fields={fields}
            selectedStepId={selectedStepId}
            steps={visualSteps}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SelectedStepApplication({
  application,
  corrections,
  fields,
  selectedStepId,
  steps,
}: ApprovalProgressDiagramProps & { selectedStepId: string }) {
  const selectedStep = steps.find((step) => step.id === selectedStepId) ?? steps[0];
  if (!selectedStep || !isSelectableProgressStep(selectedStep)) {
    return null;
  }

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
          <Badge variant={progressStatusMeta(selectedStep.status).badgeVariant}>
            {progressStatusMeta(selectedStep.status).label}
          </Badge>
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

function ApplicationStartCard({
  application,
}: {
  application: ApplicationDetailViewModel;
}) {
  const submittedAt = application.submittedAt ?? application.createdAt ?? null;

  return (
    <div className="relative min-w-0 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">START</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-950">申請</h3>
        </div>
        <Badge variant="secondary">受付</Badge>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="text-xs font-medium text-slate-500">申請者</p>
          <p className="mt-2 break-all font-medium text-slate-800">
            {application.applicantEmail ?? "-"}
          </p>
        </div>
        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs font-medium text-slate-500">申請日時</p>
          <p className="mt-2 font-medium text-slate-800">
            {formatDateTime(submittedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProgressStepCard({
  isSelected,
  onSelect,
  step,
}: {
  isSelected: boolean;
  onSelect?: () => void;
  step: ApplicationProgressStep;
}) {
  const statusMeta = progressStatusMeta(step.status);
  const latestAction = step.actions.at(-1);
  const isSelectable = !!onSelect;
  const selectedClassName = isSelected
    ? "ring-2 ring-slate-500 ring-offset-2"
    : isSelectable
      ? "hover:border-slate-400"
      : "cursor-not-allowed opacity-70";

  return (
    <button
      type="button"
      className={`relative min-w-0 rounded-lg border p-3 text-left transition ${statusMeta.className} ${selectedClassName}`}
      onClick={onSelect}
      aria-pressed={isSelected}
      disabled={!isSelectable}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            STEP {step.stepOrder}
          </p>
          <h3 className="mt-1 break-words text-sm font-semibold text-slate-950">
            {step.stepName}
          </h3>
        </div>
        <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="text-xs font-medium text-slate-500">承認・確認できる人</p>
          <UserList users={step.assignees} />
        </div>
        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs font-medium text-slate-500">実施履歴</p>
          {step.actions.length > 0 ? (
            <div className="mt-2 space-y-2">
              {step.actions.map((action) => (
                <ActionHistory key={action.id} action={action} />
              ))}
            </div>
          ) : step.status === "current" ? (
            <p className="mt-2 text-sm font-medium text-blue-700">
              現在このステップで確認中
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">未実施</p>
          )}
        </div>
        {latestAction?.comment ? (
          <p className="rounded-md bg-white/70 px-3 py-2 text-xs leading-5 text-slate-700">
            {latestAction.comment}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function UserList({ users }: { users: ApplicationProgressUser[] }) {
  if (users.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">未設定</p>;
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {users.map((user) => (
        <span
          key={user.id}
          className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
          title={user.email}
        >
          <span className="truncate">{displayUser(user)}</span>
        </span>
      ))}
    </div>
  );
}

function ActionHistory({ action }: { action: ApplicationProgressAction }) {
  return (
    <div className="rounded-md bg-white/70 px-3 py-2">
      <p className="text-sm font-medium text-slate-800">
        {displayUser(action.actedBy)} が {actionLabel(action.action)}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {formatDateTime(action.actedAt)}
      </p>
    </div>
  );
}
