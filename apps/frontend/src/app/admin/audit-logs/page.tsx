import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type AuditLogItem = {
  id: string;
  actionType: string;
  targetType: string;
  targetId: string | null;
  actorUserId: string | null;
  createdAt: string;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

export default async function AdminAuditLogsPage() {
  try {
    const accessToken = await getAccessTokenFromCookie();
    if (!accessToken) {
      throw 401;
    }
    const response = await client.GET("/audit-logs", {
      params: { query: { limit: 50 } },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.response.ok || !response.data) {
      throw response.response.status;
    }
    const rows = unwrapData<{ logs?: AuditLogItem[] }>(response.data).logs ?? [];
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">監査ログ</h2>
          <p className="text-muted-foreground">
            テナント内のすべての操作履歴を確認できます
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>監査ログ</CardTitle>
            <CardDescription>
              最新50件の操作履歴
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">監査ログはまだありません</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日時</TableHead>
                    <TableHead>操作</TableHead>
                    <TableHead>対象</TableHead>
                    <TableHead>対象ID</TableHead>
                    <TableHead>操作者</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(row.createdAt).toLocaleString("ja-JP")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.actionType}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{row.targetType}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.targetId ? `${row.targetId.slice(0, 8)}...` : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.actorUserId ? `${row.actorUserId.slice(0, 8)}...` : "-"}
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
    if (typeof error === "number") {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">監査ログの取得に失敗しました（status: {error}）</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">監査ログの取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }
}
