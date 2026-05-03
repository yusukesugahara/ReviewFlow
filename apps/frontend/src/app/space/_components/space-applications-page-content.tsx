import type { ReactNode } from "react";
import Link from "next/link";
import {
  backendAuthFetchJson,
  BackendHttpError,
} from "@/lib/server/backend-auth-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
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
import { ApplicationEmptyState } from "@/features/applications/application-empty-state";
import { ApplicationListTable } from "@/features/applications/application-list-table";
import {
  buildSpaceApplicationDetailHref,
  buildSpaceApplicationNewHref,
  buildSpaceApplicationsHref,
} from "@/features/applications/application-routes";
import { getCurrentSessionUser } from "@/lib/server/session";

type FormDefinitionRow = {
  id: string;
  name: string;
  status: string;
  createdAt?: string;
};

type ApplicationRow = {
  id: string;
  groupId: string;
  status: string;
  applicantEmail: string;
  createdAt: string;
};

type ApplicationListView = "mine" | "review" | "all";

type SpaceApplicationsPageContentProps = {
  spaceId: string;
  status?: string;
  view?: string;
};

export async function SpaceApplicationsPageContent({
  spaceId,
  status,
  view,
}: SpaceApplicationsPageContentProps) {
  try {
    const activeView = parseApplicationListView(view);
    const [definitionsRaw, applicationsRaw, actor] = await Promise.all([
      backendAuthFetchJson(
        `/form-definitions?groupId=${encodeURIComponent(spaceId)}`,
      ),
      backendAuthFetchJson(`/applications?groupId=${encodeURIComponent(spaceId)}`),
      getCurrentSessionUser(),
    ]);

    const definitions =
      unwrapData<{ definitions?: FormDefinitionRow[] }>(definitionsRaw).definitions ?? [];
    const applicationRows =
      unwrapData<{ applications?: ApplicationRow[] }>(applicationsRaw)
        .applications ?? [];

    const visibleApplications = filterApplicationsByView(
      applicationRows,
      activeView,
      actor?.email,
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
                            definition.status === "published" ? "default" : "outline"
                          }
                        >
                          {definition.status === "published" ? "公開済み" : "下書き"}
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
                  applicationRows,
                  "mine",
                  actor?.email,
                ).length,
                review: filterApplicationsByView(
                  applicationRows,
                  "review",
                  actor?.email,
                ).length,
                all: applicationRows.length,
              }}
              spaceId={spaceId}
              status="published"
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
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              申請一覧の取得に失敗しました（status: {error.status}）
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">申請一覧の取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }
}

function parseApplicationListView(view: string | undefined): ApplicationListView {
  if (view === "review" || view === "all") {
    return view;
  }
  return "mine";
}

function filterApplicationsByView(
  rows: ApplicationRow[],
  view: ApplicationListView,
  actorEmail: string | undefined,
): ApplicationRow[] {
  if (view === "all") {
    return rows;
  }
  if (view === "review") {
    return rows.filter((row) => row.status === "in_review");
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
  if (view === "review") {
    return "レビュー対象の申請はありません";
  }
  if (view === "all") {
    return "スペース内の申請はまだありません";
  }
  return "自分の申請はまだありません";
}

function getApplicationEmptyAction(
  view: ApplicationListView,
  spaceId: string,
): ReactNode {
  if (view === "review") {
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
  const tabs: { view: ApplicationListView; label: string }[] = [
    { view: "mine", label: "自分の申請" },
    { view: "review", label: "レビュー対象" },
    { view: "all", label: "すべて" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => {
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
