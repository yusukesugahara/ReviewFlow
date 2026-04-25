import Link from "next/link";
import { backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationSetupSubnav } from "../_components/application-setup-subnav";

type FormTemplate = {
  id: string;
  name: string;
  status: string;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

type PageProps = {
  searchParams?: Promise<{ createdId?: string; status?: string; setupError?: string }>;
};

function TemplateListSection({
  title,
  emptyMessage,
  templates,
  createdId,
}: {
  title: string;
  emptyMessage: string;
  templates: FormTemplate[];
  createdId?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <Badge variant="outline">{templates.length}</Badge>
      </div>

      {templates.length === 0 ? (
        <p className="rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between ${
                createdId === template.id ? "border-primary bg-accent/40" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{template.name}</span>
                <Badge variant={template.status === "published" ? "default" : "outline"}>
                  {template.status === "published" ? "公開済み" : "下書き"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/template-management/${encodeURIComponent(template.id)}`}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  フォーム詳細
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function AdminTemplateManagementPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const createdId = params.createdId;

  const raw = await backendAuthFetchJson("/form-templates");
  const templates = unwrapData<{ templates?: FormTemplate[] }>(raw).templates ?? [];
  const publishedTemplates = templates.filter((template) => template.status === "published");
  const draftTemplates = templates.filter((template) => template.status !== "published");

  return (
    <div className="space-y-6">
      <ApplicationSetupSubnav />
      <div>
        <h2 className="text-3xl font-bold tracking-tight">フォーム管理</h2>
        <p className="text-muted-foreground">
          申請の作成と一覧管理を行い、設定内容を確認します
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. 申請一覧</CardTitle>
          <CardDescription>
            登録済み申請フォームの状態確認と詳細画面への遷移ができます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">申請フォームがありません</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <TemplateListSection
                title="下書き"
                emptyMessage="下書きの申請フォームがありません"
                templates={draftTemplates}
                createdId={createdId}
              />
              <TemplateListSection
                title="公開済み"
                emptyMessage="公開済みの申請フォームがありません"
                templates={publishedTemplates}
                createdId={createdId}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
