"use client";

import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/app/(authorized)/space/_components/metric-card";
import { buildSpaceApplicationNewHref } from "@/app/_components/applications/application-routes";
import type { AdminDashboardViewProps } from "./types";

export function AdminDashboardView({
  avgReturns,
  fetchErrorStatus,
  resubmitCount,
  spaceId,
  totalApplications,
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

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild size="sm">
          <Link href={buildSpaceApplicationNewHref(spaceId)}>新規申請</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/space/applications?spaceId=${encodeURIComponent(spaceId)}`}>
            申請フォーム一覧を見る
          </Link>
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <MetricCard
          title="申請件数"
          value={totalApplications}
          description="全ての申請数"
          toneClassName="bg-violet-100"
          iconClassName="text-violet-600"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-full w-full"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <MetricCard
          title="平均差し戻し数"
          value={avgReturns}
          description="1申請あたりの平均"
          toneClassName="bg-indigo-100"
          iconClassName="text-indigo-600"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-full w-full"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          }
        />
        <MetricCard
          title="再提出件数"
          value={resubmitCount}
          description="差し戻し後レビュー中"
          toneClassName="bg-sky-100"
          iconClassName="text-sky-700"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-full w-full"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
