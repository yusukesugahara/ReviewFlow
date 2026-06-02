import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarClock, ClipboardList, Mail, Route } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTimeJa } from "@/lib/date-format";
import { PageHeader } from "@/app/_components/enterprise/page-header";
import { ApprovalProgressDiagram } from "./approval-progress-diagram";
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
} from "./application-detail.types";

export { ApprovalProgressDiagram } from "./approval-progress-diagram";

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
  const currentStep = getCurrentStep(application);
  const submittedAt = application.submittedAt ?? application.createdAt ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Application detail"
        title={title}
        description={description ?? `ID: ${application.id.slice(0, 12)}...`}
        status={
          <ApplicationStatusBadge
            status={application.status}
            className="px-3 py-1 text-sm"
          />
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <ApplicationBasicInfo
            application={application}
            formDetailHref={formDetailHref}
            showApplicantEmail={showApplicantEmail}
            showCurrentStep={showCurrentStep}
            showTimestamps={showTimestamps}
          />

          <ApplicationFieldsCard
            application={application}
            fields={fields}
            title={fieldsTitle}
            description={descriptionForFields(fieldsDescription, fields.length)}
            openCorrectionItems={openCorrectionItems}
            canReturnApplication={canReturnApplication}
            returnAction={returnAction}
            decisionActions={reviewerActions}
          />

          <ApprovalProgressDiagram
            application={application}
            corrections={corrections}
            fields={fields}
            steps={application.approvalProgress ?? []}
          />

          {showOpenCorrectionSummary && openCorrectionItems.length > 0 ? (
            <OpenCorrectionSummary items={openCorrectionItems} />
          ) : null}

          {showCorrectionHistory ? (
            <CorrectionHistory corrections={corrections} />
          ) : null}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
          <ApplicationSideSummary
            application={application}
            currentStepName={currentStep?.stepName}
            formDetailHref={formDetailHref}
            submittedAt={submittedAt}
          />
          {actions ? <ActionPanel>{actions}</ActionPanel> : null}
          {publicApplicationUrlPath ? (
            <PublicApplicationUrlCard path={publicApplicationUrlPath} />
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function descriptionForFields(description: string, fieldsCount: number): string {
  return `${description}。${fieldsCount}項目の入力内容を確認できます。`;
}

function getCurrentStep(application: ApplicationDetailViewModel) {
  return application.approvalProgress?.find((step) => step.status === "current");
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
  const currentStep = getCurrentStep(application);
  const applicationStatus = currentStep
    ? `${application.status} / STEP ${currentStep.stepOrder}: ${currentStep.stepName}`
    : application.status;

  return (
    <Card>
      <CardHeader className="border-b border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>基本情報</CardTitle>
            <CardDescription>申請の対象フォーム、申請者、現在の状態です</CardDescription>
          </div>
          <ApplicationStatusBadge status={application.status} />
        </div>
      </CardHeader>
      <CardContent className="pt-6">
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

function ApplicationSideSummary({
  application,
  currentStepName,
  formDetailHref,
  submittedAt,
}: {
  application: ApplicationDetailViewModel;
  currentStepName?: string;
  formDetailHref?: string | null;
  submittedAt?: string | null;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="text-base">申請サマリー</CardTitle>
        <CardDescription>ID: {application.id.slice(0, 12)}...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <SummaryRow
          icon={<ClipboardList className="size-4" aria-hidden="true" />}
          label="フォーム"
          value={application.formDefinitionName ?? application.applicationName ?? "-"}
          href={formDetailHref}
        />
        <SummaryRow
          icon={<Mail className="size-4" aria-hidden="true" />}
          label="申請者"
          value={application.applicantEmail ?? "-"}
          mono
        />
        <SummaryRow
          icon={<Route className="size-4" aria-hidden="true" />}
          label="現在のステップ"
          value={currentStepName ?? "完了または未開始"}
        />
        <SummaryRow
          icon={<CalendarClock className="size-4" aria-hidden="true" />}
          label="申請日時"
          value={formatDateTime(submittedAt)}
        />
      </CardContent>
    </Card>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  href,
  mono = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string | null;
  mono?: boolean;
}) {
  const text = (
    <span
      className={`break-words text-sm font-medium text-slate-900 ${
        mono ? "font-mono text-xs" : ""
      }`}
    >
      {value}
    </span>
  );

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
        {icon}
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {href ? (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-700 underline-offset-2 hover:underline"
          >
            {text}
          </Link>
        ) : (
          text
        )}
      </div>
    </div>
  );
}

function ActionPanel({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="text-base">操作</CardTitle>
        <CardDescription>この申請に対して実行できる操作です</CardDescription>
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
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
      <CardHeader className="border-b border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="secondary">{fields.length}項目</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
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
      <CardHeader className="border-b border-slate-200">
        <CardTitle>現在オープン中の修正対象</CardTitle>
        <CardDescription>
          {items.length}個のフィールドが差し戻し対象となっています
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
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
      <CardHeader className="border-b border-slate-200">
        <CardTitle>差し戻し履歴</CardTitle>
        <CardDescription>
          {corrections.length === 0
            ? "差し戻し履歴はありません"
            : `${corrections.length}件の差し戻しがあります`}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
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
