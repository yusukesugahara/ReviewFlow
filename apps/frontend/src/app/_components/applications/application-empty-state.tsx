import type { ReactNode } from "react";

type ApplicationEmptyStateProps = {
  message: string;
  action?: ReactNode;
  className?: string;
};

export function ApplicationEmptyState({
  message,
  action,
  className = "py-8",
}: ApplicationEmptyStateProps) {
  if (!action) {
    return (
      <p className={`${className} text-center text-muted-foreground`}>
        {message}
      </p>
    );
  }

  return (
    <div className={`${className} text-center`}>
      <p className="mb-4 text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
