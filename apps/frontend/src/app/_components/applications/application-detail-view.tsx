"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTimeJa } from "@/lib/date-format";
import { ApplicationStatusBadge } from "./application-status-badge";
import { DynamicFieldInput, DynamicFieldsTable } from "./dynamic-fields";
import { PublicApplicationUrlCard } from "./public-application-url-card";
import { ReturnApplicationConfirmButton } from "./return-application-confirm-button";
import type {
  ApplicationCorrection,
  ApplicationCorrectionTargetItem,
  ApplicationDetailViewModel,
  ApplicationDetailViewProps,
  ApplicationFormField,
  ApplicationProgressAction,
  ApplicationProgressStep,
  ApplicationProgressUser,
} from "./application-detail.types";

export function ApplicationDetailView({
  title,
  description,
  application,
  fields,
  fieldsTitle = "申請内容",
  fieldsDescription = "入力された値を確認できます",
  openCorrectionItems = [],
  corrections = [],
  actions,
  reviewerActions,
  formDetailHref,
  showApplicantEmail = false,
  showCurrentStep = false,
  showTimestamps = false,
  showCorrectionHistory = false,
  showOpenCorrectionSummary = false,
  publicApplicationUrlPath,
  canReturnApplication = false,
  returnAction,
}: ApplicationDetailViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">
            {description ?? `ID: ${application.id.slice(0, 12)}...`}
          </p>
        </div>
        <ApplicationStatusBadge
          status={application.status}
          className="px-4 py-2 text-base"
        />
      </div>

      <ApplicationBasicInfo
        application={application}
        formDetailHref={formDetailHref}
        showApplicantEmail={showApplicantEmail}
        showCurrentStep={showCurrentStep}
        showTimestamps={showTimestamps}
      />

      <ApprovalProgressDiagram
        application={application}
        corrections={corrections}
        fields={fields}
        steps={application.approvalProgress ?? []}
      />

      {publicApplicationUrlPath ? (
        <PublicApplicationUrlCard path={publicApplicationUrlPath} />
      ) : null}

      <ApplicationFieldsCard
        application={application}
        fields={fields}
        title={fieldsTitle}
        description={fieldsDescription}
        openCorrectionItems={openCorrectionItems}
        canReturnApplication={canReturnApplication}
        returnAction={returnAction}
        decisionActions={reviewerActions}
      />

      {actions}

      {showOpenCorrectionSummary && openCorrectionItems.length > 0 ? (
        <OpenCorrectionSummary items={openCorrectionItems} />
      ) : null}

      {showCorrectionHistory ? (
        <CorrectionHistory corrections={corrections} />
      ) : null}
    </div>
  );
}

export function ApprovalProgressDiagram({
  application,
  corrections,
  fields,
  steps,
}: {
  application: ApplicationDetailViewModel;
  corrections: ApplicationCorrection[];
  fields: ApplicationFormField[];
  steps: ApplicationProgressStep[];
}) {
  if (steps.length === 0) {
    return null;
  }
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
  const gridColumns = `repeat(${visualSteps.length + 1}, minmax(0, 1fr))`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>承認ステップ</CardTitle>
        <CardDescription>
          左から右に向かって承認が進みます
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div
            className="grid w-full gap-3"
            style={{ gridTemplateColumns: gridColumns }}
          >
            <ApplicationStartCard
              application={application}
              showArrow={visualSteps.length > 0}
            />
            {visualSteps.map((step, index) => (
              <ProgressStepCard
                key={step.id}
                isSelected={step.id === selectedStepId}
                onSelect={
                  isSelectableProgressStep(step)
                    ? () => setSelectedStepId(step.id)
                    : undefined
                }
                step={step}
                showArrow={index < visualSteps.length - 1}
              />
            ))}
          </div>
          <ApprovalStepApplicationList
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

function ApprovalStepApplicationList({
  application,
  corrections,
  fields,
  selectedStepId,
  steps,
}: {
  application: ApplicationDetailViewModel;
  corrections: ApplicationCorrection[];
  fields: ApplicationFormField[];
  selectedStepId: string;
  steps: ApplicationProgressStep[];
}) {
  if (steps.length === 0) {
    return null;
  }
  const correctionsByReturnedActionId = mapCorrectionsToReturnedActions(
    steps,
    corrections,
  );
  const selectedStep = steps.find((step) => step.id === selectedStepId) ?? steps[0];
  if (!selectedStep) {
    return null;
  }
  const returnedActions = selectedStep.actions.filter(
    (action) => action.action === "returned",
  );
  const stepCorrections = returnedActions
    .map((action) => correctionsByReturnedActionId.get(action.id))
    .filter((correction): correction is ApplicationCorrection => !!correction);

  return (
    <div className="space-y-4 border-t border-slate-200 pt-5">
      <div
        key={`application-document-${selectedStep.id}`}
        className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4"
      >
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

        {stepCorrections.length > 0 ? (
          <div className="space-y-3">
            {stepCorrections.map((correction) => (
              <StepOverallCorrectionComment
                key={correction.id}
                correction={correction}
              />
            ))}
          </div>
        ) : null}

        <DynamicFieldsTable
          fields={fields.map((field) => ({
            ...field,
            required: field.required ?? false,
          }))}
          values={application.values}
          disabled
          title="申請内容"
          getRowClassName={(field) =>
            getFieldCorrectionItems(stepCorrections, field).length > 0
              ? "bg-amber-50"
              : undefined
          }
          renderValue={(field, value) => {
            const fieldCorrectionItems = getFieldCorrectionItems(
              stepCorrections,
              field,
            );
            return (
              <div className="space-y-3">
                <DynamicFieldInput
                  field={field}
                  value={value}
                  disabled
                  readOnly
                  variant="table"
                />
                {fieldCorrectionItems.length > 0 ? (
                  <div className="space-y-2">
                    {fieldCorrectionItems.map(({ correction, item }) => (
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
          }}
        />
      </div>
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
  showArrow,
}: {
  application: ApplicationDetailViewModel;
  showArrow: boolean;
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
      {showArrow ? (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-lg text-slate-400">
          →
        </span>
      ) : null}
    </div>
  );
}

function ProgressStepCard({
  isSelected,
  onSelect,
  step,
  showArrow,
}: {
  isSelected: boolean;
  onSelect?: () => void;
  step: ApplicationProgressStep;
  showArrow: boolean;
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
          <p className="text-xs font-medium text-slate-500">STEP {step.stepOrder}</p>
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
            <p className="mt-2 text-sm font-medium text-blue-700">現在このステップで確認中</p>
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
      {showArrow ? (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-lg text-slate-400">
          →
        </span>
      ) : null}
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

function progressStatusMeta(status: ApplicationProgressStep["status"]) {
  if (status === "current") {
    return {
      label: "現在",
      badgeVariant: "default" as const,
      className: "border-blue-300 bg-blue-50 shadow-sm",
    };
  }
  if (status === "approved") {
    return {
      label: "承認済み",
      badgeVariant: "secondary" as const,
      className: "border-emerald-200 bg-emerald-50",
    };
  }
  if (status === "returned") {
    return {
      label: "差し戻し",
      badgeVariant: "outline" as const,
      className: "border-amber-300 bg-amber-50",
    };
  }
  if (status === "rejected") {
    return {
      label: "却下",
      badgeVariant: "destructive" as const,
      className: "border-red-300 bg-red-50",
    };
  }
  return {
    label: "未到達",
    badgeVariant: "outline" as const,
    className: "border-slate-200 bg-slate-50",
  };
}

function isSelectableProgressStep(step: ApplicationProgressStep): boolean {
  return step.status !== "pending";
}

function displayUser(user: ApplicationProgressUser): string {
  return user.name?.trim() || user.email;
}

function actionLabel(action: string): string {
  if (action === "approved") {
    return "承認";
  }
  if (action === "returned") {
    return "差し戻し";
  }
  if (action === "rejected") {
    return "却下";
  }
  return action;
}

function mapCorrectionsToReturnedActions(
  steps: ApplicationProgressStep[],
  corrections: ApplicationCorrection[],
): Map<string, ApplicationCorrection> {
  const returnedActions = steps
    .flatMap((step) =>
      step.actions
        .filter((action) => action.action === "returned")
        .map((action) => ({ stepOrder: step.stepOrder, action })),
    )
    .sort((a, b) => {
      const actedAtDiff =
        new Date(a.action.actedAt).getTime() - new Date(b.action.actedAt).getTime();
      return actedAtDiff !== 0 ? actedAtDiff : a.stepOrder - b.stepOrder;
    });
  const sortedCorrections = [...corrections].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const mapped = new Map<string, ApplicationCorrection>();
  returnedActions.forEach(({ action }, index) => {
    const correction = sortedCorrections[index];
    if (correction) {
      mapped.set(action.id, correction);
    }
  });
  return mapped;
}

function getFieldCorrectionItems(
  corrections: ApplicationCorrection[],
  field: Pick<ApplicationFormField, "id" | "fieldKey">,
): Array<{
  correction: ApplicationCorrection;
  item: ApplicationCorrection["items"][number];
}> {
  return corrections.flatMap((correction) =>
    correction.items
      .filter(
        (item) => item.formFieldId === field.id || item.fieldKey === field.fieldKey,
      )
      .map((item) => ({ correction, item })),
  );
}

function formatDateTime(value?: string | null): string {
  return value ? formatDateTimeJa(value) : "-";
}

function ApplicationBasicInfo({
  application,
  formDetailHref,
}: {
  application: ApplicationDetailViewModel;
  formDetailHref?: string | null;
  showApplicantEmail: boolean;
  showCurrentStep: boolean;
  showTimestamps: boolean;
}) {
  const currentStep = application.approvalProgress?.find(
    (step) => step.status === "current",
  );
  const applicationStatus = currentStep
    ? `${application.status} / STEP ${currentStep.stepOrder}: ${currentStep.stepName}`
    : application.status;

  return (
    <Card>
      <CardHeader>
        <CardTitle>基本情報</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <InfoTile
          label="申請フォーム"
          value={application.formDefinitionName ?? application.applicationName ?? "-"}
          href={formDetailHref}
          className="md:col-span-2 xl:col-span-1"
        />
          <InfoTile
          label="申請者メール"
          value={application.applicantEmail ?? "-"}
          mono
          className="md:col-span-2 xl:col-span-1"
        />
          <InfoTile label="ステータス" value={applicationStatus} />
          <InfoTile
          label="作成日時"
          value={formatDateTime(application.createdAt)}
        />
          <InfoTile
          label="更新日時"
          value={formatDateTime(application.updatedAt)}
        />
        </div>
      </CardContent>
    </Card>
  );
}

function InfoTile({
  label,
  value,
  mono = false,
  className,
  href,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  className?: string;
  href?: string | null;
}) {
  const content = (
    <>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p
        className={`mt-1 truncate text-sm font-semibold text-slate-900 ${
          mono ? "font-mono" : ""
        } ${href ? "text-blue-700 underline-offset-2 group-hover:underline" : ""}`}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </p>
    </>
  );

  return (
    <div className={`min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 ${className ?? ""}`}>
      {href ? (
        <Link
          href={href}
          className="group block min-w-0"
          target="_blank"
          rel="noopener noreferrer"
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}

function ApplicationFieldsCard({
  application,
  fields,
  title,
  description,
  openCorrectionItems,
  canReturnApplication,
  returnAction,
  decisionActions,
}: {
  application: ApplicationDetailViewModel;
  fields: ApplicationFormField[];
  title: string;
  description: string;
  openCorrectionItems: ApplicationCorrectionTargetItem[];
  canReturnApplication: boolean;
  returnAction?: (formData: FormData) => Promise<void>;
  decisionActions?: ReactNode;
}) {
  const correctionTargetKeys = new Set(
    openCorrectionItems.flatMap((item) => [item.formFieldId, item.fieldKey]),
  );
  const canReturn = canReturnApplication && !!returnAction;
  const returnFormId = `return-application-${application.id}`;
  const table = (
    <DynamicFieldsTable
      fields={fields.map((field) => ({
        ...field,
        required: field.required ?? false,
      }))}
      values={application.values}
      title="申請書"
      getRowClassName={(field) =>
        correctionTargetKeys.has(field.id) || correctionTargetKeys.has(field.fieldKey)
          ? "bg-amber-50"
          : undefined
      }
      renderValue={(field, value) => {
        const isCorrectionTarget =
          correctionTargetKeys.has(field.id) || correctionTargetKeys.has(field.fieldKey);
        return (
          <div className="space-y-3">
            <DynamicFieldInput
              field={field}
              value={value}
              disabled
              readOnly
              variant="table"
            />
            {isCorrectionTarget ? (
              <p className="text-xs font-medium text-amber-700">
                差し戻し対象項目です
              </p>
            ) : null}
            {canReturn ? (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    id={`return:${field.id}`}
                    name={`return:${field.id}`}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  この項目を差し戻し対象にする
                </label>
                <Input
                  name={`comment:${field.id}`}
                  placeholder="この項目への差し戻しコメント（任意）"
                  className="bg-white text-sm"
                />
              </div>
            ) : null}
          </div>
        );
      }}
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {canReturn && returnAction ? (
          <div className="space-y-4">
            <form id={returnFormId} action={returnAction} className="space-y-4">
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <Label htmlFor="overallComment">差し戻し全体コメント（任意）</Label>
                <Textarea
                  id="overallComment"
                  name="overallComment"
                  placeholder="差し戻しの全体的な理由や説明"
                  rows={3}
                  className="bg-white"
                />
              </div>
              {table}
            </form>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <ReturnApplicationConfirmButton formId={returnFormId} />
              {decisionActions}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {table}
            {decisionActions ? (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
                {decisionActions}
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OpenCorrectionSummary({
  items,
}: {
  items: ApplicationCorrectionTargetItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>現在オープン中の修正対象</CardTitle>
        <CardDescription>
          {items.length}個のフィールドが差し戻し対象となっています
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={`${item.formFieldId}-${item.fieldKey}`}
              className="flex items-center gap-2 border-l-2 border-amber-400 p-2 pl-3"
            >
              <Badge variant="outline">{item.label}</Badge>
              <span className="font-mono text-xs text-muted-foreground">
                ({item.fieldKey})
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function CorrectionHistory({
  corrections,
}: {
  corrections: ApplicationCorrection[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>差し戻し履歴</CardTitle>
        <CardDescription>
          {corrections.length === 0
            ? "差し戻し履歴はありません"
            : `${corrections.length}件の差し戻しがあります`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {corrections.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            差し戻し履歴はありません
          </p>
        ) : (
          <div className="space-y-4">
            {corrections.map((correction) => (
              <div
                key={correction.id}
                className="space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{correction.status}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(correction.createdAt)}
                  </span>
                </div>
                {correction.overallComment ? (
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="mb-1 text-sm font-medium">総合コメント</p>
                    <p className="text-sm">{correction.overallComment}</p>
                  </div>
                ) : null}
                {correction.items.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-medium">個別コメント</p>
                    <ul className="space-y-1">
                      {correction.items.map((item) => (
                        <li
                          key={`${correction.id}-${item.fieldKey}`}
                          className="border-l-2 border-amber-400 pl-4 text-sm"
                        >
                          <span className="font-mono text-xs text-muted-foreground">
                            {item.fieldKey}:
                          </span>{" "}
                          {item.comment || "（コメントなし）"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
