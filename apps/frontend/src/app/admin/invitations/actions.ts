"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie } from "@/lib/server/session";

type InvitationResponse = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

type ApiFailure = { status: number; body: unknown };
type TenantRole = "tenant_admin" | "tenant_user";

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

function isTenantRole(role: string): role is TenantRole {
  return role === "tenant_admin" || role === "tenant_user";
}

function invitationErrorMessage(error: unknown) {
  if (!isApiFailure(error)) {
    return "招待の作成に失敗しました";
  }

  const body = error.body;
  if (body && typeof body === "object" && "errorCode" in body) {
    const errorCode = (body as { errorCode?: unknown }).errorCode;
    if (errorCode === "INVITATION_MEMBER_EXISTS") {
      return "このメールアドレスのユーザーは既に登録されています";
    }
    if (errorCode === "INVITATION_PENDING_EXISTS") {
      return "このメールアドレスには既に保留中の招待があります";
    }
  }

  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  if (error.status === 403) {
    return "招待を作成する権限がありません";
  }
  if (error.status === 409) {
    return "既存ユーザーまたは保留中の招待と重複しています";
  }
  return `招待の作成に失敗しました（status: ${error.status}）`;
}

function userDeleteErrorMessage(error: unknown) {
  if (!isApiFailure(error)) {
    return "ユーザーの削除に失敗しました";
  }

  const body = error.body;
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  if (error.status === 403) {
    return "このユーザーを削除する権限がありません";
  }
  if (error.status === 404) {
    return "削除対象のユーザーが見つかりません";
  }
  if (error.status === 409) {
    return "最後のテナント管理者は削除できません";
  }
  return `ユーザーの削除に失敗しました（status: ${error.status}）`;
}

function userRestoreErrorMessage(error: unknown) {
  if (!isApiFailure(error)) {
    return "ユーザーの復活に失敗しました";
  }

  const body = error.body;
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  if (error.status === 403) {
    return "このユーザーを復活する権限がありません";
  }
  if (error.status === 404) {
    return "復活対象のユーザーが見つかりません";
  }
  return `ユーザーの復活に失敗しました（status: ${error.status}）`;
}

export async function createInvitationAction(
  formData: FormData,
): Promise<void> {
  const email = formData.get("email");
  const role = formData.get("role");

  if (typeof email !== "string" || typeof role !== "string" || !isTenantRole(role)) {
    redirect("/admin/invitations?formError=入力内容を確認してください");
  }

  let createdRaw: unknown;
  try {
    const response = await client.POST("/invitations", {
      body: { email: email.trim(), role },
      headers: await authHeadersOrRedirect(),
    });
    if (!response.response.ok || !response.data) {
      throw { status: response.response.status, body: response.error };
    }
    createdRaw = response.data;
  } catch (error) {
    const nextParams = new URLSearchParams({
      toast: "error",
      message: invitationErrorMessage(error),
    });
    redirect(`/admin/invitations?${nextParams.toString()}`);
  }

  const created = unwrapData<InvitationResponse>(createdRaw);
  revalidatePath("/admin/invitations");

  const nextParams = new URLSearchParams({
    sent: "1",
    email: created.email,
    role: created.role,
    expiresAt: created.expiresAt,
  });
  redirect(`/admin/invitations?${nextParams.toString()}`);
}

export async function deleteUserAction(userId: string): Promise<void> {
  try {
    const response = await client.DELETE("/users/{id}", {
      params: { path: { id: userId } },
      headers: await authHeadersOrRedirect(),
    });
    if (!response.response.ok) {
      throw { status: response.response.status, body: response.error };
    }
  } catch (error) {
    const nextParams = new URLSearchParams({
      toast: "error",
      message: userDeleteErrorMessage(error),
    });
    redirect(`/admin/invitations?${nextParams.toString()}`);
  }

  revalidatePath("/admin/invitations");
  redirect("/admin/invitations?toast=success&message=ユーザーを削除しました");
}

export async function restoreUserAction(userId: string): Promise<void> {
  try {
    const response = await client.PATCH("/users/{id}/restore", {
      params: { path: { id: userId } },
      headers: await authHeadersOrRedirect(),
    });
    if (!response.response.ok) {
      throw { status: response.response.status, body: response.error };
    }
  } catch (error) {
    const nextParams = new URLSearchParams({
      toast: "error",
      message: userRestoreErrorMessage(error),
    });
    redirect(`/admin/invitations?${nextParams.toString()}`);
  }

  revalidatePath("/admin/invitations");
  redirect("/admin/invitations?toast=success&message=ユーザーを復活しました");
}
