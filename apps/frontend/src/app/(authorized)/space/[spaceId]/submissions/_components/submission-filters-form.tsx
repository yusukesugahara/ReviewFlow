import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApplicationStatusLabel } from "@/components/applications/status/application-status";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import { SubmissionDateFilterPicker } from "./submission-date-filter-picker";
import { SubmissionSearchSubmitButton } from "./submission-search-submit-button";
import { SubmissionStatusFilterSelect } from "./submission-status-filter-select";
import type { SubmissionFilters } from "./space-submissions.helpers";

const SUBMISSION_STATUS_OPTIONS = [
  APPLICATION_STATUSES.submitted,
  APPLICATION_STATUSES.inReview,
  APPLICATION_STATUSES.returned,
  APPLICATION_STATUSES.approved,
  APPLICATION_STATUSES.rejected,
];

type SubmissionFiltersFormProps = {
  filters: SubmissionFilters;
  spaceId: string;
};

export function SubmissionFiltersForm({
  filters,
  spaceId,
}: SubmissionFiltersFormProps) {
  return (
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
  );
}
