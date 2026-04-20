import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";
import { renderFieldValue } from "@/lib/form-field-value";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">申請詳細</h2>
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
              <span className="text-muted-foreground">テンプレートID</span>
              <span className="font-mono">{app.formTemplateId.slice(0, 12)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">作成日時</span>
              <span>{new Date(app.createdAt).toLocaleString("ja-JP")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">更新日時</span>
              <span>{new Date(app.updatedAt).toLocaleString("ja-JP")}</span>
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

        {(app.status === "draft" || app.status === "returned") && (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/app/applications/${app.id}/edit`}>編集する</Link>
            </Button>
            {app.status === "draft" && (
              <form action={submitAction.bind(null, app.id)}>
                <Button type="submit">提出する</Button>
              </form>
            )}
            {app.status === "returned" && (
              <form action={resubmitAction.bind(null, app.id)}>
                <Button type="submit">再提出する</Button>
              </form>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>差し戻し履歴</CardTitle>
            <CardDescription>
              {corrections.length === 0
                ? "差し戻し履歴はありません"
                : `${corrections.length}件の差し戻しがあります`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {corrections.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                差し戻し履歴はありません
              </p>
            ) : (
              <div className="space-y-4">
                {corrections.map((c) => (
                  <div key={c.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{c.status}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(c.createdAt).toLocaleString("ja-JP")}
                      </span>
                    </div>
                    {c.overallComment ? (
                      <div className="bg-muted/50 p-3 rounded-md">
                        <p className="text-sm font-medium mb-1">総合コメント</p>
                        <p className="text-sm">{c.overallComment}</p>
                      </div>
                    ) : null}
                    {c.items.length > 0 ? (
                      <div>
                        <p className="text-sm font-medium mb-2">個別コメント</p>
                        <ul className="space-y-1">
                          {c.items.map((item) => (
                            <li
                              key={`${c.id}-${item.fieldKey}`}
                              className="text-sm pl-4 border-l-2 border-amber-400"
                            >
                              <span className="font-mono text-xs text-muted-foreground">
                                {item.fieldKey}:
                              </span>{" "}
                              {item.comment || "（コメントなし）"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              申請詳細の取得に失敗しました（status: {error.status}）
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">申請詳細の取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }
}
