import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  status?: ReactNode;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  status,
}: PageHeaderProps) {
  return (
    <header className="mb-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {eyebrow}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {title}
            </h1>
            {status}
          </div>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
      <Separator />
    </header>
  );
}
