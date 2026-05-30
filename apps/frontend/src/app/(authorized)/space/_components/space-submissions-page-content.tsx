import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import { getApplicationStatusLabel } from "@/app/_components/applications/application-status";
import { ApplicationEmptyState } from "@/app/_components/applications/application-empty-state";
import { ApplicationListTable } from "@/app/_components/applications/application-list-table";
import { buildSpaceSubmissionDetailHref } from "@/app/_components/applications/application-routes";
import { SubmissionSearchSubmitButton } from "./submission-search-submit-button";
import type { ApplicationRow } from "./space-applications.types";

type SpaceSubmissionsPageContentProps = {
  applications: ApplicationRow[];
  fetchErrorStatus?: number;
  filters: SubmissionFilters;
  spaceId: string;
};

export function SpaceSubmissionsPageContent({
  applications,
  fetchErrorStatus,
  filters,
  spaceId,
}: SpaceSubmissionsPageContentProps) {
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

  const submittedApplications = applications.filter((row) => !isFormSetupApplication(row));
  const filteredApplications = filterApplications(submittedApplications, filters);
  const pendingApplications = filteredApplications.filter(isPendingApplication);
  const processedApplications = filteredApplications.filter(isProcessedApplication);
  const hasFilters =
    filters.applicant.length > 0 ||
    filters.createdFrom.length > 0 ||
    filters.createdTo.length > 0 ||
    filters.form.length > 0 ||
    filters.status.length > 0;
  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">申請一覧</h2>
          <p className="text-muted-foreground">
            利用者から届いた申請をステータスと申請者ごとに確認できます
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard label="対応が必要" value={pendingApplications.length} tone="amber" />
        <SummaryCard label="対応済み" value={processedApplications.length} tone="emerald" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Search className="h-5 w-5 text-slate-500" aria-hidden="true" />
            すべての申請
          </CardTitle>
          <CardDescription>
            申請者、ステータス、作成時期で申請を絞り込めます（{filteredApplications.length}件）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form className="space-y-4">
            <input type="hidden" name="page" value="1" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="applicant">申請者</Label>
                <Input
                  id="applicant"
                  name="applicant"
                  defaultValue={filters.applicant}
                  placeholder="メールアドレスで検索"
                />
              </div>
              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="form">申請フォーム</Label>
                <Input
                  id="form"
                  name="form"
                  defaultValue={filters.form}
                  placeholder="フォーム名で検索"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">ステータス</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={filters.status}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">すべて</option>
                  {SUBMISSION_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {getApplicationStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="createdFrom">作成日 From</Label>
                  <Input
                    id="createdFrom"
                    name="createdFrom"
                    type="date"
                    defaultValue={filters.createdFrom}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="createdTo">作成日 To</Label>
                  <Input
                    id="createdTo"
                    name="createdTo"
                    type="date"
                    defaultValue={filters.createdTo}
                  />
                </div>
              </div>
              <div className="flex gap-2">
              <SubmissionSearchSubmitButton />
              <Button asChild type="button" variant="outline">
                <Link href={`/space/${encodeURIComponent(spaceId)}/submissions`}>
                  クリア
                </Link>
              </Button>
              </div>
            </div>
          </form>

          <div className="border-t border-slate-200 pt-5">
          {filteredApplications.length === 0 ? (
            <ApplicationEmptyState
              message={hasFilters ? "条件に一致する申請はありません" : "申請はまだありません"}
            />
          ) : (
            <>
              <ApplicationListTable
                rows={paginatedApplications}
                actionLabel="詳細"
                openDetailInNewTab
                showApplicantEmail
                getDetailHref={(row) =>
                  buildSpaceSubmissionDetailHref(row) ??
                  `/space/${encodeURIComponent(spaceId)}/submissions/${encodeURIComponent(row.id)}`
                }
              />
              <PaginationControls
                currentPage={currentPage}
                filters={filters}
                pageSize={PAGE_SIZE}
                spaceId={spaceId}
                totalCount={filteredApplications.length}
                totalPages={totalPages}
              />
            </>
          )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type SubmissionFilters = {
  applicant: string;
  createdFrom: string;
  createdTo: string;
  form: string;
  page: number;
  status: string;
};

const PAGE_SIZE = 10;

const SUBMISSION_STATUS_OPTIONS = [
  APPLICATION_STATUSES.submitted,
  APPLICATION_STATUSES.inReview,
  APPLICATION_STATUSES.returned,
  APPLICATION_STATUSES.approved,
  APPLICATION_STATUSES.rejected,
];

function filterApplications(
  applications: ApplicationRow[],
  filters: SubmissionFilters,
): ApplicationRow[] {
  const applicant = filters.applicant.toLowerCase();
  const form = filters.form.toLowerCase();
  const createdFrom = parseDateStart(filters.createdFrom);
  const createdTo = parseDateEnd(filters.createdTo);

  return applications.filter((row) => {
    if (applicant && !row.applicantEmail?.toLowerCase().includes(applicant)) {
      return false;
    }
    if (form && !getApplicationFormSearchText(row).includes(form)) {
      return false;
    }
    if (filters.status && row.status !== filters.status) {
      return false;
    }

    const createdAt = new Date(row.createdAt).getTime();
    if (createdFrom !== null && createdAt < createdFrom) {
      return false;
    }
    if (createdTo !== null && createdAt > createdTo) {
      return false;
    }

    return true;
  });
}

function getApplicationFormSearchText(row: ApplicationRow): string {
  return [
    row.formDefinitionName,
    row.applicationName,
    row.formDefinitionId,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function parseDateStart(value: string): number | null {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function parseDateEnd(value: string): number | null {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function PaginationControls({
  currentPage,
  filters,
  pageSize,
  spaceId,
  totalCount,
  totalPages,
}: {
  currentPage: number;
  filters: SubmissionFilters;
  pageSize: number;
  spaceId: string;
  totalCount: number;
  totalPages: number;
}) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {start}-{end}件を表示 / 全{totalCount}件
      </p>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" disabled={currentPage <= 1}>
          <Link
            href={buildSubmissionsPageHref(spaceId, filters, currentPage - 1)}
            aria-disabled={currentPage <= 1}
            tabIndex={currentPage <= 1 ? -1 : undefined}
          >
            <ChevronLeft aria-hidden="true" />
            前へ
          </Link>
        </Button>
        <span className="min-w-20 text-center text-sm font-medium text-slate-700">
          {currentPage} / {totalPages}
        </span>
        <Button asChild variant="outline" size="sm" disabled={currentPage >= totalPages}>
          <Link
            href={buildSubmissionsPageHref(spaceId, filters, currentPage + 1)}
            aria-disabled={currentPage >= totalPages}
            tabIndex={currentPage >= totalPages ? -1 : undefined}
          >
            次へ
            <ChevronRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function buildSubmissionsPageHref(
  spaceId: string,
  filters: SubmissionFilters,
  page: number,
): string {
  const params = new URLSearchParams();
  if (filters.applicant) {
    params.set("applicant", filters.applicant);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.form) {
    params.set("form", filters.form);
  }
  if (filters.createdFrom) {
    params.set("createdFrom", filters.createdFrom);
  }
  if (filters.createdTo) {
    params.set("createdTo", filters.createdTo);
  }
  if (page > 1) {
    params.set("page", String(page));
  }

  const pathname = `/space/${encodeURIComponent(spaceId)}/submissions`;
  return params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald";
}) {
  const toneClassName =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-emerald-200 bg-emerald-50 text-emerald-900";

  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClassName}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function isFormSetupApplication(row: ApplicationRow): boolean {
  return (
    row.status === APPLICATION_STATUSES.draft ||
    row.status === APPLICATION_STATUSES.published
  );
}

function isPendingApplication(row: ApplicationRow): boolean {
  return (
    row.status === APPLICATION_STATUSES.submitted ||
    row.status === APPLICATION_STATUSES.inReview ||
    row.status === APPLICATION_STATUSES.returned
  );
}

function isProcessedApplication(row: ApplicationRow): boolean {
  return (
    row.status === APPLICATION_STATUSES.approved ||
    row.status === APPLICATION_STATUSES.rejected
  );
}
