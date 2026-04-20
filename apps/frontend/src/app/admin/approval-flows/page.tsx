import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";

type FormTemplate = {
  id: string;
  name: string;
  status: string;
};

type ApprovalStep = {
  id: string;
  stepOrder: number;
  stepName: string;
  approverRole: string;
  canReturn: boolean;
};

type ApprovalFlow = {
  id: string;
  formTemplateId: string;
  name: string;
  isActive: boolean;
  steps: ApprovalStep[];
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

function parseSteps(stepLines: string) {
  const lines = stepLines
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines.map((line, index) => {
    const [stepNameRaw, roleRaw, canReturnRaw] = line.split(",").map((v) => v?.trim() ?? "");
    return {
      stepOrder: index + 1,
      stepName: stepNameRaw || `Step ${index + 1}`,
      approverRole: roleRaw === "tenant_admin" ? "tenant_admin" : "approver",
      canReturn: canReturnRaw === "true",
    };
  });
}

async function createApprovalFlowAction(formData: FormData): Promise<void> {
  "use server";
  const formTemplateId = formData.get("formTemplateId");
  const name = formData.get("name");
  const stepLines = formData.get("stepLines");
  if (
    typeof formTemplateId !== "string" ||
    typeof name !== "string" ||
    typeof stepLines !== "string"
  ) {
    return;
  }
  const steps = parseSteps(stepLines);
  if (steps.length === 0) {
    return;
  }

  await backendAuthFetchJson("/approval-flows", {
    method: "POST",
    body: { formTemplateId, name, steps },
  });
  revalidatePath("/admin/approval-flows");
  redirect("/admin/approval-flows");
}

export default async function AdminApprovalFlowsPage() {
  const templatesRaw = await backendAuthFetchJson("/form-templates");
  const templates = unwrapData<{ templates?: FormTemplate[] }>(templatesRaw).templates ?? [];
  const publishedTemplates = templates.filter((t) => t.status === "published");

  const flowsRaw = await backendAuthFetchJson("/approval-flows");
  const flows = unwrapData<{ flows?: ApprovalFlow[] }>(flowsRaw).flows ?? [];

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <h2 style={{ margin: 0 }}>承認フロー作成</h2>
      <form action={createApprovalFlowAction} style={{ display: "grid", gap: 8 }}>
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
        <input name="name" placeholder="フロー名（例: 経費申請フロー）" required />
        <label style={{ display: "grid", gap: 4 }}>
          <span>ステップ定義（1行: stepName,approver|tenant_admin,true|false）</span>
          <textarea
            name="stepLines"
            rows={5}
            defaultValue={"一次承認,approver,true\n最終承認,tenant_admin,false"}
            required
          />
        </label>
        <button type="submit">承認フロー作成</button>
      </form>

      <section style={{ display: "grid", gap: 8 }}>
        <h3 style={{ marginBottom: 0 }}>既存フロー</h3>
        <ul>
          {flows.map((flow) => (
            <li key={flow.id}>
              {flow.name} ({flow.isActive ? "active" : "inactive"}) / template:{" "}
              {flow.formTemplateId}
              <ul>
                {flow.steps.map((step) => (
                  <li key={step.id}>
                    {step.stepOrder}. {step.stepName} ({step.approverRole}) return:
                    {step.canReturn ? "yes" : "no"}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
