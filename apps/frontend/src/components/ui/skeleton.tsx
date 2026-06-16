import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 読み込み中のプレースホルダーを表示します。
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200", className)}
      {...props}
    />
  );
}

export { Skeleton };
