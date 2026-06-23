"use client";

import type { FormActionResponse } from "@/lib/baseTypes";
import { AuthFormShell, type AuthFormAppGuide } from "./auth-form-shell";
import { CredentialAuthForm } from "./credential-auth-form";

type AuthFormProps = {
  apiReachable: boolean;
  title: string;
  description: string;
  appGuide?: AuthFormAppGuide | null;
  submitLabel: string;
  submittingLabel: string;
  passwordAutoComplete: "current-password" | "new-password";
  passwordHint?: string;
  switchText: string;
  switchHref: "/login" | "/signup";
  switchLabel: string;
  forgotPasswordHref?: string;
  submit: (formData: FormData) => Promise<FormActionResponse<void>>;
  next?: string;
  fallbackErrorMessage: string;
};

const DEFAULT_APP_GUIDE: AuthFormAppGuide = {
  title: "申請業務を\nシンプルに管理する",
  description:
    "申請作成、承認、監査ログまでを一つのフローに統合。必要な情報をすぐに見つけられる実務向けUIです。",
  highlights: [
    "役割ごとの画面で迷わない導線",
    "入力エラーをリアルタイムに明示",
    "承認ステータスを即座に可視化",
  ],
};

/**
 * 認証フォームの共通送信状態とエラー表示を提供します。
 */
export function AuthForm({
  apiReachable,
  title,
  description,
  appGuide = DEFAULT_APP_GUIDE,
  submitLabel,
  submittingLabel,
  passwordAutoComplete,
  passwordHint,
  switchText,
  switchHref,
  switchLabel,
  forgotPasswordHref,
  submit,
  next,
  fallbackErrorMessage,
}: AuthFormProps) {
  return (
    <AuthFormShell
      appGuide={appGuide}
      description={description}
      switchHref={switchHref}
      switchLabel={switchLabel}
      switchText={switchText}
      title={title}
    >
      <CredentialAuthForm
        apiReachable={apiReachable}
        fallbackErrorMessage={fallbackErrorMessage}
        forgotPasswordHref={forgotPasswordHref}
        next={next}
        passwordAutoComplete={passwordAutoComplete}
        passwordHint={passwordHint}
        submit={submit}
        submitLabel={submitLabel}
        submittingLabel={submittingLabel}
      />
    </AuthFormShell>
  );
}
