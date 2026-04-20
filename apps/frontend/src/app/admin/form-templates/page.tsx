import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

async function createTemplateAction(formData: FormData): Promise<void> {
  "use server";
  const name = formData.get("name");
  const description = formData.get("description");
  if (typeof name !== "string" || name.trim().length === 0) {
    return;
  }
  const created = await backendAuthFetchJson("/form-templates", {
    method: "POST",
    body: {
      name: name.trim(),
      description:
        typeof description === "string" && description.trim().length > 0
          ? description.trim()
          : undefined,
    },
  });
  const template = unwrapData<{ id: string }>(created);
  revalidatePath("/admin/form-templates");
  redirect(`/admin/form-templates?templateId=${encodeURIComponent(template.id)}`);
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
  revalidatePath("/admin/form-templates");
  redirect(`/admin/form-templates?templateId=${encodeURIComponent(templateId)}`);
}

async function publishTemplateAction(templateId: string): Promise<void> {
  "use server";
  await backendAuthFetchJson(`/form-templates/${templateId}/publish`, {
    method: "POST",
    body: {},
  });
  revalidatePath("/admin/form-templates");
  redirect(`/admin/form-templates?templateId=${encodeURIComponent(templateId)}`);
}

type PageProps = {
  searchParams?: Promise<{ templateId?: string }>;
};

export default async function AdminFormTemplatesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const selectedTemplateId = params.templateId;

  const raw = await backendAuthFetchJson("/form-templates");
  const templates = unwrapData<{ templates?: FormTemplate[] }>(raw).templates ?? [];
  const selected =
    templates.find((t) => t.id === selectedTemplateId) ?? templates.at(0) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">フォームテンプレート作成</h2>
        <p className="text-muted-foreground">
          申請フォームのテンプレートを作成し、フィールドを定義します
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. 新しいテンプレート作成</CardTitle>
          <CardDescription>まずテンプレートを作成します</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createTemplateAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">テンプレート名</Label>
              <Input
                id="name"
                name="name"
                placeholder="例: 経費申請フォーム"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">説明（任意）</Label>
              <Input
                id="description"
                name="description"
                placeholder="このテンプレートの説明"
              />
            </div>
            <Button type="submit">テンプレート作成</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. 既存テンプレート</CardTitle>
          <CardDescription>編集するテンプレートを選択してください</CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">テンプレートがありません</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <Link
                  key={t.id}
                  href={`/admin/form-templates?templateId=${encodeURIComponent(t.id)}`}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-accent ${
                    selected?.id === t.id ? "bg-accent border-primary" : ""
                  }`}
                >
                  <span className="font-medium">{t.name}</span>
                  <Badge variant={t.status === "published" ? "default" : "outline"}>
                    {t.status === "published" ? "公開済み" : "下書き"}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selected ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>3. フィールド追加: {selected.name}</CardTitle>
              <CardDescription>テンプレートにフィールドを追加します</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={addFieldAction.bind(null, selected.id)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fieldKey">フィールドキー</Label>
                    <Input
                      id="fieldKey"
                      name="fieldKey"
                      placeholder="例: amount"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="label">ラベル</Label>
                    <Input
                      id="label"
                      name="label"
                      placeholder="例: 金額"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <Button type="submit">フィールド追加</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. フィールド一覧</CardTitle>
              <CardDescription>
                {selected.fields.length}個のフィールドが定義されています
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selected.fields.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  フィールドがまだありません
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
              )}
            </CardContent>
          </Card>

          {selected.status === "draft" ? (
            <Card>
              <CardHeader>
                <CardTitle>5. テンプレート公開</CardTitle>
                <CardDescription>
                  フィールド定義が完了したら、テンプレートを公開できます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={publishTemplateAction.bind(null, selected.id)}>
                  <Button type="submit" size="lg">公開する</Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Badge>公開済み</Badge>
                  <span className="text-sm text-muted-foreground">
                    このテンプレートは既に公開されています
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
