import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-fetch";
import { getCurrentSessionUser } from "@/lib/server/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ExportJob = {
  id: string;
  status: string;
  filePath?: string | null;
  createdAt: string;
};

async function createExportJobAction(formData: FormData): Promise<void> {
  "use server";
  const groupId = formData.get("groupId");
  const me = await getCurrentSessionUser();
  if (!me || typeof groupId !== "string" || groupId.length === 0) {
    redirect(
      "/admin/export-jobs?formError=エクスポート対象のスペースを選択してください",
    );
  }
  let job: ExportJob;
  try {
    const createdRaw = await backendAuthFetchJson("/export-jobs", {
      method: "POST",
      body: { groupId },
    });
    job = unwrapData<ExportJob>(createdRaw);
  } catch (error) {
    const message =
      error instanceof BackendHttpError
        ? `CSVジョブの作成に失敗しました（status: ${error.status}）`
        : "CSVジョブの作成に失敗しました";
    const params = new URLSearchParams({ toast: "error", message });
    redirect(`/admin/export-jobs?${params.toString()}`);
  }
  revalidatePath("/admin/export-jobs");
  const params = new URLSearchParams({
    jobId: job.id,
    toast: "success",
    message: "CSVジョブを作成しました",
  });
  redirect(`/admin/export-jobs?${params.toString()}`);
}

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

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

type ExportJobsPageProps = {
  searchParams?: Promise<{ jobId?: string; formError?: string }>;
};

export default async function ExportJobsPage({ searchParams }: ExportJobsPageProps) {
  const params = (await searchParams) ?? {};
  const spacesRaw = await backendAuthFetchJson("/groups");
  const spaces = unwrapData<{ groups?: { id: string }[] }>(spacesRaw).groups ?? [];
  const groupId = spaces[0]?.id ?? "";
  const jobId = params.jobId;
  let latestJob: ExportJob | null = null;
  let errorText: string | null = null;
  if (jobId) {
    try {
      const createdRaw = await backendAuthFetchJson(`/export-jobs/${jobId}`);
      latestJob = unwrapData<ExportJob>(createdRaw);
    } catch (error) {
      if (error instanceof BackendHttpError) {
        errorText = `CSVジョブ取得に失敗しました（status: ${error.status}）`;
      } else {
        errorText = "CSVジョブ取得に失敗しました";
      }
    }
  }

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
          {params.formError ? (
            <p className="mb-4 text-sm font-medium text-destructive">
              {params.formError}
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
