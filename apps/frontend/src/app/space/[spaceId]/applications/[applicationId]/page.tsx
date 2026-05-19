import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import { getAccessTokenFromCookie, getCurrentSessionUser } from "@/lib/server/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getApplicationCapabilities } from "@/app/_components/applications/application-capabilities";
import { ApplicantApplicationActions } from "@/app/_components/applications/applicant-application-actions";
import { ApplicationStatusBadge } from "@/app/_components/applications/application-status-badge";
import { PublicApplicationUrlCard } from "@/app/_components/applications/public-application-url-card";
import { DynamicFieldInput } from "@/app/_components/applications/dynamic-fields";
import { DescriptionEditModal } from "./description-edit-modal";
import {
  ApplicationDetailView,
  type ApplicationCorrection,
  type ApplicationCorrectionTargetItem,
  type ApplicationDetailViewModel,
  type ApplicationFormField,
} from "@/app/_components/applications/application-detail-view";
import {
  buildSpaceApplicationDetailHref,
  buildSpaceApplicationEditHrefByIds,
} from "@/app/_components/applications/application-routes";
import { ReviewerApplicationActions } from "@/app/_components/applications/reviewer-application-actions";

type PageProps = {
  params: Promise<{ spaceId: string; applicationId: string }>;
  searchParams?: Promise<{ actionError?: string; definitionId?: string }>;
};
type ApiFailure = { status: number; body: unknown };

type FormDefinitionDetail = {
  createdAt?: string;
  description?: string | null;
  fields?: ApplicationFormField[];
  id?: string;
  name?: string;
  status?: string;
  updatedAt?: string;
};

type ApplicationSummary = {
  formDefinitionId?: string | null;
  id: string;
  status: string;
};

async function authHeadersOrRedirect(): Promise<{ Authorization: string }> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }
  return { Authorization: `Bearer ${accessToken}` };
}

function isApiFailure(error: unknown): error is ApiFailure {
  return (
    !!error &&
    typeof error === "object" &&
    typeof (error as ApiFailure).status === "number" &&
    "body" in error
  );
}

function errorMessageFromBody(body: unknown): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return "申請の操作に失敗しました";
}

async function postApplicationAction(
  path:
    | "/applications/{id}/submit"
    | "/applications/{id}/resubmit"
    | "/applications/{id}/approve"
    | "/applications/{id}/reject"
    | "/applications/{id}/return",
  applicationId: string,
  body: Record<string, unknown>,
): Promise<ApplicationDetailViewModel> {
  const response = await client.POST(path, {
    params: { path: { id: applicationId } },
    body,
    headers: await authHeadersOrRedirect(),
  });
  if (!response.response.ok || !response.data) {
    throw { status: response.response.status, body: response.error };
  }
  return unwrapData<ApplicationDetailViewModel>(response.data);
}

async function submitAction(spaceId: string, applicationId: string): Promise<void> {
  "use server";
  let updated: ApplicationDetailViewModel;
  try {
    updated = await postApplicationAction("/applications/{id}/submit", applicationId, {});
  } catch (error) {
    redirectToApplicationActionError(spaceId, applicationId, error);
  }
  redirectToApplicationDetail(updated, "申請を提出しました");
}

async function resubmitAction(spaceId: string, applicationId: string): Promise<void> {
  "use server";
  let updated: ApplicationDetailViewModel;
  try {
    updated = await postApplicationAction("/applications/{id}/resubmit", applicationId, {});
  } catch (error) {
    redirectToApplicationActionError(spaceId, applicationId, error);
  }
  redirectToApplicationDetail(updated, "申請を再提出しました");
}

async function approveAction(
  spaceId: string,
  applicationId: string,
  formData: FormData,
): Promise<void> {
  "use server";
  const comment = formData.get("comment");
  let updated: ApplicationDetailViewModel;
  try {
    updated = await postApplicationAction("/applications/{id}/approve", applicationId, {
      comment: typeof comment === "string" ? comment : undefined,
    });
  } catch (error) {
    redirectToApplicationActionError(spaceId, applicationId, error);
  }
  redirectToApplicationDetail(updated, "申請を承認しました");
}

async function rejectAction(
  spaceId: string,
  applicationId: string,
  formData: FormData,
): Promise<void> {
  "use server";
  const comment = formData.get("comment");
  let updated: ApplicationDetailViewModel;
  try {
    updated = await postApplicationAction("/applications/{id}/reject", applicationId, {
      comment: typeof comment === "string" ? comment : undefined,
    });
  } catch (error) {
    redirectToApplicationActionError(spaceId, applicationId, error);
  }
  redirectToApplicationDetail(updated, "申請を却下しました");
}

async function returnAction(
  spaceId: string,
  applicationId: string,
  fieldMap: Array<{ id: string; key: string }>,
  formData: FormData,
): Promise<void> {
  "use server";
  const overallComment = formData.get("overallComment");
  const fields: Array<{ fieldId: string; comment?: string }> = [];
  for (const field of fieldMap) {
    const selected = formData.get(`return:${field.id}`) === "on";
    if (!selected) {
      continue;
    }
    const comment = formData.get(`comment:${field.id}`);
    fields.push({
      fieldId: field.id,
      comment: typeof comment === "string" && comment.trim().length > 0 ? comment : undefined,
    });
  }

  if (fields.length === 0) {
    redirectToApplicationValidationError(
      spaceId,
      applicationId,
      "差し戻し対象の項目を選択してください。",
    );
  }

  let updated: ApplicationDetailViewModel;
  try {
    updated = await postApplicationAction("/applications/{id}/return", applicationId, {
      overallComment:
        typeof overallComment === "string" && overallComment.trim().length > 0
          ? overallComment
          : undefined,
      fields,
    });
  } catch (error) {
    redirectToApplicationActionError(spaceId, applicationId, error);
  }
  redirectToApplicationDetail(updated, "申請を差し戻しました");
}

async function updateDescriptionAction(
  spaceId: string,
  applicationId: string,
  definitionId: string,
  formData: FormData,
): Promise<void> {
  "use server";
  const description = formData.get("description");
  const detailHref = buildFormDetailHref(spaceId, applicationId, definitionId);
  const response = await client.PATCH("/form-definitions/{id}/description", {
    params: { path: { id: definitionId } },
    body: {
      description: typeof description === "string" ? description : undefined,
    },
    headers: await authHeadersOrRedirect(),
  });
  if (!response.response.ok) {
    const params = new URLSearchParams({
      view: "form",
      definitionId,
      toast: "error",
      message: "説明欄の更新に失敗しました",
    });
    redirect(
      `/space/${encodeURIComponent(spaceId)}/applications/${encodeURIComponent(applicationId)}?${params.toString()}`,
    );
  }
  revalidatePath(detailHref);
  revalidatePath(`/space/${encodeURIComponent(spaceId)}/applications`);
  redirect(
    `${detailHref}&${new URLSearchParams({
      toast: "success",
      message: "保存しました",
    }).toString()}`,
  );
}

function buildFormDetailHref(
  spaceId: string,
  applicationId: string,
  definitionId: string,
): string {
  return `/space/${encodeURIComponent(spaceId)}/applications/${encodeURIComponent(applicationId)}?${new URLSearchParams({
    view: "form",
    definitionId,
  }).toString()}`;
}

function redirectToApplicationDetail(
  application: ApplicationDetailViewModel,
  message?: string,
): never {
  const detailHref = buildSpaceApplicationDetailHref(application);
  if (detailHref) {
    revalidatePath(detailHref);
    revalidatePath(`/space/${encodeURIComponent(application.groupId ?? "")}/applications`);
    if (message) {
      const params = new URLSearchParams({
        toast: "success",
        message,
      });
      redirect(`${detailHref}?${params.toString()}`);
    }
    redirect(detailHref);
  }

  redirect("/space");
}

function redirectToApplicationValidationError(
  spaceId: string,
  applicationId: string,
  message: string,
): never {
  const detailHref = buildSpaceApplicationDetailHref({
    id: applicationId,
    groupId: spaceId,
  });
  const params = new URLSearchParams({ actionError: message });
  redirect(`${detailHref ?? "/space"}?${params.toString()}`);
}

function redirectToApplicationActionError(
  spaceId: string,
  applicationId: string,
  error: unknown,
): never {
  const detailHref = buildSpaceApplicationDetailHref({
    id: applicationId,
    groupId: spaceId,
  });
  const params = new URLSearchParams({
    toast: "error",
    message: applicationActionErrorMessage(error),
  });
  redirect(`${detailHref ?? "/space"}?${params.toString()}`);
}

function applicationActionErrorMessage(error: unknown): string {
  if (!isApiFailure(error)) {
    return "申請の操作に失敗しました";
  }

  const errorCode =
    error.body && typeof error.body === "object" && "errorCode" in error.body
      ? (error.body as { errorCode: unknown }).errorCode
      : null;

  if (errorCode === "APPLICATION_NOT_DRAFT") {
    return "下書きまたは公開済みの申請のみ提出できます。画面を更新して状態を確認してください。";
  }
  if (errorCode === "APPLICATION_REQUIRED_FIELDS_MISSING") {
    return "必須項目を入力してから提出してください。";
  }
  if (errorCode === "APPLICATION_ACCESS_DENIED") {
    return "この申請を操作する権限がありません。";
  }
  if (errorCode === "APPLICATION_NO_APPROVAL_FLOW") {
    return "このスペースに有効な承認フローがありません。";
  }
  if (errorCode === "APPLICATION_NOT_IN_REVIEW") {
    return "承認待ち状態の申請のみ操作できます。画面を更新して状態を確認してください。";
  }
  if (errorCode === "APPLICATION_APPROVAL_FORBIDDEN") {
    return "現在の承認ステップを操作する権限がありません。";
  }
  if (errorCode === "APPLICATION_RETURN_NOT_ALLOWED") {
    return "現在の承認ステップでは差し戻しできません。";
  }
  if (errorCode === "APPLICATION_RETURN_FIELDS_INVALID") {
    return "差し戻し対象の項目が不正です。画面を更新して再度お試しください。";
  }
  if (errorCode === "APPLICATION_CORRECTION_ALREADY_OPEN") {
    return "この申請には未解決の差し戻し依頼が既にあります。";
  }

  return `${errorMessageFromBody(error.body)}（status: ${error.status}）`;
}

function hasRequiredValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

function getMissingRequiredFields(
  fields: ApplicationFormField[],
  values: Record<string, unknown>,
): ApplicationFormField[] {
  return fields.filter(
    (field) => field.required && !hasRequiredValue(values[field.fieldKey]),
  );
}

function isFormSetupStatus(status: string): boolean {
  return (
    status === APPLICATION_STATUSES.draft ||
    status === APPLICATION_STATUSES.published
  );
}

function formatDateTime(value?: string): string {
  return value ? new Date(value).toLocaleString("ja-JP") : "-";
}

function FormDetailView({
  application,
  definition,
  fields,
  relatedApplications,
  publicApplicationUrlPath,
  editHref,
  descriptionAction,
}: {
  application: ApplicationDetailViewModel;
  definition: FormDefinitionDetail | null;
  fields: ApplicationFormField[];
  relatedApplications: ApplicationSummary[];
  publicApplicationUrlPath: string;
  editHref: string;
  descriptionAction: (formData: FormData) => Promise<void>;
}) {
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

export default async function SpaceApplicationDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ spaceId, applicationId }, query] = await Promise.all([
    params,
    searchParams ??
      Promise.resolve({} as { actionError?: string; definitionId?: string }),
  ]);

  try {
    const authHeaders = await authHeadersOrRedirect();
    const appRaw = await client.GET("/applications/{id}", {
      params: { path: { id: applicationId } },
      headers: authHeaders,
    });
    if (!appRaw.response.ok || !appRaw.data) {
      throw { status: appRaw.response.status, body: appRaw.error };
    }
    const app = unwrapData<ApplicationDetailViewModel>(appRaw.data);
    const definitionId = app.formDefinitionId ?? query.definitionId;
    const [templateRaw, correctionsRaw, correctionTargetsRaw] = await Promise.all([
      definitionId
        ? client.GET("/form-definitions/{id}", {
            params: { path: { id: definitionId } },
            headers: authHeaders,
          })
        : client.GET("/form-definitions", {
            params: { query: { groupId: spaceId } },
            headers: authHeaders,
          }),
      client.GET("/applications/{id}/corrections", {
        params: { path: { id: applicationId } },
        headers: authHeaders,
      }),
      client.GET("/applications/{id}/correction-targets", {
        params: { path: { id: applicationId } },
        headers: authHeaders,
      }),
    ]);
    if (!templateRaw.response.ok || !templateRaw.data) {
      throw { status: templateRaw.response.status, body: templateRaw.error };
    }
    if (!correctionsRaw.response.ok || !correctionsRaw.data) {
      throw { status: correctionsRaw.response.status, body: correctionsRaw.error };
    }
    if (!correctionTargetsRaw.response.ok || !correctionTargetsRaw.data) {
      throw { status: correctionTargetsRaw.response.status, body: correctionTargetsRaw.error };
    }
    const definition = definitionId
      ? unwrapData<FormDefinitionDetail>(templateRaw.data)
      : (unwrapData<{ definitions?: { fields?: ApplicationFormField[] }[] }>(
          templateRaw.data,
        ).definitions?.[0] ?? null);
    const fields = definition?.fields ?? [];
    const corrections =
      unwrapData<{ corrections?: ApplicationCorrection[] }>(correctionsRaw.data)
        .corrections ?? [];
    const openItems =
      unwrapData<{
        openCorrection?: { items?: ApplicationCorrectionTargetItem[] } | null;
      }>(correctionTargetsRaw.data).openCorrection?.items ?? [];
    const actor = await getCurrentSessionUser();
    const capabilities = getApplicationCapabilities(app, actor);
    const fieldMap = fields.map((field) => ({ id: field.id, key: field.fieldKey }));
    const missingRequiredFields = getMissingRequiredFields(fields, app.values);
    const publicApplicationUrlPath = definitionId
      ? `/apply/${encodeURIComponent(spaceId)}?formDefinitionId=${encodeURIComponent(definitionId)}`
      : `/apply/${encodeURIComponent(spaceId)}`;
    const isFormDetail = isFormSetupStatus(app.status);
    const actionCapabilities = {
      ...capabilities,
      canSubmitApplication:
        capabilities.canSubmitApplication && missingRequiredFields.length === 0,
    };

    if (isFormDetail) {
      const applicationsRaw = await client.GET("/applications", {
        params: { query: { groupId: spaceId } },
        headers: authHeaders,
      });
      if (!applicationsRaw.response.ok || !applicationsRaw.data) {
        throw { status: applicationsRaw.response.status, body: applicationsRaw.error };
      }
      const relatedApplications =
        unwrapData<{ applications?: ApplicationSummary[] }>(applicationsRaw.data)
          .applications?.filter(
            (row) =>
              row.formDefinitionId === definitionId &&
              !isFormSetupStatus(row.status),
          ) ?? [];
      const editHref = definitionId
        ? `${buildSpaceApplicationEditHrefByIds(
            spaceId,
            app.id,
          )}?definitionId=${encodeURIComponent(definitionId)}`
        : buildSpaceApplicationEditHrefByIds(spaceId, app.id);

      return (
        <FormDetailView
          application={app}
          definition={definition as FormDefinitionDetail | null}
          fields={fields}
          relatedApplications={relatedApplications}
          publicApplicationUrlPath={publicApplicationUrlPath}
          editHref={editHref}
          descriptionAction={updateDescriptionAction.bind(
            null,
            spaceId,
            app.id,
            definitionId ?? "",
          )}
        />
      );
    }

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
            {query.actionError ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {query.actionError}
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
                editHref={
                  definitionId
                    ? `${buildSpaceApplicationEditHrefByIds(
                        spaceId,
                        app.id,
                      )}?definitionId=${encodeURIComponent(definitionId)}`
                    : buildSpaceApplicationEditHrefByIds(spaceId, app.id)
                }
                submitAction={submitAction.bind(null, spaceId, app.id)}
                resubmitAction={resubmitAction.bind(null, spaceId, app.id)}
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
            approveAction={approveAction.bind(null, spaceId, app.id)}
            rejectAction={rejectAction.bind(null, spaceId, app.id)}
            returnAction={returnAction.bind(null, spaceId, app.id, fieldMap)}
          />
        }
      />
    );
  } catch (error) {
    if (isApiFailure(error)) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              申請詳細の取得に失敗しました（status: {error.status}）
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">申請詳細の取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }
}
