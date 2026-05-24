import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import { ApplicationEmptyState } from "@/app/_components/applications/application-empty-state";
import {
  buildSpaceApplicationDetailHref,
  buildSpaceApplicationNewHref,
} from "@/app/_components/applications/application-routes";
import type {
  ApplicationRow,
  FormDefinitionRow,
  SpaceApplicationsPageContentProps,
} from "./space-applications.types";

export function SpaceApplicationsPageContent({
  applications,
  formDefinitions,
  fetchErrorStatus,
  spaceId,
}: SpaceApplicationsPageContentProps) {
  if (fetchErrorStatus !== undefined) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">
            申請フォーム一覧の取得に失敗しました（status: {fetchErrorStatus}）
          </p>
        </CardContent>
      </Card>
    );
  }

  const setupApplications = applications.filter(isFormSetupApplication);
  const submittedApplications = applications.filter((row) => !isFormSetupApplication(row));
  const displayDefinitions =
    formDefinitions.length > 0
      ? formDefinitions
      : buildFallbackDefinitions(submittedApplications, spaceId);
  const rows = displayDefinitions.map((definition) =>
    buildApplicationFormListRow(definition, applications, setupApplications, spaceId),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">申請フォーム一覧</h2>
          <p className="text-muted-foreground">
            作成した申請フォームごとに、利用者から届いた申請を確認できます
          </p>
        </div>
        <Button asChild>
          <Link href={buildSpaceApplicationNewHref(spaceId)}>新規申請</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>申請フォーム</CardTitle>
          <CardDescription>
            公開URLの確認やフォーム詳細を管理します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.length === 0 ? (
            <ApplicationEmptyState
              message="作成した申請フォームはまだありません"
              action={
                <Button asChild variant="outline">
                  <Link href={buildSpaceApplicationNewHref(spaceId)}>
                    新規申請
                  </Link>
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>申請タイトル</TableHead>
                  <TableHead>公開済み</TableHead>
                  <TableHead className="text-right">未処理</TableHead>
                  <TableHead className="text-right">処理済み</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.definitionId}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell>
                      <FormDefinitionStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.pendingCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.processedCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {row.detailHref ? (
                          <Button asChild variant="ghost" size="sm">
                            <Link href={row.detailHref}>フォーム詳細</Link>
                          </Button>
                        ) : null}
                      {row.publicHref ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={row.publicHref}>公開URL</Link>
                        </Button>
                      ) : (
                        <span className="self-center text-sm text-muted-foreground">未公開</span>
                      )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function isFormSetupApplication(row: ApplicationRow): boolean {
  return (
    row.status === APPLICATION_STATUSES.draft ||
    row.status === APPLICATION_STATUSES.published
  );
}

type ApplicationFormListRow = {
  definitionId: string;
  detailHref: string | null;
  pendingCount: number;
  processedCount: number;
  publicHref: string | null;
  status: string;
  title: string;
};

function buildApplicationFormListRow(
  definition: FormDefinitionRow,
  applications: ApplicationRow[],
  setupApplications: ApplicationRow[],
  spaceId: string,
): ApplicationFormListRow {
  const relatedApplications = applications.filter(
    (row) => row.formDefinitionId === definition.id && !isFormSetupApplication(row),
  );
  const setupApplication = setupApplications.find(
    (row) => row.formDefinitionId === definition.id,
  );
  const detailHref = setupApplication
    ? buildSpaceApplicationDetailHref(setupApplication) ??
      `/space/${encodeURIComponent(spaceId)}/applications/${encodeURIComponent(setupApplication.id)}`
    : null;
  const formDetailHref = detailHref ? appendQueryParam(detailHref, "view", "form") : null;
  const isPublished = definition.status === APPLICATION_STATUSES.published;

  return {
    definitionId: definition.id,
    detailHref: formDetailHref,
    pendingCount: relatedApplications.filter(isPendingApplicationStatus).length,
    processedCount: relatedApplications.filter(isProcessedApplicationStatus).length,
    publicHref: isPublished
      ? `/apply/${encodeURIComponent(definition.groupId || spaceId)}?formDefinitionId=${encodeURIComponent(definition.id)}`
      : null,
    status: definition.status,
    title: definition.name,
  };
}

function appendQueryParam(href: string, key: string, value: string): string {
  const [pathname, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set(key, value);
  return `${pathname}?${params.toString()}`;
}

function isPendingApplicationStatus(row: ApplicationRow): boolean {
  return (
    row.status === APPLICATION_STATUSES.submitted ||
    row.status === APPLICATION_STATUSES.inReview ||
    row.status === APPLICATION_STATUSES.returned
  );
}

function isProcessedApplicationStatus(row: ApplicationRow): boolean {
  return (
    row.status === APPLICATION_STATUSES.approved ||
    row.status === APPLICATION_STATUSES.rejected
  );
}

function buildFallbackDefinitions(
  rows: ApplicationRow[],
  spaceId: string,
): FormDefinitionRow[] {
  const definitions = new Map<string, FormDefinitionRow>();
  for (const row of rows) {
    const id = row.formDefinitionId;
    if (!id || definitions.has(id)) {
      continue;
    }
    definitions.set(id, {
      id,
      groupId: row.groupId || spaceId,
      name: row.formDefinitionName?.trim() || row.applicationName?.trim() || "-",
      status: APPLICATION_STATUSES.published,
      fields: [],
      createdAt: row.createdAt,
      updatedAt: row.createdAt,
    });
  }
  return Array.from(definitions.values());
}

function FormDefinitionStatusBadge({ status }: { status: string }) {
  const isPublished = status === APPLICATION_STATUSES.published;
  const label = isPublished
    ? "公開済み"
    : status === APPLICATION_STATUSES.draft
      ? "下書き"
      : status;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${
        isPublished
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      {label}
    </span>
  );
}
