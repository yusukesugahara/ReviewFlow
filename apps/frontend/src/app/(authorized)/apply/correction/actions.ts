"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { DynamicFormField } from "@/components/applications/dynamic-fields/dynamic-fields";
import { readDynamicValuesFromFormData } from "@/components/applications/dynamic-fields/dynamic-field-form-data";
import { parseDynamicFormFieldsJson } from "@/components/applications/dynamic-fields/dynamic-field-schema";
import { validateRequiredDynamicFields } from "@/components/applications/dynamic-fields/dynamic-field-validation";
import { client } from "@/lib/server/backend-fetch";
import { errorMessageFromBody, isApiFailure } from "@/lib/server/api-failure";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { applicantHeaders } from "../form/_utils/server";
import type { PublicCorrectionSubmitState } from "./types";

const publicCorrectionFormSchema = z.object({
  applicationId: z.string().min(1),
  fieldsJson: z.string().min(1),
});

/**
 * FormData 内の修正対象項目 JSON を読み取り、失敗時は空配列を返します。
 */
function parseFields(fieldsJson: FormDataEntryValue | null): DynamicFormField[] {
  try {
    return parseDynamicFormFieldsJson(fieldsJson);
  } catch {
    return [];
  }
}

/**
 * 公開差戻し修正フォームの入力を保存し、申請を再提出します。
 */
export async function submitPublicCorrectionAction(
  _previousState: PublicCorrectionSubmitState,
  formData: FormData,
): Promise<PublicCorrectionSubmitState> {
  const parsedForm = publicCorrectionFormSchema.safeParse({
    applicationId: formData.get("applicationId"),
    fieldsJson: formData.get("fieldsJson"),
  });
  if (!parsedForm.success) {
    return { formError: "修正対象項目を取得できませんでした" };
  }
  const fields = parseFields(parsedForm.data.fieldsJson);
  if (fields.length === 0) {
    return { formError: "修正対象項目を取得できませんでした" };
  }

  const values = readDynamicValuesFromFormData(
    fields,
    formData,
    new Set(fields.map((field) => field.fieldKey)),
  );
  const { fieldErrors, missingFieldLabels } = validateRequiredDynamicFields(fields, values);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      formError: "未入力の必須項目があります",
      fieldErrors,
      missingFieldLabels,
    };
  }

  try {
    const headers = await applicantHeaders();
    const patchResponse = await client.PATCH("/public/applications/{id}", {
      params: { path: { id: parsedForm.data.applicationId } },
      body: { values },
      headers,
    });
    unwrapResponseData<unknown>(patchResponse);

    const resubmitResponse = await client.POST(
      "/public/applications/{id}/resubmit",
      {
        params: { path: { id: parsedForm.data.applicationId } },
        headers,
      },
    );
    unwrapResponseData<unknown>(resubmitResponse);
  } catch (error) {
    const message = isApiFailure(error)
      ? errorMessageFromBody(error.body, "submit_failed")
      : "submit_failed";
    return {
      formError:
        message === "submit_failed"
          ? "修正内容の送信に失敗しました"
          : `修正内容の送信に失敗しました。${message}`,
    };
  }

  redirect("/apply/correction?resubmitted=1");
}
