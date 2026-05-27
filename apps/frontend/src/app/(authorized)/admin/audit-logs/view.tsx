import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AdminAuditLogsErrorViewProps, AdminAuditLogsViewProps } from "./types";

function shortId(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? `${value.slice(0, 8)}...` : "-";
}

export function AdminAuditLogsView({ rows }: AdminAuditLogsViewProps) {
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
          <CardDescription>最新50件の操作履歴</CardDescription>
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
                      {shortId(row.targetId)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {shortId(row.actorUserId)}
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

export function AdminAuditLogsErrorView({ status }: AdminAuditLogsErrorViewProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-destructive">
          {status
            ? `監査ログの取得に失敗しました（status: ${status}）`
            : "監査ログの取得に失敗しました"}
        </p>
      </CardContent>
    </Card>
  );
}
