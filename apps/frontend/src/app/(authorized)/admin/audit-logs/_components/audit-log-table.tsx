import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTimeJa } from "@/lib/date-format";
import type { EnrichedAuditRow } from "../_view-models/audit-log-view-model";

type AuditLogTableProps = {
  rows: EnrichedAuditRow[];
};

export function AuditLogTable({ rows }: AuditLogTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-36">日時</TableHead>
            <TableHead className="min-w-48">操作者</TableHead>
            <TableHead className="min-w-56">対象</TableHead>
            <TableHead className="min-w-52">操作</TableHead>
            <TableHead className="min-w-56">状態/権限変更</TableHead>
            <TableHead className="min-w-40">詳細</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ display, row }) => (
            <TableRow key={row.id}>
              <TableCell className="align-top text-sm text-slate-700">
                {formatDateTimeJa(row.createdAt)}
              </TableCell>
              <TableCell className="align-top">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-950">{display.actorLabel}</p>
                  {display.actorDetail ? (
                    <p className="text-xs text-muted-foreground">{display.actorDetail}</p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="align-top">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-950">{display.targetLabel}</p>
                  {display.targetDetail ? (
                    <p className="text-xs text-muted-foreground">{display.targetDetail}</p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="align-top">
                <div className="space-y-2">
                  <p className="text-sm font-medium leading-6 text-slate-950">
                    {display.actionLabel}
                  </p>
                  <Badge variant="outline" className="font-normal">
                    {row.actionType}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="align-top">
                <div className="space-y-1 text-sm text-slate-700">
                  {display.changeItems.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </TableCell>
              <TableCell className="align-top">
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer text-slate-700 hover:text-slate-950">
                    詳細
                  </summary>
                  <div className="mt-2 space-y-1 rounded-md border border-slate-200 bg-slate-50 p-3">
                    {display.summary ? (
                      <p className="break-words text-slate-700">{display.summary}</p>
                    ) : null}
                    {display.detailItems.map((item) => (
                      <p key={`${item.label}:${item.value}`} className="break-all">
                        {item.label}: {item.value}
                      </p>
                    ))}
                  </div>
                </details>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
