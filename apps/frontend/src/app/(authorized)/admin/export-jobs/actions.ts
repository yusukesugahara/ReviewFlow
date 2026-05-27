"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createExportJobSchema } from "@/lib/auth-schema";
import { client } from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type {
  CreateExportJobBody,
  CreateExportJobSuccessJson,
  ExportJobResponse,
} from "@/lib/schema";

export async function createExportJobAction(formData: FormData): Promise<void> {
  const parsed = createExportJobSchema.safeParse({
    groupId: formData.get("groupId"),
  });
  const me = await getCurrentSessionUser();

  if (!me || !parsed.success) {
    redirect(
      "/admin/export-jobs?formError=エクスポート対象のスペースを選択してください",
    );
  }

  let job: ExportJobResponse;
  try {
    const accessToken = await getAccessTokenFromCookie();
    if (!accessToken) {
      redirect("/login");
    }
    const body: CreateExportJobBody = { groupId: parsed.data.groupId };
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
