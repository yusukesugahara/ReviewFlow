import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  ListChecks,
  RotateCcw,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CardHeading } from "@/components/ui/card-heading";
import {
  buildDashboardTotals,
  buildSpaceDashboardCardModel,
} from "./_view-models/dashboard-view-model";
import type { AdminDashboardViewProps, SpaceDashboardSummary } from "./types";

export function AdminDashboardView({
  fetchErrorStatus,
  selectedSpaceId,
  spaces,
}: AdminDashboardViewProps) {
  if (fetchErrorStatus !== undefined) {
    return (
      <Alert variant="destructive">
        <AlertTitle>ダッシュボードの取得に失敗しました</AlertTitle>
        <AlertDescription>
          status: {fetchErrorStatus}。通信状況を確認してから再読み込みしてください。
        </AlertDescription>
      </Alert>
    );
  }

  const selectedSpace =
    spaces.find((space) => space.id === selectedSpaceId) ?? spaces[0] ?? null;
  const totals = buildDashboardTotals(spaces);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          スペースダッシュボード
        </h1>
        <p className="text-sm text-slate-600">
          所属スペースごとの申請状況、フォーム、メンバー構成を確認できます。
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <OverviewStat label="スペース" value={spaces.length} icon={Users} />
        <OverviewStat label="申請" value={totals.totalApplications} icon={FileText} />
        <OverviewStat label="対応が必要" value={totals.needsActionCount} icon={Clock3} />
        <OverviewStat label="差し戻し中" value={totals.returnedCount} icon={RotateCcw} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {spaces.map((space) => (
          <SpaceSummaryCard
            key={space.id}
            isSelected={space.id === selectedSpace?.id}
            space={space}
          />
        ))}
      </div>
    </div>
  );
}

function OverviewStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <Icon className="size-4 text-slate-500" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">
        {value}
      </p>
    </div>
  );
}

function SpaceSummaryCard({
  isSelected,
  space,
}: {
  isSelected: boolean;
  space: SpaceDashboardSummary;
}) {
  const viewModel = buildSpaceDashboardCardModel(space);

  return (
    <Card
      className={`border-slate-200 bg-white shadow-sm ${
        isSelected ? "ring-2 ring-slate-300 ring-offset-2" : ""
      }`}
    >
      <CardHeader className="space-y-3 border-b border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardHeading
            badge={viewModel.roleLabel}
            badgeVariant="outline"
            description={viewModel.descriptionText}
            descriptionClassName="leading-6 text-slate-600"
            title={space.name}
            titleClassName="text-lg text-slate-950"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <CompactMetric label="メンバー" value={`${space.memberCount}名`} />
          <CompactMetric
            label="公開フォーム"
            value={`${space.publishedFormCount}/${space.formCount}`}
          />
          <CompactMetric label="平均差し戻し" value={space.avgReturns} />
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <StatusMetric
            icon={Clock3}
            label="対応が必要"
            value={space.needsActionCount}
          />
          <StatusMetric
            icon={RotateCcw}
            label="再申請待ち"
            value={space.returnedCount}
          />
          <StatusMetric
            icon={CheckCircle2}
            label="承認済み"
            value={space.approvedCount}
          />
          <StatusMetric
            icon={AlertCircle}
            label="却下"
            value={space.rejectedCount}
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">直近の動き</p>
              <p className="mt-1 text-sm text-slate-600">
                {viewModel.latestApplicationText}
              </p>
            </div>
            <div className="text-right text-sm text-slate-600">
              <p>申請 {space.totalApplications}件</p>
              <p>差し戻し履歴 {space.correctionCount}件</p>
              <p>再提出レビュー中 {space.resubmitCount}件</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button asChild size="sm" variant="outline" className="bg-white">
            <Link href={`/space/${encodeURIComponent(space.id)}/applications`}>
              <ListChecks className="size-4" aria-hidden="true" />
              フォーム
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="bg-white">
            <Link href={`/space/${encodeURIComponent(space.id)}/submissions`}>
              <FileText className="size-4" aria-hidden="true" />
              申請一覧
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">
        {value}
      </p>
    </div>
  );
}

function StatusMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 px-3 py-3">
      <div className="flex items-center gap-2 text-slate-600">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <p className="truncate text-xs font-medium">{label}</p>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-slate-950">
        {value}
      </p>
    </div>
  );
}
