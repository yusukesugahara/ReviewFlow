"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type { ApplicationDetailViewModel } from "@/components/applications/application-detail.types";
import { buildSpaceSubmissionDetailHref } from "@/components/applications/application-routes";

type ApiFailure = { status: number; body: unknown };

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
    | "/applications/{id}/return"
    | "/applications/{id}/return-email/resend",
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

export async function submitAction(spaceId: string, applicationId: string): Promise<void> {
  let updated: ApplicationDetailViewModel;
  try {
    updated = await postApplicationAction("/applications/{id}/submit", applicationId, {});
  } catch (error) {
    redirectToApplicationActionError(spaceId, applicationId, error);
  }
  redirectToApplicationDetail(updated, "申請を提出しました");
}

export async function resubmitAction(spaceId: string, applicationId: string): Promise<void> {
  let updated: ApplicationDetailViewModel;
  try {
    updated = await postApplicationAction("/applications/{id}/resubmit", applicationId, {});
  } catch (error) {
    redirectToApplicationActionError(spaceId, applicationId, error);
  }
  redirectToApplicationDetail(updated, "申請を再提出しました");
}

export async function approveAction(
  spaceId: string,
  applicationId: string,
  formData: FormData,
): Promise<void> {
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

export async function rejectAction(
  spaceId: string,
  applicationId: string,
  formData: FormData,
): Promise<void> {
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

export async function returnAction(
  spaceId: string,
  applicationId: string,
  fieldMap: Array<{ id: string; key: string }>,
  formData: FormData,
): Promise<void> {
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

export async function resendReturnEmailAction(
  spaceId: string,
  applicationId: string,
): Promise<void> {
  let updated: ApplicationDetailViewModel;
  try {
    updated = await postApplicationAction(
      "/applications/{id}/return-email/resend",
      applicationId,
      {},
    );
  } catch (error) {
    redirectToApplicationActionError(spaceId, applicationId, error);
  }
  redirectToApplicationDetail(updated, "差し戻しメールを再送しました");
}

export async function updateDescriptionAction(
  spaceId: string,
  applicationId: string,
  definitionId: string,
  formData: FormData,
): Promise<void> {
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
  const detailHref = buildSpaceSubmissionDetailHref(application);
  if (detailHref) {
    revalidatePath(detailHref);
    revalidatePath(`/space/${encodeURIComponent(application.groupId ?? "")}/submissions`);
    if (message) {
      const params = new URLSearchParams({
        toast: "success",
        message,
      });
      redirect(appendQueryString(detailHref, params));
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
  const detailHref = buildSpaceSubmissionDetailHref({
    id: applicationId,
    groupId: spaceId,
  });
  const params = new URLSearchParams({ actionError: message });
  redirect(appendQueryString(detailHref ?? "/space", params));
}

function redirectToApplicationActionError(
  spaceId: string,
  applicationId: string,
  error: unknown,
): never {
  const detailHref = buildSpaceSubmissionDetailHref({
    id: applicationId,
    groupId: spaceId,
  });
  const params = new URLSearchParams({
    toast: "error",
    message: applicationActionErrorMessage(error),
  });
  redirect(appendQueryString(detailHref ?? "/space", params));
}

function appendQueryString(href: string, params: URLSearchParams): string {
  return `${href}${href.includes("?") ? "&" : "?"}${params.toString()}`;
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
  if (errorCode === "APPLICATION_NO_OPEN_CORRECTION") {
    return "未解決の差し戻し依頼がないため、メールを再送できません。";
  }

  return `${errorMessageFromBody(error.body)}（status: ${error.status}）`;
}
