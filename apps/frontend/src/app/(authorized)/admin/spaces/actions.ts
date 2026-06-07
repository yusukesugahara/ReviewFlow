"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { client } from "@/lib/server/backend-fetch";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import {
  errorMessageFromBody,
  isApiFailure,
  throwIfApiResponseFailed,
} from "@/lib/server/api-failure";
import {
  addGroupMemberSchema,
  createSpaceSchema,
  inviteSpaceMemberSchema,
  updateGroupMemberRoleSchema,
} from "@/lib/auth-schema";
import type {
  AddGroupMemberBody,
  AddGroupMemberSuccessJson,
  CreateGroupBody,
  CreateGroupSuccessJson,
  CreateInvitationBody,
  CreateInvitationSuccessJson,
  UpdateGroupMemberRoleBody,
  UpdateGroupMemberRoleSuccessJson,
} from "@/lib/schema";

const formDataStringArraySchema = z.array(z.string());

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

function redirectWithSpaceError(error: unknown, fallback: string): never {
  const nextParams = new URLSearchParams({
    toast: "error",
    message: spaceErrorMessage(error, fallback),
  });
  redirect(`/admin/spaces?${nextParams.toString()}`);
}

function redirectWithSpaceValidationError(message: string): never {
  const nextParams = new URLSearchParams({ formError: message });
  redirect(`/admin/spaces?${nextParams.toString()}`);
}

function readStringFormDataValues(formData: FormData, key: string): string[] {
  const parsed = formDataStringArraySchema.safeParse(formData.getAll(key));
  return parsed.success ? parsed.data : [];
}

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
    const response = await client.POST("/groups", {
      body,
      headers: await authHeadersOrRedirect(),
    });
    const data: CreateGroupSuccessJson | undefined = response.data;
    throwIfApiResponseFailed(response);
    if (!data) {
      throw { status: response.response.status, body: response.error };
    }
  } catch (error) {
    redirectWithSpaceError(error, "スペースの作成に失敗しました");
  }

  revalidatePath("/admin/spaces");
  redirect("/admin/spaces?toast=success&message=スペースを作成しました");
}

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
    const response = await client.POST("/groups/{groupId}/members", {
      params: { path: { groupId } },
      body,
      headers: await authHeadersOrRedirect(),
    });
    const data: AddGroupMemberSuccessJson | undefined = response.data;
    throwIfApiResponseFailed(response);
    if (!data) {
      throw { status: response.response.status, body: response.error };
    }
  } catch (error) {
    redirectWithSpaceError(error, "スペースメンバーの追加に失敗しました");
  }

  revalidatePath("/admin/spaces");
  redirect(
    "/admin/spaces?toast=success&message=スペースメンバーを追加しました",
  );
}

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
    const response = await client.POST("/invitations", {
      body,
      headers: await authHeadersOrRedirect(),
    });
    const data: CreateInvitationSuccessJson | undefined = response.data;
    throwIfApiResponseFailed(response);
    if (!data) {
      throw { status: response.response.status, body: response.error };
    }
  } catch (error) {
    redirectWithSpaceError(error, "スペース招待の作成に失敗しました");
  }

  revalidatePath("/admin/spaces");
  redirect("/admin/spaces?toast=success&message=招待メールを送信しました");
}

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
    const response = await client.PATCH("/groups/{groupId}/members/{userId}/role", {
      params: { path: { groupId, userId } },
      body,
      headers: await authHeadersOrRedirect(),
    });
    const data: UpdateGroupMemberRoleSuccessJson | undefined = response.data;
    throwIfApiResponseFailed(response);
    if (!data) {
      throw { status: response.response.status, body: response.error };
    }
  } catch (error) {
    redirectWithSpaceError(error, "スペースロールの更新に失敗しました");
  }

  revalidatePath("/admin/spaces");
  redirect(
    "/admin/spaces?toast=success&message=スペースロールを更新しました",
  );
}

export async function removeMemberAction(
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
    redirectWithSpaceError(error, "スペースメンバーの削除に失敗しました");
  }
  revalidatePath("/admin/spaces");
  redirect(
    "/admin/spaces?toast=success&message=スペースメンバーを削除しました",
  );
}

export async function leaveSpaceAction(groupId: string): Promise<void> {
  try {
    const response = await client.DELETE("/groups/{groupId}/members/me", {
      params: { path: { groupId } },
      headers: await authHeadersOrRedirect(),
    });
    throwIfApiResponseFailed(response);
  } catch (error) {
    redirectWithSpaceError(error, "スペースからの退出に失敗しました");
  }
  revalidatePath("/admin/spaces");
  redirect("/admin/spaces?toast=success&message=スペースから退出しました");
}

export async function removeSpaceAction(groupId: string): Promise<void> {
  try {
    const response = await client.DELETE("/groups/{groupId}", {
      params: { path: { groupId } },
      headers: await authHeadersOrRedirect(),
    });
    throwIfApiResponseFailed(response);
  } catch (error) {
    redirectWithSpaceError(error, "スペースの削除に失敗しました");
  }
  revalidatePath("/admin/spaces");
  redirect("/admin/spaces?toast=success&message=スペースを削除しました");
}
