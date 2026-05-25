import type { ReactNode } from "react";
import { renderFieldValue } from "@/lib/form-field-value";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApplicationStatusBadge } from "./application-status-badge";
import { PublicApplicationUrlCard } from "./public-application-url-card";
import type {
  ApplicationCorrection,
  ApplicationCorrectionTargetItem,
  ApplicationDetailViewModel,
  ApplicationDetailViewProps,
  ApplicationFormField,
} from "./application-detail.types";

export function ApplicationDetailView({
  title,
  description,
  application,
  fields,
  fieldsTitle = "申請内容",
  fieldsDescription = "入力された値を確認できます",
  openCorrectionItems = [],
  corrections = [],
  actions,
  reviewerActions,
  showApplicantEmail = false,
  showCurrentStep = false,
  showTimestamps = false,
  showCorrectionHistory = false,
  showOpenCorrectionSummary = false,
  publicApplicationUrlPath,
}: ApplicationDetailViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">
            {description ?? `ID: ${application.id.slice(0, 12)}...`}
          </p>
        </div>
        <ApplicationStatusBadge
          status={application.status}
          className="px-4 py-2 text-base"
        />
      </div>

      <ApplicationBasicInfo
        application={application}
        showApplicantEmail={showApplicantEmail}
        showCurrentStep={showCurrentStep}
        showTimestamps={showTimestamps}
      />

      {publicApplicationUrlPath ? (
        <PublicApplicationUrlCard path={publicApplicationUrlPath} />
      ) : null}

      <ApplicationFieldsCard
        application={application}
        fields={fields}
        title={fieldsTitle}
        description={fieldsDescription}
        openCorrectionItems={openCorrectionItems}
      />

      {actions}
      {reviewerActions}

      {showOpenCorrectionSummary && openCorrectionItems.length > 0 ? (
        <OpenCorrectionSummary items={openCorrectionItems} />
      ) : null}

      {showCorrectionHistory ? (
        <CorrectionHistory corrections={corrections} />
      ) : null}
    </div>
  );
}

function ApplicationBasicInfo({
  application,
  showApplicantEmail,
  showCurrentStep,
  showTimestamps,
}: {
  application: ApplicationDetailViewModel;
  showApplicantEmail: boolean;
  showCurrentStep: boolean;
  showTimestamps: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>基本情報</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {showApplicantEmail ? (
          <InfoRow
            label="申請者メール"
            value={application.applicantEmail ?? "-"}
            mono
          />
        ) : null}
        {showCurrentStep ? (
          <InfoRow
            label="現在のステップ"
            value={application.currentStepOrder ?? "-"}
          />
        ) : null}
        {showTimestamps && application.createdAt ? (
          <InfoRow
            label="作成日時"
            value={new Date(application.createdAt).toLocaleString("ja-JP")}
          />
        ) : null}
        {showTimestamps && application.updatedAt ? (
          <InfoRow
            label="更新日時"
            value={new Date(application.updatedAt).toLocaleString("ja-JP")}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono" : undefined}>{value}</span>
    </div>
  );
}

function ApplicationFieldsCard({
  application,
  fields,
  title,
  description,
  openCorrectionItems,
}: {
  application: ApplicationDetailViewModel;
  fields: ApplicationFormField[];
  title: string;
  description: string;
  openCorrectionItems: ApplicationCorrectionTargetItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden border border-slate-400 bg-white">
          <div className="border-b border-slate-400 bg-slate-100 px-3 py-2 text-center text-sm font-semibold text-slate-900">
            申請内容
          </div>
          <div className="divide-y divide-slate-300">
            {fields.map((field, index) => {
          const isCorrectionTarget = openCorrectionItems.some(
            (item) =>
              item.formFieldId === field.id || item.fieldKey === field.fieldKey,
          );
          return (
            <div
              key={field.id}
              className={`grid min-h-14 grid-cols-1 divide-y divide-slate-300 md:grid-cols-[180px_minmax(0,1fr)] md:divide-x md:divide-y-0 ${
                isCorrectionTarget
                  ? "bg-amber-50"
                  : "bg-white"
              }`}
            >
              <div className="flex items-start gap-2 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800">
                <span className="mt-0.5 min-w-5 text-xs text-slate-500">{index + 1}</span>
                <span className="break-words">{field.label}</span>
              </div>
              <div className="min-w-0 px-3 py-3 text-base">
                {renderFieldValue(field, application.values[field.fieldKey])}
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {field.fieldKey}
                </div>
                {isCorrectionTarget ? (
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    差し戻し対象項目です
                  </p>
                ) : null}
              </div>
            </div>
          );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OpenCorrectionSummary({
  items,
}: {
  items: ApplicationCorrectionTargetItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>現在オープン中の修正対象</CardTitle>
        <CardDescription>
          {items.length}個のフィールドが差し戻し対象となっています
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={`${item.formFieldId}-${item.fieldKey}`}
              className="flex items-center gap-2 border-l-2 border-amber-400 p-2 pl-3"
            >
              <Badge variant="outline">{item.label}</Badge>
              <span className="font-mono text-xs text-muted-foreground">
                ({item.fieldKey})
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function CorrectionHistory({
  corrections,
}: {
  corrections: ApplicationCorrection[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>差し戻し履歴</CardTitle>
        <CardDescription>
          {corrections.length === 0
            ? "差し戻し履歴はありません"
            : `${corrections.length}件の差し戻しがあります`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {corrections.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            差し戻し履歴はありません
          </p>
        ) : (
          <div className="space-y-4">
            {corrections.map((correction) => (
              <div
                key={correction.id}
                className="space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{correction.status}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(correction.createdAt).toLocaleString("ja-JP")}
                  </span>
                </div>
                {correction.overallComment ? (
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="mb-1 text-sm font-medium">総合コメント</p>
                    <p className="text-sm">{correction.overallComment}</p>
                  </div>
                ) : null}
                {correction.items.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-medium">個別コメント</p>
                    <ul className="space-y-1">
                      {correction.items.map((item) => (
                        <li
                          key={`${correction.id}-${item.fieldKey}`}
                          className="border-l-2 border-amber-400 pl-4 text-sm"
                        >
                          <span className="font-mono text-xs text-muted-foreground">
                            {item.fieldKey}:
                          </span>{" "}
                          {item.comment || "（コメントなし）"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
