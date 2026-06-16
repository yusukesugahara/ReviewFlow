"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { client } from "@/lib/server/backend-fetch";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { errorMessageFromBody, isApiFailure } from "@/lib/server/api-failure";
import type { components } from "@/lib/api-schema";
import type { ApplicationDetailViewModel } from "@/components/applications/detail/application-detail.types";
import {
  appendQueryParams,
  buildSpaceApplicationFormDetailHref,
  buildSpaceApplicationsHref,
  buildSpaceSubmissionDetailHref,
} from "@/components/applications/routing/application-routes";

const optionalStringFormValueSchema = z.string().optional().catch(undefined);
const optionalNonEmptyStringFormValueSchema = z
  .string()
  .trim()
  .min(1)
  .optional()
  .catch(undefined);
const expectedStepOrderFormValueSchema = z.coerce.number().int().min(1);

type ApproveApplicationBody = components["schemas"]["ApproveApplicationDto"];
type RejectApplicationBody = components["schemas"]["RejectApplicationDto"];
type ReturnApplicationBody = components["schemas"]["ReturnApplicationDto"];
type ApplicationActionBody =
  | ApproveApplicationBody
  | RejectApplicationBody
  | ReturnApplicationBody;

type ApplicationBodyActionPath =
  | "/applications/{id}/approve"
  | "/applications/{id}/reject"
  | "/applications/{id}/return";
type EmptyApplicationActionPath =
  | "/applications/{id}/submit"
  | "/applications/{id}/resubmit"
  | "/applications/{id}/return-email/resend";

/**
 * FormData から任意の文字列値を読み取ります。
 */
function readOptionalString(formData: FormData, key: string): string | undefined {
  return optionalStringFormValueSchema.parse(formData.get(key) || undefined);
}

/**
 * FormData から空文字を除外した任意の文字列値を読み取ります。
 */
function readOptionalNonEmptyString(
  formData: FormData,
  key: string,
): string | undefined {
  return optionalNonEmptyStringFormValueSchema.parse(formData.get(key) || undefined);
}

/**
 * 承認操作の競合確認に使う期待ステップ番号を読み取ります。
 */
function readExpectedStepOrder(formData: FormData): number | null {
  const parsed = expectedStepOrderFormValueSchema.safeParse(
    formData.get("expectedStepOrder"),
  );
  return parsed.success ? parsed.data : null;
}

/**
 * ボディ付きの申請操作 API を呼び出し、更新後の申請詳細を返します。
 */
async function postApplicationAction(
  path: ApplicationBodyActionPath,
  applicationId: string,
  body: ApplicationActionBody,
): Promise<ApplicationDetailViewModel> {
  const response = await client.POST(path, {
    params: { path: { id: applicationId } },
    body,
    headers: await authHeadersOrRedirect(),
  });
  return unwrapResponseData<ApplicationDetailViewModel>(response);
}

/**
 * ボディなしの申請操作 API を呼び出し、更新後の申請詳細を返します。
 */
async function postEmptyApplicationAction(
  path: EmptyApplicationActionPath,
  applicationId: string,
): Promise<ApplicationDetailViewModel> {
  const response = await client.POST(path, {
    params: { path: { id: applicationId } },
    headers: await authHeadersOrRedirect(),
  });
  return unwrapResponseData<ApplicationDetailViewModel>(response);
}

/**
 * 下書きまたは公開済みの申請を提出します。
 */
export async function submitAction(spaceId: string, applicationId: string): Promise<void> {
  let updated: ApplicationDetailViewModel;
  try {
    updated = await postEmptyApplicationAction(
      "/applications/{id}/submit",
      applicationId,
    );
  } catch (error) {
    redirectToApplicationActionError(spaceId, applicationId, error);
  }
  redirectToApplicationDetail(updated, "申請を提出しました");
}

/**
 * 差戻し修正後の申請を再提出します。
 */
export async function resubmitAction(spaceId: string, applicationId: string): Promise<void> {
  let updated: ApplicationDetailViewModel;
  try {
    updated = await postEmptyApplicationAction(
      "/applications/{id}/resubmit",
      applicationId,
    );
  } catch (error) {
    redirectToApplicationActionError(spaceId, applicationId, error);
  }
  redirectToApplicationDetail(updated, "申請を再提出しました");
}

/**
 * 現在の承認ステップで申請を承認します。
 */
export async function approveAction(
  spaceId: string,
  applicationId: string,
  formData: FormData,
): Promise<void> {
  const comment = readOptionalString(formData, "comment");
  const expectedStepOrder = readExpectedStepOrder(formData);
  if (!expectedStepOrder) {
    redirectToApplicationValidationError(
      spaceId,
      applicationId,
      "承認ステップが確認できません。画面を更新して再度お試しください。",
    );
  }
  let updated: ApplicationDetailViewModel;
  try {
    updated = await postApplicationAction("/applications/{id}/approve", applicationId, {
      comment,
      expectedStepOrder,
    });
  } catch (error) {
    redirectToApplicationActionError(spaceId, applicationId, error);
  }
  redirectToApplicationDetail(updated, "申請を承認しました");
}

/**
 * 現在の承認ステップで申請を却下します。
 */
export async function rejectAction(
  spaceId: string,
  applicationId: string,
  formData: FormData,
): Promise<void> {
  const comment = readOptionalString(formData, "comment");
  const expectedStepOrder = readExpectedStepOrder(formData);
  if (!expectedStepOrder) {
    redirectToApplicationValidationError(
      spaceId,
      applicationId,
      "承認ステップが確認できません。画面を更新して再度お試しください。",
    );
  }
  let updated: ApplicationDetailViewModel;
  try {
    updated = await postApplicationAction("/applications/{id}/reject", applicationId, {
      comment,
      expectedStepOrder,
    });
  } catch (error) {
    redirectToApplicationActionError(spaceId, applicationId, error);
  }
  redirectToApplicationDetail(updated, "申請を却下しました");
}

/**
 * 現在の承認ステップで申請を差し戻します。
 */
export async function returnAction(
  spaceId: string,
  applicationId: string,
  fieldMap: Array<{ id: string; key: string }>,
  formData: FormData,
): Promise<void> {
  const overallComment = readOptionalNonEmptyString(formData, "overallComment");
  const expectedStepOrder = readExpectedStepOrder(formData);
  if (!expectedStepOrder) {
    redirectToApplicationValidationError(
      spaceId,
      applicationId,
      "承認ステップが確認できません。画面を更新して再度お試しください。",
    );
  }
  const fields: Array<{ fieldId: string; comment?: string }> = [];
  for (const field of fieldMap) {
    const selected = formData.get(`return:${field.id}`) === "on";
    if (!selected) {
      continue;
    }
    fields.push({
      fieldId: field.id,
      comment: readOptionalNonEmptyString(formData, `comment:${field.id}`),
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
      overallComment,
      expectedStepOrder,
      fields,
    });
  } catch (error) {
    redirectToApplicationActionError(spaceId, applicationId, error);
  }
  redirectToApplicationDetail(updated, "申請を差し戻しました");
}

/**
 * 差戻し依頼メールを再送します。
 */
export async function resendReturnEmailAction(
  spaceId: string,
  applicationId: string,
): Promise<void> {
  let updated: ApplicationDetailViewModel;
  try {
    updated = await postEmptyApplicationAction(
      "/applications/{id}/return-email/resend",
      applicationId,
    );
  } catch (error) {
    redirectToApplicationActionError(spaceId, applicationId, error);
  }
  redirectToApplicationDetail(updated, "差し戻しメールを再送しました");
}

/**
 * フォーム定義の説明欄を更新します。
 */
export async function updateDescriptionAction(
  spaceId: string,
  applicationId: string,
  definitionId: string,
  formData: FormData,
): Promise<void> {
  const description = readOptionalString(formData, "description");
  const detailHref = buildSpaceApplicationFormDetailHref({
    applicationId,
    definitionId,
    spaceId,
  });
  const response = await client.PATCH("/form-definitions/{id}/description", {
    params: { path: { id: definitionId } },
    body: {
      description,
    },
    headers: await authHeadersOrRedirect(),
  });
  if (!response.response.ok) {
    redirect(
      appendQueryParams(detailHref, {
        toast: "error",
        message: "説明欄の更新に失敗しました",
      }),
    );
  }
  revalidatePath(detailHref);
  revalidatePath(buildSpaceApplicationsHref(spaceId));
  redirect(
    appendQueryParams(detailHref, {
      toast: "success",
      message: "保存しました",
    }),
  );
}

/**
 * 更新後の申請詳細画面へ成功メッセージ付きで遷移します。
 */
function redirectToApplicationDetail(
  application: ApplicationDetailViewModel,
  message?: string,
): never {
  const detailHref = buildSpaceSubmissionDetailHref(application);
  if (detailHref) {
    revalidatePath(detailHref);
    revalidatePath(
      `/space/${encodeURIComponent(application.groupId ?? "")}/submissions`,
    );
    if (message) {
      redirect(
        appendQueryParams(detailHref, {
          toast: "success",
          message,
        }),
      );
    }
    redirect(detailHref);
  }

  redirect("/space");
}

/**
 * 申請操作の入力検証エラーを詳細画面へ引き継いで遷移します。
 */
function redirectToApplicationValidationError(
  spaceId: string,
  applicationId: string,
  message: string,
): never {
  const detailHref = buildSpaceSubmissionDetailHref({
    id: applicationId,
    groupId: spaceId,
  });
  redirect(appendQueryParams(detailHref ?? "/space", { actionError: message }));
}

/**
 * 申請操作 API の失敗を詳細画面へエラートーストとして引き継ぎます。
 */
function redirectToApplicationActionError(
  spaceId: string,
  applicationId: string,
  error: unknown,
): never {
  const detailHref = buildSpaceSubmissionDetailHref({
    id: applicationId,
    groupId: spaceId,
  });
  redirect(
    appendQueryParams(detailHref ?? "/space", {
      toast: "error",
      message: applicationActionErrorMessage(error),
    }),
  );
}

/**
 * 申請操作 API の失敗内容を画面表示用メッセージに変換します。
 */
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
  if (errorCode === "APPLICATION_REVIEW_STATE_CONFLICT") {
    return "申請の承認ステップが更新されています。画面を更新して状態を確認してください。";
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
  if (errorCode === "APPLICATION_NO_OPEN_CORRECTION") {
    return "未解決の差し戻し依頼がないため、メールを再送できません。";
  }

  return `${errorMessageFromBody(error.body, "申請の操作に失敗しました")}（status: ${error.status}）`;
}
