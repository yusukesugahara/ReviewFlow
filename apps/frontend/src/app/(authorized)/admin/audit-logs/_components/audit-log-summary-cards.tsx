import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import type { AuditLogSummaryCounts } from "../audit-log-view-model";

type AuditLogSummaryCardsProps = {
  highRiskHref: string;
  isHighRiskFilterActive: boolean;
  summaryCounts: AuditLogSummaryCounts;
};

export function AuditLogSummaryCards({
  highRiskHref,
  isHighRiskFilterActive,
  summaryCounts,
}: AuditLogSummaryCardsProps) {
  return (
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
