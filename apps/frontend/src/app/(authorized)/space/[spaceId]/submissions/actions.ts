"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createExportJobSchema } from "@/lib/auth-schema";
import { unwrapData } from "@/lib/server/api-envelope";
import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type {
  CreateExportJobBody,
  CreateExportJobSuccessJson,
  ExportJobResponse,
} from "@/lib/schema";

export async function createSubmissionCsvExportAction(
  spaceId: string,
  formData: FormData,
): Promise<void> {
  const parsed = createExportJobSchema.safeParse({
    groupId: spaceId,
    formDefinitionId: formData.get("formDefinitionId") || undefined,
  });

  if (!parsed.success || !parsed.data.formDefinitionId) {
    redirectToSubmissions(spaceId, {
      toast: "error",
      message: "CSV出力対象の申請フォームを選択してください",
    });
  }

  let job: ExportJobResponse;
  try {
    const accessToken = await getAccessTokenFromCookie();
    if (!accessToken) {
      redirect("/login");
    }
    const body: CreateExportJobBody = {
      groupId: parsed.data.groupId,
      formDefinitionId: parsed.data.formDefinitionId,
    };
    const response = await client.POST("/export-jobs", {
      body,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data: CreateExportJobSuccessJson | undefined = response.data;
    if (!response.response.ok || !data) {
      throw response.response.status;
    }
    job = unwrapData<ExportJobResponse>(data);
  } catch (error) {
    const message =
      typeof error === "number"
        ? `CSVジョブの作成に失敗しました（status: ${error}）`
        : "CSVジョブの作成に失敗しました";
    redirectToSubmissions(spaceId, { toast: "error", message });
  }

  revalidatePath(`/space/${encodeURIComponent(spaceId)}/submissions`);
  redirectToSubmissions(spaceId, {
    jobId: job.id,
    toast: "success",
    message: "CSVジョブを作成しました",
  });
}

function redirectToSubmissions(
  spaceId: string,
  params: Record<string, string>,
): never {
  const query = new URLSearchParams(params);
  redirect(`/space/${encodeURIComponent(spaceId)}/submissions?${query.toString()}`);
}
