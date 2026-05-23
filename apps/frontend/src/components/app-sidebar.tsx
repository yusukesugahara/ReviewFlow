"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  ClipboardList,
  FileText,
  Home,
  type LucideIcon,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { LogoutForm } from "@/app/(authorized)/logout/logout-form";
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
  spacePath?: "applications" | "applicationsNew";
};

const spaceNavItems: SidebarNavItem[] = [
  {
    href: "/space/applications",
    label: "申請一覧",
    icon: ClipboardList,
    spacePath: "applications",
  },
  {
    href: "/space/applications/new",
    label: "新規申請",
    icon: FileText,
    spacePath: "applicationsNew",
  },
  { href: "/space/users", label: "メンバー", icon: Users, spaceAdminOnly: true },
];

const tenantAdminNavItems: SidebarNavItem[] = [
  { href: "/admin/spaces", label: "スペース", icon: ShieldCheck },
  { href: "/admin/invitations", label: "ユーザー", icon: Users },
  { href: "/admin/audit-logs", label: "監査ログ", icon: ClipboardList },
  {
    href: "/admin/export-jobs",
    label: "CSV出力ジョブ",
    icon: FileText,
    adminOnly: true,
  },
];

const applicantNavItems: SidebarNavItem[] = [
  {
    href: "/space/applications",
    label: "申請一覧",
    icon: ClipboardList,
    spacePath: "applications",
  },
  {
    href: "/space/applications/new",
    label: "新規申請",
    icon: FileText,
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
      <div className="mx-auto flex w-full max-w-[1440px] lg:min-h-screen">
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
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">
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

function AppBreadcrumb({ spaces }: { spaces: AppSidebarSpace[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const items = buildBreadcrumbItems(pathname, spaces, searchParams);

  if (items.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="パンくずリスト"
      className="mb-5 flex min-w-0 items-center gap-1 text-sm text-slate-500"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={`${item.href}-${item.label}`} className="flex min-w-0 items-center gap-1">
            {index > 0 ? (
              <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
            ) : null}
            {isLast ? (
              <span
                className="truncate font-medium text-slate-900"
                aria-current="page"
                title={item.label}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="inline-flex min-w-0 items-center gap-1 truncate rounded-md px-1.5 py-1 text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                title={item.label}
              >
                {index === 0 ? <Home className="size-4 shrink-0" aria-hidden="true" /> : null}
                <span className="truncate">{item.label}</span>
              </Link>
            )}
          </div>
        );
      })}
    </nav>
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
  const pathSpaceId = getPathSpaceId(pathname);
  const activeSpaceId =
    pathSpaceId ?? searchParams.get("spaceId") ?? spaces[0]?.id ?? null;
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
        <SectionLabel>ユーザー</SectionLabel>
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
  const pathSpaceId = getPathSpaceId(pathname);
  const activeSpaceId =
    pathSpaceId ?? searchParams.get("spaceId") ?? spaces[0]?.id ?? null;

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
        const params = new URLSearchParams(searchParams);
        const href = getSpaceSwitcherHref(pathname, params, space.id);
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
  spacePath?: "applications" | "applicationsNew";
  fallbackSpaceId?: string;
  icon: LucideIcon;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathSpaceId = getPathSpaceId(pathname);
  const activeSpaceId =
    pathSpaceId ?? searchParams.get("spaceId") ?? fallbackSpaceId;
  const isSectionRoot = href === "/admin" || href === "/space";
  const scopedHref =
    spacePath === "applicationsNew" && activeSpaceId
      ? `/space/${encodeURIComponent(activeSpaceId)}/applications/new`
      : spacePath === "applications" && activeSpaceId
      ? `/space/${encodeURIComponent(activeSpaceId)}/applications`
      : href.startsWith("/space") && activeSpaceId
        ? `${href}?spaceId=${encodeURIComponent(activeSpaceId)}`
        : href;
  const isApplicationNewActive =
    spacePath === "applicationsNew" &&
    (pathname === scopedHref || pathname === href);
  const isApplicationsActive =
    spacePath === "applications" &&
    (pathname === scopedHref ||
      (pathname.startsWith(`${scopedHref}/`) &&
        pathname !== `${scopedHref}/new`) ||
      pathname === href);
  const isActive = spacePath === "applications" || spacePath === "applicationsNew"
    ? isApplicationsActive || isApplicationNewActive
    : isSectionRoot
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

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

function getPathSpaceId(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "space" || segments.length < 3) {
    return null;
  }
  const [spaceId, section] = segments.slice(1);
  if (section !== "applications") {
    return null;
  }
  if (!spaceId) {
    return null;
  }
  return decodeURIComponent(spaceId);
}

function getSpaceSwitcherHref(
  pathname: string,
  params: URLSearchParams,
  spaceId: string,
): string {
  const pathSpaceId = getPathSpaceId(pathname);
  if (pathSpaceId) {
    const nextPathname = pathname.replace(
      `/space/${encodeURIComponent(pathSpaceId)}/`,
      `/space/${encodeURIComponent(spaceId)}/`,
    );
    return params.size > 0 ? `${nextPathname}?${params.toString()}` : nextPathname;
  }

  params.set("spaceId", spaceId);
  return `${pathname}?${params.toString()}`;
}

type BreadcrumbItem = {
  href: string;
  label: string;
};

function buildBreadcrumbItems(
  pathname: string,
  spaces: AppSidebarSpace[],
  searchParams: URLSearchParams,
): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "admin") {
    return buildAdminBreadcrumbItems(segments);
  }

  if (segments[0] === "space") {
    return buildSpaceBreadcrumbItems(segments, spaces, searchParams);
  }

  return [{ href: "/", label: "ホーム" }];
}

function buildAdminBreadcrumbItems(segments: string[]): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ href: "/admin", label: "管理" }];
  const section = segments[1];

  if (section === "spaces") {
    items.push({ href: "/admin/spaces", label: "スペース" });
  } else if (section === "invitations") {
    items.push({ href: "/admin/invitations", label: "ユーザー" });
  } else if (section === "audit-logs") {
    items.push({ href: "/admin/audit-logs", label: "監査ログ" });
  } else if (section === "export-jobs") {
    items.push({ href: "/admin/export-jobs", label: "CSV出力ジョブ" });
  }

  return items;
}

function buildSpaceBreadcrumbItems(
  segments: string[],
  spaces: AppSidebarSpace[],
  searchParams: URLSearchParams,
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ href: "/space", label: "スペース" }];
  const [second, third, fourth, fifth] = segments.slice(1);

  if (!second) {
    return items;
  }

  if (second === "applications") {
    items.push({ href: "/space/applications", label: "申請一覧" });
    return items;
  }

  if (second === "application-setup") {
    items.push({ href: "/space/application-setup", label: "申請フォーム設定" });
    return items;
  }

  if (second === "users") {
    items.push({ href: "/space/users", label: "メンバー" });
    return items;
  }

  if (third === "applications") {
    const spaceId = decodeURIComponent(second);
    const spaceName = spaces.find((space) => space.id === spaceId)?.name ?? "スペース";
    const encodedSpaceId = encodeURIComponent(spaceId);

    items.push({ href: `/space/${encodedSpaceId}/applications`, label: spaceName });
    items.push({ href: `/space/${encodedSpaceId}/applications`, label: "申請一覧" });

    if (fourth === "new") {
      items.push({ href: `/space/${encodedSpaceId}/applications/new`, label: "新規申請" });
    } else if (fourth) {
      const isFormDetail = searchParams.get("view") === "form";
      items.push({
        href: buildApplicationBreadcrumbHref(encodedSpaceId, fourth, isFormDetail),
        label: isFormDetail ? "フォーム詳細画面" : "申請詳細",
      });
      if (fifth === "edit") {
        items.push({
          href: `/space/${encodedSpaceId}/applications/${encodeURIComponent(fourth)}/edit`,
          label: "編集",
        });
      }
    }
  }

  return items;
}

function buildApplicationBreadcrumbHref(
  encodedSpaceId: string,
  applicationId: string,
  isFormDetail: boolean,
): string {
  const href = `/space/${encodedSpaceId}/applications/${encodeURIComponent(applicationId)}`;
  return isFormDetail ? `${href}?view=form` : href;
}
