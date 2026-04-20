import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">承認フロー作成</h2>
        <p className="text-muted-foreground">
          申請の承認フローを定義します
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新しい承認フロー作成</CardTitle>
          <CardDescription>
            公開済みのフォームテンプレートに対して承認フローを作成します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createApprovalFlowAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="formTemplateId">フォームテンプレート</Label>
              <select
                id="formTemplateId"
                name="formTemplateId"
                required
                defaultValue=""
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="" disabled>
                  公開済みフォームを選択
                </option>
                {publishedTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

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
              <Label htmlFor="stepLines">ステップ定義</Label>
              <p className="text-sm text-muted-foreground">
                1行につき1ステップを定義します。形式: ステップ名,ロール(approver/tenant_admin),差し戻し可否(true/false)
              </p>
              <Textarea
                id="stepLines"
                name="stepLines"
                rows={5}
                defaultValue="一次承認,approver,true\n最終承認,tenant_admin,false"
                required
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                例: 一次承認,approver,true
              </p>
            </div>

            <Button type="submit">承認フロー作成</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>既存の承認フロー</CardTitle>
          <CardDescription>
            {flows.length}個の承認フローが定義されています
          </CardDescription>
        </CardHeader>
        <CardContent>
          {flows.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              承認フローがまだありません
            </p>
          ) : (
            <div className="space-y-4">
              {flows.map((flow) => (
                <div key={flow.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{flow.name}</h3>
                    <div className="flex gap-2">
                      <Badge variant={flow.isActive ? "default" : "secondary"}>
                        {flow.isActive ? "有効" : "無効"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    Template ID: {flow.formTemplateId.slice(0, 12)}...
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">承認ステップ:</p>
                    <div className="space-y-1">
                      {flow.steps.map((step) => (
                        <div
                          key={step.id}
                          className="flex items-center gap-2 text-sm pl-4 py-1"
                        >
                          <Badge variant="outline" className="w-8 text-center">
                            {step.stepOrder}
                          </Badge>
                          <span className="font-medium">{step.stepName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {step.approverRole === "tenant_admin" ? "管理者" : "承認者"}
                          </Badge>
                          {step.canReturn ? (
                            <Badge variant="outline" className="text-xs">
                              差し戻し可
                            </Badge>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
