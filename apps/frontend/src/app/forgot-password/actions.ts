"use server";

import { redirect } from "next/navigation";
import { requestPasswordResetSchema } from "@/lib/auth-schema";
import { client } from "@/lib/relay/client";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import type {
  RequestPasswordResetBody,
  RequestPasswordResetSuccessJson,
} from "@/lib/schema";

/**
 * パスワード再設定メールの送信を依頼します。
 */
export async function requestPasswordResetAction(formData: FormData): Promise<void> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    const params = new URLSearchParams({
      formError: "メールアドレスを入力してください",
    });
    redirect(`/forgot-password?${params.toString()}`);
  }

  const body: RequestPasswordResetBody = parsed.data;

  try {
    const response = await client.requestPasswordReset( { body });
    unwrapResponseData<RequestPasswordResetSuccessJson["data"]>(response);
  } catch {
    const params = new URLSearchParams({
      toast: "error",
      message: "パスワード再設定メールの送信に失敗しました",
    });
    redirect(`/forgot-password?${params.toString()}`);
  }

  redirect("/forgot-password?sent=1");
}
