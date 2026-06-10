"use server";

import { redirect } from "next/navigation";
import { requestPasswordResetSchema } from "@/lib/auth-schema";
import { client } from "@/lib/server/backend-fetch";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import type {
  RequestPasswordResetBody,
  RequestPasswordResetSuccessJson,
} from "@/lib/schema";

export async function requestPasswordResetAction(formData: FormData): Promise<void> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    redirect("/forgot-password?formError=メールアドレスを入力してください");
  }

  const body: RequestPasswordResetBody = parsed.data;

  try {
    const response = await client.POST("/auth/password-reset/request", { body });
    unwrapResponseData<RequestPasswordResetSuccessJson["data"]>(response);
  } catch {
    redirect(
      "/forgot-password?toast=error&message=パスワード再設定メールの送信に失敗しました",
    );
  }

  redirect("/forgot-password?sent=1");
}
