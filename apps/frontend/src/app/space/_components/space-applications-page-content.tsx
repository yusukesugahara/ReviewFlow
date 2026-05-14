import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import { ApplicationEmptyState } from "@/app/_components/applications/application-empty-state";
import { ApplicationListTable } from "@/app/_components/applications/application-list-table";
import {
  buildSpaceApplicationDetailHref,
  buildSpaceApplicationNewHref,
} from "@/app/_components/applications/application-routes";

export type ApplicationRow = {
  applicationName?: string | null;
  formDefinitionId?: string | null;
  formDefinitionName?: string | null;
  id: string;
  groupId: string;
  status: string;
  applicantEmail: string;
  applicantUserId?: string | null;
  createdAt: string;
};

export type FormDefinitionRow = {
  id: string;
  groupId: string;
  name: string;
  description?: string | null;
  status: string;
  fields?: unknown[];
  createdAt: string;
  updatedAt: string;
};

type SpaceApplicationsPageContentProps = {
  applications: ApplicationRow[];
  formDefinitions: FormDefinitionRow[];
  fetchErrorStatus?: number;
  spaceId: string;
};

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
            申請一覧の取得に失敗しました（status: {fetchErrorStatus}）
          </p>
        </CardContent>
      </Card>
    );
  }

  const submittedApplications = applications.filter(
    (row) => !isFormSetupApplication(row),
  );
  const displayDefinitions =
    formDefinitions.length > 0
      ? formDefinitions
      : buildFallbackDefinitions(submittedApplications, spaceId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">申請一覧</h2>
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
          <CardTitle>作成した申請フォーム</CardTitle>
          <CardDescription>
            {displayDefinitions.length}件の申請フォームと、
            {submittedApplications.length}件の申請を表示しています
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {displayDefinitions.length === 0 ? (
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
            displayDefinitions.map((definition) => {
              const rows = submittedApplications.filter(
                (row) => row.formDefinitionId === definition.id,
              );
              return (
                <section
                  key={definition.id}
                  className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-950">
                          {definition.name}
                        </h3>
                        <FormDefinitionStatusBadge status={definition.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rows.length}件の申請 /{" "}
                        {definition.fields?.length ?? 0}項目
                      </p>
                    </div>
                    {definition.status === APPLICATION_STATUSES.published ? (
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={`/apply/${encodeURIComponent(definition.groupId)}?formDefinitionId=${encodeURIComponent(definition.id)}`}
                        >
                          公開URL
                        </Link>
                      </Button>
                    ) : null}
                  </div>

                  {rows.length === 0 ? (
                    <p className="rounded-md border border-dashed border-slate-200 px-3 py-6 text-sm text-muted-foreground">
                      この申請フォームには、まだ利用者からの申請がありません。
                    </p>
                  ) : (
                    <ApplicationListTable
                      rows={rows}
                      getDetailHref={(row) =>
                        buildSpaceApplicationDetailHref(row) ??
                        `/space/${encodeURIComponent(spaceId)}/applications/${encodeURIComponent(row.id)}`
                      }
                      showApplicantEmail
                    />
                  )}
                </section>
              );
            })
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
