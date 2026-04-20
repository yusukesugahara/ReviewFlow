import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";

type FormTemplate = {
  id: string;
  name: string;
  status: string;
};

type ApprovalFlow = {
  id: string;
  formTemplateId: string;
  name: string;
  isActive: boolean;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

async function createApplicationAction(formData: FormData): Promise<void> {
  "use server";
  const formTemplateId = formData.get("formTemplateId");
  const approvalFlowId = formData.get("approvalFlowId");
  const valuesJson = formData.get("valuesJson");
  if (typeof formTemplateId !== "string" || typeof valuesJson !== "string") {
    redirect("/app/applications/new?error=invalid_input");
  }

  let values: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(valuesJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("values must be object");
    }
    values = parsed as Record<string, unknown>;
  } catch {
    redirect("/app/applications/new?error=invalid_json");
  }

  const created = await backendAuthFetchJson("/applications", {
    method: "POST",
    body: {
      formTemplateId,
      approvalFlowId:
        typeof approvalFlowId === "string" && approvalFlowId.length > 0
          ? approvalFlowId
          : undefined,
      values,
    },
  });
  const app = unwrapData<{ id: string }>(created);
  revalidatePath("/app/applications");
  redirect(`/app/applications/${app.id}`);
}

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function NewApplicationPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const error = params.error;

  const templatesRaw = await backendAuthFetchJson("/form-templates");
  const templates = unwrapData<{ templates?: FormTemplate[] }>(templatesRaw).templates ?? [];
  const publishedTemplates = templates.filter((t) => t.status === "published");

  const flowsRaw = await backendAuthFetchJson("/approval-flows");
  const flows = unwrapData<{ flows?: ApprovalFlow[] }>(flowsRaw).flows ?? [];

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>申請作成</h2>
      <p style={{ margin: 0 }}>
        values は `field_key` をキーにした JSON で入力します（例: {"{"}"amount{"}"}: 1200）。
      </p>
      {error ? (
        <p style={{ margin: 0, color: "#b91c1c" }}>
          入力エラーです。JSON 形式と必須項目を確認してください。
        </p>
      ) : null}
      <form action={createApplicationAction} style={{ display: "grid", gap: 8 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>フォームテンプレート</span>
          <select name="formTemplateId" required defaultValue="">
            <option value="" disabled>
              公開済みフォームを選択
            </option>
            {publishedTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>承認フロー（任意）</span>
          <select name="approvalFlowId" defaultValue="">
            <option value="">自動選択</option>
            {flows.map((flow) => (
              <option key={flow.id} value={flow.id}>
                {flow.name} ({flow.formTemplateId})
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>values (JSON)</span>
          <textarea
            name="valuesJson"
            rows={10}
            defaultValue={`{\n  "title": "出張交通費",\n  "amount": 12000\n}`}
            required
          />
        </label>
        <button type="submit">申請を作成</button>
      </form>
    </section>
  );
}
