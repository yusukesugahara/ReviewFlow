import type { ReactNode } from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CardHeadingProps = {
  badge?: ReactNode;
  badgeVariant?: BadgeProps["variant"];
  className?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  title: ReactNode;
  titleClassName?: string;
};

/**
 * カード内で使う見出しと説明文を表示します。
 */
export function CardHeading({
  badge,
  badgeVariant = "outline",
  className,
  description,
  descriptionClassName,
  title,
  titleClassName,
}: CardHeadingProps) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <CardTitle className={cn("break-words text-xl", titleClassName)}>
          {title}
        </CardTitle>
        {badge ? <Badge variant={badgeVariant}>{badge}</Badge> : null}
      </div>
      {description ? (
        <CardDescription className={descriptionClassName}>
          {description}
        </CardDescription>
      ) : null}
    </div>
  );
}
