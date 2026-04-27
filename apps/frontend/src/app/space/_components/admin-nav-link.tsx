"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminNavLinkProps = {
  href: string;
  children: ReactNode;
};

export function AdminNavLink({ href, children }: AdminNavLinkProps) {
  const pathname = usePathname();
  const isSectionRoot = href === "/admin" || href === "/space";
  const isActive = isSectionRoot
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        "justify-start h-10 rounded-xl px-3.5 text-[14px] font-medium transition-colors",
        "text-slate-300 hover:bg-slate-800 hover:text-white",
        isActive &&
          "bg-violet-500/15 text-violet-100 ring-1 ring-inset ring-violet-400/40 hover:bg-violet-500/20"
      )}
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}
