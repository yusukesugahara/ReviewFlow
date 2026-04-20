import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";
import { getCurrentSessionUser } from "@/lib/server/session";

type ExportJob = {
  id: string;
  status: string;
  filePath?: string | null;
  createdAt: string;
};

async function createExportJobAction(): Promise<void> {
  "use server";
  const me = await getCurrentSessionUser();
  if (!me) {
    return;
  }
  const createdRaw = await backendAuthFetchJson("/export-jobs", {
    method: "POST",
    body: {},
  });
  const job = unwrapData<ExportJob>(createdRaw);
  revalidatePath("/admin/export-jobs");
  redirect(`/admin/export-jobs?jobId=${encodeURIComponent(job.id)}`);
}

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

type ExportJobsPageProps = {
  searchParams?: Promise<{ jobId?: string }>;
};

export default async function ExportJobsPage({ searchParams }: ExportJobsPageProps) {
  const params = (await searchParams) ?? {};
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
    <section style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>CSVジョブ</h2>
      <p style={{ margin: 0 }}>
        現行APIは一覧を持たないため、最新ジョブを都度作成して状態を確認します。
      </p>
      <form action={createExportJobAction}>
        <button type="submit">新しいCSVジョブを作成</button>
      </form>
      {errorText ? <p>{errorText}</p> : null}
      {latestJob ? (
        <div>
          <div>ID: {latestJob.id}</div>
          <div>Status: {latestJob.status}</div>
          <div>Created: {new Date(latestJob.createdAt).toLocaleString()}</div>
          {latestJob.status === "completed" ? (
            <a href={`/api/export-jobs/${latestJob.id}/download`}>CSVをダウンロード</a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
