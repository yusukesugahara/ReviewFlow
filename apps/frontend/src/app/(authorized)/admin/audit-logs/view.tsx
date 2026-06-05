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

function shortId(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? `${value.slice(0, 8)}...` : "-";
}

type AuditMetadata = {
  durationMs?: unknown;
  errorCode?: unknown;
  ip?: unknown;
  path?: unknown;
  role?: unknown;
  statusCode?: unknown;
  success?: unknown;
  userAgent?: unknown;
};

type RiskLevel = "high" | "medium" | "low";

type EnrichedAuditRow = {
  metadata: AuditMetadata;
  reasons: string[];
  risk: RiskLevel;
  row: AdminAuditLogsViewProps["rows"][number];
};

export function AdminAuditLogsView({
  createdFrom,
  createdTo,
  outcome,
  query,
  risk,
  rows,
}: AdminAuditLogsViewProps) {
  const hasSearch = query.length > 0;
  const enrichedRows = rows.map(enrichAuditRow);
  const filteredRows = enrichedRows.filter((item) => {
    if (outcome === "failed" && item.metadata.success !== false) {
      return false;
    }
    if (outcome === "success" && item.metadata.success === false) {
      return false;
    }
    if (risk !== "all" && item.risk !== risk) {
      return false;
    }
    return true;
  });
  const highRiskCount = enrichedRows.filter((item) => item.risk === "high").length;
  const mediumRiskCount = enrichedRows.filter((item) => item.risk === "medium").length;
  const failedCount = enrichedRows.filter((item) => item.metadata.success === false).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <AuditSummaryCard
          icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
          label="高リスク"
          tone="red"
          value={highRiskCount}
        />
        <AuditSummaryCard
          icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
          label="要確認"
          tone="amber"
          value={mediumRiskCount}
        />
        <AuditSummaryCard
          icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
          label="失敗操作"
          tone="slate"
          value={failedCount}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>監査ログ</CardTitle>
          <CardDescription>
            {hasSearch ? `「${query}」に一致する最新200件の操作履歴` : "最新200件の操作履歴"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <form className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_160px_160px]">
              <div className="space-y-2">
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
                    placeholder="操作、対象、ID、操作者メールで検索"
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
            <div className="grid gap-3 sm:grid-cols-[220px_220px]">
              <div className="space-y-2">
                <Label htmlFor="createdFrom">
                  作成日 From
                </Label>
                <AuditLogDateFilterPicker
                  id="createdFrom"
                  name="createdFrom"
                  defaultValue={createdFrom}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="createdTo">
                  作成日 To
                </Label>
                <AuditLogDateFilterPicker
                  id="createdTo"
                  name="createdTo"
                  defaultValue={createdTo}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="submit" variant="outline" className="bg-white">
                検索
              </Button>
              <Button asChild type="button" variant="outline" className="bg-white">
                <Link href="/admin/audit-logs">クリア</Link>
              </Button>
            </div>
          </form>
          {filteredRows.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {hasSearch || risk !== "all" || outcome !== "all" || createdFrom || createdTo
                ? "条件に一致する監査ログはありません"
                : "監査ログはまだありません"}
            </p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>リスク</TableHead>
                  <TableHead>操作</TableHead>
                  <TableHead>結果</TableHead>
                  <TableHead>対象</TableHead>
                  <TableHead>対象ID</TableHead>
                  <TableHead>操作者</TableHead>
                  <TableHead>接続元</TableHead>
                  <TableHead>確認ポイント</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map(({ metadata, reasons, risk, row }) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDateTimeJa(row.createdAt)}
                    </TableCell>
                    <TableCell>
                      <RiskBadge risk={risk} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.actionType}</Badge>
                    </TableCell>
                    <TableCell>
                      {metadata.success === false ? (
                        <Badge variant="destructive">{textValue(metadata.errorCode) || "失敗"}</Badge>
                      ) : (
                        <Badge variant="secondary">成功</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{row.targetType}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {shortId(row.targetId)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.actorEmail ?? shortId(row.actorUserId)}
                    </TableCell>
                    <TableCell className="min-w-40 text-xs text-muted-foreground">
                      <div>{textValue(metadata.ip) || "-"}</div>
                      <div className="mt-1 max-w-48 truncate" title={textValue(metadata.userAgent)}>
                        {textValue(metadata.userAgent) || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-64 text-xs">
                      <div className="space-y-1">
                        {reasons.map((reason) => (
                          <div key={reason}>{reason}</div>
                        ))}
                        <div className="text-muted-foreground">
                          {textValue(metadata.path) || "-"} / {textValue(metadata.statusCode) || "-"} / {textValue(metadata.durationMs) || "-"}ms
                        </div>
                      </div>
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
  icon,
  label,
  tone,
  value,
}: {
  icon: ReactNode;
  label: string;
  tone: "amber" | "red" | "slate";
  value: number;
}) {
  const toneClassName =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-900"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-slate-50 text-slate-900";

  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClassName}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  if (risk === "high") {
    return <Badge variant="destructive">高</Badge>;
  }
  if (risk === "medium") {
    return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">中</Badge>;
  }
  return <Badge variant="secondary">低</Badge>;
}

function enrichAuditRow(row: AdminAuditLogsViewProps["rows"][number]): EnrichedAuditRow {
  const metadata = readMetadata(row.metadataJson);
  const reasons: string[] = [];
  const targetType = row.targetType;
  const method = row.actionType.split(":")[0] ?? "";
  const statusCode = numberValue(metadata.statusCode);
  const durationMs = numberValue(metadata.durationMs);

  if (metadata.success === false) {
    reasons.push(`失敗: ${textValue(metadata.errorCode) || "原因不明"}`);
  }
  if (["users", "invitations", "auth"].includes(targetType)) {
    reasons.push("認証・ユーザー管理");
  }
  if (targetType === "export-jobs") {
    reasons.push("データ出力");
  }
  if (["DELETE", "PATCH"].includes(method)) {
    reasons.push("変更・削除操作");
  }
  if (statusCode !== null && statusCode >= 400) {
    reasons.push(`HTTP ${statusCode}`);
  }
  if (durationMs !== null && durationMs >= 3000) {
    reasons.push("処理時間が長い");
  }
  if (reasons.length === 0) {
    reasons.push("通常操作");
  }

  const risk: RiskLevel =
    metadata.success === false ||
    targetType === "auth" ||
    (["users", "invitations"].includes(targetType) && ["POST", "PATCH", "DELETE"].includes(method))
      ? "high"
      : targetType === "export-jobs" ||
          ["DELETE", "PATCH"].includes(method) ||
          (statusCode !== null && statusCode >= 300)
        ? "medium"
        : "low";

  return { metadata, reasons, risk, row };
}

function readMetadata(value: unknown): AuditMetadata {
  return value && typeof value === "object" ? (value as AuditMetadata) : {};
}

function textValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
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
