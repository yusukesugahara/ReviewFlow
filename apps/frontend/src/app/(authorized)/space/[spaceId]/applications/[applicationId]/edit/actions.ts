"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DynamicFormField } from "@/components/applications/dynamic-fields";
import { readDynamicValuesFromFormData } from "@/components/applications/dynamic-field-form-data";
import { parseDynamicFormFieldsJson } from "@/components/applications/dynamic-field-schema";
import { client } from "@/lib/server/backend-fetch";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";

function parseFields(fieldsJson: FormDataEntryValue | null): DynamicFormField[] {
  try {
    return parseDynamicFormFieldsJson(fieldsJson);
  } catch {
    return [];
  }
}

function appendQueryString(href: string, params: URLSearchParams): string {
  return `${href}${href.includes("?") ? "&" : "?"}${params.toString()}`;
}

export async function updateReturnedApplicationAction(
  spaceId: string,
  applicationId: string,
  detailPath: string,
  editPath: string,
  formData: FormData,
): Promise<void> {
  const fields = parseFields(formData.get("fieldsJson"));
  if (fields.length === 0) {
    redirect(
      appendQueryString(
        editPath,
        new URLSearchParams({ correctionError: "修正対象項目を取得できませんでした。" }),
      ),
    );
  }

  const editableFieldKeys = new Set(fields.map((field) => field.fieldKey));
  const response = await client.PATCH("/applications/{id}", {
    params: { path: { id: applicationId } },
    body: {
      values: readDynamicValuesFromFormData(fields, formData, editableFieldKeys),
    },
    headers: await authHeadersOrRedirect(),
  });

  if (!response.response.ok) {
    redirect(
      appendQueryString(
        editPath,
        new URLSearchParams({
          correctionError: `修正内容の保存に失敗しました（status: ${response.response.status}）`,
        }),
      ),
    );
  }

  revalidatePath(detailPath);
  revalidatePath(`/space/${encodeURIComponent(spaceId)}/submissions`);
  redirect(
    appendQueryString(
      detailPath,
      new URLSearchParams({
        toast: "success",
        message: "修正内容を保存しました。内容を確認して再提出してください。",
      }),
    ),
  );
}
