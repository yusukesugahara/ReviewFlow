import type { ReactNode } from "react";
import { FileClock, FileText, ShieldAlert, UsersRound } from "lucide-react";
import type { AuditLogSummaryCounts } from "../_view-models/audit-log-view-model";

type AuditLogSummaryCardsProps = {
  summaryCounts: AuditLogSummaryCounts;
};

/**
 * 監査ログの概要件数カード群を表示します。
 */
export function AuditLogSummaryCards({
  summaryCounts,
}: AuditLogSummaryCardsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <AuditSummaryCard
        icon={<FileClock className="h-5 w-5" aria-hidden="true" />}
        label="全イベント"
        tone="slate"
        value={summaryCounts.total}
      />
      <AuditSummaryCard
        icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
        label="重要操作"
        tone="red"
        value={summaryCounts.importantEvents}
      />
      <AuditSummaryCard
        icon={<FileText className="h-5 w-5" aria-hidden="true" />}
        label="申請"
        tone="blue"
        value={summaryCounts.applicationEvents}
      />
      <AuditSummaryCard
        icon={<UsersRound className="h-5 w-5" aria-hidden="true" />}
        label="ユーザー・スペース"
        tone="emerald"
        value={summaryCounts.accessEvents}
      />
    </div>
  );
}

/**
 * 監査ログ概要件数の 1 カードを表示します。
 */
function AuditSummaryCard({
  icon,
  label,
  tone,
  value,
}: {
  icon: ReactNode;
  label: string;
  tone: "blue" | "emerald" | "red" | "slate";
  value: number;
}) {
  const toneClassName =
    tone === "blue"
      ? "border-sky-200 bg-sky-50 text-sky-950"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
        : tone === "red"
          ? "border-red-200 bg-red-50 text-red-950"
          : "border-slate-200 bg-slate-50 text-slate-950";

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
