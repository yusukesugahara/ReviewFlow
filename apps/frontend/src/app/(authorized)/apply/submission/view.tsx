import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DynamicFieldsTable } from "@/components/applications/dynamic-fields/dynamic-fields";
import { renderFieldValue } from "@/lib/form-field-value";
import { formatDateTimeJa } from "@/lib/date-format";
import type {
  ApplicationDetail,
  FormDefinitionResponse,
} from "@/lib/schema";

type PublicSubmissionViewProps = {
  application: ApplicationDetail;
  definition: FormDefinitionResponse;
};

/**
 * 申請者向け申請詳細画面を表示します。
 */
export function PublicSubmissionView({
  application,
  definition,
}: PublicSubmissionViewProps) {
  const submittedAt = application.submittedAt ?? application.createdAt ?? null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-2xl">申請内容</CardTitle>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-medium text-slate-500">申請日時</p>
                <p className="text-sm font-medium text-slate-900">
                  {submittedAt ? formatDateTimeJa(submittedAt) : "-"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <DynamicFieldsTable
              fields={definition.fields}
              values={application.values}
              title="申請書"
              renderValue={(field, value) => (
                <p className="whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-950">
                  {renderFieldValue(field, value)}
                </p>
              )}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

/**
 * 申請者向け申請詳細画面のエラー状態を表示します。
 */
export function PublicSubmissionErrorView({ status }: { status?: number }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-xl border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>申請内容を表示できません</CardTitle>
          <CardDescription>
            {status
              ? `申請内容の取得に失敗しました（status: ${status}）`
              : "申請内容の取得に失敗しました"}
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
