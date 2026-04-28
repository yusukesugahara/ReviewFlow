"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type SpaceSwitcherItem = {
  id: string;
  name: string;
};

type SpaceSwitcherProps = {
  spaces: SpaceSwitcherItem[];
};

export function SpaceSwitcher({ spaces }: SpaceSwitcherProps) {
  const searchParams = useSearchParams();
  const activeSpaceId = searchParams.get("spaceId") ?? spaces[0]?.id ?? null;

  if (spaces.length === 0) {
    return (
      <div className="rounded-md px-2 py-1.5 text-xs text-slate-500">
        参加スペースなし
      </div>
    );
  }

  return (
    <nav className="grid gap-1">
      {spaces.map((space) => {
        const isActive = activeSpaceId === space.id;
        return (
          <Link
            key={space.id}
            href={`/space?spaceId=${encodeURIComponent(space.id)}`}
            className={cn(
              "block truncate rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
              isActive && "bg-violet-50 text-violet-800 ring-1 ring-violet-200",
            )}
            title={space.name}
          >
            {space.name}
          </Link>
        );
      })}
    </nav>
  );
}
