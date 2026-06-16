import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarClock, ClipboardList, Route, UserRound } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { CardHeading } from "@/components/ui/card-heading";
import {
  formatApplicationDateTime,
  getCurrentStep,
} from "./application-detail-section-helpers";
import { ApplicationStatusBadge } from "../status/application-status-badge";
import type { ApplicationDetailViewModel } from "./application-detail.types";

export { ApplicationFieldsCard } from "./application-fields-card";
export {
  descriptionForFields,
  getCurrentStep,
} from "./application-detail-section-helpers";
export {
  CorrectionHistory,
  OpenCorrectionSummary,
} from "../corrections/application-correction-sections";

/**
 * 申請の基本情報セクションを表示します。
 */
export function ApplicationBasicInfo({
  application,
  formDetailHref,
}: {
  application: ApplicationDetailViewModel;
  formDetailHref?: string | null;
  showApplicantEmail: boolean;
  showCurrentStep: boolean;
  showTimestamps: boolean;
}) {
  const currentStep = getCurrentStep(application);
  const applicationStatus = currentStep
    ? `STEP ${currentStep.stepOrder}: ${currentStep.stepName}`
    : application.status;

  return (
    <Card>
      <CardHeader className="border-b border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardHeading
            description="申請の対象フォームと管理上の状態です"
            title="基本情報"
          />
          <ApplicationStatusBadge status={application.status} />
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryRow
            icon={<ClipboardList className="size-4" aria-hidden="true" />}
            label="申請フォーム"
            value={application.formDefinitionName ?? application.applicationName ?? "-"}
            href={formDetailHref}
            className="md:col-span-2 xl:col-span-1"
          />
          <SummaryRow
            icon={<Route className="size-4" aria-hidden="true" />}
            label="ステータス"
            value={applicationStatus}
          />
          <SummaryRow
            icon={<CalendarClock className="size-4" aria-hidden="true" />}
            label="作成日時"
            value={formatApplicationDateTime(application.createdAt)}
          />
          <SummaryRow
            icon={<CalendarClock className="size-4" aria-hidden="true" />}
            label="更新日時"
            value={formatApplicationDateTime(application.updatedAt)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 申請詳細のサイドサマリーを表示します。
 */
export function ApplicationSideSummary({
  application,
  currentStepName,
  submittedAt,
}: {
  application: ApplicationDetailViewModel;
  currentStepName?: string;
  submittedAt?: string | null;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-slate-200">
        <CardHeading title="申請サマリー" titleClassName="text-base" />
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <SummaryRow
          icon={<UserRound className="size-4" aria-hidden="true" />}
          label="申請者"
          value={application.applicantEmail ?? "-"}
          mono
        />
        <SummaryRow
          icon={<Route className="size-4" aria-hidden="true" />}
          label="現在のステップ"
          value={currentStepName ?? "完了または未開始"}
        />
        <SummaryRow
          icon={<CalendarClock className="size-4" aria-hidden="true" />}
          label="申請日時"
          value={formatApplicationDateTime(submittedAt)}
        />
      </CardContent>
    </Card>
  );
}

/**
 * サマリー内の 1 行を表示します。
 */
function SummaryRow({
  icon,
  label,
  value,
  href,
  mono = false,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string | null;
  mono?: boolean;
  className?: string;
}) {
  const text = (
    <span
      className={`break-words text-sm font-medium text-slate-900 ${
        mono ? "font-mono text-xs" : ""
      }`}
    >
      {value}
    </span>
  );

  return (
    <div className={`flex min-w-0 gap-3 ${className ?? ""}`}>
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
        {icon}
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {href ? (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-700 underline-offset-2 hover:underline"
          >
            {text}
          </Link>
        ) : (
          text
        )}
      </div>
    </div>
  );
}

/**
 * 申請詳細の操作パネルを表示します。
 */
export function ActionPanel({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="border-b border-slate-200">
        <CardHeading
          description="この申請に対して実行できる操作です"
          title="操作"
          titleClassName="text-base"
        />
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}
