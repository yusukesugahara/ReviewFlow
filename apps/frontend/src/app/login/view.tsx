"use client";

import { AuthForm } from "../auth-form";
import { login } from "./actions";

type LoginViewProps = {
  apiReachable: boolean;
};

export const LoginView = ({ apiReachable }: LoginViewProps) => {
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
      submit={login}
      fallbackErrorMessage="ログインに失敗しました"
    />
  );
};
