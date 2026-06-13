"use server";

import { redirect } from "next/navigation";
import { confirmPasswordResetSchema } from "@/lib/auth-schema";
import { client } from "@/lib/server/backend-fetch";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import type {
  ConfirmPasswordResetBody,
  ConfirmPasswordResetSuccessJson,
} from "@/lib/schema";

export async function confirmPasswordResetAction(formData: FormData): Promise<void> {
  const parsed = confirmPasswordResetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const params = new URLSearchParams({
      formError: "入力内容を確認してください",
    });
    redirect(`/password-reset?${params.toString()}`);
  }

  const body: ConfirmPasswordResetBody = parsed.data;

  try {
    const response = await client.POST("/auth/password-reset/confirm", { body });
    unwrapResponseData<ConfirmPasswordResetSuccessJson["data"]>(response);
  } catch {
    const params = new URLSearchParams({
      token: body.token,
      toast: "error",
      message:
        "パスワードの再設定に失敗しました。リンクの有効期限を確認してください。",
    });
    redirect(`/password-reset?${params.toString()}`);
  }

  const params = new URLSearchParams({
    toast: "success",
    message: "パスワードを再設定しました",
  });
  redirect(`/login?${params.toString()}`);
}
