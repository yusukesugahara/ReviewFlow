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
      description="登録済みのメールアドレスとパスワードで ReviewFlow に入ります。"
      appGuide={null}
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
