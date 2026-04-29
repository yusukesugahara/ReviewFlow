import Link from "next/link";
import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type FormTemplateRow = {
  id: string;
  name: string;
  status: string;
  createdAt?: string;
};

type ApplicationRow = {
  id: string;
  status: string;
  applicantEmail: string;
  formTemplateId: string;
  createdAt: string;
};

type PageProps = {
  searchParams?: Promise<{ status?: string; spaceId?: string }>;
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

export default async function AdminApplicationsPage({ searchParams }: PageProps) {
  try {
    const params = (await searchParams) ?? {};
    const spacesRaw = await backendAuthFetchJson("/groups");
    const spaces = unwrapData<{ groups?: { id: string }[] }>(spacesRaw).groups ?? [];
    const spaceId = params.spaceId ?? spaces[0]?.id ?? "";
    const activeStatus = params.status === "draft" ? "draft" : "published";
    const [templatesRaw, applicationsRaw] = await Promise.all([
      backendAuthFetchJson(`/form-templates?groupId=${encodeURIComponent(spaceId)}`),
      backendAuthFetchJson(`/applications?groupId=${encodeURIComponent(spaceId)}`),
    ]);

    const templates =
      unwrapData<{ templates?: FormTemplateRow[] }>(templatesRaw).templates ?? [];
    const applicationRows =
      unwrapData<{ applications?: ApplicationRow[] }>(applicationsRaw).applications ?? [];

    const publishedTemplates = templates.filter((row) => row.status === "published");
    const draftTemplates = templates.filter((row) => row.status !== "published");
    const visibleTemplates =
      activeStatus === "draft" ? draftTemplates : publishedTemplates;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">申請一覧</h2>
          <p className="text-muted-foreground">
            申請作成画面で作成した申請定義と、提出済みの申請を確認できます
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>申請作成一覧</CardTitle>
            <CardDescription>
              {templates.length}件の申請定義があります
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Link
                href="/space/applications?status=published"
                className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-[13px] font-medium transition-colors ${
                  activeStatus === "published"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                申請 ({publishedTemplates.length})
              </Link>
              <Link
                href="/space/applications?status=draft"
                className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-[13px] font-medium transition-colors ${
                  activeStatus === "draft"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                下書き ({draftTemplates.length})
              </Link>
            </div>
            {templates.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">申請作成データはまだありません</p>
            ) : visibleTemplates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {activeStatus === "draft"
                  ? "下書きはありません"
                  : "公開済みの申請はありません"}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>申請名</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>作成日時</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="font-medium text-slate-900">{template.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.status === "published" ? "default" : "outline"}>
                          {template.status === "published" ? "公開済み" : "下書き"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {template.createdAt
                          ? new Date(template.createdAt).toLocaleString("ja-JP")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link
                            href={`/admin/template-management/${encodeURIComponent(template.id)}?spaceId=${encodeURIComponent(spaceId)}`}
                          >
                            詳細
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>提出済み申請一覧</CardTitle>
            <CardDescription>
              {applicationRows.length}件の提出済み申請があります
            </CardDescription>
          </CardHeader>
          <CardContent>
            {applicationRows.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">提出済み申請はまだありません</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ステータス</TableHead>
                    <TableHead>申請者</TableHead>
                    <TableHead>テンプレート</TableHead>
                    <TableHead>作成日時</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applicationRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(r.status)}>
                          {getStatusLabel(r.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.applicantEmail}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.formTemplateId.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString("ja-JP")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/space/applications/${r.id}`}>詳細</Link>
                        </Button>
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
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">申請一覧の取得に失敗しました（status: {error.status}）</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">申請一覧の取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }
}
