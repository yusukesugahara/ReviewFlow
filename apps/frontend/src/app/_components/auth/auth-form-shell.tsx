import Link from "next/link";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AuthFormAppGuide = {
  title: string;
  description: string;
  highlights: [string, string, string];
};

type AuthFormShellProps = {
  appGuide?: AuthFormAppGuide | null;
  children: ReactNode;
  description: string;
  switchHref: "/login" | "/signup";
  switchLabel: string;
  switchText: string;
  title: string;
};

/**
 * 認証系フォーム画面の共通レイアウトを表示します。
 */
export function AuthFormShell({
  appGuide,
  children,
  description,
  switchHref,
  switchLabel,
  switchText,
  title,
}: AuthFormShellProps) {
  const hasAppGuide = !!appGuide;

  return (
    <main
      className={cn(
        "min-h-[calc(100dvh-60px)] px-4",
        hasAppGuide
          ? "bg-slate-50 py-8 md:py-12"
          : "flex items-center bg-slate-100 py-10 md:py-14",
      )}
    >
      <div
        className={
          hasAppGuide
            ? "mx-auto grid w-full max-w-6xl items-stretch gap-6 lg:grid-cols-[1.1fr_1fr]"
            : "mx-auto flex w-full max-w-md flex-col"
        }
      >
        {appGuide ? (
          <section className="hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-4">
              <p className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                ReviewFlow
              </p>
              <h2 className="text-3xl font-semibold leading-tight text-slate-900">
                {appGuide.title.split("\n").map((line, index) => (
                  <span key={line}>
                    {index > 0 ? <br /> : null}
                    {line}
                  </span>
                ))}
              </h2>
              <p className="max-w-md text-sm leading-6 text-slate-600">
                {appGuide.description}
              </p>
            </div>
            <ul className="space-y-3 text-sm text-slate-600">
              {appGuide.highlights.map((highlight) => (
                <li key={highlight}>・{highlight}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <Card
          className={cn(
            "w-full border-slate-200 bg-white shadow-sm",
            !hasAppGuide && "rounded-lg",
          )}
        >
          <CardHeader
            className={cn(
              "space-y-1",
              !hasAppGuide && "border-b border-slate-200 px-7 pb-6 pt-6",
            )}
          >
            {!hasAppGuide ? (
              <div className="mb-5">
                <Link
                  href="/"
                  className="block text-lg font-semibold text-slate-950"
                >
                  ReviewFlow
                </Link>
                <p className="mt-0.5 text-xs text-slate-500">ワークスペース</p>
              </div>
            ) : null}
            <CardTitle
              className={cn(
                "text-2xl font-bold text-slate-900",
                !hasAppGuide && "text-xl font-semibold text-slate-950",
              )}
            >
              {title}
            </CardTitle>
            <CardDescription
              className={cn(
                "text-slate-600",
                !hasAppGuide && "leading-6",
              )}
            >
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className={cn(!hasAppGuide && "px-7 pb-6 pt-6")}>
            {children}
          </CardContent>
          <CardFooter
            className={cn(
              "flex flex-col space-y-2",
              !hasAppGuide && "border-t border-slate-200 bg-slate-50 px-7 py-5",
            )}
          >
            <div className="text-center text-sm text-muted-foreground">
              {switchText}
              <Link
                href={switchHref}
                className="ml-1 font-medium text-primary hover:underline"
              >
                {switchLabel}
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
