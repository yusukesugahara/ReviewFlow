import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  backendAuthFetchJson,
  BackendHttpError,
  errorMessageFromBody,
} from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { getCurrentSessionUser } from "@/lib/server/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getApplicationCapabilities } from "@/app/_components/applications/application-capabilities";
import { ApplicantApplicationActions } from "@/app/_components/applications/applicant-application-actions";
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

async function submitAction(spaceId: string, applicationId: string): Promise<void> {
  "use server";
  let updated: ApplicationDetailViewModel;
  try {
    const updatedRaw = await backendAuthFetchJson(`/applications/${applicationId}/submit`, {
      method: "POST",
      body: {},
    });
    updated = unwrapData<ApplicationDetailViewModel>(updatedRaw);
  } catch (error) {
    redirectToApplicationActionError(spaceId, applicationId, error);
  }
  redirectToApplicationDetail(updated, "申請を提出しました");
}

async function resubmitAction(spaceId: string, applicationId: string): Promise<void> {
  "use server";
  let updated: ApplicationDetailViewModel;
  try {
    const updatedRaw = await backendAuthFetchJson(`/applications/${applicationId}/resubmit`, {
      method: "POST",
      body: {},
    });
    updated = unwrapData<ApplicationDetailViewModel>(updatedRaw);
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
    const updatedRaw = await backendAuthFetchJson(`/applications/${applicationId}/approve`, {
      method: "POST",
      body: { comment: typeof comment === "string" ? comment : undefined },
    });
    updated = unwrapData<ApplicationDetailViewModel>(updatedRaw);
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
    const updatedRaw = await backendAuthFetchJson(`/applications/${applicationId}/reject`, {
      method: "POST",
      body: { comment: typeof comment === "string" ? comment : undefined },
    });
    updated = unwrapData<ApplicationDetailViewModel>(updatedRaw);
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
    const updatedRaw = await backendAuthFetchJson(`/applications/${applicationId}/return`, {
      method: "POST",
      body: {
        overallComment:
          typeof overallComment === "string" && overallComment.trim().length > 0
            ? overallComment
            : undefined,
        fields,
      },
    });
    updated = unwrapData<ApplicationDetailViewModel>(updatedRaw);
  } catch (error) {
    redirectToApplicationActionError(spaceId, applicationId, error);
  }
  redirectToApplicationDetail(updated, "申請を差し戻しました");
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
  if (!(error instanceof BackendHttpError)) {
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
    const appRaw = await backendAuthFetchJson(`/applications/${applicationId}`);
    const app = unwrapData<ApplicationDetailViewModel>(appRaw);
    const definitionId = app.formDefinitionId ?? query.definitionId;
    const [templateRaw, correctionsRaw, correctionTargetsRaw] = await Promise.all([
      definitionId
        ? backendAuthFetchJson(`/form-definitions/${definitionId}`)
        : backendAuthFetchJson(
            `/form-definitions?groupId=${encodeURIComponent(spaceId)}`,
          ),
      backendAuthFetchJson(`/applications/${applicationId}/corrections`),
      backendAuthFetchJson(`/applications/${applicationId}/correction-targets`),
    ]);
    const definition = definitionId
      ? unwrapData<{ fields?: ApplicationFormField[] }>(templateRaw)
      : (unwrapData<{ definitions?: { fields?: ApplicationFormField[] }[] }>(
          templateRaw,
        ).definitions?.[0] ?? null);
    const fields = definition?.fields ?? [];
    const corrections =
      unwrapData<{ corrections?: ApplicationCorrection[] }>(correctionsRaw)
        .corrections ?? [];
    const openItems =
      unwrapData<{
        openCorrection?: { items?: ApplicationCorrectionTargetItem[] } | null;
      }>(correctionTargetsRaw).openCorrection?.items ?? [];
    const actor = await getCurrentSessionUser();
    const capabilities = getApplicationCapabilities(app, actor);
    const fieldMap = fields.map((field) => ({ id: field.id, key: field.fieldKey }));
    const missingRequiredFields = getMissingRequiredFields(fields, app.values);
    const publicApplicationUrlPath = definitionId
      ? `/apply/${encodeURIComponent(spaceId)}?formDefinitionId=${encodeURIComponent(definitionId)}`
      : `/apply/${encodeURIComponent(spaceId)}`;
    const actionCapabilities = {
      ...capabilities,
      canSubmitApplication:
        capabilities.canSubmitApplication && missingRequiredFields.length === 0,
    };

    return (
      <ApplicationDetailView
        title="申請詳細"
        application={app}
        fields={fields}
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
    if (error instanceof BackendHttpError) {
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
