import { Badge } from "@/components/ui/badge";
import {
  getApplicationStatusBadgeVariant,
  getApplicationStatusLabel,
} from "./application-status";

type ApplicationStatusBadgeProps = {
  status: string;
  className?: string;
};

export function ApplicationStatusBadge({
  status,
  className,
}: ApplicationStatusBadgeProps) {
  return (
    <Badge
      variant={getApplicationStatusBadgeVariant(status)}
      className={className}
    >
      {getApplicationStatusLabel(status)}
    </Badge>
  );
}
