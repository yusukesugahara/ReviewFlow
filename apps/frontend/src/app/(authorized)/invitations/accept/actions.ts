"use server";

import { redirect } from "next/navigation";
import { acceptInvitationSchema } from "@/lib/auth-schema";
import { client } from "@/lib/relay/client";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import type { AcceptInvitationBody, AcceptInvitationSuccessJson } from "@/lib/schema";

/**
 * 招待承諾トークンを検証し、招待を承諾します。
 */
export async function acceptInvitationAction(formData: FormData): Promise<void> {
  const parsed = acceptInvitationSchema.safeParse({
    token: formData.get("token"),
    name: formData.get("name") || undefined,
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    const params = new URLSearchParams({
      formError: "入力内容を確認してください",
    });
    redirect(`/invitations/accept?${params.toString()}`);
  }

  const body: AcceptInvitationBody = {
    token: parsed.data.token,
    name: parsed.data.name && parsed.data.name.length > 0 ? parsed.data.name : undefined,
    password: parsed.data.password,
  };

  try {
    const response = await client.acceptInvitation( { body });
    unwrapResponseData<AcceptInvitationSuccessJson["data"]>(response);
  } catch {
    const params = new URLSearchParams({
      toast: "error",
      message: "招待の受諾に失敗しました。入力内容を確認してください。",
    });
    if (parsed.data.next) {
      params.set("next", parsed.data.next);
    }
    redirect(`/invitations/accept?${params.toString()}`);
  }

  const params = new URLSearchParams({
    toast: "success",
    message: "招待を受諾しました。ログインしてください。",
  });
  if (parsed.data.next) {
    params.set("next", parsed.data.next);
  }
  redirect(`/login?${params.toString()}`);
}
