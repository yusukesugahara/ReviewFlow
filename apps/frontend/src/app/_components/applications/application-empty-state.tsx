import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

type ApplicationEmptyStateProps = {
  message: string;
  action?: ReactNode;
  className?: string;
};

export function ApplicationEmptyState({
  message,
  action,
  className = "py-10",
}: ApplicationEmptyStateProps) {
  return (
    <div className={`${className} text-center`}>
      <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
        <Inbox className="size-5" aria-hidden="true" />
      </div>
      <p className="mx-auto max-w-md text-sm leading-6 text-slate-600">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
