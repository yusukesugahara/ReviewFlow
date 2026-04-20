import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";

type ApplicationDetail = {
  id: string;
  status: string;
  formTemplateId: string;
  values: Record<string, unknown>;
};

type FormField = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
};

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
  editableFieldKeys: string[],
  formData: FormData,
): Promise<void> {
  "use server";
  const values: Record<string, unknown> = {};
  for (const key of editableFieldKeys) {
    const raw = formData.get(`field:${key}`);
    if (typeof raw === "string") {
      values[key] = raw;
    }
  }

  await backendAuthFetchJson(`/applications/${applicationId}`, {
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
    const appRaw = await backendAuthFetchJson(`/applications/${id}`);
    const app = unwrapData<ApplicationDetail>(appRaw);
    if (!(app.status === "draft" || app.status === "returned")) {
      return <p>この申請は編集できません。</p>;
    }

    const templateRaw = await backendAuthFetchJson(`/form-templates/${app.formTemplateId}`);
    const fields = unwrapData<{ fields?: FormField[] }>(templateRaw).fields ?? [];

    const targetsRaw = await backendAuthFetchJson(`/applications/${id}/correction-targets`);
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
      <section style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>申請編集</h2>
        <p style={{ margin: 0 }}>
          {app.status === "returned"
            ? "差し戻し対象の項目のみ編集できます。"
            : "下書き申請を編集できます。"}
        </p>
        <form action={patchApplicationAction.bind(null, id, editableFieldKeys)}>
          <div style={{ display: "grid", gap: 10 }}>
            {fields.map((field) => {
              const disabled =
                app.status === "returned" && !returnedEditable.has(field.fieldKey);
              const defaultValue = app.values[field.fieldKey];
              const targetComment = targetItems.find(
                (item) => item.fieldKey === field.fieldKey,
              )?.comment;
              return (
                <label
                  key={field.id}
                  style={{ display: "grid", gap: 4, opacity: disabled ? 0.55 : 1 }}
                >
                  <span>
                    {field.label}
                    {field.required ? " *" : ""}
                  </span>
                  <input
                    name={`field:${field.fieldKey}`}
                    defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
                    disabled={disabled}
                  />
                  {targetComment ? (
                    <small style={{ color: "#9a3412" }}>差し戻しコメント: {targetComment}</small>
                  ) : null}
                </label>
              );
            })}
          </div>
          <button type="submit" style={{ marginTop: 12 }}>
            保存する
          </button>
        </form>
      </section>
    );
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return <p>申請編集画面の取得に失敗しました（status: {error.status}）</p>;
    }
    return <p>申請編集画面の取得に失敗しました</p>;
  }
}
