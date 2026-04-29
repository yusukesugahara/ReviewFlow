import Link from "next/link";
import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ApplicationRow = {
  id: string;
  status: string;
  applicantEmail: string;
  formTemplateId: string;
  createdAt: string;
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

type PageProps = {
  searchParams?: Promise<{ spaceId?: string }>;
};

export default async function ReviewApplicationsPage({ searchParams }: PageProps) {
  try {
    const params = (await searchParams) ?? {};
    const spacesRaw = await backendAuthFetchJson("/groups");
    const spaces = unwrapData<{ groups?: { id: string }[] }>(spacesRaw).groups ?? [];
    const spaceId = params.spaceId ?? spaces[0]?.id ?? "";
    const raw = await backendAuthFetchJson(
      `/applications?groupId=${encodeURIComponent(spaceId)}`,
    );
    const rows =
      unwrapData<{ applications?: ApplicationRow[] }>(raw).applications ?? [];

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">レビュー待ち申請</h2>
          <p className="text-muted-foreground">
            あなたがレビューすべき申請一覧です
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>レビュー対象</CardTitle>
            <CardDescription>
              {rows.length}件の申請があります
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">レビュー待ちの申請はありません</p>
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
                  {rows.map((r) => (
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
                        {r.formTemplateId.slice(0, 12)}...
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString("ja-JP")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/review/applications/${r.id}`}>レビュー</Link>
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
            <p className="text-destructive">レビュー一覧の取得に失敗しました（status: {error.status}）</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">レビュー一覧の取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }
}
