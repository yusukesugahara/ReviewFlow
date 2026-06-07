"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { DynamicFormField } from "@/components/applications/dynamic-fields";
import { readDynamicValuesFromFormData } from "@/components/applications/dynamic-field-form-data";
import { parseDynamicFormFieldsJson } from "@/components/applications/dynamic-field-schema";
import { validateRequiredDynamicFields } from "@/components/applications/dynamic-field-validation";
import { client } from "@/lib/server/backend-fetch";
import { errorMessageFromBody, isApiFailure } from "@/lib/server/api-failure";
import { applicantHeaders } from "../form/server";
import type { PublicCorrectionSubmitState } from "./types";

const publicCorrectionFormSchema = z.object({
  applicationId: z.string().min(1),
  fieldsJson: z.string().min(1),
});

function parseFields(fieldsJson: FormDataEntryValue | null): DynamicFormField[] {
  try {
    return parseDynamicFormFieldsJson(fieldsJson);
  } catch {
    return [];
  }
}

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
    if (!patchResponse.response.ok || !patchResponse.data) {
      throw { status: patchResponse.response.status, body: patchResponse.error };
    }

    const resubmitResponse = await client.POST(
      "/public/applications/{id}/resubmit",
      {
        params: { path: { id: parsedForm.data.applicationId } },
        headers,
      },
    );
    if (!resubmitResponse.response.ok || !resubmitResponse.data) {
      throw {
        status: resubmitResponse.response.status,
        body: resubmitResponse.error,
      };
    }
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
