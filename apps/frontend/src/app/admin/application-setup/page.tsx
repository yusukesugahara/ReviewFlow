import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BackendHttpError, backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApprovalStepsBuilder } from "../_components/approval-steps-builder";
import { AddFieldForm, FormFieldEditor } from "../_components/form-field-editor";

type FormField = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options?: unknown[] | null;
  sortOrder: number;
};

type FormTemplate = {
  id: string;
  name: string;
  status: string;
  fields: FormField[];
};

type ApprovalFlow = {
  id: string;
  formTemplateId: string;
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

function parseOptions(optionsText: FormDataEntryValue | null) {
  if (typeof optionsText !== "string") {
    return [];
  }
  return optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, all) => line.length > 0 && all.indexOf(line) === index)
    .map((line) => ({ label: line, value: line }));
}

function readsOptions(fieldType: string): boolean {
  return fieldType === "select" || fieldType === "radio" || fieldType === "checkbox";
}

async function createTemplateAction(formData: FormData): Promise<void> {
  "use server";
  const name = formData.get("name");
  if (typeof name !== "string" || name.trim().length === 0) {
    return;
  }

  await backendAuthFetchJson("/form-templates", {
    method: "POST",
    body: {
      name: name.trim(),
      description: `${name.trim()} の申請フォーム`,
    },
  });
  revalidatePath("/admin/application-setup");
  revalidatePath("/admin/template-management");
  redirect("/admin/application-setup");
}

async function addFieldAction(templateId: string, formData: FormData): Promise<void> {
  "use server";
  const fieldKeyInput = formData.get("fieldKey");
  const label = formData.get("label");
  const fieldType = formData.get("fieldType");
  const required = formData.get("required") === "on";
  if (
    typeof label !== "string" ||
    typeof fieldType !== "string"
  ) {
    return;
  }
  const normalizedLabel = label.trim();
  const resolvedLabel = normalizedLabel.length > 0 ? normalizedLabel : "テンプレート";
  const fallbackFieldKey = normalizedLabel
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const fieldKey =
    typeof fieldKeyInput === "string" && fieldKeyInput.trim().length > 0
      ? fieldKeyInput.trim()
      : fallbackFieldKey || `field_${Date.now()}`;

  await backendAuthFetchJson(`/form-templates/${templateId}/fields`, {
    method: "POST",
    body: {
      fieldKey,
      label: resolvedLabel,
      fieldType,
      required,
      placeholder:
        typeof formData.get("placeholder") === "string"
          ? String(formData.get("placeholder")).trim()
          : undefined,
      helpText:
        typeof formData.get("helpText") === "string"
          ? String(formData.get("helpText")).trim()
          : undefined,
      options: readsOptions(fieldType) ? parseOptions(formData.get("optionsText")) : [],
      sortOrder: Number(formData.get("sortOrder") ?? "0"),
    },
  });
  revalidatePath("/admin/application-setup");
  redirect("/admin/application-setup");
}

async function updateFieldSettingsAction(
  templateId: string,
  fieldId: string,
  formData: FormData
): Promise<void> {
  "use server";
  const fieldType = formData.get("fieldType");
  if (typeof fieldType !== "string") {
    return;
  }

  await backendAuthFetchJson(`/form-templates/${templateId}/fields/${fieldId}/settings`, {
    method: "POST",
    body: {
      label:
        typeof formData.get("label") === "string"
          ? String(formData.get("label")).trim()
          : undefined,
      fieldType,
      required: formData.get("required") === "on",
      placeholder:
        typeof formData.get("placeholder") === "string"
          ? String(formData.get("placeholder")).trim()
          : undefined,
      helpText:
        typeof formData.get("helpText") === "string"
          ? String(formData.get("helpText")).trim()
          : undefined,
      options: readsOptions(fieldType) ? parseOptions(formData.get("optionsText")) : [],
    },
  });
  revalidatePath("/admin/application-setup");
  revalidatePath(`/admin/template-management/${templateId}`);
  redirect("/admin/application-setup");
}

async function publishTemplateAction(templateId: string): Promise<void> {
  "use server";
  await backendAuthFetchJson(`/form-templates/${templateId}/publish`, {
    method: "POST",
    body: {},
  });
  revalidatePath("/admin/application-setup");
  revalidatePath("/admin/template-management");
  redirect("/admin/application-setup");
}

async function keepDraftAction(): Promise<void> {
  "use server";
  revalidatePath("/admin/application-setup");
  redirect("/admin/application-setup");
}

async function moveFieldAction(
  templateId: string,
  fieldId: string,
  direction: "up" | "down"
): Promise<void> {
  "use server";
  try {
    await backendAuthFetchJson(`/form-templates/${templateId}/fields/${fieldId}/move`, {
      method: "POST",
      body: { direction },
    });
  } catch (error) {
    if (
      error instanceof BackendHttpError &&
      (error.status === 404 || error.status === 409)
    ) {
      revalidatePath("/admin/application-setup");
      redirect("/admin/application-setup");
    }
    throw error;
  }
  revalidatePath("/admin/application-setup");
  redirect("/admin/application-setup");
}

async function deleteFieldAction(templateId: string, fieldId: string): Promise<void> {
  "use server";
  await backendAuthFetchJson(`/form-templates/${templateId}/fields/${fieldId}/delete`, {
    method: "POST",
    body: {},
  });
  revalidatePath("/admin/application-setup");
  redirect("/admin/application-setup");
}

async function createApprovalFlowAction(templateId: string, formData: FormData): Promise<void> {
  "use server";
  const name = formData.get("name");
  const stepLines = formData.get("stepLines");
  if (typeof name !== "string" || typeof stepLines !== "string") {
    return;
  }
  const steps = parseSteps(stepLines);
  if (name.trim().length === 0 || steps.length === 0) {
    return;
  }

  await backendAuthFetchJson("/approval-flows", {
    method: "POST",
    body: {
      formTemplateId: templateId,
      name: name.trim(),
      steps,
    },
  });
  revalidatePath("/admin/application-setup");
  revalidatePath("/admin/approval-flows");
  redirect("/admin/application-setup");
}

export default async function AdminApplicationSetupPage() {
  const templatesRaw = await backendAuthFetchJson("/form-templates");
  const templates = unwrapData<{ templates?: FormTemplate[] }>(templatesRaw).templates ?? [];
  const flowsRaw = await backendAuthFetchJson("/approval-flows");
  const flows = unwrapData<{ flows?: ApprovalFlow[] }>(flowsRaw).flows ?? [];
  const selected = templates.find((template) => template.status === "draft") ?? templates.at(0) ?? null;
  const isDraftSelected = selected?.status === "draft";
  const hasFields = (selected?.fields.length ?? 0) > 0;
  const hasApprovalFlow =
    selected != null && flows.some((flow) => flow.formTemplateId === selected.id);
  const canPublish = hasFields && hasApprovalFlow;
  const nextSortOrder =
    selected == null
      ? 0
      : selected.fields.reduce((max, field) => Math.max(max, field.sortOrder), -1) + 1;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">申請作成</h2>
        <p className="max-w-2xl text-[15px] leading-6 text-slate-600 md:text-[16px]">
          3ステップで「フォーム作成 → 承認フロー作成 → 申請公開」を進めます。
        </p>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">1. フォーム設定</CardTitle>
          <CardDescription>
            まず申請名を作成し、必要な入力項目を追加します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form action={createTemplateAction} className="space-y-3 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">申請名</Label>
              <Input id="templateName" name="name" placeholder="例: 経費申請" required />
            </div>
            <div className="flex justify-end">
              <Button type="submit">申請名を作成</Button>
            </div>
          </form>

          {selected ? (
            <div className="space-y-4 rounded-lg border p-4">
              {!isDraftSelected ? (
                <p className="text-sm text-slate-600">
                  公開済みテンプレートは編集できません。編集するには下書きテンプレートを選択してください。
                </p>
              ) : null}
              <div className="space-y-3">
                {selected.fields.length === 0 ? (
                  <p className="rounded-lg border border-dashed py-6 text-center text-sm text-slate-600">
                    まだフォーム項目がありません。
                  </p>
                ) : (
                  selected.fields.map((field, index) => (
                    <FormFieldEditor
                      key={field.id}
                      field={field}
                      index={index}
                      total={selected.fields.length}
                      disabled={!isDraftSelected}
                      updateAction={updateFieldSettingsAction.bind(null, selected.id, field.id)}
                      deleteAction={deleteFieldAction.bind(null, selected.id, field.id)}
                      moveUpAction={moveFieldAction.bind(null, selected.id, field.id, "up")}
                      moveDownAction={moveFieldAction.bind(null, selected.id, field.id, "down")}
                    />
                  ))
                )}
              </div>
              <AddFieldForm
                action={addFieldAction.bind(null, selected.id)}
                nextSortOrder={nextSortOrder}
                disabled={!isDraftSelected}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">2. 承認フロー設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selected ? (
            <form action={createApprovalFlowAction.bind(null, selected.id)} className="space-y-4">
              <input type="hidden" name="name" value={`${selected.name} 承認フロー`} />
                <div className="space-y-2">
                  <Label>承認ステップ</Label>
                  <p className="text-sm text-muted-foreground">
                    ステップを追加し、順番を調整して保存してください。
                  </p>
                  <ApprovalStepsBuilder />
                </div>
            </form>
          ) : (
            <p className="text-sm text-slate-600">先に申請名を作成してください。</p>
          )}
        </CardContent>
      </Card>

      {selected ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">3. 申請公開</CardTitle>
            <CardDescription>
              条件を満たしたら、最後に公開します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selected.status === "published" ? (
              <p className="text-sm text-slate-600">この申請はすでに公開済みです。</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={hasFields ? "default" : "outline"}>
                    フォーム項目 {hasFields ? "OK" : "未完了"}
                  </Badge>
                  <Badge variant={hasApprovalFlow ? "default" : "outline"}>
                    承認フロー {hasApprovalFlow ? "OK" : "未完了"}
                  </Badge>
                </div>
                {!canPublish ? (
                  <p className="text-sm text-slate-600">
                    公開するには、フォーム項目を1件以上追加し、承認フローを1件以上作成してください。
                  </p>
                ) : null}
                <form action={publishTemplateAction.bind(null, selected.id)} className="flex items-center gap-2">
                  <Button type="submit" formAction={keepDraftAction} variant="secondary">
                    下書き
                  </Button>
                  <Button type="submit" variant="outline" disabled={!canPublish}>
                    申請公開
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
