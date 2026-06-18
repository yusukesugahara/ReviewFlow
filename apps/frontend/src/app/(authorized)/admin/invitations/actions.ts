"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { client } from "@/lib/relay/client";
import { createInvitationSchema } from "@/lib/auth-schema";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import {
  errorMessageFromBody,
  isApiFailure,
  throwIfApiResponseFailed,
} from "@/lib/server/api-failure";
import type {
  CreateInvitationBody,
  CreateInvitationSuccessJson,
} from "@/lib/schema";

/**
 * 招待作成失敗時の画面表示メッセージを組み立てます。
 */
function invitationErrorMessage(error: unknown) {
  if (!isApiFailure(error)) {
    return "招待の作成に失敗しました";
  }

  const body = error.body;
  if (body && typeof body === "object" && "errorCode" in body) {
    const errorCode = (body as { errorCode?: unknown }).errorCode;
    if (errorCode === "INVITATION_MEMBER_EXISTS") {
      return "このメールアドレスのユーザは既に登録されています";
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
    return "既存ユーザまたは保留中の招待と重複しています";
  }
  return `招待の作成に失敗しました（status: ${error.status}）`;
}

/**
 * ユーザー削除失敗時の画面表示メッセージを組み立てます。
 */
function userDeleteErrorMessage(error: unknown) {
  if (!isApiFailure(error)) {
    return "ユーザの削除に失敗しました";
  }

  const message = errorMessageFromBody(error.body, "");
  if (message) {
    return message;
  }

  if (error.status === 403) {
    return "このユーザを削除する権限がありません";
  }
  if (error.status === 404) {
    return "削除対象のユーザが見つかりません";
  }
  if (error.status === 409) {
    return "最後のテナント管理者は削除できません";
  }
  return `ユーザの削除に失敗しました（status: ${error.status}）`;
}

/**
 * ユーザー復活失敗時の画面表示メッセージを組み立てます。
 */
function userRestoreErrorMessage(error: unknown) {
  if (!isApiFailure(error)) {
    return "ユーザの復活に失敗しました";
  }

  const message = errorMessageFromBody(error.body, "");
  if (message) {
    return message;
  }

  if (error.status === 403) {
    return "このユーザを復活する権限がありません";
  }
  if (error.status === 404) {
    return "復活対象のユーザが見つかりません";
  }
  return `ユーザの復活に失敗しました（status: ${error.status}）`;
}

/**
 * 招待作成フォームを検証し、テナントユーザー招待を作成します。
 */
export async function createInvitationAction(
  formData: FormData,
): Promise<void> {
  const parsed = createInvitationSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    const params = new URLSearchParams({
      formError: "入力内容を確認してください",
    });
    redirect(`/admin/invitations?${params.toString()}`);
  }

  const body: CreateInvitationBody = parsed.data;
  let created: CreateInvitationSuccessJson["data"];
  try {
    const response = await client.createInvitation( {
      body,
      headers: await authHeadersOrRedirect(),
    });
    created = unwrapResponseData<CreateInvitationSuccessJson["data"]>(response);
  } catch (error) {
    const nextParams = new URLSearchParams({
      toast: "error",
      message: invitationErrorMessage(error),
    });
    redirect(`/admin/invitations?${nextParams.toString()}`);
  }

  revalidatePath("/admin/invitations");

  const nextParams = new URLSearchParams({
    sent: "1",
    email: created.email,
    role: created.role,
    expiresAt: created.expiresAt,
  });
  redirect(`/admin/invitations?${nextParams.toString()}`);
}

/**
 * 指定ユーザーを削除し、管理者向け招待画面へ結果を反映します。
 */
export async function deleteUserAction(userId: string): Promise<void> {
  try {
    const response = await client.removeUser( {
      params: { path: { id: userId } },
      headers: await authHeadersOrRedirect(),
    });
    throwIfApiResponseFailed(response);
  } catch (error) {
    const nextParams = new URLSearchParams({
      toast: "error",
      message: userDeleteErrorMessage(error),
    });
    redirect(`/admin/invitations?${nextParams.toString()}`);
  }

  revalidatePath("/admin/invitations");
  const params = new URLSearchParams({
    toast: "success",
    message: "ユーザを削除しました",
  });
  redirect(`/admin/invitations?${params.toString()}`);
}

/**
 * 削除済みユーザーを復活し、管理者向け招待画面へ結果を反映します。
 */
export async function restoreUserAction(userId: string): Promise<void> {
  try {
    const response = await client.restoreUser( {
      params: { path: { id: userId } },
      headers: await authHeadersOrRedirect(),
    });
    throwIfApiResponseFailed(response);
  } catch (error) {
    const nextParams = new URLSearchParams({
      toast: "error",
      message: userRestoreErrorMessage(error),
    });
    redirect(`/admin/invitations?${nextParams.toString()}`);
  }

  revalidatePath("/admin/invitations");
  const params = new URLSearchParams({
    toast: "success",
    message: "ユーザを復活しました",
  });
  redirect(`/admin/invitations?${params.toString()}`);
}
