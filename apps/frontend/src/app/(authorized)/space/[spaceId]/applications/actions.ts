"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie } from "@/lib/server/session";

async function authHeadersOrRedirect(): Promise<{ Authorization: string }> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }
  return { Authorization: `Bearer ${accessToken}` };
}

function applicationsPath(spaceId: string, archived = false): string {
  const base = `/space/${encodeURIComponent(spaceId)}/applications`;
  return archived ? `${base}?archived=true` : base;
}

function withQuery(path: string, params: URLSearchParams): string {
  return `${path}${path.includes("?") ? "&" : "?"}${params.toString()}`;
}

async function updateArchivedState(
  definitionId: string,
  spaceId: string,
  action: "archive" | "restore",
): Promise<void> {
  const authHeaders = await authHeadersOrRedirect();
  const response =
    action === "archive"
      ? await client.POST("/form-definitions/{id}/archive", {
          params: { path: { id: definitionId } },
          headers: authHeaders,
        })
      : await client.POST("/form-definitions/{id}/restore", {
          params: { path: { id: definitionId } },
          headers: authHeaders,
        });

  if (!response.response.ok) {
    const params = new URLSearchParams({
      toast: "error",
      message:
        action === "archive"
          ? "申請フォームの削除に失敗しました"
          : "申請フォームの復元に失敗しました",
    });
    redirect(withQuery(applicationsPath(spaceId, action === "restore"), params));
  }

  revalidatePath(applicationsPath(spaceId));
  revalidatePath(applicationsPath(spaceId, true));
  const params = new URLSearchParams({
    toast: "success",
    message:
      action === "archive"
        ? "申請フォームを削除済みに移動しました"
        : "申請フォームを復元しました",
  });
  redirect(withQuery(applicationsPath(spaceId, action === "archive"), params));
}

export async function archiveFormDefinitionAction(
  definitionId: string,
  spaceId: string,
): Promise<void> {
  await updateArchivedState(definitionId, spaceId, "archive");
}

export async function restoreFormDefinitionAction(
  definitionId: string,
  spaceId: string,
): Promise<void> {
  await updateArchivedState(definitionId, spaceId, "restore");
}
