"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DynamicFormField } from "@/components/applications/dynamic-fields/dynamic-fields";
import { readDynamicValuesFromFormData } from "@/components/applications/dynamic-fields/dynamic-field-form-data";
import { parseDynamicFormFieldsJson } from "@/components/applications/dynamic-fields/dynamic-field-schema";
import { appendQueryParams } from "@/components/applications/routing/application-routes";
import { client } from "@/lib/relay/client";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";

/**
 * FormData 内のフォーム項目 JSON を読み取り、失敗時は空配列を返します。
 */
function parseFields(fieldsJson: FormDataEntryValue | null): DynamicFormField[] {
  try {
    return parseDynamicFormFieldsJson(fieldsJson);
  } catch {
    return [];
  }
}

/**
 * 差戻し申請の修正内容を保存し、詳細画面へ結果付きで遷移します。
 */
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
      appendQueryParams(editPath, {
        correctionError: "修正対象項目を取得できませんでした。",
      }),
    );
  }

  const editableFieldKeys = new Set(fields.map((field) => field.fieldKey));
  const response = await client.patchApplication( {
    params: { path: { id: applicationId } },
    body: {
      values: readDynamicValuesFromFormData(fields, formData, editableFieldKeys),
    },
    headers: await authHeadersOrRedirect(),
  });

  if (!response.response.ok) {
    redirect(
      appendQueryParams(editPath, {
        correctionError: `修正内容の保存に失敗しました（status: ${response.response.status}）`,
      }),
    );
  }

  revalidatePath(detailPath);
  revalidatePath(`/space/${encodeURIComponent(spaceId)}/submissions`);
  redirect(
    appendQueryParams(detailPath, {
      toast: "success",
      message: "修正内容を保存しました。内容を確認して再提出してください。",
    }),
  );
}
