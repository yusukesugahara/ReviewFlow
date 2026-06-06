"use server";

import { redirect } from "next/navigation";
import {
  readDynamicValuesFromFormData,
  type DynamicFormField,
} from "@/components/applications/dynamic-fields";
import { client } from "@/lib/server/backend-fetch";
import type {
  CreatePublicApplicationBody,
  CreatePublicApplicationSuccessJson,
} from "@/lib/schema";
import { errorMessageFromBody, isApiFailure, isDynamicFormField } from "./helpers";
import { applicantHeaders } from "./server";
import type { PublicApplicationSubmitState } from "./types";

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
  if (typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

function validateRequiredFields(
  fields: DynamicFormField[],
  values: Record<string, unknown>,
): { fieldErrors: Record<string, string>; missingFieldLabels: string[] } {
  const errors: Record<string, string> = {};
  const missingFieldLabels: string[] = [];
  for (const field of fields) {
    if (field.required && !valuePresent(values[field.fieldKey])) {
      errors[field.fieldKey] = "必須項目です";
      missingFieldLabels.push(field.label);
    }
  }
  return { fieldErrors: errors, missingFieldLabels };
}

export async function submitPublicApplicationAction(
  _previousState: PublicApplicationSubmitState,
  formData: FormData,
): Promise<PublicApplicationSubmitState> {
  const groupId = formData.get("groupId");
  const formDefinitionId = formData.get("formDefinitionId");
  const fieldsJson = formData.get("fieldsJson");

  if (
    typeof groupId !== "string" ||
    typeof formDefinitionId !== "string" ||
    typeof fieldsJson !== "string"
  ) {
    redirect("/apply/form?formError=入力内容を確認してください");
  }

  let fields: DynamicFormField[] = [];
  try {
    const parsed: unknown = JSON.parse(fieldsJson);
    if (Array.isArray(parsed)) {
      fields = parsed.filter(isDynamicFormField);
    }
  } catch {
    redirect("/apply/form?formError=入力内容を確認してください");
  }

  const body: CreatePublicApplicationBody = {
    groupId,
    formDefinitionId,
    values: readDynamicValuesFromFormData(fields, formData),
  };
  const { fieldErrors, missingFieldLabels } = validateRequiredFields(
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
    const data: CreatePublicApplicationSuccessJson | undefined = response.data;
    if (!response.response.ok || !data) {
      throw { status: response.response.status, body: response.error };
    }
  } catch (error) {
    const message = isApiFailure(error)
      ? errorMessageFromBody(error.body)
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
