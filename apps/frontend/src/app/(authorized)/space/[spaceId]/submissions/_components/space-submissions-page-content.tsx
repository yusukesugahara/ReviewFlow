import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { CardHeading } from "@/components/ui/card-heading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApplicationEmptyState } from "@/components/applications/list/application-empty-state";
import { ApplicationListTable } from "@/components/applications/list/application-list-table";
import { buildSpaceSubmissionDetailHref } from "@/components/applications/routing/application-routes";
import type { ExportJobResponse } from "@/lib/schema";
import { SubmissionCsvExportControls } from "./submission-csv-export-controls";
import { SubmissionFiltersForm } from "./submission-filters-form";
import { SubmissionPaginationControls } from "./submission-pagination-controls";
import { SubmissionSummaryCards } from "./submission-summary-cards";
import type { ApplicationRow } from "@/components/space/space-applications.types";
import {
  buildExportFormOptions,
  buildSubmittedApplications,
  buildSubmissionSummaryCounts,
  filterApplications,
  hasSubmissionFilters,
  paginateApplications,
  type SubmissionFilters,
} from "../_utils/space-submissions.helpers";

type SpaceSubmissionsPageContentProps = {
  applications: ApplicationRow[];
  currentUserId: string | null;
  fetchErrorStatus?: number;
  filters: SubmissionFilters;
  latestExportJob: ExportJobResponse | null;
  spaceId: string;
};

/**
 * 提出一覧のフィルター、CSV 出力、一覧表示をまとめて表示します。
 */
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
      <SubmissionSummaryCards
        activeSummary={filters.summary}
        counts={summaryCounts}
        spaceId={spaceId}
      />

      <Card>
        <CardHeader className="gap-3 border-b border-slate-200 sm:flex-row sm:items-start sm:justify-between">
          <CardHeading
            description="申請者、ステータス、作成時期で申請を絞り込めます"
            title="すべての申請"
          />
          <SubmissionCsvExportControls
            exportFormOptions={exportFormOptions}
            latestExportJob={latestExportJob}
            spaceId={spaceId}
          />
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <SubmissionFiltersForm filters={filters} spaceId={spaceId} />

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
                <SubmissionPaginationControls
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
