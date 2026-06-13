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
import { textValue } from "../_utils/audit-log-metadata";
import type { RiskLevel } from "../_utils/audit-log-risk";
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
            <TableHead className="min-w-44">操作者</TableHead>
            <TableHead className="min-w-72">操作内容</TableHead>
            <TableHead className="min-w-24">結果</TableHead>
            <TableHead className="min-w-28">詳細</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ display, metadata, reasons, risk: rowRisk, row }) => (
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
                <div className="space-y-2">
                  <p className="text-sm font-medium leading-6 text-slate-950">
                    {display.actionLabel}
                  </p>
                  <p className="text-sm text-slate-600">対象: {display.targetLabel}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskBadge risk={rowRisk} />
                    <Badge variant="outline" className="font-normal">
                      {row.actionType}
                    </Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell className="align-top">
                {display.isSuccess ? (
                  <Badge variant="secondary">{display.resultLabel}</Badge>
                ) : (
                  <Badge variant="destructive">{display.resultLabel}</Badge>
                )}
              </TableCell>
              <TableCell className="align-top">
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer text-slate-700 hover:text-slate-950">
                    技術情報
                  </summary>
                  <div className="mt-2 space-y-1 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p>API: {textValue(metadata.path) || "-"}</p>
                    <p>HTTP: {textValue(metadata.statusCode) || "-"}</p>
                    <p>処理時間: {textValue(metadata.durationMs) || "-"}ms</p>
                    <p>IP: {textValue(metadata.ip) || "-"}</p>
                    <p className="break-all">UA: {textValue(metadata.userAgent) || "-"}</p>
                    <p>分類: {reasons.join(" / ")}</p>
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

function RiskBadge({ risk }: { risk: RiskLevel }) {
  if (risk === "high") {
    return <Badge variant="destructive">高リスク</Badge>;
  }
  if (risk === "medium") {
    return (
      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
        要確認
      </Badge>
    );
  }
  return <Badge variant="secondary">通常</Badge>;
}
