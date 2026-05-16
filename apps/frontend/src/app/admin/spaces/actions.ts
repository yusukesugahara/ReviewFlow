"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie } from "@/lib/server/session";

type ApiFailure = { status: number; body: unknown };
type TenantRole = "tenant_admin" | "tenant_user";
type SpaceRole = "admin" | "user";

async function authHeadersOrRedirect(): Promise<{ Authorization: string }> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }
  return { Authorization: `Bearer ${accessToken}` };
}

function isApiFailure(error: unknown): error is ApiFailure {
  return (
    !!error &&
    typeof error === "object" &&
    typeof (error as { status?: unknown }).status === "number" &&
    "body" in error
  );
}

function throwIfFailed(response: { response: Response; error?: unknown }): void {
  if (!response.response.ok) {
    throw { status: response.response.status, body: response.error };
  }
}

function isTenantRole(role: string): role is TenantRole {
  return role === "tenant_admin" || role === "tenant_user";
}

function isSpaceRole(role: string): role is SpaceRole {
  return role === "admin" || role === "user";
}

function spaceErrorMessage(error: unknown, fallback: string) {
  if (!isApiFailure(error)) {
    return fallback;
  }

  const body = error.body;
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
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

export async function createSpaceAction(formData: FormData): Promise<void> {
  const name = formData.get("name");
  const description = formData.get("description");
  const adminUserIds = formData
    .getAll("adminUserIds")
    .filter((value): value is string => typeof value === "string");

  if (typeof name !== "string" || adminUserIds.length === 0) {
    redirectWithSpaceValidationError("スペース名と管理者を入力してください");
  }

  try {
    const response = await client.POST("/groups", {
      body: {
        name: name.trim(),
        description:
          typeof description === "string" ? description.trim() : undefined,
        adminUserIds,
      },
      headers: await authHeadersOrRedirect(),
    });
    throwIfFailed(response);
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
  const userId = formData.get("userId");
  const role = formData.get("role");

  if (typeof userId !== "string" || typeof role !== "string" || !isSpaceRole(role)) {
    redirectWithSpaceValidationError("追加するユーザーとロールを選択してください");
  }

  try {
    const response = await client.POST("/groups/{groupId}/members", {
      params: { path: { groupId } },
      body: { userId, role },
      headers: await authHeadersOrRedirect(),
    });
    throwIfFailed(response);
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
  const email = formData.get("email");
  const tenantRole = formData.get("tenantRole");
  const groupRole = formData.get("groupRole");

  if (
    typeof email !== "string" ||
    typeof tenantRole !== "string" ||
    typeof groupRole !== "string" ||
    !isTenantRole(tenantRole) ||
    !isSpaceRole(groupRole)
  ) {
    redirectWithSpaceValidationError("招待先メールアドレスとロールを入力してください");
  }

  try {
    const response = await client.POST("/invitations", {
      body: {
        email: email.trim(),
        role: tenantRole,
        groupId,
        groupRole,
      },
      headers: await authHeadersOrRedirect(),
    });
    throwIfFailed(response);
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
  const role = formData.get("role");

  if (typeof role !== "string" || !isSpaceRole(role)) {
    redirectWithSpaceValidationError("更新するスペースロールを選択してください");
  }

  try {
    const response = await client.PATCH("/groups/{groupId}/members/{userId}/role", {
      params: { path: { groupId, userId } },
      body: { role },
      headers: await authHeadersOrRedirect(),
    });
    throwIfFailed(response);
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
    throwIfFailed(response);
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
    throwIfFailed(response);
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
    throwIfFailed(response);
  } catch (error) {
    redirectWithSpaceError(error, "スペースの削除に失敗しました");
  }
  revalidatePath("/admin/spaces");
  redirect("/admin/spaces?toast=success&message=スペースを削除しました");
}
