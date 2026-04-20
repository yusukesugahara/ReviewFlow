import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";
import { renderFieldValue } from "@/lib/form-field-value";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  fieldType: string;
  options?: unknown[] | null;
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

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "approved":
      return "default";
    case "in_review":
      return "secondary";
    case "returned":
    case "rejected":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "下書き",
    submitted: "提出済み",
    in_review: "レビュー中",
    returned: "差し戻し",
    approved: "承認",
    rejected: "却下",
  };
  return labels[status] ?? status;
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">レビュー詳細</h2>
            <p className="text-muted-foreground">ID: {app.id.slice(0, 12)}...</p>
          </div>
          <Badge variant={getStatusBadgeVariant(app.status)} className="text-base px-4 py-2">
            {getStatusLabel(app.status)}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">申請者ID</span>
              <span className="font-mono">{app.applicantUserId.slice(0, 12)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">現在のステップ</span>
              <span>{app.currentStepOrder ?? "-"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>申請内容</CardTitle>
            <CardDescription>入力された値を確認できます</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field) => {
              const isCorrectionTarget = openItems.some(
                (item) => item.formFieldId === field.id || item.fieldKey === field.fieldKey,
              );
              return (
                <div
                  key={field.id}
                  className={`p-4 rounded-lg border ${
                    isCorrectionTarget ? "bg-amber-50 border-amber-200" : "bg-muted/30"
                  }`}
                >
                  <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                    {field.label}
                    <span className="font-mono text-xs text-muted-foreground">
                      ({field.fieldKey})
                    </span>
                  </div>
                  <div className="text-base">
                    {renderFieldValue(field, app.values[field.fieldKey])}
                  </div>
                  {isCorrectionTarget ? (
                    <p className="text-xs text-amber-700 mt-2 font-medium">
                      ⚠️ 差し戻し対象項目です
                    </p>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {app.status === "in_review" ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700">✓ 承認</CardTitle>
                <CardDescription>この申請を承認します</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={approveAction.bind(null, app.id)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="approve-comment">コメント（任意）</Label>
                    <Textarea
                      id="approve-comment"
                      name="comment"
                      placeholder="承認コメント"
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full">承認する</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-700">✕ 却下</CardTitle>
                <CardDescription>この申請を却下します</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={rejectAction.bind(null, app.id)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reject-comment">コメント（任意）</Label>
                    <Textarea
                      id="reject-comment"
                      name="comment"
                      placeholder="却下理由"
                      rows={3}
                    />
                  </div>
                  <Button type="submit" variant="destructive" className="w-full">却下する</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {app.status === "in_review" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-amber-700">↩ 差し戻し</CardTitle>
              <CardDescription>
                特定のフィールドに対して修正を依頼します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={returnAction.bind(null, app.id, fieldMap)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="overallComment">全体コメント（任意）</Label>
                  <Textarea
                    id="overallComment"
                    name="overallComment"
                    placeholder="差し戻しの全体的な理由や説明"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>差し戻し対象フィールド</Label>
                  <div className="space-y-3">
                    {fields.map((field) => (
                      <div key={field.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`return:${field.id}`}
                            name={`return:${field.id}`}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label
                            htmlFor={`return:${field.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {field.label}
                            <span className="font-mono text-xs text-muted-foreground ml-2">
                              ({field.fieldKey})
                            </span>
                          </Label>
                        </div>
                        <Input
                          name={`comment:${field.id}`}
                          placeholder="この項目への個別コメント（任意）"
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" variant="outline" className="w-full">
                  差し戻す
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {openItems.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>現在オープン中の修正対象</CardTitle>
              <CardDescription>
                {openItems.length}個のフィールドが差し戻し対象となっています
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {openItems.map((item) => (
                  <li
                    key={`${item.formFieldId}-${item.fieldKey}`}
                    className="flex items-center gap-2 p-2 border-l-2 border-amber-400 pl-3"
                  >
                    <Badge variant="outline">{item.label}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      ({item.fieldKey})
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              レビュー詳細の取得に失敗しました（status: {error.status}）
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">レビュー詳細の取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }
}
