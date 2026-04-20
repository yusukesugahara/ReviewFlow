import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";

type ApplicationDetail = {
  id: string;
  status: string;
  formTemplateId: string;
  applicantUserId: string;
  currentStepOrder: number | null;
  values: Record<string, unknown>;
};

type FormField = {
  id: string;
  fieldKey: string;
  label: string;
};

type CorrectionTargetItem = {
  formFieldId: string;
  fieldKey: string;
  label: string;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

async function approveAction(applicationId: string, formData: FormData): Promise<void> {
  "use server";
  const comment = formData.get("comment");
  await backendAuthFetchJson(`/applications/${applicationId}/approve`, {
    method: "POST",
    body: { comment: typeof comment === "string" ? comment : undefined },
  });
  revalidatePath(`/review/applications/${applicationId}`);
  revalidatePath("/review/applications");
  redirect(`/review/applications/${applicationId}`);
}

async function rejectAction(applicationId: string, formData: FormData): Promise<void> {
  "use server";
  const comment = formData.get("comment");
  await backendAuthFetchJson(`/applications/${applicationId}/reject`, {
    method: "POST",
    body: { comment: typeof comment === "string" ? comment : undefined },
  });
  revalidatePath(`/review/applications/${applicationId}`);
  revalidatePath("/review/applications");
  redirect(`/review/applications/${applicationId}`);
}

async function returnAction(
  applicationId: string,
  fieldMap: Array<{ id: string; key: string }>,
  formData: FormData,
): Promise<void> {
  "use server";
  const overallComment = formData.get("overallComment");
  const fields: Array<{ fieldId: string; comment?: string }> = [];
  for (const f of fieldMap) {
    const selected = formData.get(`return:${f.id}`) === "on";
    if (!selected) {
      continue;
    }
    const comment = formData.get(`comment:${f.id}`);
    fields.push({
      fieldId: f.id,
      comment: typeof comment === "string" && comment.trim().length > 0 ? comment : undefined,
    });
  }

  if (fields.length === 0) {
    return;
  }

  await backendAuthFetchJson(`/applications/${applicationId}/return`, {
    method: "POST",
    body: {
      overallComment:
        typeof overallComment === "string" && overallComment.trim().length > 0
          ? overallComment
          : undefined,
      fields,
    },
  });
  revalidatePath(`/review/applications/${applicationId}`);
  revalidatePath("/review/applications");
  redirect(`/review/applications/${applicationId}`);
}

export default async function ReviewApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const appRaw = await backendAuthFetchJson(`/applications/${id}`);
    const app = unwrapData<ApplicationDetail>(appRaw);
    const templateRaw = await backendAuthFetchJson(`/form-templates/${app.formTemplateId}`);
    const fields = unwrapData<{ fields?: FormField[] }>(templateRaw).fields ?? [];
    const correctionTargetsRaw = await backendAuthFetchJson(
      `/applications/${id}/correction-targets`,
    );
    const openItems =
      unwrapData<{ openCorrection?: { items?: CorrectionTargetItem[] } | null }>(
        correctionTargetsRaw,
      ).openCorrection?.items ?? [];

    const fieldMap = fields.map((f) => ({ id: f.id, key: f.fieldKey }));

    return (
      <section style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>レビュー詳細</h2>
        <div>ID: {app.id}</div>
        <div>Status: {app.status}</div>
        <div>Applicant: {app.applicantUserId}</div>
        <div>Current Step: {app.currentStepOrder ?? "-"}</div>

        <h3 style={{ marginBottom: 0 }}>入力値</h3>
        <pre
          style={{
            margin: 0,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 6,
            overflowX: "auto",
          }}
        >
          {JSON.stringify(app.values, null, 2)}
        </pre>

        {app.status === "in_review" ? (
          <>
            <form action={approveAction.bind(null, app.id)} style={{ display: "grid", gap: 8 }}>
              <h3 style={{ marginBottom: 0 }}>承認</h3>
              <textarea name="comment" placeholder="任意コメント" rows={3} />
              <button type="submit">承認する</button>
            </form>

            <form action={rejectAction.bind(null, app.id)} style={{ display: "grid", gap: 8 }}>
              <h3 style={{ marginBottom: 0 }}>却下</h3>
              <textarea name="comment" placeholder="任意コメント" rows={3} />
              <button type="submit">却下する</button>
            </form>

            <form
              action={returnAction.bind(null, app.id, fieldMap)}
              style={{ display: "grid", gap: 8 }}
            >
              <h3 style={{ marginBottom: 0 }}>差し戻し</h3>
              <textarea name="overallComment" placeholder="全体コメント（任意）" rows={3} />
              <div style={{ display: "grid", gap: 8 }}>
                {fields.map((field) => (
                  <label
                    key={field.id}
                    style={{
                      display: "grid",
                      gap: 4,
                      border: "1px solid #ddd",
                      borderRadius: 6,
                      padding: 8,
                    }}
                  >
                    <span>
                      <input type="checkbox" name={`return:${field.id}`} />
                      {` ${field.label} (${field.fieldKey})`}
                    </span>
                    <input
                      name={`comment:${field.id}`}
                      placeholder="この項目への差し戻しコメント（任意）"
                    />
                  </label>
                ))}
              </div>
              <button type="submit">差し戻す</button>
            </form>
          </>
        ) : null}

        {openItems.length > 0 ? (
          <section>
            <h3 style={{ marginBottom: 0 }}>現在オープン中の修正対象</h3>
            <ul>
              {openItems.map((item) => (
                <li key={`${item.formFieldId}-${item.fieldKey}`}>
                  {item.label} ({item.fieldKey})
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>
    );
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return <p>レビュー詳細の取得に失敗しました（status: {error.status}）</p>;
    }
    return <p>レビュー詳細の取得に失敗しました</p>;
  }
}
