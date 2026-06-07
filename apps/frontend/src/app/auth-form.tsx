"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useId, useState } from "react";
import type { FormActionResponse } from "@/lib/baseTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AuthFormState = {
  email: string;
  password: string;
  loading: boolean;
  fieldErrors: { email?: string[]; password?: string[] };
  formError: string;
};

type AuthFormProps = {
  apiReachable: boolean;
  title: string;
  description: string;
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

export function AuthForm({
  apiReachable,
  title,
  description,
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
  const formId = useId();
  const emailErrorId = `${formId}-email-error`;
  const passwordHintId = `${formId}-password-hint`;
  const passwordErrorId = `${formId}-password-error`;

  const [state, setState] = useState<AuthFormState>({
    email: "",
    password: "",
    loading: false,
    fieldErrors: {},
    formError: "",
  });

  const disabled = state.loading || !apiReachable;

  const onSubmit = async (formData: FormData) => {
    if (disabled) {
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    try {
      const result = await submit(formData);
      if ("fieldErrors" in result && result.fieldErrors) {
        setState((s) => ({
          ...s,
          fieldErrors: result.fieldErrors ?? {},
          formError: "",
          loading: false,
        }));
        return;
      }
      if ("error" in result && result.error) {
        setState((s) => ({
          ...s,
          fieldErrors: {},
          formError: result.error?.message ?? fallbackErrorMessage,
          loading: false,
        }));
        return;
      }
    } catch (err) {
      unstable_rethrow(err);
      setState((s) => ({
        ...s,
        fieldErrors: {},
        formError: err instanceof Error ? err.message : fallbackErrorMessage,
        loading: false,
      }));
      return;
    }
    setState((s) => ({ ...s, loading: false }));
  };

  return (
    <main className="min-h-[calc(100dvh-60px)] bg-slate-50 px-4 py-8 md:py-12">
      <div className="mx-auto grid w-full max-w-6xl items-stretch gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-4">
            <p className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
              ReviewFlow
            </p>
            <h2 className="text-3xl font-semibold leading-tight text-slate-900">
              申請業務を
              <br />
              シンプルに管理する
            </h2>
            <p className="max-w-md text-sm leading-6 text-slate-600">
              申請作成、承認、監査ログまでを一つのフローに統合。必要な情報をすぐに見つけられる実務向けUIです。
            </p>
          </div>
          <ul className="space-y-3 text-sm text-slate-600">
            <li>・役割ごとの画面で迷わない導線</li>
            <li>・入力エラーをリアルタイムに明示</li>
            <li>・承認ステータスを即座に可視化</li>
          </ul>
        </section>

        <Card className="w-full border-slate-200 bg-white shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-slate-900">{title}</CardTitle>
            <CardDescription className="text-slate-600">{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {!apiReachable ? (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                API サーバーに接続できません。バックエンドの起動と環境変数を確認してください。
              </div>
            ) : null}

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                if (next) {
                  formData.set("next", next);
                }
                void onSubmit(formData);
              }}
              noValidate
            >
              {state.formError ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {state.formError}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={state.email}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      email: e.target.value,
                      fieldErrors: { ...s.fieldErrors, email: undefined },
                      formError: "",
                    }))
                  }
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={disabled}
                  aria-invalid={!!state.fieldErrors.email}
                  aria-describedby={state.fieldErrors.email ? emailErrorId : undefined}
                  className={cn(
                    "h-11 border-slate-300 focus-visible:ring-violet-500",
                    state.fieldErrors.email && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {state.fieldErrors.email ? (
                  <p id={emailErrorId} className="text-sm text-destructive" role="alert">
                    {state.fieldErrors.email.join("、")}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  value={state.password}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      password: e.target.value,
                      fieldErrors: { ...s.fieldErrors, password: undefined },
                      formError: "",
                    }))
                  }
                  required
                  minLength={8}
                  autoComplete={passwordAutoComplete}
                  disabled={disabled}
                  aria-invalid={!!state.fieldErrors.password}
                  aria-describedby={[
                    passwordHint ? passwordHintId : "",
                    state.fieldErrors.password ? passwordErrorId : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  className={cn(
                    "h-11 border-slate-300 focus-visible:ring-violet-500",
                    state.fieldErrors.password && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {passwordHint ? (
                  <p id={passwordHintId} className="text-xs text-muted-foreground">
                    {passwordHint}
                  </p>
                ) : null}
                {forgotPasswordHref ? (
                  <div className="text-right">
                    <Link
                      href={forgotPasswordHref}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      パスワードを忘れた方
                    </Link>
                  </div>
                ) : null}
                {state.fieldErrors.password ? (
                  <p id={passwordErrorId} className="text-sm text-destructive" role="alert">
                    {state.fieldErrors.password.join("、")}
                  </p>
                ) : null}
              </div>

              <Button type="submit" className="w-full" disabled={disabled} aria-busy={state.loading}>
                {state.loading ? submittingLabel : submitLabel}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-center text-sm text-muted-foreground">
              {switchText}
              <Link href={switchHref} className="ml-1 font-medium text-primary hover:underline">
                {switchLabel}
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
