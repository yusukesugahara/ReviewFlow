import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b bg-muted/40">
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-lg font-semibold">管理者コンソール</h1>
        </div>
      </div>
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 px-4 py-6">
        <aside className="fixed top-28 z-30 -ml-2 hidden h-[calc(100vh-8rem)] w-full shrink-0 md:sticky md:block">
          <nav className="grid gap-2">
            <NavLink href="/admin">ダッシュボード</NavLink>
            <NavLink href="/admin/form-templates">フォーム作成</NavLink>
            <NavLink href="/admin/approval-flows">承認フロー作成</NavLink>
            <NavLink href="/admin/applications">申請一覧</NavLink>
            <NavLink href="/admin/export-jobs">CSVジョブ</NavLink>
            <NavLink href="/admin/audit-logs">監査ログ</NavLink>
          </nav>
        </aside>
        <main className="relative flex w-full flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button asChild variant="ghost" className="justify-start">
      <Link href={href}>{children}</Link>
    </Button>
  );
}
