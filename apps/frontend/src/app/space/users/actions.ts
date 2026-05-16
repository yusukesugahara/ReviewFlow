"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  backendAuthFetchJson,
  BackendHttpError,
} from "@/lib/server/backend-fetch";

function spaceUsersErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof BackendHttpError)) {
    return fallback;
  }
  if (error.status === 403) {
    return "この操作を実行する権限がありません";
  }
  if (error.status === 404) {
    return "対象のスペースメンバーが見つかりません";
  }
  if (error.status === 409) {
    return "最後のスペース管理者は変更または削除できません";
  }
  if (error.status === 400) {
    return "入力内容を確認してください";
  }
  return `${fallback}（status: ${error.status}）`;
}

function redirectWithSpaceUsersError(
  groupId: string,
  error: unknown,
  fallback: string,
): never {
  const params = new URLSearchParams({
    spaceId: groupId,
    toast: "error",
    message: spaceUsersErrorMessage(error, fallback),
  });
  redirect(`/space/users?${params.toString()}`);
}

function redirectWithSpaceUsersValidationError(
  groupId: string,
  message: string,
): never {
  const params = new URLSearchParams({
    spaceId: groupId,
    formError: message,
  });
  redirect(`/space/users?${params.toString()}`);
}

export async function removeSpaceMemberAction(
  groupId: string,
  userId: string,
): Promise<void> {
  try {
    await backendAuthFetchJson(`/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
    });
  } catch (error) {
    redirectWithSpaceUsersError(
      groupId,
      error,
      "スペースメンバーの削除に失敗しました",
    );
  }

  revalidatePath("/space/users");
  const params = new URLSearchParams({
    spaceId: groupId,
    toast: "success",
    message: "スペースメンバーを削除しました",
  });
  redirect(`/space/users?${params.toString()}`);
}

export async function updateSpaceMemberRoleAction(
  groupId: string,
  userId: string,
  formData: FormData,
): Promise<void> {
  const role = formData.get("role");

  if (typeof role !== "string") {
    redirectWithSpaceUsersValidationError(
      groupId,
      "更新するスペースロールを選択してください",
    );
  }

  try {
    await backendAuthFetchJson(`/groups/${groupId}/members/${userId}/role`, {
      method: "PATCH",
      body: { role },
    });
  } catch (error) {
    redirectWithSpaceUsersError(
      groupId,
      error,
      "スペースロールの更新に失敗しました",
    );
  }

  revalidatePath("/space/users");
  const params = new URLSearchParams({
    spaceId: groupId,
    toast: "success",
    message: "スペースロールを更新しました",
  });
  redirect(`/space/users?${params.toString()}`);
}
