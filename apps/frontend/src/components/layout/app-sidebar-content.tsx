"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Users, type LucideIcon } from "lucide-react";
import { LogoutForm } from "@/app/(authorized)/logout/_components/logout-form";
import {
  buildSidebarLinkRoute,
  buildSpaceSwitcherHref,
  getActiveSpaceId,
  type SidebarSpacePath,
} from "@/components/layout/app-sidebar-routing";
import {
  getPrimarySidebarNavItems,
  tenantAdminSidebarNavItems,
} from "@/components/layout/app-sidebar-navigation";
import type { AppSidebarSpace, AppSidebarVariant } from "./app-sidebar.types";
import { cn } from "@/lib/utils";

export function SidebarContent({
  variant,
  isTenantAdmin,
  spaces,
  userEmail,
  userName,
  onNavigate,
}: {
  variant: AppSidebarVariant;
  isTenantAdmin: boolean;
  spaces: AppSidebarSpace[];
  userEmail?: string;
  userName?: string | null;
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
  const primaryNavItems = getPrimarySidebarNavItems({
    activeSpace,
    isTenantAdmin,
    variant,
  });

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
          {primaryNavItems.map((item) => (
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
            {tenantAdminSidebarNavItems.map((item) => (
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
        <Link
          href="/account"
          className={cn(
            "mb-3 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
            pathname === "/account" && "bg-slate-900 text-white hover:bg-slate-900 hover:text-white",
          )}
          onClick={onNavigate}
        >
          <Users className="size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium">{userName || "アカウント"}</p>
            {userEmail ? (
              <p className="truncate text-xs opacity-75" title={userEmail}>
                {userEmail}
              </p>
            ) : null}
          </div>
        </Link>
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
