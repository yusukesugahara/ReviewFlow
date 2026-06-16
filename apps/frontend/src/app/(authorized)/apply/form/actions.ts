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
import type {
  CreatePublicApplicationBody,
  CreatePublicApplicationSuccessJson,
} from "@/lib/schema";
import { applicantHeaders } from "./_utils/server";
import type { PublicApplicationSubmitState } from "./types";

const publicApplicationFormSchema = z.object({
  groupId: z.string().min(1),
  formDefinitionId: z.string().min(1),
  fieldsJson: z.string().min(1),
});

/**
 * 公開申請フォームへエラーメッセージ付きでリダイレクトします。
 */
function redirectWithPublicApplicationFormError(message: string): never {
  const params = new URLSearchParams({ formError: message });
  redirect(`/apply/form?${params.toString()}`);
}

/**
 * 公開申請フォームの入力を検証し、公開申請として送信します。
 */
export async function submitPublicApplicationAction(
  _previousState: PublicApplicationSubmitState,
  formData: FormData,
): Promise<PublicApplicationSubmitState> {
  const groupId = formData.get("groupId");
  const formDefinitionId = formData.get("formDefinitionId");
  const fieldsJson = formData.get("fieldsJson");

  const parsedForm = publicApplicationFormSchema.safeParse({
    groupId,
    formDefinitionId,
    fieldsJson,
  });
  if (!parsedForm.success) {
    redirectWithPublicApplicationFormError("入力内容を確認してください");
  }

  let fields: DynamicFormField[] = [];
  try {
    fields = parseDynamicFormFieldsJson(parsedForm.data.fieldsJson);
  } catch {
    redirectWithPublicApplicationFormError("入力内容を確認してください");
  }

  const body: CreatePublicApplicationBody = {
    groupId: parsedForm.data.groupId,
    formDefinitionId: parsedForm.data.formDefinitionId,
    values: readDynamicValuesFromFormData(fields, formData),
  };
  const { fieldErrors, missingFieldLabels } = validateRequiredDynamicFields(
    fields,
    body.values ?? {},
  );
  if (Object.keys(fieldErrors).length > 0) {
    return {
      formError: "未入力の必須項目があります",
      fieldErrors,
      missingFieldLabels,
    };
  }

  try {
    const response = await client.POST("/public/applications", {
      body,
      headers: await applicantHeaders(),
    });
    unwrapResponseData<CreatePublicApplicationSuccessJson["data"]>(response);
  } catch (error) {
    const message = isApiFailure(error)
      ? errorMessageFromBody(error.body, "submit_failed")
      : "submit_failed";
    return {
      formError:
        message === "submit_failed"
          ? "申請の送信に失敗しました"
          : `申請の送信に失敗しました。${message}`,
    };
  }

  redirect("/apply/form?submitted=1");
}
