"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";

/**
 * 申請フォーム一覧のパスをアーカイブ表示条件付きで組み立てます。
 */
function applicationsPath(spaceId: string, archived = false): string {
  const base = `/space/${encodeURIComponent(spaceId)}/applications`;
  return archived ? `${base}?archived=true` : base;
}

/**
 * 既存パスへクエリパラメータを付与した URL を返します。
 */
function withQuery(path: string, params: URLSearchParams): string {
  return `${path}${path.includes("?") ? "&" : "?"}${params.toString()}`;
}

/**
 * フォーム定義のアーカイブ状態を更新し、一覧画面へ結果付きで遷移します。
 */
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

/**
 * フォーム定義を削除済み状態に移動します。
 */
export async function archiveFormDefinitionAction(
  definitionId: string,
  spaceId: string,
): Promise<void> {
  await updateArchivedState(definitionId, spaceId, "archive");
}

/**
 * 削除済みのフォーム定義を復元します。
 */
export async function restoreFormDefinitionAction(
  definitionId: string,
  spaceId: string,
): Promise<void> {
  await updateArchivedState(definitionId, spaceId, "restore");
}
