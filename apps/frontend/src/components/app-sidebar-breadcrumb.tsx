"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import type { AppSidebarSpace } from "./app-sidebar";

type BreadcrumbItem = {
  href: string;
  label: string;
};

export function AppBreadcrumb({ spaces }: { spaces: AppSidebarSpace[] }) {
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
    items.push({ href: "/space/applications", label: "申請フォーム一覧" });
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
    items.push({ href: `/space/${encodedSpaceId}/applications`, label: "申請フォーム一覧" });

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

  if (third === "submissions") {
    const spaceId = decodeURIComponent(second);
    const spaceName = spaces.find((space) => space.id === spaceId)?.name ?? "スペース";
    const encodedSpaceId = encodeURIComponent(spaceId);

    items.push({ href: `/space/${encodedSpaceId}/applications`, label: spaceName });
    items.push({ href: `/space/${encodedSpaceId}/submissions`, label: "申請一覧" });

    if (fourth) {
      items.push({
        href: `/space/${encodedSpaceId}/submissions/${encodeURIComponent(fourth)}`,
        label: "申請詳細",
      });
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
