import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTimeJa } from "@/lib/date-format";
import type { EnrichedAuditRow } from "@/components/audit-logs/audit-log-display";

type SpaceOverviewRecentAuditLogsProps = {
  auditLogsHref: string;
  rows: EnrichedAuditRow[];
};

export function SpaceOverviewRecentAuditLogs({
  auditLogsHref,
  rows,
}: SpaceOverviewRecentAuditLogsProps) {
  return (
    <Card>
      <CardHeader className="gap-3 border-b border-slate-200 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ClipboardList className="size-5 text-slate-500" aria-hidden="true" />
            最近の監査ログ
          </CardTitle>
          <CardDescription>
            このスペースで記録された業務操作を新しい順に表示します
          </CardDescription>
        </div>
        <Button asChild variant="outline" size="sm" className="bg-white sm:shrink-0">
          <Link href={auditLogsHref}>
            監査ログ
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            このスペースの監査ログはまだありません
          </p>
        ) : (
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
            {rows.map(({ display, row }) => (
              <div
                key={row.id}
                className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate text-sm font-medium text-slate-950">
                      {display.actionLabel}
                    </p>
                    <Badge variant="outline" className="font-normal">
                      {row.actionType}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-slate-600">
                    {display.actorLabel} / {display.targetLabel}
                  </p>
                  {display.changeItems.length > 0 ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {display.changeItems.join("、")}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm tabular-nums text-slate-600 md:text-right">
                  {formatDateTimeJa(row.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
