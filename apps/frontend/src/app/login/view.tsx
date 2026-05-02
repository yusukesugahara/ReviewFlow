"use client";

import { AuthForm } from "../auth-form";
import { login } from "./actions";

type LoginViewProps = {
  apiReachable: boolean;
  next?: string;
};

export const LoginView = ({ apiReachable, next }: LoginViewProps) => {
  return (
    <AuthForm
      apiReachable={apiReachable}
      title="ログイン"
      description="登録済みのメールアドレスとパスワードでサインインします。"
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
