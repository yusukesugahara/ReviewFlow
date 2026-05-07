"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  APPLICATION_LIST_VIEW_OPTIONS,
  APPLICATION_LIST_VIEWS,
  APPLICATION_STATUSES,
  type ApplicationListView,
} from "@/lib/constants/applications";
import { ApplicationEmptyState } from "@/app/_components/applications/application-empty-state";
import { ApplicationListTable } from "@/app/_components/applications/application-list-table";
import {
  buildSpaceApplicationDetailHref,
  buildSpaceApplicationNewHref,
  buildSpaceApplicationsHref,
} from "@/app/_components/applications/application-routes";

export type FormDefinitionRow = {
  id: string;
  name: string;
  status: string;
  createdAt?: string;
};

export type ApplicationRow = {
  id: string;
  groupId: string;
  status: string;
  applicantEmail: string;
  createdAt: string;
};

type SpaceApplicationsPageContentProps = {
  actorEmail?: string;
  applications: ApplicationRow[];
  definitions: FormDefinitionRow[];
  fetchErrorStatus?: number;
  spaceId: string;
  view?: string;
};

export function SpaceApplicationsPageContent({
  actorEmail,
  applications,
  definitions,
  fetchErrorStatus,
  spaceId,
  view,
}: SpaceApplicationsPageContentProps) {
  if (fetchErrorStatus !== undefined) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">
            申請一覧の取得に失敗しました（status: {fetchErrorStatus}）
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeView = parseApplicationListView(view);
  const visibleApplications = filterApplicationsByView(
    applications,
    activeView,
    actorEmail,
  );

  return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">申請一覧</h2>
            <p className="text-muted-foreground">
              申請作成画面で作成した申請定義と、提出済みの申請を確認できます
            </p>
          </div>
          <Button asChild>
            <Link href={buildSpaceApplicationNewHref(spaceId)}>新規申請</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>申請作成一覧</CardTitle>
            <CardDescription>
              {definitions.length}件の申請定義があります
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {definitions.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                申請作成データはまだありません
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>申請名</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>作成日時</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {definitions.map((definition) => (
                    <TableRow key={definition.id}>
                      <TableCell>
                        <div className="font-medium text-slate-900">
                          {definition.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            definition.status === APPLICATION_STATUSES.published
                              ? "default"
                              : "outline"
                          }
                        >
                          {definition.status === APPLICATION_STATUSES.published
                            ? "公開済み"
                            : "下書き"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {definition.createdAt
                          ? new Date(definition.createdAt).toLocaleString("ja-JP")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href="/space/application-setup">編集</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>申請一覧</CardTitle>
            <CardDescription>
              {visibleApplications.length}件の申請を表示しています
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ApplicationListViewTabs
              activeView={activeView}
              counts={{
                mine: filterApplicationsByView(
                  applications,
                  "mine",
                  actorEmail,
                ).length,
                review: filterApplicationsByView(
                  applications,
                  "review",
                  actorEmail,
                ).length,
                all: applications.length,
              }}
              spaceId={spaceId}
              status={APPLICATION_STATUSES.published}
            />
            {visibleApplications.length === 0 ? (
              <ApplicationEmptyState
                message={getApplicationEmptyMessage(activeView)}
                action={getApplicationEmptyAction(activeView, spaceId)}
              />
            ) : (
              <ApplicationListTable
                rows={visibleApplications}
                getDetailHref={(row) =>
                  buildSpaceApplicationDetailHref(row) ??
                  `/space/${encodeURIComponent(spaceId)}/applications/${encodeURIComponent(row.id)}`
                }
                showApplicantEmail
              />
            )}
          </CardContent>
        </Card>
      </div>
  );
}

function parseApplicationListView(view: string | undefined): ApplicationListView {
  if (
    view === APPLICATION_LIST_VIEWS.review ||
    view === APPLICATION_LIST_VIEWS.all
  ) {
    return view;
  }
  return APPLICATION_LIST_VIEWS.mine;
}

function filterApplicationsByView(
  rows: ApplicationRow[],
  view: ApplicationListView,
  actorEmail: string | undefined,
): ApplicationRow[] {
  if (view === APPLICATION_LIST_VIEWS.all) {
    return rows;
  }
  if (view === APPLICATION_LIST_VIEWS.review) {
    return rows.filter((row) => row.status === APPLICATION_STATUSES.inReview);
  }
  if (!actorEmail) {
    return [];
  }
  const normalizedActorEmail = actorEmail.toLowerCase();
  return rows.filter(
    (row) => row.applicantEmail.toLowerCase() === normalizedActorEmail,
  );
}

function getApplicationEmptyMessage(view: ApplicationListView): string {
  if (view === APPLICATION_LIST_VIEWS.review) {
    return "レビュー対象の申請はありません";
  }
  if (view === APPLICATION_LIST_VIEWS.all) {
    return "スペース内の申請はまだありません";
  }
  return "自分の申請はまだありません";
}

function getApplicationEmptyAction(
  view: ApplicationListView,
  spaceId: string,
): ReactNode {
  if (view === APPLICATION_LIST_VIEWS.review) {
    return undefined;
  }
  return (
    <Button asChild variant="outline">
      <Link href={buildSpaceApplicationNewHref(spaceId)}>新規申請</Link>
    </Button>
  );
}

function ApplicationListViewTabs({
  activeView,
  counts,
  spaceId,
  status,
}: {
  activeView: ApplicationListView;
  counts: Record<ApplicationListView, number>;
  spaceId: string;
  status: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {APPLICATION_LIST_VIEW_OPTIONS.map((tab) => {
        const isActive = activeView === tab.view;
        return (
          <Link
            key={tab.view}
            href={buildSpaceApplicationsViewHref(spaceId, {
              status,
              view: tab.view,
            })}
            className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-[13px] font-medium transition-colors ${
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {tab.label} ({counts[tab.view]})
          </Link>
        );
      })}
    </div>
  );
}

function buildSpaceApplicationsViewHref(
  spaceId: string,
  params: { status: string; view: ApplicationListView },
): string {
  const searchParams = new URLSearchParams();
  searchParams.set("view", params.view);
  searchParams.set("status", params.status);
  return `${buildSpaceApplicationsHref(spaceId)}?${searchParams.toString()}`;
}
