import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";
import {
  DynamicFieldInput,
  readDynamicValuesFromFormData,
  type DynamicFormField,
} from "@/app/_components/applications/dynamic-fields";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildSpaceApplicationDetailHref } from "@/app/_components/applications/application-routes";

type ApplicationDetail = {
  id: string;
  groupId?: string | null;
  status: string;
  values: Record<string, unknown>;
};

type FormField = DynamicFormField;

type CorrectionTargetItem = {
  fieldKey: string;
  comment: string | null;
};

type PageProps = {
  params: Promise<{ spaceId: string; applicationId: string }>;
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

  const updatedRaw = await backendAuthFetchJson(`/applications/${applicationId}`, {
    method: "PATCH",
    body: { values },
  });
  const updated = unwrapData<ApplicationDetail>(updatedRaw);
  const detailHref = buildSpaceApplicationDetailHref(updated);
  if (detailHref) {
    revalidatePath(detailHref);
    revalidatePath(`${detailHref}/edit`);
    revalidatePath(`/space/${encodeURIComponent(updated.groupId ?? "")}/applications`);
    redirect(detailHref);
  }
  redirect("/space");
}

export default async function SpaceApplicationEditPage({ params }: PageProps) {
  const { spaceId, applicationId } = await params;
  try {
    const appRaw = await backendAuthFetchJson(`/applications/${applicationId}`);
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

    const [templateRaw, targetsRaw] = await Promise.all([
      backendAuthFetchJson(
        `/form-definitions?groupId=${encodeURIComponent(spaceId)}`,
      ),
      backendAuthFetchJson(`/applications/${applicationId}/correction-targets`),
    ]);
    const definition =
      unwrapData<{ definitions?: { fields?: FormField[] }[] }>(templateRaw)
        .definitions?.[0] ?? null;
    const fields = definition?.fields ?? [];
    const targetItems =
      unwrapData<{ openCorrection?: { items?: CorrectionTargetItem[] } | null }>(targetsRaw)
        .openCorrection?.items ?? [];
    const returnedEditable = new Set(targetItems.map((target) => target.fieldKey));

    const editableFieldKeys = fields
      .filter((field) => {
        if (app.status === "draft") {
          return true;
        }
        return returnedEditable.has(field.fieldKey);
      })
      .map((field) => field.fieldKey);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">申請編集</h2>
            <p className="text-muted-foreground">
              {app.status === "returned"
                ? "差し戻し対象の項目のみ編集できます"
                : "下書き申請を編集できます"}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/space/${encodeURIComponent(spaceId)}/applications/${encodeURIComponent(applicationId)}`}>
              詳細へ戻る
            </Link>
          </Button>
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
            <form action={patchApplicationAction.bind(null, applicationId, fields, editableFieldKeys)} className="space-y-4">
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
                        <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-700">
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
    if (error instanceof BackendHttpError) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              申請編集画面の取得に失敗しました（status: {error.status}）
            </p>
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
