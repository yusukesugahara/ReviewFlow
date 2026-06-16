"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { isApiFailure, throwIfApiResponseFailed } from "@/lib/server/api-failure";
import {
  addGroupMemberSchema,
  updateGroupMemberRoleSchema,
} from "@/lib/auth-schema";
import type {
  AddGroupMemberBody,
  UpdateGroupMemberRoleBody,
} from "@/lib/schema";

/**
 * スペースユーザー管理操作失敗時の画面表示メッセージを組み立てます。
 */
function spaceUsersErrorMessage(error: unknown, fallback: string) {
  if (!isApiFailure(error)) {
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

/**
 * スペースユーザー管理画面へエラートースト付きでリダイレクトします。
 */
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

/**
 * スペースユーザー管理画面へフォーム検証エラー付きでリダイレクトします。
 */
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

/**
 * 指定スペースからメンバーを削除します。
 */
export async function removeSpaceMemberAction(
  groupId: string,
  userId: string,
): Promise<void> {
  try {
    const response = await client.DELETE("/groups/{groupId}/members/{userId}", {
      params: { path: { groupId, userId } },
      headers: await authHeadersOrRedirect(),
    });
    throwIfApiResponseFailed(response);
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

/**
 * 指定スペースメンバーのスペースロールを更新します。
 */
export async function updateSpaceMemberRoleAction(
  groupId: string,
  userId: string,
  formData: FormData,
): Promise<void> {
  const parsed = updateGroupMemberRoleSchema.safeParse({
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirectWithSpaceUsersValidationError(
      groupId,
      "更新するスペースロールを選択してください",
    );
  }

  const body: UpdateGroupMemberRoleBody = parsed.data;

  try {
    const response = await client.PATCH("/groups/{groupId}/members/{userId}/role", {
      params: { path: { groupId, userId } },
      body,
      headers: await authHeadersOrRedirect(),
    });
    throwIfApiResponseFailed(response);
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

/**
 * 既存ユーザーを指定スペースのメンバーとして追加します。
 */
export async function addSpaceMemberAction(
  groupId: string,
  formData: FormData,
): Promise<void> {
  const parsed = addGroupMemberSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    redirectWithSpaceUsersValidationError(
      groupId,
      "追加するユーザとロールを選択してください",
    );
  }

  const body: AddGroupMemberBody = parsed.data;

  try {
    const response = await client.POST("/groups/{groupId}/members", {
      params: { path: { groupId } },
      body,
      headers: await authHeadersOrRedirect(),
    });
    throwIfApiResponseFailed(response);
  } catch (error) {
    redirectWithSpaceUsersError(
      groupId,
      error,
      "スペースメンバーの追加に失敗しました",
    );
  }

  revalidatePath("/space/users");
  const params = new URLSearchParams({
    spaceId: groupId,
    toast: "success",
    message: "スペースメンバーを追加しました",
  });
  redirect(`/space/users?${params.toString()}`);
}
