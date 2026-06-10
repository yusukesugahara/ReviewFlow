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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import { getApplicationStatusLabel } from "@/components/applications/application-status";
import { ApplicationEmptyState } from "@/components/applications/application-empty-state";
import { ApplicationListTable } from "@/components/applications/application-list-table";
import { buildSpaceSubmissionDetailHref } from "@/components/applications/application-routes";
import type { ExportJobResponse } from "@/lib/schema";
import { SubmissionCsvExportControls } from "./submission-csv-export-controls";
import { SubmissionDateFilterPicker } from "./submission-date-filter-picker";
import { SubmissionSearchSubmitButton } from "./submission-search-submit-button";
import { SubmissionStatusFilterSelect } from "./submission-status-filter-select";
import type { ApplicationRow } from "@/components/space/space-applications.types";
import {
  buildExportFormOptions,
  buildSubmittedApplications,
  buildSubmissionsPageHref,
  buildSubmissionSummaryCounts,
  buildSummaryFilterHref,
  filterApplications,
  hasSubmissionFilters,
  paginateApplications,
  type SubmissionFilters,
} from "./space-submissions.helpers";

type SpaceSubmissionsPageContentProps = {
  applications: ApplicationRow[];
  currentUserId: string | null;
  fetchErrorStatus?: number;
  filters: SubmissionFilters;
  latestExportJob: ExportJobResponse | null;
  spaceId: string;
};

export function SpaceSubmissionsPageContent({
  applications,
  currentUserId,
  fetchErrorStatus,
  filters,
  latestExportJob,
  spaceId,
}: SpaceSubmissionsPageContentProps) {
  if (fetchErrorStatus !== undefined) {
    return (
      <Alert variant="destructive">
        <AlertTitle>申請一覧の取得に失敗しました</AlertTitle>
        <AlertDescription>status: {fetchErrorStatus}</AlertDescription>
      </Alert>
    );
  }

  const submittedApplications = buildSubmittedApplications(applications);
  const exportFormOptions = buildExportFormOptions(submittedApplications);
  const summaryCounts = buildSubmissionSummaryCounts(
    submittedApplications,
    currentUserId,
  );
  const filteredApplications = filterApplications(
    submittedApplications,
    filters,
    currentUserId,
  );
  const { currentPage, paginatedApplications, totalPages } = paginateApplications(
    filteredApplications,
    filters.page,
    PAGE_SIZE,
  );
  const hasFilters = hasSubmissionFilters(filters);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          href={buildSummaryFilterHref(spaceId, "myNeedsAction")}
          isActive={filters.summary === "myNeedsAction"}
          label="あなたの対応が必要"
          value={summaryCounts.myNeedsAction}
          tone="blue"
        />
        <SummaryCard
          href={buildSummaryFilterHref(spaceId, "spaceNeedsAction")}
          isActive={filters.summary === "spaceNeedsAction"}
          label="スペース内で対応が必要"
          value={summaryCounts.spaceNeedsAction}
          tone="amber"
        />
        <SummaryCard
          href={buildSummaryFilterHref(spaceId, "returned")}
          isActive={filters.summary === "returned"}
          label="差し戻し後、再申請待ち"
          value={summaryCounts.returned}
          tone="rose"
        />
        <SummaryCard
          href={buildSummaryFilterHref(spaceId, "recentProcessed")}
          isActive={filters.summary === "recentProcessed"}
          label="直近7日間に対応"
          value={summaryCounts.recentProcessed}
          tone="emerald"
        />
      </div>

      <Card>
        <CardHeader className="gap-3 border-b border-slate-200 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Search className="h-5 w-5 text-slate-500" aria-hidden="true" />
              すべての申請
            </CardTitle>
            <CardDescription>
              申請者、ステータス、作成時期で申請を絞り込めます（{filteredApplications.length}件）
            </CardDescription>
          </div>
          <SubmissionCsvExportControls
            exportFormOptions={exportFormOptions}
            latestExportJob={latestExportJob}
            spaceId={spaceId}
          />
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <form className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <input type="hidden" name="page" value="1" />
            {filters.summary ? (
              <input type="hidden" name="summary" value={filters.summary} />
            ) : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="applicant">申請者</Label>
                <Input
                  id="applicant"
                  name="applicant"
                  defaultValue={filters.applicant}
                  placeholder="メールアドレスで検索"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="form">申請フォーム</Label>
                <Input
                  id="form"
                  name="form"
                  defaultValue={filters.form}
                  placeholder="フォーム名で検索"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">ステータス</Label>
                <SubmissionStatusFilterSelect
                  defaultValue={filters.status}
                  options={SUBMISSION_STATUS_OPTIONS.map((status) => ({
                    label: getApplicationStatusLabel(status),
                    value: status,
                  }))}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="createdFrom">作成日 From</Label>
                <SubmissionDateFilterPicker
                  id="createdFrom"
                  name="createdFrom"
                  defaultValue={filters.createdFrom}
                />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="createdTo">作成日 To</Label>
                <SubmissionDateFilterPicker
                  id="createdTo"
                  name="createdTo"
                  defaultValue={filters.createdTo}
                />
                </div>
              </div>
              <div className="flex gap-2">
                <SubmissionSearchSubmitButton />
                <Button asChild type="button" variant="outline" className="bg-white">
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

const PAGE_SIZE = 10;

const SUBMISSION_STATUS_OPTIONS = [
  APPLICATION_STATUSES.submitted,
  APPLICATION_STATUSES.inReview,
  APPLICATION_STATUSES.returned,
  APPLICATION_STATUSES.approved,
  APPLICATION_STATUSES.rejected,
];

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
