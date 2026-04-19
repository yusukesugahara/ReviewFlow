"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useId, useState } from "react";
import type { FormActionResponse } from "@/lib/baseTypes";

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

const inputBaseClass =
  "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100";

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
    <main className="grid min-h-[calc(100dvh-57px)] place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

        {!apiReachable ? (
          <p
            className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900"
            role="alert"
          >
            API サーバーに接続できません。バックエンドの起動と、フロントの
            <code className="mx-1 rounded bg-amber-100 px-1 py-0.5">NEXT_PUBLIC_API_URL</code>
            /<code className="mx-1 rounded bg-amber-100 px-1 py-0.5">INTERNAL_API_KEY</code>
            （Docker の場合は
            <code className="mx-1 rounded bg-amber-100 px-1 py-0.5">INTERNAL_API_ORIGIN</code>
            ）を確認してください。
          </p>
        ) : null}

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit();
          }}
          noValidate
        >
          {state.formError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {state.formError}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-800">
              メールアドレス
            </label>
            <input
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
              className={`${inputBaseClass} ${state.fieldErrors.email ? "border-red-300 focus:border-red-500 focus:ring-red-200" : "border-slate-300"}`}
            />
            <p id={emailErrorId} className="min-h-4 text-xs text-red-600" role="alert">
              {state.fieldErrors.email?.join("、") ?? ""}
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-800">
              パスワード
            </label>
            <input
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
              aria-describedby={[passwordHint ? passwordHintId : "", state.fieldErrors.password ? passwordErrorId : ""]
                .filter(Boolean)
                .join(" ")}
              className={`${inputBaseClass} ${state.fieldErrors.password ? "border-red-300 focus:border-red-500 focus:ring-red-200" : "border-slate-300"}`}
            />
            {passwordHint ? (
              <p id={passwordHintId} className="text-xs text-slate-500">
                {passwordHint}
              </p>
            ) : null}
            <p id={passwordErrorId} className="min-h-4 text-xs text-red-600" role="alert">
              {state.fieldErrors.password?.join("、") ?? ""}
            </p>
          </div>

          <button
            type="submit"
            disabled={disabled}
            aria-busy={state.loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {state.loading ? submittingLabel : submitLabel}
          </button>
        </form>

        <p className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
          {switchText}
          <Link href={switchHref} className="ml-1 font-medium text-blue-600 hover:text-blue-700">
            {switchLabel}
          </Link>
        </p>
      </div>
    </main>
  );
}
