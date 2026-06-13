"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  accountEmailSchema,
  accountPasswordSchema,
  accountProfileSchema,
} from "@/lib/auth-schema";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import {
  errorMessageFromBody,
  isApiFailure,
} from "@/lib/server/api-failure";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { client } from "@/lib/server/backend-fetch";
import { persistAccessTokenCookie } from "@/lib/server/session";
import type {
  RequestMeEmailChangeBody,
  RequestMeEmailChangeSuccessJson,
  UpdateMePasswordBody,
  UpdateMePasswordSuccessJson,
  UpdateMeProfileBody,
  UpdateMeProfileSuccessJson,
} from "@/lib/schema";

const apiErrorCodeSchema = z.object({
  errorCode: z.string().optional(),
});

function redirectWithAccountError(
  key: "emailError" | "passwordError" | "profileError",
  message: string,
): never {
  const params = new URLSearchParams({ [key]: message });
  redirect(`/account?${params.toString()}`);
}

function redirectWithAccountSuccess(message: string): never {
  const params = new URLSearchParams({ toast: "success", message });
  redirect(`/account?${params.toString()}`);
}

function firstFieldError(
  error: z.ZodError,
  fallback: string,
): string {
  const fieldErrors = error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >;
  for (const messages of Object.values(fieldErrors)) {
    const message = messages?.[0];
    if (message) {
      return message;
    }
  }
  return fallback;
}

function errorCodeFromBody(body: unknown): string | undefined {
  const parsed = apiErrorCodeSchema.safeParse(body);
  return parsed.success ? parsed.data.errorCode : undefined;
}

function profileErrorMessage(error: unknown): string {
  if (!isApiFailure(error)) {
    return "プロフィールの更新に失敗しました";
  }
  if (error.status === 400) {
    return "名前を確認してください";
  }
  return errorMessageFromBody(error.body, "プロフィールの更新に失敗しました");
}

function emailErrorMessage(error: unknown): string {
  if (!isApiFailure(error)) {
    return "確認メールの送信に失敗しました";
  }
  if (errorCodeFromBody(error.body) === "AUTH_EMAIL_TAKEN") {
    return "このメールアドレスは既に使用されています";
  }
  if (errorCodeFromBody(error.body) === "AUTH_EMAIL_UNCHANGED") {
    return "現在のメールアドレスとは別のメールアドレスを入力してください";
  }
  if (error.status === 400) {
    return "メールアドレスを確認してください";
  }
  return errorMessageFromBody(error.body, "確認メールの送信に失敗しました");
}

function passwordErrorMessage(error: unknown): string {
  if (!isApiFailure(error)) {
    return "パスワードの変更に失敗しました";
  }
  if (errorCodeFromBody(error.body) === "AUTH_INVALID_CREDENTIALS") {
    return "現在のパスワードが違います";
  }
  if (error.status === 400) {
    return "パスワードは8文字以上で入力してください";
  }
  return errorMessageFromBody(error.body, "パスワードの変更に失敗しました");
}

export async function updateAccountProfileAction(
  formData: FormData,
): Promise<void> {
  const parsed = accountProfileSchema.safeParse({
    name: formData.get("name") || undefined,
  });

  if (!parsed.success) {
    redirectWithAccountError(
      "profileError",
      firstFieldError(parsed.error, "名前を確認してください"),
    );
  }

  const body: UpdateMeProfileBody = {
    name: parsed.data.name,
  };

  try {
    const response = await client.PATCH("/auth/me/profile", {
      body,
      headers: await authHeadersOrRedirect(),
    });
    const data = unwrapResponseData<UpdateMeProfileSuccessJson["data"]>(
      response,
    );
    await persistAccessTokenCookie(data.access_token);
  } catch (error) {
    redirectWithAccountError("profileError", profileErrorMessage(error));
  }

  redirectWithAccountSuccess("プロフィールを更新しました");
}

export async function updateAccountEmailAction(
  formData: FormData,
): Promise<void> {
  const parsed = accountEmailSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    redirectWithAccountError(
      "emailError",
      firstFieldError(parsed.error, "メールアドレスを確認してください"),
    );
  }

  const body: RequestMeEmailChangeBody = {
    email: parsed.data.email,
  };

  try {
    const response = await client.POST("/auth/me/email-change/request", {
      body,
      headers: await authHeadersOrRedirect(),
    });
    unwrapResponseData<RequestMeEmailChangeSuccessJson["data"]>(
      response,
    );
  } catch (error) {
    redirectWithAccountError("emailError", emailErrorMessage(error));
  }

  redirectWithAccountSuccess(
    "確認メールを送信しました。メール内のURLから変更を確定してください",
  );
}

export async function updateAccountPasswordAction(
  formData: FormData,
): Promise<void> {
  const parsed = accountPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    newPasswordConfirmation: formData.get("newPasswordConfirmation"),
  });

  if (!parsed.success) {
    redirectWithAccountError(
      "passwordError",
      firstFieldError(parsed.error, "パスワードを確認してください"),
    );
  }

  const body: UpdateMePasswordBody = {
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
  };

  try {
    const response = await client.PATCH("/auth/me/password", {
      body,
      headers: await authHeadersOrRedirect(),
    });
    const data = unwrapResponseData<UpdateMePasswordSuccessJson["data"]>(
      response,
    );
    await persistAccessTokenCookie(data.access_token);
  } catch (error) {
    redirectWithAccountError("passwordError", passwordErrorMessage(error));
  }

  redirectWithAccountSuccess("パスワードを変更しました");
}
