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

export type AuthFormAppGuide = {
  title: string;
  description: string;
  highlights: [string, string, string];
};

type AuthFormShellProps = {
  appGuide: AuthFormAppGuide;
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
  return (
    <main className="min-h-[calc(100dvh-60px)] bg-slate-50 px-4 py-8 md:py-12">
      <div className="mx-auto grid w-full max-w-6xl items-stretch gap-6 lg:grid-cols-[1.1fr_1fr]">
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

        <Card className="w-full border-slate-200 bg-white shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-slate-900">
              {title}
            </CardTitle>
            <CardDescription className="text-slate-600">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
          <CardFooter className="flex flex-col space-y-2">
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
