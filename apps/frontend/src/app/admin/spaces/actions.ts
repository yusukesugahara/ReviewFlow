"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  backendAuthFetchJson,
  BackendHttpError,
} from "@/lib/server/backend-fetch";

function spaceErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof BackendHttpError)) {
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
    error: spaceErrorMessage(error, fallback),
  });
  redirect(`/admin/spaces?${nextParams.toString()}`);
}

export async function createSpaceAction(formData: FormData): Promise<void> {
  const name = formData.get("name");
  const description = formData.get("description");
  const adminUserIds = formData
    .getAll("adminUserIds")
    .filter((value): value is string => typeof value === "string");

  if (typeof name !== "string" || adminUserIds.length === 0) {
    return;
  }

  try {
    await backendAuthFetchJson("/groups", {
      method: "POST",
      body: {
        name: name.trim(),
        description:
          typeof description === "string" ? description.trim() : undefined,
        adminUserIds,
      },
    });
  } catch (error) {
    redirectWithSpaceError(error, "スペースの作成に失敗しました");
  }

  revalidatePath("/admin/spaces");
  redirect("/admin/spaces");
}

export async function addMemberAction(
  groupId: string,
  formData: FormData,
): Promise<void> {
  const userId = formData.get("userId");
  const role = formData.get("role");

  if (typeof userId !== "string" || typeof role !== "string") {
    return;
  }

  try {
    await backendAuthFetchJson(`/groups/${groupId}/members`, {
      method: "POST",
      body: { userId, role },
    });
  } catch (error) {
    redirectWithSpaceError(error, "スペースメンバーの追加に失敗しました");
  }

  revalidatePath("/admin/spaces");
  redirect("/admin/spaces");
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
    typeof groupRole !== "string"
  ) {
    return;
  }

  try {
    await backendAuthFetchJson("/invitations", {
      method: "POST",
      body: {
        email: email.trim(),
        role: tenantRole,
        groupId,
        groupRole,
      },
    });
  } catch (error) {
    redirectWithSpaceError(error, "スペース招待の作成に失敗しました");
  }

  revalidatePath("/admin/spaces");
  redirect("/admin/spaces");
}

export async function updateMemberRoleAction(
  groupId: string,
  userId: string,
  formData: FormData,
): Promise<void> {
  const role = formData.get("role");

  if (typeof role !== "string") {
    return;
  }

  try {
    await backendAuthFetchJson(`/groups/${groupId}/members/${userId}/role`, {
      method: "PATCH",
      body: { role },
    });
  } catch (error) {
    redirectWithSpaceError(error, "スペースロールの更新に失敗しました");
  }

  revalidatePath("/admin/spaces");
  redirect("/admin/spaces");
}

export async function removeMemberAction(
  groupId: string,
  userId: string,
): Promise<void> {
  try {
    await backendAuthFetchJson(`/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
    });
  } catch (error) {
    redirectWithSpaceError(error, "スペースメンバーの削除に失敗しました");
  }
  revalidatePath("/admin/spaces");
  redirect("/admin/spaces");
}

export async function leaveSpaceAction(groupId: string): Promise<void> {
  try {
    await backendAuthFetchJson(`/groups/${groupId}/members/me`, {
      method: "DELETE",
    });
  } catch (error) {
    redirectWithSpaceError(error, "スペースからの退出に失敗しました");
  }
  revalidatePath("/admin/spaces");
  redirect("/admin/spaces");
}

export async function removeSpaceAction(groupId: string): Promise<void> {
  try {
    await backendAuthFetchJson(`/groups/${groupId}`, { method: "DELETE" });
  } catch (error) {
    redirectWithSpaceError(error, "スペースの削除に失敗しました");
  }
  revalidatePath("/admin/spaces");
  redirect("/admin/spaces");
}
