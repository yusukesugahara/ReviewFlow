"use client";

import { AuthForm } from "../_components/auth/auth-form";
import { signup } from "./actions";
import type { SignupViewProps } from "./types";

/**
 * サインアップフォーム画面を表示します。
 */
export const SignupView = ({ apiReachable }: SignupViewProps) => {
  return (
    <AuthForm
      apiReachable={apiReachable}
      title="新規登録"
      description="メールアドレスとパスワードを設定してアカウントを作成します。パスワードは 8 文字以上です。"
      appGuide={null}
      submitLabel="アカウントを作成する"
      submittingLabel="登録処理中..."
      passwordAutoComplete="new-password"
      passwordHint="8 文字以上（英数字・記号の組み合わせを推奨）"
      switchText="すでにアカウントをお持ちの方は"
      switchHref="/login"
      switchLabel="ログイン"
      submit={signup}
      fallbackErrorMessage="登録に失敗しました"
    />
  );
};
