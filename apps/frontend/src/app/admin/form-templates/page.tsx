import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";

type FormField = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  sortOrder: number;
};

type FormTemplate = {
  id: string;
  name: string;
  status: string;
  fields: FormField[];
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

async function createTemplateAction(formData: FormData): Promise<void> {
  "use server";
  const name = formData.get("name");
  const description = formData.get("description");
  if (typeof name !== "string" || name.trim().length === 0) {
    return;
  }
  const created = await backendAuthFetchJson("/form-templates", {
    method: "POST",
    body: {
      name: name.trim(),
      description:
        typeof description === "string" && description.trim().length > 0
          ? description.trim()
          : undefined,
    },
  });
  const template = unwrapData<{ id: string }>(created);
  revalidatePath("/admin/form-templates");
  redirect(`/admin/form-templates?templateId=${encodeURIComponent(template.id)}`);
}

async function addFieldAction(templateId: string, formData: FormData): Promise<void> {
  "use server";
  const fieldKey = formData.get("fieldKey");
  const label = formData.get("label");
  const fieldType = formData.get("fieldType");
  const required = formData.get("required") === "on";
  const sortOrder = Number(formData.get("sortOrder") ?? "0");
  if (
    typeof fieldKey !== "string" ||
    typeof label !== "string" ||
    typeof fieldType !== "string"
  ) {
    return;
  }
  await backendAuthFetchJson(`/form-templates/${templateId}/fields`, {
    method: "POST",
    body: { fieldKey, label, fieldType, required, sortOrder },
  });
  revalidatePath("/admin/form-templates");
  redirect(`/admin/form-templates?templateId=${encodeURIComponent(templateId)}`);
}

async function publishTemplateAction(templateId: string): Promise<void> {
  "use server";
  await backendAuthFetchJson(`/form-templates/${templateId}/publish`, {
    method: "POST",
    body: {},
  });
  revalidatePath("/admin/form-templates");
  redirect(`/admin/form-templates?templateId=${encodeURIComponent(templateId)}`);
}

type PageProps = {
  searchParams?: Promise<{ templateId?: string }>;
};

export default async function AdminFormTemplatesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const selectedTemplateId = params.templateId;

  const raw = await backendAuthFetchJson("/form-templates");
  const templates = unwrapData<{ templates?: FormTemplate[] }>(raw).templates ?? [];
  const selected =
    templates.find((t) => t.id === selectedTemplateId) ?? templates.at(0) ?? null;

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <h2 style={{ margin: 0 }}>フォーム作成</h2>

      <form action={createTemplateAction} style={{ display: "grid", gap: 8 }}>
        <h3 style={{ marginBottom: 0 }}>1. テンプレート作成</h3>
        <input name="name" placeholder="テンプレート名（例: 経費申請）" required />
        <input name="description" placeholder="説明（任意）" />
        <button type="submit">テンプレート作成</button>
      </form>

      <section style={{ display: "grid", gap: 8 }}>
        <h3 style={{ marginBottom: 0 }}>2. 既存テンプレート</h3>
        {templates.length === 0 ? <p>テンプレートがありません。</p> : null}
        <ul>
          {templates.map((t) => (
            <li key={t.id}>
              <a href={`/admin/form-templates?templateId=${encodeURIComponent(t.id)}`}>
                {t.name} ({t.status})
              </a>
            </li>
          ))}
        </ul>
      </section>

      {selected ? (
        <>
          <form action={addFieldAction.bind(null, selected.id)} style={{ display: "grid", gap: 8 }}>
            <h3 style={{ marginBottom: 0 }}>3. フィールド追加: {selected.name}</h3>
            <input name="fieldKey" placeholder="field key (例: amount)" required />
            <input name="label" placeholder="ラベル (例: 金額)" required />
            <select name="fieldType" defaultValue="text">
              <option value="text">text</option>
              <option value="textarea">textarea</option>
              <option value="number">number</option>
              <option value="date">date</option>
              <option value="select">select</option>
              <option value="radio">radio</option>
              <option value="checkbox">checkbox</option>
            </select>
            <label>
              <input type="checkbox" name="required" /> 必須
            </label>
            <input
              name="sortOrder"
              type="number"
              defaultValue={selected.fields.length}
              min={0}
              step={1}
            />
            <button type="submit">フィールド追加</button>
          </form>

          <section style={{ display: "grid", gap: 8 }}>
            <h3 style={{ marginBottom: 0 }}>4. フィールド一覧</h3>
            <ul>
              {selected.fields.map((field) => (
                <li key={field.id}>
                  [{field.sortOrder}] {field.label} ({field.fieldKey}) / {field.fieldType}
                  {field.required ? " *" : ""}
                </li>
              ))}
            </ul>
          </section>

          {selected.status === "draft" ? (
            <form action={publishTemplateAction.bind(null, selected.id)}>
              <button type="submit">5. 公開する</button>
            </form>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
