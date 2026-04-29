"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type SpaceScopedLinkProps = {
  className?: string;
  href: string;
  children: ReactNode;
};

export function SpaceScopedLink({
  className,
  href,
  children,
}: SpaceScopedLinkProps) {
  const searchParams = useSearchParams();
  const spaceId = searchParams.get("spaceId");
  const scopedHref =
    href.startsWith("/space") && spaceId
      ? `${href}?spaceId=${encodeURIComponent(spaceId)}`
      : href;

  return (
    <Link className={className} href={scopedHref}>
      {children}
    </Link>
  );
}
