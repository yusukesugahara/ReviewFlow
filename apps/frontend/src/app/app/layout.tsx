import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type ApplicantLayoutProps = {
  children: ReactNode;
};

export default function ApplicantLayout({ children }: ApplicantLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b bg-muted/40">
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-lg font-semibold">申請ポータル</h1>
        </div>
      </div>
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 px-4 py-6">
        <aside className="fixed top-28 z-30 -ml-2 hidden h-[calc(100vh-8rem)] w-full shrink-0 md:sticky md:block">
          <nav className="grid gap-2">
            <Button asChild variant="ghost" className="justify-start">
              <Link href="/app/applications">申請一覧</Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start">
              <Link href="/app/applications/new">新規申請</Link>
            </Button>
          </nav>
        </aside>
        <main className="relative flex w-full flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
