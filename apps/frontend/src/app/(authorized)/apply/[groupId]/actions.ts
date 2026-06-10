"use server";

import { redirect } from "next/navigation";
import { requestFormAccessSchema } from "@/lib/auth-schema";
import {
  errorMessageFromBody,
  isApiFailure,
} from "@/lib/server/api-failure";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/server/backend-fetch";
import type { RequestFormAccessBody } from "@/lib/schema";

const REQUEST_ACCESS_FAILED_MESSAGE =
  "フォーム案内の送信に失敗しました。時間をおいて再度お試しください。";
const JAPANESE_TEXT_PATTERN = /[ぁ-んァ-ヶ一-龠]/;

function buildApplyRedirectPath(
  groupId: string,
  params: Record<string, string | undefined>,
): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });
  const search = query.toString();
  return `/apply/${encodeURIComponent(groupId)}${search ? `?${search}` : ""}`;
}

function validationMessageFromFieldErrors(fieldErrors: {
  email?: string[];
  groupId?: string[];
}): string {
  return (
    fieldErrors.email?.[0] ??
    fieldErrors.groupId?.[0] ??
    "入力内容を確認してください。"
  );
}

function errorCodeFromBody(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("errorCode" in body)) {
    return undefined;
  }
  const { errorCode } = body as { errorCode?: unknown };
  return typeof errorCode === "string" ? errorCode : undefined;
}

function requestAccessFailureMessage(
  body: unknown,
  hasFormDefinitionId: boolean,
): string {
  const errorCode = errorCodeFromBody(body);
  if (errorCode === "FORM_DEFINITION_AMBIGUOUS" && !hasFormDefinitionId) {
    return "申請フォームを特定できません。申請フォーム一覧から公開URLを開き直してください。";
  }
  if (errorCode === "FORM_DEFINITION_NOT_FOUND") {
    return "公開中の申請フォームが見つかりません。URLを確認してください。";
  }
  const message = errorMessageFromBody(body, REQUEST_ACCESS_FAILED_MESSAGE);
  return JAPANESE_TEXT_PATTERN.test(message) ? message : REQUEST_ACCESS_FAILED_MESSAGE;
}

export async function requestAccessAction(formData: FormData): Promise<void> {
  const parsed = requestFormAccessSchema.safeParse({
    groupId: formData.get("groupId"),
    formDefinitionId: formData.get("formDefinitionId") || undefined,
    email: formData.get("email"),
  });

  if (!parsed.success) {
    const groupId = String(formData.get("groupId") ?? "");
    const formDefinitionId = String(formData.get("formDefinitionId") ?? "") || undefined;
    redirect(
      buildApplyRedirectPath(groupId, {
        formError: validationMessageFromFieldErrors(
          parsed.error.flatten().fieldErrors,
        ),
        formDefinitionId,
      }),
    );
  }

  const body: RequestFormAccessBody = { email: parsed.data.email };
  let failureMessage: string | undefined;

  try {
    const response = await client.POST(
      "/form-definitions/groups/{groupId}/request-access",
      {
        params: {
          path: { groupId: parsed.data.groupId },
          query: parsed.data.formDefinitionId
            ? { formDefinitionId: parsed.data.formDefinitionId }
            : undefined,
        },
        body,
      },
    );
    unwrapResponseData<unknown>(response);
  } catch (error) {
    failureMessage = isApiFailure(error)
      ? requestAccessFailureMessage(error.body, Boolean(parsed.data.formDefinitionId))
      : REQUEST_ACCESS_FAILED_MESSAGE;
  }

  if (failureMessage) {
    redirect(
      buildApplyRedirectPath(parsed.data.groupId, {
        toast: "error",
        message: failureMessage,
        formDefinitionId: parsed.data.formDefinitionId,
      }),
    );
  }

  redirect(
    buildApplyRedirectPath(parsed.data.groupId, {
      sent: "1",
      formDefinitionId: parsed.data.formDefinitionId,
    }),
  );
}
