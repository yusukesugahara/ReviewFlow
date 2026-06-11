import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeJa } from "@/lib/date-format";
import { AuditLogDateFilterPicker } from "./audit-log-date-filter-picker";
import type { AdminAuditLogsErrorViewProps, AdminAuditLogsViewProps } from "./types";
import {
  buildAdminAuditLogsViewModel,
  textValue,
  type RiskLevel,
} from "./audit-log-helpers";

export function AdminAuditLogsView({
  createdFrom,
  createdTo,
  outcome,
  query,
  risk,
  rows,
}: AdminAuditLogsViewProps) {
  const {
    filteredRows,
    hasActiveFilters,
    highRiskHref,
    isHighRiskFilterActive,
    listDescription,
    summaryCounts,
  } = buildAdminAuditLogsViewModel({
    createdFrom,
    createdTo,
    outcome,
    query,
    risk,
    rows,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">監査ログ</h1>
        <p className="text-sm text-slate-600">
          誰が、いつ、どんな操作をしたかを確認できます。
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <AuditSummaryCard
          active={isHighRiskFilterActive}
          href={highRiskHref}
          icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
          label="高リスク"
          linkLabel={`高リスクの操作履歴を表示（${summaryCounts.highRisk}件）`}
          tone="red"
          value={summaryCounts.highRisk}
        />
        <AuditSummaryCard
          icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
          label="要確認"
          tone="amber"
          value={summaryCounts.mediumRisk}
        />
        <AuditSummaryCard
          icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
          label="失敗操作"
          tone="slate"
          value={summaryCounts.failed}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>操作履歴</CardTitle>
          <CardDescription>{listDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <form className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2 xl:col-span-3">
                <Label htmlFor="audit-query">検索キーワード</Label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="audit-query"
                    name="q"
                    defaultValue={query}
                    placeholder="操作者メール、対象ID、操作内容で検索"
                    className="bg-white pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="audit-risk">リスク</Label>
                <Select name="risk" defaultValue={risk}>
                  <SelectTrigger id="audit-risk" className="h-10 rounded-lg bg-white text-[15px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">リスクすべて</SelectItem>
                    <SelectItem value="high">高リスク</SelectItem>
                    <SelectItem value="medium">要確認</SelectItem>
                    <SelectItem value="low">通常</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="audit-outcome">結果</Label>
                <Select name="outcome" defaultValue={outcome}>
                  <SelectTrigger id="audit-outcome" className="h-10 rounded-lg bg-white text-[15px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">結果すべて</SelectItem>
                    <SelectItem value="failed">失敗のみ</SelectItem>
                    <SelectItem value="success">成功のみ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="createdFrom">期間 From</Label>
                  <AuditLogDateFilterPicker
                    id="createdFrom"
                    name="createdFrom"
                    defaultValue={createdFrom}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="createdTo">期間 To</Label>
                  <AuditLogDateFilterPicker
                    id="createdTo"
                    name="createdTo"
                    defaultValue={createdTo}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="outline" className="bg-white">
                  検索
                </Button>
                <Button asChild type="button" variant="outline" className="bg-white">
                  <Link href="/admin/audit-logs">クリア</Link>
                </Button>
              </div>
            </div>
          </form>
          {filteredRows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {hasActiveFilters
                ? "条件に一致する監査ログはありません"
                : "監査ログはまだありません"}
            </p>
          ) : (
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
                  {filteredRows.map(({ display, metadata, reasons, risk: rowRisk, row }) => (
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
                            <p className="break-all">
                              UA: {textValue(metadata.userAgent) || "-"}
                            </p>
                            <p>分類: {reasons.join(" / ")}</p>
                          </div>
                        </details>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AuditSummaryCard({
  active = false,
  href,
  icon,
  label,
  linkLabel,
  tone,
  value,
}: {
  active?: boolean;
  href?: string;
  icon: ReactNode;
  label: string;
  linkLabel?: string;
  tone: "amber" | "red" | "slate";
  value: number;
}) {
  const toneClassName =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-900"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-slate-50 text-slate-900";
  const activeClassName =
    tone === "red"
      ? "ring-2 ring-red-400 ring-offset-2"
      : tone === "amber"
        ? "ring-2 ring-amber-400 ring-offset-2"
        : "ring-2 ring-slate-400 ring-offset-2";
  const className = [
    "block rounded-lg border px-4 py-3",
    toneClassName,
    href ? "cursor-pointer transition hover:shadow-sm hover:brightness-[0.98]" : "",
    active ? activeClassName : "",
  ]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={className}
        aria-current={active ? "page" : undefined}
        aria-label={linkLabel ?? label}
      >
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
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

export function AdminAuditLogsErrorView({ status }: AdminAuditLogsErrorViewProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-destructive">
          {status
            ? `監査ログの取得に失敗しました（status: ${status}）`
            : "監査ログの取得に失敗しました"}
        </p>
      </CardContent>
    </Card>
  );
}
