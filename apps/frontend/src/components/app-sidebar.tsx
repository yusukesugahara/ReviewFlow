"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  Inbox,
  FilePlusCorner,
  type LucideIcon,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { LogoutForm } from "@/app/(authorized)/logout/logout-form";
import { AppBreadcrumb } from "@/components/app-sidebar-breadcrumb";
import {
  buildSidebarLinkRoute,
  buildSpaceSwitcherHref,
  getActiveSpaceId,
  type SidebarSpacePath,
} from "@/components/app-sidebar-routing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AppSidebarSpace = {
  id: string;
  name: string;
  currentUserRole?: "admin" | "user" | null;
};

type AppSidebarProps = {
  children: ReactNode;
  userEmail?: string;
  userRoles: string[];
  spaces: AppSidebarSpace[];
  variant?: "workspace" | "applicant";
};

type SidebarNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  spaceAdminOnly?: boolean;
  spacePath?: SidebarSpacePath;
};

const spaceNavItems: SidebarNavItem[] = [
  {
    href: "/space/applications",
    label: "申請フォーム一覧",
    icon: ClipboardList,
    spacePath: "applications",
  },
  {
    href: "/space/submissions",
    label: "申請一覧",
    icon: Inbox,
    spacePath: "submissions",
  },
  {
    href: "/space/applications/new",
    label: "申請フォーム作成",
    icon: FilePlusCorner,
    spacePath: "applicationsNew",
  },
  { href: "/space/users", label: "メンバー", icon: Users, spaceAdminOnly: true },
];

const tenantAdminNavItems: SidebarNavItem[] = [
  { href: "/admin/spaces", label: "スペース", icon: ShieldCheck },
  { href: "/admin/invitations", label: "ユーザ", icon: Users },
  { href: "/admin/audit-logs", label: "監査ログ", icon: ClipboardList },
];

const applicantNavItems: SidebarNavItem[] = [
  {
    href: "/space/applications",
    label: "申請フォーム一覧",
    icon: ClipboardList,
    spacePath: "applications",
  },
  {
    href: "/space/applications/new",
    label: "申請フォーム作成",
    icon: FilePlusCorner,
    spacePath: "applicationsNew",
  },
];

export function AppSidebar({
  children,
  userEmail,
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

function SidebarContent({
  variant,
  isTenantAdmin,
  spaces,
  userEmail,
  onNavigate,
}: {
  variant: "workspace" | "applicant";
  isTenantAdmin: boolean;
  spaces: AppSidebarSpace[];
  userEmail?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSpaceId = getActiveSpaceId({
    pathname,
    searchParams,
    fallbackSpaceId: spaces[0]?.id,
  });
  const activeSpace = spaces.find((space) => space.id === activeSpaceId);
  const canManageActiveSpace =
    isTenantAdmin || activeSpace?.currentUserRole === "admin";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
      {variant === "workspace" ? (
        <section>
          <SectionLabel>現在のスペース</SectionLabel>
          <SpaceSwitcher spaces={spaces} onNavigate={onNavigate} />
        </section>
      ) : null}
      <section className="mt-5">
        <SectionLabel>{variant === "workspace" ? "スペース" : "申請"}</SectionLabel>
        <nav className="grid gap-1">
          {(variant === "workspace" ? spaceNavItems : applicantNavItems)
            .filter((item) => !item.adminOnly || isTenantAdmin)
            .filter((item) => !item.spaceAdminOnly || canManageActiveSpace)
            .map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                spacePath={item.spacePath}
                fallbackSpaceId={spaces[0]?.id}
                icon={item.icon}
                onNavigate={onNavigate}
              >
                {item.label}
              </SidebarLink>
            ))}
        </nav>
      </section>
      {isTenantAdmin ? (
        <section className="mt-5">
          <SectionLabel>テナント管理</SectionLabel>
          <nav className="grid gap-1">
            {tenantAdminNavItems.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                onNavigate={onNavigate}
              >
                {item.label}
              </SidebarLink>
            ))}
          </nav>
        </section>
      ) : null}
      <section className="mt-auto border-t border-slate-200 pt-4">
        <SectionLabel>ユーザ</SectionLabel>
        <div className="mb-3 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600">
          <Users className="size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium text-slate-700">アカウント</p>
            {userEmail ? (
              <p className="truncate text-xs text-slate-500" title={userEmail}>
                {userEmail}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-2 px-1">
          <LogoutForm />
        </div>
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </h2>
  );
}

function SpaceSwitcher({
  spaces,
  onNavigate,
}: {
  spaces: AppSidebarSpace[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSpaceId = getActiveSpaceId({
    pathname,
    searchParams,
    fallbackSpaceId: spaces[0]?.id,
  });

  if (spaces.length === 0) {
    return (
      <div className="rounded-md px-2 py-2 text-xs text-slate-500">
        参加スペースなし
      </div>
    );
  }

  return (
    <nav className="grid gap-1">
      {spaces.map((space) => {
        const isActive = activeSpaceId === space.id;
        const href = buildSpaceSwitcherHref({
          pathname,
          searchParams,
          spaceId: space.id,
        });
        return (
          <Link
            key={space.id}
            href={href}
            className={cn(
              "block truncate rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
              isActive && "bg-violet-50 text-violet-800 ring-1 ring-violet-200",
            )}
            title={space.name}
            onClick={onNavigate}
          >
            {space.name}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarLink({
  href,
  spacePath,
  fallbackSpaceId,
  icon: Icon,
  children,
  onNavigate,
}: {
  href: string;
  spacePath?: SidebarSpacePath;
  fallbackSpaceId?: string;
  icon: LucideIcon;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { scopedHref, isActive } = buildSidebarLinkRoute({
    pathname,
    searchParams,
    fallbackSpaceId,
    href,
    spacePath,
  });

  return (
    <Link
      href={scopedHref}
      className={cn(
        "flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
        isActive && "bg-slate-900 text-white hover:bg-slate-900 hover:text-white",
      )}
      onClick={onNavigate}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{children}</span>
    </Link>
  );
}
