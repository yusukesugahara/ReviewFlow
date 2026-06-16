"use server";

import { redirect } from "next/navigation";
import { confirmEmailChangeSchema } from "@/lib/auth-schema";
import { client } from "@/lib/server/backend-fetch";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { clearAccessTokenCookie } from "@/lib/server/session";
import type {
  ConfirmEmailChangeBody,
  ConfirmEmailChangeSuccessJson,
} from "@/lib/schema";

/**
 * メールアドレス変更トークンを検証し、変更を確定します。
 */
export async function confirmAccountEmailChangeAction(
  formData: FormData,
): Promise<void> {
  const parsed = confirmEmailChangeSchema.safeParse({
    token: formData.get("token"),
  });

  if (!parsed.success) {
    redirect(
      "/account/email-change/confirm?formError=確認トークンが見つかりません",
    );
  }

  const body: ConfirmEmailChangeBody = parsed.data;

  try {
    const response = await client.POST("/auth/email-change/confirm", {
      body,
    });
    unwrapResponseData<ConfirmEmailChangeSuccessJson["data"]>(response);
    await clearAccessTokenCookie();
  } catch {
    const params = new URLSearchParams({
      token: body.token,
      formError:
        "メールアドレスの変更に失敗しました。リンクの有効期限を確認してください。",
    });
    redirect(`/account/email-change/confirm?${params.toString()}`);
  }

  const params = new URLSearchParams({
    toast: "success",
    message:
      "メールアドレスを変更しました。新しいメールアドレスでログインしてください",
  });
  redirect(
    `/login?${params.toString()}`,
  );
}
