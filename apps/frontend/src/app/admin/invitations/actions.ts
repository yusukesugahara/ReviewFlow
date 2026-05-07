"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  backendAuthFetchJson,
  BackendHttpError,
} from "@/lib/server/backend-fetch";

type InvitationResponse = {
  id: string;
  token: string;
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

function invitationErrorMessage(error: unknown) {
  if (!(error instanceof BackendHttpError)) {
    return "招待の作成に失敗しました";
  }

  const body = error.body;
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

export async function createInvitationAction(
  formData: FormData,
): Promise<void> {
  const email = formData.get("email");
  const role = formData.get("role");

  if (typeof email !== "string" || typeof role !== "string") {
    return;
  }

  let createdRaw: unknown;
  try {
    createdRaw = await backendAuthFetchJson("/invitations", {
      method: "POST",
      body: { email: email.trim(), role },
    });
  } catch (error) {
    const nextParams = new URLSearchParams({
      error: invitationErrorMessage(error),
    });
    redirect(`/admin/invitations?${nextParams.toString()}`);
  }

  const created = unwrapData<InvitationResponse>(createdRaw);
  revalidatePath("/admin/invitations");

  const nextParams = new URLSearchParams({
    token: created.token,
    email: created.email,
    role: created.role,
    expiresAt: created.expiresAt,
  });
  redirect(`/admin/invitations?${nextParams.toString()}`);
}
