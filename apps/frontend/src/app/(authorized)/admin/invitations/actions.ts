"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { createInvitationSchema } from "@/lib/auth-schema";
import { unwrapData } from "@/lib/server/api-envelope";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { errorMessageFromBody, isApiFailure } from "@/lib/server/api-error";
import type {
  CreateInvitationBody,
  CreateInvitationSuccessJson,
} from "@/lib/schema";

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

  const message = errorMessageFromBody(body, "");
  if (message) {
    return message;
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

  const message = errorMessageFromBody(error.body, "");
  if (message) {
    return message;
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

  const message = errorMessageFromBody(error.body, "");
  if (message) {
    return message;
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
  const parsed = createInvitationSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirect("/admin/invitations?formError=入力内容を確認してください");
  }

  const body: CreateInvitationBody = parsed.data;
  let createdRaw: CreateInvitationSuccessJson;
  try {
    const response = await client.POST("/invitations", {
      body,
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

  const created = unwrapData<CreateInvitationSuccessJson["data"]>(createdRaw);
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
