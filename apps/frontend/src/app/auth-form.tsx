"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useId, useState } from "react";
import type { FormActionResponse } from "@/lib/baseTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  submit: (params: { email: string; password: string }) => Promise<FormActionResponse<void>>;
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
  submit,
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

  const onSubmit = async () => {
    if (disabled) {
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    try {
      const result = await submit({ email: state.email, password: state.password });
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
    <main className="flex min-h-[calc(100dvh-60px)] items-center justify-center bg-gradient-to-b from-background to-muted/20 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
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
              void onSubmit();
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
              <Input
                type="password"
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
                  state.fieldErrors.password && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {passwordHint ? (
                <p id={passwordHintId} className="text-xs text-muted-foreground">
                  {passwordHint}
                </p>
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
    </main>
  );
}
