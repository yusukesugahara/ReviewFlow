"use client";

import { AuthForm } from "../_components/auth/auth-form";
import { login } from "./actions";
import type { LoginViewProps } from "./types";

/**
 * ログインフォーム画面を表示します。
 */
export const LoginView = ({ apiReachable, next }: LoginViewProps) => {
  return (
    <AuthForm
      apiReachable={apiReachable}
      title="ログイン"
      description="登録済みのメールアドレスとパスワードでサインインします。"
      appGuide={{
        title: "申請受付から\n承認まで一元管理",
        description:
          "ReviewFlow は、公開フォームで受け付けた申請をスペースごとに整理し、確認・差し戻し・承認履歴まで管理できる業務アプリです。",
        highlights: [
          "公開フォームで申請を受け付け",
          "担当者ごとの承認ステップを管理",
          "差し戻しと監査ログを記録",
        ],
      }}
      submitLabel="ログインする"
      submittingLabel="ログイン中..."
      passwordAutoComplete="current-password"
      switchText="アカウントをお持ちでない方は"
      switchHref="/signup"
      switchLabel="新規登録"
      forgotPasswordHref="/forgot-password"
      submit={login}
      next={next}
      fallbackErrorMessage="ログインに失敗しました"
    />
  );
};
