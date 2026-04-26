import Link from "next/link";
import { notFound } from "next/navigation";
import { backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

type PageProps = {
  params: Promise<{ templateId: string }>;
};

export default async function AdminTemplateDetailPage({ params }: PageProps) {
  const { templateId } = await params;
  const raw = await backendAuthFetchJson("/form-templates");
  const templates = unwrapData<{ templates?: FormTemplate[] }>(raw).templates ?? [];
  const template = templates.find((item) => item.id === templateId);

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">フォーム詳細</h2>
          <p className="text-muted-foreground">フォームの設定内容とフィールド定義を確認します</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/application-setup">申請作成へ戻る</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{template.name}</CardTitle>
          <CardDescription>フォームの基本情報</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">ステータス:</span>
            <Badge variant={template.status === "published" ? "default" : "outline"}>
              {template.status === "published" ? "公開済み" : "下書き"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">テンプレートID: {template.id}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>フィールド一覧</CardTitle>
          <CardDescription>
            {template.fields.length}個のフィールドが定義されています
          </CardDescription>
        </CardHeader>
        <CardContent>
          {template.fields.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              まだフィールドがありません
            </p>
          ) : (
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
                {template.fields.map((field) => (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
