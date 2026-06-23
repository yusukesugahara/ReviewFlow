"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

/**
 * 監査ログ行をテーブルとして表示します。
 */
export function AuditLogTable({ rows }: AuditLogTableProps) {
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleRow = (rowId: string) => {
    setExpandedRowIds((current) => {
      const next = new Set(current);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-36">日時</TableHead>
            <TableHead className="min-w-80">操作内容</TableHead>
            <TableHead className="min-w-56">対象</TableHead>
            <TableHead className="min-w-56">変更内容</TableHead>
            <TableHead className="min-w-40">詳細</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ display, row }) => {
            const isExpanded = expandedRowIds.has(row.id);
            const detailId = `audit-log-detail-${row.id}`;
            const detailButtonLabel = `${display.targetLabel} の詳細を${
              isExpanded ? "閉じる" : "表示"
            }`;

            return (
              <Fragment key={row.id}>
                <TableRow className={rowToneClassName(display.severity)}>
                  <TableCell className="align-top text-sm text-slate-700">
                    {formatDateTimeJa(row.createdAt)}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-white font-normal">
                          {display.categoryLabel}
                        </Badge>
                        {display.severityLabel ? (
                          <Badge
                            variant={
                              display.severity === "critical"
                                ? "destructive"
                                : "secondary"
                            }
                            className={severityBadgeClassName(display.severity)}
                          >
                            {display.severityLabel}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm font-medium leading-6 text-slate-950">
                        {display.sentence}
                      </p>
                      {display.actorDetail ? (
                        <p className="text-xs text-muted-foreground">
                          {display.actorDetail}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      {display.targetHref ? (
                        <Link
                          href={display.targetHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-slate-950 underline underline-offset-2"
                        >
                          {display.targetLabel}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-slate-950">
                          {display.targetLabel}
                        </p>
                      )}
                      {display.targetDetail ? (
                        <p className="text-xs text-muted-foreground">
                          {display.targetDetail}
                        </p>
                      ) : null}
                      <Badge variant="outline" className="bg-white font-normal">
                        {display.targetTypeLabel}
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      aria-controls={detailId}
                      aria-expanded={isExpanded}
                      aria-label={detailButtonLabel}
                      onClick={() => toggleRow(row.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown aria-hidden="true" />
                      ) : (
                        <ChevronRight aria-hidden="true" />
                      )}
                      {isExpanded ? "閉じる" : "詳細"}
                    </Button>
                  </TableCell>
                </TableRow>
                {isExpanded ? (
                  <TableRow
                    id={detailId}
                    className="bg-slate-50/80 hover:bg-slate-50/80"
                  >
                    <TableCell colSpan={5} className="p-0">
                      <AuditLogExpandedDetails entry={{ display, row }} />
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function AuditLogExpandedDetails({ entry }: { entry: EnrichedAuditRow }) {
  const { display, row } = entry;

  return (
    <div
      role="region"
      aria-label={`${display.targetLabel} の詳細`}
      className="space-y-5 border-l-4 border-l-slate-300 px-4 py-4"
    >
      <div>
        <p className="text-xs font-medium text-slate-500">監査サマリー</p>
        <p className="mt-1 text-sm font-medium leading-6 text-slate-950">
          {display.sentence}
        </p>
      </div>

      <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AuditLogFact label="いつ" value={formatDateTimeJa(row.createdAt)} />
        <AuditLogFact
          label="だれが"
          value={display.actorLabel}
          detail={display.actorDetail}
        />
        <AuditLogFact
          label="どんな操作"
          value={display.actionLabel}
          detail={`操作コード: ${row.actionType}`}
        />
        <AuditLogFact
          label="何に対して"
          value={display.targetLabel}
          detail={display.targetDetail}
          href={display.targetHref}
          badge={display.targetTypeLabel}
        />
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">変更内容</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-800">
            {display.changeItems.map((item) => (
              <li key={item} className="break-words">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">概要</p>
          <p className="mt-2 break-words text-sm text-slate-800">
            {display.summary ?? "概要は記録されていません"}
          </p>
        </section>
      </div>

    </div>
  );
}

type AuditLogFactProps = {
  badge?: string | null;
  detail?: string | null;
  href?: string | null;
  label: string;
  value: string;
};

function AuditLogFact({
  badge,
  detail,
  href,
  label,
  value,
}: AuditLogFactProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 space-y-1">
        {href ? (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-words text-sm font-medium text-slate-950 underline underline-offset-2"
          >
            {value}
          </Link>
        ) : (
          <span className="block break-words text-sm font-medium text-slate-950">
            {value}
          </span>
        )}
        {detail ? (
          <span className="block break-words text-xs text-muted-foreground">
            {detail}
          </span>
        ) : null}
        {badge ? (
          <Badge variant="outline" className="mt-1 bg-white font-normal">
            {badge}
          </Badge>
        ) : null}
      </dd>
    </div>
  );
}

function rowToneClassName(severity: EnrichedAuditRow["display"]["severity"]) {
  if (severity === "critical") {
    return "border-l-4 border-l-red-500 bg-red-50/40";
  }
  if (severity === "attention") {
    return "border-l-4 border-l-amber-400 bg-amber-50/40";
  }
  return "";
}

function severityBadgeClassName(
  severity: EnrichedAuditRow["display"]["severity"],
) {
  if (severity === "critical") {
    return "border-red-600 bg-red-600 text-white";
  }
  if (severity === "attention") {
    return "border-amber-200 bg-amber-100 text-amber-950";
  }
  return "";
}
