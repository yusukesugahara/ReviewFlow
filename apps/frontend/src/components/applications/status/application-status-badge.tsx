import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import {
  getApplicationStatusBadgeVariant,
  getApplicationStatusLabel,
} from "./application-status";

type ApplicationStatusBadgeProps = {
  status: string;
  className?: string;
};

/**
 * 申請ステータスをバッジとして表示します。
 */
export function ApplicationStatusBadge({
  status,
  className,
}: ApplicationStatusBadgeProps) {
  return (
    <Badge
      variant={getApplicationStatusBadgeVariant(status)}
      className={cn(getApplicationStatusClassName(status), className)}
    >
      {getApplicationStatusLabel(status)}
    </Badge>
  );
}

/**
 * 申請ステータスに対応するバッジ className を返します。
 */
function getApplicationStatusClassName(status: string): string {
  switch (status) {
    case APPLICATION_STATUSES.submitted:
      return "border-slate-300 bg-white text-slate-700";
    case APPLICATION_STATUSES.inReview:
      return "border-blue-200 bg-blue-50 text-blue-800";
    case APPLICATION_STATUSES.returned:
      return "border-amber-200 bg-amber-50 text-amber-800";
    case APPLICATION_STATUSES.approved:
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case APPLICATION_STATUSES.rejected:
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "";
  }
}
