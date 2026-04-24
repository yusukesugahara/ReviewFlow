import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApprovalStepsBuilder } from "../_components/approval-steps-builder";

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
      sortOrder: Number(formData.get("sortOrder") ?? "0"),
    },
  });
  revalidatePath("/admin/application-setup");
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
  await backendAuthFetchJson(`/form-templates/${templateId}/fields/${fieldId}/move`, {
    method: "POST",
    body: { direction },
  });
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
  const selected = templates.at(0) ?? null;
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
          </form>

          {selected ? (
            <div className="space-y-4 rounded-lg border p-4">
              <form action={addFieldAction.bind(null, selected.id)}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">順序</TableHead>
                      <TableHead>ラベル</TableHead>
                      <TableHead>キー</TableHead>
                      <TableHead>タイプ</TableHead>
                      <TableHead>必須</TableHead>
                      <TableHead className="w-20">削除</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-6 text-right font-medium">{field.sortOrder}</span>
                            <Button
                              type="submit"
                              formAction={moveFieldAction.bind(null, selected.id, field.id, "up")}
                              formNoValidate
                              variant="outline"
                              size="sm"
                              disabled={index === 0}
                            >
                              ↑
                            </Button>
                            <Button
                              type="submit"
                              formAction={moveFieldAction.bind(null, selected.id, field.id, "down")}
                              formNoValidate
                              variant="outline"
                              size="sm"
                              disabled={index === selected.fields.length - 1}
                            >
                              ↓
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input value={field.label} readOnly />
                        </TableCell>
                        <TableCell>
                          <Input value={field.fieldKey} readOnly className="font-mono text-xs" />
                        </TableCell>
                        <TableCell>
                          <select
                            defaultValue={field.fieldType}
                            name={`fieldType_${field.id}`}
                            className="flex h-9 w-full rounded-md border border-input bg-slate-50 px-3 py-1 text-sm shadow-sm"
                          >
                            <option value="text">テキスト</option>
                            <option value="textarea">複数行テキスト</option>
                            <option value="number">数値</option>
                            <option value="date">日付</option>
                            <option value="select">選択</option>
                            <option value="radio">ラジオボタン</option>
                            <option value="checkbox">チェックボックス</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end">
                            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                              <input
                                type="checkbox"
                                name={`required_${field.id}`}
                                defaultChecked={field.required}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              必須
                            </label>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="submit"
                            formAction={deleteFieldAction.bind(null, selected.id, field.id)}
                            formNoValidate
                            variant="destructive"
                            size="sm"
                          >
                            削除
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <input type="hidden" name="sortOrder" value={nextSortOrder} />
                <input type="hidden" name="label" value="テンプレート" />
                <input type="hidden" name="fieldType" value="text" />
                <input type="hidden" name="required" value="on" />
                <div className="mt-3 flex justify-end">
                  <Button type="submit">追加</Button>
                </div>
              </form>
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
