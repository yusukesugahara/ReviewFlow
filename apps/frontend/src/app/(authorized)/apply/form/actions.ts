"use server";

import { redirect } from "next/navigation";
import {
  readDynamicValuesFromFormData,
  type DynamicFormField,
} from "@/app/_components/applications/dynamic-fields";
import { client } from "@/lib/server/backend-fetch";
import type {
  CreatePublicApplicationBody,
  CreatePublicApplicationSuccessJson,
} from "@/lib/schema";
import { errorMessageFromBody, isApiFailure, isDynamicFormField } from "./helpers";
import { applicantHeaders } from "./server";

export async function submitPublicApplicationAction(formData: FormData): Promise<void> {
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
    const params = new URLSearchParams({
      toast: "error",
      message:
        message === "submit_failed"
          ? "申請の送信に失敗しました"
          : `申請の送信に失敗しました。${message}`,
    });
    redirect(`/apply/form?${params.toString()}`);
  }

  redirect("/apply/form?submitted=1");
}
