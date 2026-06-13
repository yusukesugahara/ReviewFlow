import {
  ClipboardList,
  Clock3,
  FileText,
  RotateCcw,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { SpaceOverviewStats } from "../_view-models/space-overview-view-model";

type SpaceOverviewSummaryCardsProps = {
  stats: SpaceOverviewStats;
};

export function SpaceOverviewSummaryCards({
  stats,
}: SpaceOverviewSummaryCardsProps) {
  const metrics: Array<{
    icon: LucideIcon;
    label: string;
    value: string;
  }> = [
    {
      icon: FileText,
      label: "申請",
      value: String(stats.totalApplications),
    },
    {
      icon: Clock3,
      label: "対応が必要",
      value: String(stats.needsActionCount),
    },
    {
      icon: UserCheck,
      label: "あなたの担当",
      value: String(stats.myNeedsActionCount),
    },
    {
      icon: RotateCcw,
      label: "差し戻し中",
      value: String(stats.returnedCount),
    },
    {
      icon: ClipboardList,
      label: "公開フォーム",
      value: String(stats.publishedFormCount),
    },
  ];

  if (stats.memberCount !== null) {
    metrics.push({
      icon: Users,
      label: "メンバー",
      value: String(stats.memberCount),
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <SummaryMetric key={metric.label} {...metric} />
      ))}
    </div>
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <Icon className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">
        {value}
      </p>
    </div>
  );
}
