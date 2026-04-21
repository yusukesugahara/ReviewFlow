import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ApplicantLayoutProps = {
  children: ReactNode;
};

export default function ApplicantLayout({ children }: ApplicantLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">申請ポータル</h1>
            <p className="text-xs text-slate-500">Applicant Workspace</p>
          </div>
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/app/applications/new">新規申請</Link>
          </Button>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-7xl flex-1 items-start px-6 py-8 md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12 lg:py-10">
        <nav className="mb-5 flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 md:hidden">
          <Link className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600" href="/app/applications">申請一覧</Link>
          <Link className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600" href="/app/applications/new">新規申請</Link>
        </nav>
        <aside className="hidden w-[240px] shrink-0 self-start overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg md:sticky md:top-24 md:block lg:w-[260px]">
          <div className="border-b border-slate-800 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            Navigation
          </div>
          <nav className="grid gap-1 p-2">
            <AppNavLink href="/app/applications">申請一覧</AppNavLink>
            <AppNavLink href="/app/applications/new">新規申請</AppNavLink>
          </nav>
        </aside>
        <main className="relative flex w-full flex-col overflow-hidden">
          <div className="mx-auto w-full max-w-5xl">
            {children}
          </div>
          <footer className="mt-10 border-t border-slate-200 py-5 text-xs text-slate-500">
            <p>ReviewFlow Applicant ・ ヘルプ: support@reviewflow.local</p>
          </footer>
        </main>
      </div>
    </div>
  );
}

function AppNavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        "justify-start h-10 rounded-xl px-3.5 text-[14px] font-medium transition-colors",
        "text-slate-300 hover:bg-slate-800 hover:text-white"
      )}
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}
