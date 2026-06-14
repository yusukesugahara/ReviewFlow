"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { AppBreadcrumb } from "@/components/layout/app-sidebar-breadcrumb";
import { SidebarContent } from "@/components/layout/app-sidebar-content";
import type { AppSidebarSpace, AppSidebarVariant } from "./app-sidebar.types";
import { Button } from "@/components/ui/button";

export type { AppSidebarSpace } from "./app-sidebar.types";

type AppSidebarProps = {
  children: ReactNode;
  userEmail?: string;
  userName?: string | null;
  userRoles: string[];
  spaces: AppSidebarSpace[];
  variant?: AppSidebarVariant;
};

export function AppSidebar({
  children,
  userEmail,
  userName,
  userRoles,
  spaces,
  variant = "workspace",
}: AppSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isTenantAdmin = userRoles.includes("tenant_admin");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="lg:hidden">
        <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="ナビゲーションを開く"
            onClick={() => setIsOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <span className="text-sm font-semibold text-slate-900">ReviewFlow</span>
          <div className="w-10" />
        </div>
        {isOpen ? (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label="ナビゲーションを閉じる"
              className="absolute inset-0 bg-slate-950/40"
              onClick={() => setIsOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-64 max-w-[85vw] border-r border-slate-200 bg-white shadow-xl">
              <div className="flex h-full flex-col">
                <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
                  <span className="text-sm font-semibold text-slate-900">ReviewFlow</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="ナビゲーションを閉じる"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="size-5" />
                  </Button>
                </div>
                <SidebarContent
                  variant={variant}
                  isTenantAdmin={isTenantAdmin}
                  spaces={spaces}
                  userEmail={userEmail}
                  userName={userName}
                  onNavigate={() => setIsOpen(false)}
                />
              </div>
            </aside>
          </div>
        ) : null}
      </div>
      <div className="flex w-full lg:min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-slate-200 bg-white lg:block xl:w-64">
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 px-5 py-4">
              <Link href="/space" className="block text-lg font-semibold text-slate-950">
                ReviewFlow
              </Link>
              <p className="mt-0.5 text-xs text-slate-500">ワークスペース</p>
            </div>
            <SidebarContent
              variant={variant}
              isTenantAdmin={isTenantAdmin}
              spaces={spaces}
              userEmail={userEmail}
              userName={userName}
            />
          </div>
        </aside>
        <main className="flex min-h-[calc(100vh-3.5rem)] min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:min-h-screen lg:px-8 lg:py-8">
          <div className="w-full flex-1">
            <AppBreadcrumb spaces={spaces} />
            {children}
          </div>
          <footer className="mt-10 border-t border-slate-200 py-5 text-xs text-slate-500">
            <p>ReviewFlow ・ ヘルプ: support@reviewflow.local</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
