import Link from "next/link";
import { ArrowLeft, CalendarClock, ClipboardList, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApplicantApplicationActions } from "@/app/_components/applications/applicant-application-actions";
import { ApplicationStatusBadge } from "@/app/_components/applications/application-status-badge";
import { PublicApplicationUrlCard } from "@/app/_components/applications/public-application-url-card";
import { DynamicFieldInput } from "@/app/_components/applications/dynamic-fields";
import { ApplicationDetailView } from "@/app/_components/applications/application-detail-view";
import { ReviewerApplicationActions } from "@/app/_components/applications/reviewer-application-actions";
import { buildSpaceApplicationEditHrefByIds } from "@/app/_components/applications/application-routes";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
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
  isFormDetail: boolean;
  missingRequiredFields: ApplicationFormField[];
  openItems: ApplicationCorrectionTargetItem[];
  publicApplicationUrlPath: string;
  rejectAction: (formData: FormData) => Promise<void>;
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
        <Button asChild className="shrink-0">
          <Link href={editHref}>
            <Edit3 aria-hidden="true" />
            編集
          </Link>
        </Button>
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

      <PublicApplicationUrlCard path={publicApplicationUrlPath} />

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">フォームの内容</CardTitle>
              <CardDescription>
                利用者が申請時に見る入力フォームです
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={editHref}>
                <Edit3 aria-hidden="true" />
                編集
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-muted-foreground">
              フォーム項目はまだありません
            </p>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      項目 {index + 1}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                      {field.fieldType}
                    </span>
                  </div>
                  <DynamicFieldInput
                    field={{ ...field, required: field.required ?? false }}
                    value={null}
                  />
                </div>
              ))}
              <Button type="button" disabled className="w-full">
                申請を送信
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
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
  isFormDetail,
  missingRequiredFields,
  openItems,
  publicApplicationUrlPath,
  rejectAction,
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
      showApplicantEmail
      showCurrentStep
      showTimestamps
      showCorrectionHistory
      showOpenCorrectionSummary
      publicApplicationUrlPath={publicApplicationUrlPath}
      actions={
        <div className="space-y-3">
          {actionError ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {actionError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/space/${encodeURIComponent(spaceId)}/applications`}>
                一覧へ戻る
              </Link>
            </Button>
            <ApplicantApplicationActions
              capabilities={actionCapabilities}
              editHref={editHref}
              submitAction={submitAction}
              resubmitAction={resubmitAction}
            />
          </div>
          {capabilities.canSubmitApplication &&
          missingRequiredFields.length > 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              必須項目が未入力のため提出できません。必要な入力値を登録してから提出してください。
            </p>
          ) : null}
        </div>
      }
      reviewerActions={
        <ReviewerApplicationActions
          fields={fields}
          capabilities={capabilities}
          approveAction={approveAction}
          rejectAction={rejectAction}
          returnAction={returnAction}
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
  return value ? new Date(value).toLocaleString("ja-JP") : "-";
}
