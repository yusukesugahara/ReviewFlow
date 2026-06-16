"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { buildBreadcrumbItems } from "@/components/layout/app-sidebar-routing";
import type { AppSidebarSpace } from "./app-sidebar.types";

/**
 * 現在のルートに応じたパンくずリストを表示します。
 */
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
