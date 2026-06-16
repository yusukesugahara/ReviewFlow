import Link from "next/link";
import {
  buildSummaryFilterHref,
  type SubmissionSummaryCounts,
  type SummaryFilter,
} from "../_utils/space-submissions.helpers";

type SubmissionSummaryCardsProps = {
  activeSummary: SummaryFilter;
  counts: SubmissionSummaryCounts;
  spaceId: string;
};

/**
 * 提出一覧の概要件数カード群を表示します。
 */
export function SubmissionSummaryCards({
  activeSummary,
  counts,
  spaceId,
}: SubmissionSummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        href={buildSummaryFilterHref(spaceId, "myNeedsAction")}
        isActive={activeSummary === "myNeedsAction"}
        label="あなたの対応が必要"
        value={counts.myNeedsAction}
        tone="blue"
      />
      <SummaryCard
        href={buildSummaryFilterHref(spaceId, "spaceNeedsAction")}
        isActive={activeSummary === "spaceNeedsAction"}
        label="スペース内で対応が必要"
        value={counts.spaceNeedsAction}
        tone="amber"
      />
      <SummaryCard
        href={buildSummaryFilterHref(spaceId, "returned")}
        isActive={activeSummary === "returned"}
        label="差し戻し後、再申請待ち"
        value={counts.returned}
        tone="rose"
      />
      <SummaryCard
        href={buildSummaryFilterHref(spaceId, "recentProcessed")}
        isActive={activeSummary === "recentProcessed"}
        label="直近7日間に対応"
        value={counts.recentProcessed}
        tone="emerald"
      />
    </div>
  );
}

/**
 * 提出一覧概要の 1 カードを表示します。
 */
function SummaryCard({
  href,
  isActive,
  label,
  value,
  tone,
}: {
  href: string;
  isActive: boolean;
  label: string;
  value: number;
  tone: "amber" | "blue" | "emerald" | "rose";
}) {
  const toneClassName = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  }[tone];
  const activeClassName = isActive
    ? "ring-2 ring-offset-2 ring-slate-400"
    : "hover:border-slate-300 hover:bg-white";

  return (
    <Link
      href={href}
      className={`block rounded-lg border px-4 py-3 transition ${toneClassName} ${activeClassName}`}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </Link>
  );
}
