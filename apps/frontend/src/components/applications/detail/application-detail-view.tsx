import { ApprovalProgressDiagram } from "../approval-progress/approval-progress-diagram";
import { ApplicationStatusBadge } from "../status/application-status-badge";
import {
  ActionPanel,
  ApplicationBasicInfo,
  ApplicationFieldsCard,
  ApplicationSideSummary,
  CorrectionHistory,
  OpenCorrectionSummary,
  descriptionForFields,
  getCurrentStep,
} from "./application-detail-sections";
import { PublicApplicationUrlCopyButton } from "./public-application-url-card";
import type { ApplicationDetailViewProps } from "./application-detail.types";

export { ApprovalProgressDiagram } from "../approval-progress/approval-progress-diagram";

export function ApplicationDetailView({
  application,
  fields,
  fieldsTitle = "申請内容",
  fieldsDescription = "入力された値を確認できます",
  openCorrectionItems = [],
  corrections = [],
  actions,
  reviewerActions,
  formDetailHref,
  showApplicantEmail = false,
  showCurrentStep = false,
  showTimestamps = false,
  showCorrectionHistory = false,
  showOpenCorrectionSummary = false,
  publicApplicationUrlPath,
  canReturnApplication = false,
  returnAction,
}: ApplicationDetailViewProps) {
  const currentStep = getCurrentStep(application);
  const submittedAt = application.submittedAt ?? application.createdAt ?? null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ApplicationStatusBadge
          status={application.status}
          className="px-3 py-1 text-sm"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <ApplicationBasicInfo
            application={application}
            formDetailHref={formDetailHref}
            showApplicantEmail={showApplicantEmail}
            showCurrentStep={showCurrentStep}
            showTimestamps={showTimestamps}
          />

          <ApplicationFieldsCard
            application={application}
            fields={fields}
            title={fieldsTitle}
            description={descriptionForFields(fieldsDescription, fields.length)}
            openCorrectionItems={openCorrectionItems}
            canReturnApplication={canReturnApplication}
            returnAction={returnAction}
            decisionActions={reviewerActions}
          />

          <ApprovalProgressDiagram
            application={application}
            corrections={corrections}
            fields={fields}
            steps={application.approvalProgress ?? []}
          />

          {showOpenCorrectionSummary && openCorrectionItems.length > 0 ? (
            <OpenCorrectionSummary items={openCorrectionItems} />
          ) : null}

          {showCorrectionHistory ? (
            <CorrectionHistory
              corrections={corrections}
              fields={fields}
              values={application.values}
            />
          ) : null}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
          <ApplicationSideSummary
            application={application}
            currentStepName={currentStep?.stepName}
            submittedAt={submittedAt}
          />
          {actions ? <ActionPanel>{actions}</ActionPanel> : null}
          {publicApplicationUrlPath ? (
            <PublicApplicationUrlCopyButton path={publicApplicationUrlPath} />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
