import type { ReactNode } from "react";
import { ClipboardList, FileClock, UsersRound } from "lucide-react";
import type { AuditLogSummaryCounts } from "../_view-models/audit-log-view-model";

type AuditLogSummaryCardsProps = {
  summaryCounts: AuditLogSummaryCounts;
};

/**
 * 監査ログの概要件数カード群を表示します。
 */
export function AuditLogSummaryCards({ summaryCounts }: AuditLogSummaryCardsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <AuditSummaryCard
        icon={<FileClock className="h-5 w-5" aria-hidden="true" />}
        label="全イベント"
        tone="slate"
        value={summaryCounts.total}
      />
      <AuditSummaryCard
        icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
        label="申請"
        tone="blue"
        value={summaryCounts.applicationEvents}
      />
      <AuditSummaryCard
        icon={<UsersRound className="h-5 w-5" aria-hidden="true" />}
        label="ユーザ/招待"
        tone="emerald"
        value={summaryCounts.identityEvents}
      />
      <AuditSummaryCard
        icon={<UsersRound className="h-5 w-5" aria-hidden="true" />}
        label="スペース/メンバー"
        tone="violet"
        value={summaryCounts.spaceEvents}
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
  tone: "blue" | "emerald" | "slate" | "violet";
  value: number;
}) {
  const toneClassName =
    tone === "blue"
      ? "border-sky-200 bg-sky-50 text-sky-950"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
        : tone === "violet"
          ? "border-violet-200 bg-violet-50 text-violet-950"
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
