import Link from "next/link";
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">フォーム詳細画面</h2>
          <p className="text-muted-foreground">
            利用者に公開する申請フォームの内容と受付状況を確認できます
          </p>
        </div>
        <Button asChild>
          <Link href={editHref}>編集</Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <InfoPanel label="作成日" value={formatDateTime(definition?.createdAt ?? application.createdAt)} />
        <InfoPanel label="更新日" value={formatDateTime(definition?.updatedAt ?? application.updatedAt)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <InfoPanel label="申請件数" value={relatedApplications.length} strong />
        <InfoPanel label="差し戻し件数" value={returnCount} strong />
        <InfoPanel label="確認待ち件数" value={waitingCount} strong />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{definition?.name ?? "フォーム"}</CardTitle>
              <CardDescription>説明欄</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <DescriptionEditModal
                action={descriptionAction}
                initialDescription={definition?.description ?? ""}
              />
              <ApplicationStatusBadge
                status={definition?.status ?? application.status}
                className="px-3 py-1"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {definition?.description?.trim() || "説明は設定されていません。"}
          </p>
        </CardContent>
      </Card>

      <PublicApplicationUrlCard path={publicApplicationUrlPath} />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>フォームの内容</CardTitle>
              <CardDescription>
                利用者が申請時に見る入力フォームです
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={editHref}>編集</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              フォーム項目はまだありません
            </p>
          ) : (
            <div className="space-y-6">
              {fields.map((field) => (
                <DynamicFieldInput
                  key={field.id}
                  field={{ ...field, required: field.required ?? false }}
                  value={null}
                />
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
  strong = false,
}: {
  label: string;
  value: string | number;
  strong?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={strong ? "mt-1 text-2xl font-semibold tabular-nums" : "mt-1 text-sm text-slate-900"}>
        {value}
      </p>
    </div>
  );
}

function formatDateTime(value?: string): string {
  return value ? new Date(value).toLocaleString("ja-JP") : "-";
}
