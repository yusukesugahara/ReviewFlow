"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminNavLinkProps = {
  href: string;
  children: ReactNode;
};

export function AdminNavLink({ href, children }: AdminNavLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSectionRoot = href === "/admin" || href === "/space";
  const isActive = isSectionRoot
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  const spaceId = searchParams.get("spaceId");
  const scopedHref =
    href.startsWith("/space") && spaceId
      ? `${href}?spaceId=${encodeURIComponent(spaceId)}`
      : href;

  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        "h-8 justify-start rounded-lg px-2.5 text-xs font-medium transition-colors",
        "text-slate-300 hover:bg-slate-800 hover:text-white",
        isActive &&
          "bg-violet-500/15 text-violet-100 ring-1 ring-inset ring-violet-400/40 hover:bg-violet-500/20"
      )}
    >
      <Link href={scopedHref}>{children}</Link>
    </Button>
  );
}
