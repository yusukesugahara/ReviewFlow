import Link from "next/link";
import { ArrowLeft, CalendarClock, ClipboardList, Edit3 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApplicantApplicationActions } from "@/app/_components/applications/applicant-application-actions";
import { ApplicationStatusBadge } from "@/app/_components/applications/application-status-badge";
import { PublicApplicationUrlCopyButton } from "@/app/_components/applications/public-application-url-card";
import { DynamicFieldsTable } from "@/app/_components/applications/dynamic-fields";
import {
  ApplicationDetailView,
  ApprovalProgressDiagram,
} from "@/app/_components/applications/application-detail-view";
import { ReviewerApplicationActions } from "@/app/_components/applications/reviewer-application-actions";
import { buildSpaceApplicationEditHrefByIds } from "@/app/_components/applications/application-routes";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import { formatDateTimeJa } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import { DescriptionEditModal } from "./description-edit-modal";
import type {
  ApplicationCorrection,
  ApplicationCorrectionTargetItem,
  ApplicationDetailViewModel,
  ApplicationFormField,
} from "@/app/_components/applications/application-detail.types";
import type { ApplicationCapabilities } from "@/app/_components/applications/application-capabilities";
import type { FormDetailViewProps } from "./types";

type ApplicationDetailScreenProps = {
  actionError?: string;
  app: ApplicationDetailViewModel;
  approveAction: (formData: FormData) => Promise<void>;
  capabilities: ApplicationCapabilities;
  corrections: ApplicationCorrection[];
  definitionId?: string;
  fields: ApplicationFormField[];
  formDetailHref?: string | null;
  isFormDetail: boolean;
  missingRequiredFields: ApplicationFormField[];
  openItems: ApplicationCorrectionTargetItem[];
  rejectAction: (formData: FormData) => Promise<void>;
  resendReturnEmailAction: () => Promise<void>;
  resubmitAction: () => Promise<void>;
  returnAction: (formData: FormData) => Promise<void>;
  spaceId: string;
  submitAction: () => Promise<void>;
};

export function FormDetailView({
  application,
  definition,
  fields,
  relatedApplications,
  spaceId,
  publicApplicationUrlPath,
  editHref,
  descriptionAction,
}: FormDetailViewProps) {
  const returnCount = relatedApplications.filter(
    (row) => row.status === APPLICATION_STATUSES.returned,
  ).length;
  const waitingCount = relatedApplications.filter(
    (row) =>
      row.status === APPLICATION_STATUSES.submitted ||
      row.status === APPLICATION_STATUSES.inReview,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-1">
            <Link href={`/space/${encodeURIComponent(spaceId)}/applications`}>
              <ArrowLeft aria-hidden="true" />
              一覧へ戻る
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">
            フォーム詳細
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            利用者に公開する申請フォームの内容と受付状況を確認できます
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <ApplicationStatusBadge
                  status={definition?.status ?? application.status}
                  className="px-3 py-1"
                />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                  {fields.length}項目
                </span>
              </div>
              <div>
                <CardTitle className="break-words text-2xl leading-tight text-slate-950">
                  {definition?.name ?? "フォーム"}
                </CardTitle>
                <CardDescription className="mt-2">
                  公開フォームとして利用者に表示される内容です
                </CardDescription>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <DescriptionEditModal
                action={descriptionAction}
                initialDescription={definition?.description ?? ""}
              />
              <PublicApplicationUrlCopyButton path={publicApplicationUrlPath} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-500">説明</p>
            <p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
              {definition?.description?.trim() || "説明は設定されていません。"}
            </p>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <TimestampPanel
              label="作成日"
              value={formatDateTime(definition?.createdAt ?? application.createdAt)}
            />
            <TimestampPanel
              label="更新日"
              value={formatDateTime(definition?.updatedAt ?? application.updatedAt)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <InfoPanel label="申請件数" value={relatedApplications.length} tone="blue" />
        <InfoPanel label="差し戻し件数" value={returnCount} tone="amber" />
        <InfoPanel label="確認待ち件数" value={waitingCount} tone="slate" />
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">フォームの内容</CardTitle>
              <CardDescription>
                利用者が申請時に見る入力フォームです
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={editHref}
                    className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
                    aria-label="フォームの内容を編集"
                  >
                    <Edit3 aria-hidden="true" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>フォームの内容を編集</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-muted-foreground">
              フォーム項目はまだありません
            </p>
          ) : (
            <div className="space-y-4">
              <DynamicFieldsTable
                fields={fields.map((field) => ({
                  ...field,
                  required: field.required ?? false,
                }))}
              />
              <Button type="button" disabled className="w-full">
                申請を送信
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ApprovalProgressDiagram
        application={application}
        corrections={[]}
        fields={fields}
        steps={application.approvalProgress ?? []}
      />
    </div>
  );
}

export function ApplicationDetailScreen({
  actionError,
  app,
  approveAction,
  capabilities,
  corrections,
  definitionId,
  fields,
  formDetailHref,
  isFormDetail,
  missingRequiredFields,
  openItems,
  rejectAction,
  resendReturnEmailAction,
  resubmitAction,
  returnAction,
  spaceId,
  submitAction,
}: ApplicationDetailScreenProps) {
  const actionCapabilities = {
    ...capabilities,
    canSubmitApplication:
      capabilities.canSubmitApplication && missingRequiredFields.length === 0,
  };
  const editHref = definitionId
    ? `${buildSpaceApplicationEditHrefByIds(
        spaceId,
        app.id,
      )}?definitionId=${encodeURIComponent(definitionId)}`
    : buildSpaceApplicationEditHrefByIds(spaceId, app.id);
  const canResendReturnEmail =
    app.status === APPLICATION_STATUSES.returned && openItems.length > 0;

  return (
    <ApplicationDetailView
      title={isFormDetail ? "フォーム詳細画面" : "申請詳細"}
      description={
        isFormDetail
          ? "利用者に公開する申請フォームの項目、公開URL、公開状態を確認できます"
          : undefined
      }
      application={app}
      fields={fields}
      fieldsTitle={isFormDetail ? "フォーム項目" : undefined}
      fieldsDescription={
        isFormDetail
          ? "利用者が申請時に入力する項目を確認できます"
          : undefined
      }
      openCorrectionItems={openItems}
      corrections={corrections}
      formDetailHref={formDetailHref}
      showApplicantEmail
      showCurrentStep
      showTimestamps
      showCorrectionHistory
      showOpenCorrectionSummary
      canReturnApplication={capabilities.canReturnApplication}
      returnAction={returnAction}
      actions={
        <div className="space-y-3">
          {actionError ? (
            <Alert variant="destructive">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <ApplicantApplicationActions
              capabilities={actionCapabilities}
              editHref={editHref}
              canResendReturnEmail={canResendReturnEmail}
              resendReturnEmailAction={resendReturnEmailAction}
              submitAction={submitAction}
              resubmitAction={resubmitAction}
            />
          </div>
          {capabilities.canSubmitApplication &&
          missingRequiredFields.length > 0 ? (
            <Alert variant="warning">
              <AlertDescription>
              必須項目が未入力のため提出できません。必要な入力値を登録してから提出してください。
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      }
      reviewerActions={
        <ReviewerApplicationActions
          capabilities={capabilities}
          approveAction={approveAction}
          rejectAction={rejectAction}
        />
      }
    />
  );
}

export function ApplicationDetailErrorView({ status }: { status?: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-destructive">
          {status
            ? `申請詳細の取得に失敗しました（status: ${status}）`
            : "申請詳細の取得に失敗しました"}
        </p>
      </CardContent>
    </Card>
  );
}

function InfoPanel({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "blue" | "amber" | "slate";
}) {
  const toneClass = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-white text-slate-700",
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-4 shadow-sm ${toneClass}`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-950">
        {value}
      </p>
    </div>
  );
}

function TimestampPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
        <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <p className="truncate text-xs font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function formatDateTime(value?: string): string {
  return value ? formatDateTimeJa(value) : "-";
}
