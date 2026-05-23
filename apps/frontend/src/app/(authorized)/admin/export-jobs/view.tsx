import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createExportJobAction } from "./actions";
import type { ExportJobsViewProps } from "./types";

function getJobStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "processing":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

export function ExportJobsView({
  groupId,
  latestJob,
  errorText,
  formError,
}: ExportJobsViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">CSVエクスポート</h2>
        <p className="text-muted-foreground">
          申請データをCSV形式でエクスポートできます
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新しいジョブ作成</CardTitle>
          <CardDescription>
            申請データの全件エクスポートジョブを作成します
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formError ? (
            <p className="mb-4 text-sm font-medium text-destructive">
              {formError}
            </p>
          ) : null}
          <form action={createExportJobAction}>
            <input type="hidden" name="groupId" value={groupId} />
            <Button type="submit">新しいCSVジョブを作成</Button>
          </form>
        </CardContent>
      </Card>

      {errorText ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{errorText}</p>
          </CardContent>
        </Card>
      ) : null}

      {latestJob ? (
        <Card>
          <CardHeader>
            <CardTitle>最新ジョブ</CardTitle>
            <CardDescription>ジョブID: {latestJob.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">ステータス:</span>
              <Badge variant={getJobStatusVariant(latestJob.status)}>
                {latestJob.status}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              作成日時: {new Date(latestJob.createdAt).toLocaleString("ja-JP")}
            </div>
            {latestJob.status === "completed" ? (
              <Button type="button" disabled>
                CSV生成済み
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
