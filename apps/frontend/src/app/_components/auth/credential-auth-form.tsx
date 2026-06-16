"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useId, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import type { FormActionResponse } from "@/lib/baseTypes";
import { cn } from "@/lib/utils";

type AuthFormState = {
  email: string;
  password: string;
  loading: boolean;
  fieldErrors: { email?: string[]; password?: string[] };
  formError: string;
};

type CredentialAuthFormProps = {
  apiReachable: boolean;
  fallbackErrorMessage: string;
  forgotPasswordHref?: string;
  next?: string;
  passwordAutoComplete: "current-password" | "new-password";
  passwordHint?: string;
  submit: (formData: FormData) => Promise<FormActionResponse<void>>;
  submitLabel: string;
  submittingLabel: string;
};

/**
 * メールアドレスとパスワードを使う認証フォームを表示します。
 */
export function CredentialAuthForm({
  apiReachable,
  fallbackErrorMessage,
  forgotPasswordHref,
  next,
  passwordAutoComplete,
  passwordHint,
  submit,
  submitLabel,
  submittingLabel,
}: CredentialAuthFormProps) {
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
    <>
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
          <Alert variant="destructive">
            <AlertDescription>{state.formError}</AlertDescription>
          </Alert>
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
              state.fieldErrors.email &&
                "border-destructive focus-visible:ring-destructive",
            )}
          />
          {state.fieldErrors.email ? (
            <p
              id={emailErrorId}
              className="text-[0.8rem] font-medium text-red-600"
              role="alert"
            >
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
              state.fieldErrors.password &&
                "border-destructive focus-visible:ring-destructive",
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
            <p
              id={passwordErrorId}
              className="text-[0.8rem] font-medium text-red-600"
              role="alert"
            >
              {state.fieldErrors.password.join("、")}
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={disabled}
          aria-busy={state.loading}
        >
          {state.loading ? submittingLabel : submitLabel}
        </Button>
      </form>
    </>
  );
}
