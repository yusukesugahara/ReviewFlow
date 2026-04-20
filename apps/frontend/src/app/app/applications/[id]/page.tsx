import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";

type ApplicationDetail = {
  id: string;
  status: string;
  formTemplateId: string;
  createdAt: string;
  updatedAt: string;
  values: Record<string, unknown>;
};

type FormField = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  options?: unknown[] | null;
};

type CorrectionItem = {
  fieldKey: string;
  comment: string | null;
};
type Correction = {
  id: string;
  status: string;
  overallComment: string | null;
  createdAt: string;
  items: CorrectionItem[];
};

type CorrectionTargetItem = {
  formFieldId: string;
  fieldKey: string;
  label: string;
};

type FieldOption = { value: string; label: string };

function normalizeFieldOptions(options: unknown[] | null | undefined): FieldOption[] {
  if (!Array.isArray(options)) {
    return [];
  }
  return options
    .map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt };
      }
      if (opt && typeof opt === "object") {
        const rec = opt as Record<string, unknown>;
        const value = rec.value;
        const label = rec.label;
        if (typeof value === "string" && typeof label === "string") {
          return { value, label };
        }
      }
      return null;
    })
    .filter((v): v is FieldOption => v !== null);
}

function renderValue(field: FormField, value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (field.fieldType === "checkbox") {
    if (!Array.isArray(value)) {
      return "-";
    }
    const opts = normalizeFieldOptions(field.options);
    const asStrings = value.filter((v): v is string => typeof v === "string");
    if (opts.length === 0) {
      return asStrings.join(", ");
    }
    return asStrings.map((v) => opts.find((o) => o.value === v)?.label ?? v).join(", ");
  }
  if (typeof value === "string" || typeof value === "number") {
    const opts = normalizeFieldOptions(field.options);
    if (
      opts.length > 0 &&
      (field.fieldType === "select" || field.fieldType === "radio") &&
      typeof value === "string"
    ) {
      return opts.find((o) => o.value === value)?.label ?? value;
    }
    return String(value);
  }
  return JSON.stringify(value);
}

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

async function submitAction(applicationId: string): Promise<void> {
  "use server";
  await backendAuthFetchJson(`/applications/${applicationId}/submit`, {
    method: "POST",
    body: {},
  });
  revalidatePath(`/app/applications/${applicationId}`);
  redirect(`/app/applications/${applicationId}`);
}

async function resubmitAction(applicationId: string): Promise<void> {
  "use server";
  await backendAuthFetchJson(`/applications/${applicationId}/resubmit`, {
    method: "POST",
    body: {},
  });
  revalidatePath(`/app/applications/${applicationId}`);
  redirect(`/app/applications/${applicationId}`);
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const detailRaw = await backendAuthFetchJson(`/applications/${id}`);
    const app = unwrapData<ApplicationDetail>(detailRaw);
    const templateRaw = await backendAuthFetchJson(`/form-templates/${app.formTemplateId}`);
    const fields = unwrapData<{ fields?: FormField[] }>(templateRaw).fields ?? [];
    const correctionsRaw = await backendAuthFetchJson(`/applications/${id}/corrections`);
    const corrections =
      unwrapData<{ corrections?: Correction[] }>(correctionsRaw).corrections ?? [];
    const correctionTargetsRaw = await backendAuthFetchJson(
      `/applications/${id}/correction-targets`,
    );
    const openItems =
      unwrapData<{ openCorrection?: { items?: CorrectionTargetItem[] } | null }>(
        correctionTargetsRaw,
      ).openCorrection?.items ?? [];

    return (
      <section style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>申請詳細</h2>
        <div>ID: {app.id}</div>
        <div>Status: {app.status}</div>
        <div>Template: {app.formTemplateId}</div>
        <div>Created: {new Date(app.createdAt).toLocaleString()}</div>
        <div>Updated: {new Date(app.updatedAt).toLocaleString()}</div>

        <h3 style={{ marginBottom: 0 }}>入力値</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {fields.map((field) => {
            const isCorrectionTarget = openItems.some(
              (item) => item.formFieldId === field.id || item.fieldKey === field.fieldKey,
            );
            return (
              <div
                key={field.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  padding: 8,
                  background: isCorrectionTarget ? "#fff7ed" : "transparent",
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {field.label} ({field.fieldKey})
                </div>
                <div>{renderValue(field, app.values[field.fieldKey])}</div>
                {isCorrectionTarget ? (
                  <small style={{ color: "#9a3412" }}>現在の差し戻し対象項目です</small>
                ) : null}
              </div>
            );
          })}
        </div>

        {(app.status === "draft" || app.status === "returned") && (
          <Link href={`/app/applications/${app.id}/edit`}>編集する</Link>
        )}

        {app.status === "draft" && (
          <form action={submitAction.bind(null, app.id)}>
            <button type="submit">提出する</button>
          </form>
        )}
        {app.status === "returned" && (
          <form action={resubmitAction.bind(null, app.id)}>
            <button type="submit">再提出する</button>
          </form>
        )}

        <h3 style={{ marginBottom: 0 }}>差し戻し履歴</h3>
        {corrections.length === 0 ? <p>差し戻し履歴はありません。</p> : null}
        {corrections.map((c) => (
          <article
            key={c.id}
            style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12 }}
          >
            <div>Status: {c.status}</div>
            <div>Created: {new Date(c.createdAt).toLocaleString()}</div>
            {c.overallComment ? <div>Overall: {c.overallComment}</div> : null}
            <ul style={{ marginBottom: 0 }}>
              {c.items.map((item) => (
                <li key={`${c.id}-${item.fieldKey}`}>
                  {item.fieldKey}
                  {item.comment ? `: ${item.comment}` : ""}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    );
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return <p>申請詳細の取得に失敗しました（status: {error.status}）</p>;
    }
    return <p>申請詳細の取得に失敗しました</p>;
  }
}
