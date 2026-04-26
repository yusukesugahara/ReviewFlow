import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  backendApplicantFetchJson,
  ApplicantBackendHttpError,
} from "@/lib/server/backend-applicant-fetch";
import {
  DynamicFieldInput,
  readDynamicValuesFromFormData,
  type DynamicFormField,
} from "../../_components/dynamic-fields";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ApplicationDetail = {
  id: string;
  status: string;
  formTemplateId: string;
  values: Record<string, unknown>;
};

type FormField = DynamicFormField;

type CorrectionTargetItem = {
  fieldKey: string;
  comment: string | null;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

async function patchApplicationAction(
  applicationId: string,
  fields: FormField[],
  editableFieldKeys: string[],
  formData: FormData,
): Promise<void> {
  "use server";
  const editableSet = new Set(editableFieldKeys);
  const values = readDynamicValuesFromFormData(fields, formData, editableSet);

  await backendApplicantFetchJson(`/public/applications/${applicationId}`, {
    method: "PATCH",
    body: { values },
  });
  revalidatePath(`/app/applications/${applicationId}`);
  revalidatePath(`/app/applications/${applicationId}/edit`);
  redirect(`/app/applications/${applicationId}`);
}

export default async function ApplicationEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const appRaw = await backendApplicantFetchJson(`/public/applications/${id}`);
    const app = unwrapData<ApplicationDetail>(appRaw);
    if (!(app.status === "draft" || app.status === "returned")) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">この申請は編集できません</p>
          </CardContent>
        </Card>
      );
    }

    const templateRaw = await backendApplicantFetchJson("/form-templates/public/current");
    const fields = unwrapData<{ fields?: FormField[] }>(templateRaw).fields ?? [];

    const targetsRaw = await backendApplicantFetchJson(
      `/public/applications/${id}/correction-targets`,
    );
    const targetItems =
      unwrapData<{ openCorrection?: { items?: CorrectionTargetItem[] } | null }>(targetsRaw)
        .openCorrection?.items ?? [];
    const returnedEditable = new Set(targetItems.map((t) => t.fieldKey));

    const editableFieldKeys = fields
      .filter((field) => {
        if (app.status === "draft") {
          return true;
        }
        return returnedEditable.has(field.fieldKey);
      })
      .map((f) => f.fieldKey);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">申請編集</h2>
          <p className="text-muted-foreground">
            {app.status === "returned"
              ? "差し戻し対象の項目のみ編集できます"
              : "下書き申請を編集できます"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>申請内容</CardTitle>
            <CardDescription>
              {app.status === "returned"
                ? "差し戻されたフィールドを修正してください"
                : "すべてのフィールドを編集できます"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={patchApplicationAction.bind(null, id, fields, editableFieldKeys)} className="space-y-4">
              {fields.map((field) => {
                const disabled =
                  app.status === "returned" && !returnedEditable.has(field.fieldKey);
                const defaultValue = app.values[field.fieldKey];
                const targetComment = targetItems.find(
                  (item) => item.fieldKey === field.fieldKey,
                )?.comment;
                return (
                  <DynamicFieldInput
                    key={field.id}
                    field={field}
                    value={defaultValue}
                    disabled={disabled}
                    afterInput={
                      targetComment ? (
                        <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200">
                          差し戻しコメント: {targetComment}
                        </p>
                      ) : undefined
                    }
                  />
                );
              })}
              <Button type="submit" size="lg">
                保存する
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    if (error instanceof ApplicantBackendHttpError) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">申請編集画面の取得に失敗しました（status: {error.status}）</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">申請編集画面の取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }
}
