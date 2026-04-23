import Link from "next/link";
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
  revalidatePath("/admin/application-setup");
  redirect(`/admin/application-setup?templateId=${encodeURIComponent(templateId)}`);
}

async function publishTemplateAction(templateId: string): Promise<void> {
  "use server";
  await backendAuthFetchJson(`/form-templates/${templateId}/publish`, {
    method: "POST",
    body: {},
  });
  revalidatePath("/admin/application-setup");
  revalidatePath("/admin/template-management");
  redirect(`/admin/application-setup?templateId=${encodeURIComponent(templateId)}`);
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
  redirect(`/admin/application-setup?templateId=${encodeURIComponent(templateId)}`);
}

type PageProps = {
  searchParams?: Promise<{ templateId?: string }>;
};

export default async function AdminApplicationSetupPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const selectedTemplateId = params.templateId;
  const raw = await backendAuthFetchJson("/form-templates");
  const templates = unwrapData<{ templates?: FormTemplate[] }>(raw).templates ?? [];
  const selected =
    templates.find((template) => template.id === selectedTemplateId) ?? templates.at(0) ?? null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">申請作成</h2>
        <p className="max-w-2xl text-[15px] leading-6 text-slate-600 md:text-[16px]">
          この画面でフォーム設定と承認フロー設定を一つの入力フローとして行えます。
        </p>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">1. フォーム設定</CardTitle>
          <CardDescription>
            申請作成・選択・フィールド定義までを行います。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form action={createTemplateAction} className="space-y-3 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">申請名</Label>
              <Input id="templateName" name="name" placeholder="例: 経費申請" required />
            </div>
            <Button type="submit">申請作成</Button>
          </form>

          {selected ? (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <p className="font-medium">{selected.name}</p>
                <Badge variant={selected.status === "published" ? "default" : "outline"}>
                  {selected.status === "published" ? "公開済み" : "下書き"}
                </Badge>
              </div>
              <form action={addFieldAction.bind(null, selected.id)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fieldKey">フィールドキー</Label>
                    <Input id="fieldKey" name="fieldKey" placeholder="例: amount" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="label">ラベル</Label>
                    <Input id="label" name="label" placeholder="例: 金額" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fieldType">フィールドタイプ</Label>
                    <select
                      id="fieldType"
                      name="fieldType"
                      defaultValue="text"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="text">テキスト</option>
                      <option value="textarea">複数行テキスト</option>
                      <option value="number">数値</option>
                      <option value="date">日付</option>
                      <option value="select">選択</option>
                      <option value="radio">ラジオボタン</option>
                      <option value="checkbox">チェックボックス</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">並び順</Label>
                    <Input
                      id="sortOrder"
                      name="sortOrder"
                      type="number"
                      defaultValue={selected.fields.length}
                      min={0}
                      step={1}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="required"
                    name="required"
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="required" className="font-normal">必須項目にする</Label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit">フィールド追加</Button>
                </div>
              </form>
              {selected.status === "draft" ? (
                <form action={publishTemplateAction.bind(null, selected.id)}>
                  <Button type="submit" variant="outline">申請公開</Button>
                </form>
              ) : null}

              {selected.fields.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">順序</TableHead>
                      <TableHead>ラベル</TableHead>
                      <TableHead>キー</TableHead>
                      <TableHead>タイプ</TableHead>
                      <TableHead>必須</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.fields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium">{field.sortOrder}</TableCell>
                        <TableCell>{field.label}</TableCell>
                        <TableCell className="font-mono text-xs">{field.fieldKey}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{field.fieldType}</Badge>
                        </TableCell>
                        <TableCell>
                          {field.required ? (
                            <Badge variant="destructive">必須</Badge>
                          ) : (
                            <Badge variant="secondary">任意</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-slate-600">まだフィールドがありません。</p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">2. 承認フロー設定</CardTitle>
          <CardDescription>作成した申請に対する承認フローを定義します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {selected ? (
            <form action={createApprovalFlowAction.bind(null, selected.id)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">フロー名</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="例: 経費申請承認フロー"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>承認ステップ</Label>
                <p className="text-sm text-muted-foreground">
                  ステップを追加し、順番を調整して保存してください。
                </p>
                <ApprovalStepsBuilder />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit">
                  承認フローを保存
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-slate-600">先に申請名を作成してください。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
