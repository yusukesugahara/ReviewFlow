"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { client } from "@/lib/relay/client";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import {
  errorMessageFromBody,
  isApiFailure,
  throwIfApiResponseFailed,
} from "@/lib/server/api-failure";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import {
  addGroupMemberSchema,
  createSpaceSchema,
  inviteSpaceMemberSchema,
  updateSpaceSchema,
  updateGroupMemberRoleSchema,
} from "@/lib/auth-schema";
import type {
  AddGroupMemberBody,
  AddGroupMemberSuccessJson,
  CreateGroupBody,
  CreateGroupSuccessJson,
  CreateInvitationBody,
  CreateInvitationSuccessJson,
  UpdateGroupBody,
  UpdateGroupSuccessJson,
  UpdateGroupMemberRoleBody,
  UpdateGroupMemberRoleSuccessJson,
} from "@/lib/schema";

const formDataStringArraySchema = z.array(z.string());

/**
 * スペース操作失敗時の画面表示メッセージを組み立てます。
 */
function spaceErrorMessage(error: unknown, fallback: string) {
  if (!isApiFailure(error)) {
    return fallback;
  }

  const message = errorMessageFromBody(error.body, "");
  if (message) {
    return message;
  }

  if (error.status === 403) {
    return "この操作を実行する権限がありません";
  }
  if (error.status === 409) {
    return "同じ名前のスペース、または既存のメンバーと重複しています";
  }
  if (error.status === 400) {
    return "入力内容を確認してください";
  }
  return `${fallback}（status: ${error.status}）`;
}

/**
 * 管理者向けスペース画面へエラートースト付きでリダイレクトします。
 */
function redirectWithSpaceError(error: unknown, fallback: string): never {
  const nextParams = new URLSearchParams({
    toast: "error",
    message: spaceErrorMessage(error, fallback),
  });
  redirect(`/admin/spaces?${nextParams.toString()}`);
}

/**
 * 管理者向けスペース画面へ成功トースト付きでリダイレクトします。
 */
function redirectWithSpaceSuccess(message: string): never {
  const nextParams = new URLSearchParams({ toast: "success", message });
  redirect(`/admin/spaces?${nextParams.toString()}`);
}

/**
 * 管理者向けスペース画面へフォーム検証エラー付きでリダイレクトします。
 */
function redirectWithSpaceValidationError(message: string): never {
  const nextParams = new URLSearchParams({ formError: message });
  redirect(`/admin/spaces?${nextParams.toString()}`);
}

/**
 * FormData から同名キーの文字列配列を読み取ります。
 */
function readStringFormDataValues(formData: FormData, key: string): string[] {
  const parsed = formDataStringArraySchema.safeParse(formData.getAll(key));
  return parsed.success ? parsed.data : [];
}

/**
 * スペース作成フォームを検証し、新しいスペースを作成します。
 */
export async function createSpaceAction(formData: FormData): Promise<void> {
  const parsed = createSpaceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    adminUserIds: readStringFormDataValues(formData, "adminUserIds"),
  });

  if (!parsed.success) {
    redirectWithSpaceValidationError("スペース名と管理者を入力してください");
  }

  const body: CreateGroupBody = {
    name: parsed.data.name,
    description: parsed.data.description,
    adminUserIds: parsed.data.adminUserIds,
  };

  try {
    const response = await client.createGroup( {
      body,
      headers: await authHeadersOrRedirect(),
    });
    unwrapResponseData<CreateGroupSuccessJson["data"]>(response);
  } catch (error) {
    redirectWithSpaceError(error, "スペースの作成に失敗しました");
  }

  revalidatePath("/admin/spaces");
  redirectWithSpaceSuccess("スペースを作成しました");
}

/**
 * スペース編集フォームを検証し、スペース情報を更新します。
 */
export async function updateSpaceAction(
  groupId: string,
  formData: FormData,
): Promise<void> {
  const parsed = updateSpaceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    redirectWithSpaceValidationError("スペース名を入力してください");
  }

  const body: UpdateGroupBody = {
    name: parsed.data.name,
    description: parsed.data.description,
  };

  try {
    const response = await client.updateGroup( {
      params: { path: { groupId } },
      body,
      headers: await authHeadersOrRedirect(),
    });
    unwrapResponseData<UpdateGroupSuccessJson["data"]>(response);
  } catch (error) {
    redirectWithSpaceError(error, "スペース情報の更新に失敗しました");
  }

  revalidatePath("/admin/spaces");
  redirectWithSpaceSuccess("スペース情報を更新しました");
}

/**
 * 既存ユーザーを指定スペースのメンバーとして追加します。
 */
export async function addMemberAction(
  groupId: string,
  formData: FormData,
): Promise<void> {
  const parsed = addGroupMemberSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirectWithSpaceValidationError("追加するユーザとロールを選択してください");
  }

  const body: AddGroupMemberBody = parsed.data;

  try {
    const response = await client.addGroupMember( {
      params: { path: { groupId } },
      body,
      headers: await authHeadersOrRedirect(),
    });
    unwrapResponseData<AddGroupMemberSuccessJson["data"]>(response);
  } catch (error) {
    redirectWithSpaceError(error, "スペースメンバーの追加に失敗しました");
  }

  revalidatePath("/admin/spaces");
  redirectWithSpaceSuccess("スペースメンバーを追加しました");
}

/**
 * 未登録または未参加ユーザーを指定スペースへ招待します。
 */
export async function inviteSpaceMemberAction(
  groupId: string,
  formData: FormData,
): Promise<void> {
  const parsed = inviteSpaceMemberSchema.safeParse({
    email: formData.get("email"),
    tenantRole: formData.get("tenantRole"),
    groupRole: formData.get("groupRole"),
  });

  if (!parsed.success) {
    redirectWithSpaceValidationError("招待先メールアドレスとロールを入力してください");
  }

  const body: CreateInvitationBody = {
    email: parsed.data.email,
    role: parsed.data.tenantRole,
    groupId,
    groupRole: parsed.data.groupRole,
  };

  try {
    const response = await client.createInvitation( {
      body,
      headers: await authHeadersOrRedirect(),
    });
    unwrapResponseData<CreateInvitationSuccessJson["data"]>(response);
  } catch (error) {
    redirectWithSpaceError(error, "スペース招待の作成に失敗しました");
  }

  revalidatePath("/admin/spaces");
  redirectWithSpaceSuccess("招待メールを送信しました");
}

/**
 * 指定スペースメンバーのスペースロールを更新します。
 */
export async function updateMemberRoleAction(
  groupId: string,
  userId: string,
  formData: FormData,
): Promise<void> {
  const parsed = updateGroupMemberRoleSchema.safeParse({
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirectWithSpaceValidationError("更新するスペースロールを選択してください");
  }

  const body: UpdateGroupMemberRoleBody = parsed.data;

  try {
    const response = await client.updateGroupMemberRole( {
      params: { path: { groupId, userId } },
      body,
      headers: await authHeadersOrRedirect(),
    });
    unwrapResponseData<UpdateGroupMemberRoleSuccessJson["data"]>(response);
  } catch (error) {
    redirectWithSpaceError(error, "スペースロールの更新に失敗しました");
  }

  revalidatePath("/admin/spaces");
  redirectWithSpaceSuccess("スペースロールを更新しました");
}

/**
 * 指定スペースからメンバーを削除します。
 */
export async function removeMemberAction(
  groupId: string,
  userId: string,
): Promise<void> {
  try {
    const response = await client.removeGroupMember( {
      params: { path: { groupId, userId } },
      headers: await authHeadersOrRedirect(),
    });
    throwIfApiResponseFailed(response);
  } catch (error) {
    redirectWithSpaceError(error, "スペースメンバーの削除に失敗しました");
  }
  revalidatePath("/admin/spaces");
  redirectWithSpaceSuccess("スペースメンバーを削除しました");
}

/**
 * 現在のユーザーを指定スペースから退出させます。
 */
export async function leaveSpaceAction(groupId: string): Promise<void> {
  try {
    const response = await client.leaveGroup( {
      params: { path: { groupId } },
      headers: await authHeadersOrRedirect(),
    });
    throwIfApiResponseFailed(response);
  } catch (error) {
    redirectWithSpaceError(error, "スペースからの退出に失敗しました");
  }
  revalidatePath("/admin/spaces");
  redirectWithSpaceSuccess("スペースから退出しました");
}

/**
 * 指定スペースを削除します。
 */
export async function removeSpaceAction(groupId: string): Promise<void> {
  try {
    const response = await client.removeGroup( {
      params: { path: { groupId } },
      headers: await authHeadersOrRedirect(),
    });
    throwIfApiResponseFailed(response);
  } catch (error) {
    redirectWithSpaceError(error, "スペースの削除に失敗しました");
  }
  revalidatePath("/admin/spaces");
  redirectWithSpaceSuccess("スペースを削除しました");
}
