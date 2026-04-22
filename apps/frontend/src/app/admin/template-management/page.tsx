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
  searchParams?: Promise<{ createdId?: string }>;
};

export default async function AdminTemplateManagementPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const createdId = params.createdId;

  const raw = await backendAuthFetchJson("/form-templates");
  const templates = unwrapData<{ templates?: FormTemplate[] }>(raw).templates ?? [];

  return (
    <div className="space-y-6">
      <ApplicationSetupSubnav />
      <div>
        <h2 className="text-3xl font-bold tracking-tight">フォーム管理</h2>
        <p className="text-muted-foreground">
          テンプレートの作成と一覧管理を行い、必要なテンプレートをフォーム作成画面で編集します
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. テンプレート一覧</CardTitle>
          <CardDescription>
            登録済みテンプレートの状態確認とフォーム編集画面への遷移ができます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">テンプレートがありません</p>
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
                    <Link
                      href={`/admin/form-templates?templateId=${encodeURIComponent(template.id)}`}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      フォーム作成で編集
                    </Link>
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
