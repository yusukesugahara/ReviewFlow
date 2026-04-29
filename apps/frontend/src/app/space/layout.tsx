import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";
import { AdminNavLink } from "./_components/admin-nav-link";
import {
  SpaceSwitcher,
  type SpaceSwitcherItem,
} from "./_components/space-switcher";
import { SpaceScopedLink } from "./_components/space-scoped-link";

export const dynamic = "force-dynamic";

type RootSpaceLayoutProps = {
  children: ReactNode;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

async function getMySpaces(): Promise<SpaceSwitcherItem[]> {
  try {
    const raw = await backendAuthFetchJson("/groups");
    return unwrapData<{ groups?: SpaceSwitcherItem[] }>(raw).groups ?? [];
  } catch {
    return [];
  }
}

export default async function RootSpaceLayout({ children }: RootSpaceLayoutProps) {
  const spaces = await getMySpaces();

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              スペース管理コンソール
            </h1>
            <p className="text-xs text-slate-500">ReviewFlow Space Workspace</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/spaces">システム管理へ</Link>
          </Button>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-stretch px-6 py-8 md:grid md:grid-cols-[150px_180px_minmax(0,1fr)] md:items-start md:gap-4 lg:grid-cols-[160px_190px_minmax(0,1fr)] lg:gap-6 lg:py-10">
        <aside className="mb-4 w-full rounded-lg border border-slate-200 bg-white p-2 shadow-sm md:sticky md:top-24 md:mb-0 md:block">
          <div className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Spaces
          </div>
          <SpaceSwitcher spaces={spaces} />
        </aside>
        <nav className="mb-5 flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 md:hidden">
          <SpaceScopedLink
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            href="/space"
          >
            ダッシュボード
          </SpaceScopedLink>
          <SpaceScopedLink
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            href="/space/application-setup"
          >
            申請作成
          </SpaceScopedLink>
          <SpaceScopedLink
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            href="/space/applications"
          >
            申請一覧
          </SpaceScopedLink>
          <SpaceScopedLink
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            href="/space/users"
          >
            ユーザー一覧
          </SpaceScopedLink>
        </nav>
        <aside className="hidden w-full shrink-0 self-start overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-md md:sticky md:top-24 md:block">
          <div className="border-b border-slate-800 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Navigation
          </div>
          <nav className="grid gap-1 p-1.5">
            <AdminNavLink href="/space">ダッシュボード</AdminNavLink>
            <AdminNavLink href="/space/application-setup">
              申請作成
            </AdminNavLink>
            <AdminNavLink href="/space/applications">申請一覧</AdminNavLink>
            <AdminNavLink href="/space/users">ユーザー一覧</AdminNavLink>
          </nav>
        </aside>
        <main className="relative flex w-full flex-col overflow-hidden">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
          <footer className="mt-10 border-t border-slate-200 py-5 text-xs text-slate-500">
            <p>ReviewFlow Space ・ ヘルプ: support@reviewflow.local</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
