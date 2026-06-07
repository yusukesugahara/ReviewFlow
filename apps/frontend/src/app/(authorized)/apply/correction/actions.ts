"use server";

import { redirect } from "next/navigation";
import {
  readDynamicValuesFromFormData,
  type DynamicFormField,
} from "@/components/applications/dynamic-fields";
import { client } from "@/lib/server/backend-fetch";
import { errorMessageFromBody, isApiFailure } from "@/lib/server/api-error";
import { isDynamicFormField } from "../form/helpers";
import { applicantHeaders } from "../form/server";
import type { PublicCorrectionSubmitState } from "./types";

function valuePresent(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

function parseFields(fieldsJson: FormDataEntryValue | null): DynamicFormField[] {
  if (typeof fieldsJson !== "string") {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(fieldsJson);
    return Array.isArray(parsed) ? parsed.filter(isDynamicFormField) : [];
  } catch {
    return [];
  }
}

function validateRequiredFields(
  fields: DynamicFormField[],
  values: Record<string, unknown>,
): { fieldErrors: Record<string, string>; missingFieldLabels: string[] } {
  const fieldErrors: Record<string, string> = {};
  const missingFieldLabels: string[] = [];
  for (const field of fields) {
    if (field.required && !valuePresent(values[field.fieldKey])) {
      fieldErrors[field.fieldKey] = "必須項目です";
      missingFieldLabels.push(field.label);
    }
  }
  return { fieldErrors, missingFieldLabels };
}

export async function submitPublicCorrectionAction(
  _previousState: PublicCorrectionSubmitState,
  formData: FormData,
): Promise<PublicCorrectionSubmitState> {
  const applicationId = formData.get("applicationId");
  const fields = parseFields(formData.get("fieldsJson"));
  if (typeof applicationId !== "string" || fields.length === 0) {
    return { formError: "修正対象項目を取得できませんでした" };
  }

  const values = readDynamicValuesFromFormData(
    fields,
    formData,
    new Set(fields.map((field) => field.fieldKey)),
  );
  const { fieldErrors, missingFieldLabels } = validateRequiredFields(fields, values);
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
      params: { path: { id: applicationId } },
      body: { values },
      headers,
    });
    if (!patchResponse.response.ok || !patchResponse.data) {
      throw { status: patchResponse.response.status, body: patchResponse.error };
    }

    const resubmitResponse = await client.POST(
      "/public/applications/{id}/resubmit",
      {
        params: { path: { id: applicationId } },
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
