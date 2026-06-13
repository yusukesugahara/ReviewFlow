import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApplicantApplicationActions } from "@/components/applications/actions/applicant-application-actions";
import {
  ApplicationDetailView,
} from "@/components/applications/detail/application-detail-view";
import { ReviewerApplicationActions } from "@/components/applications/actions/reviewer-application-actions";
import { buildSpaceApplicationEditHrefByIds } from "@/components/applications/routing/application-routes";
import { isReturnedApplicationStatus } from "@/components/applications/status/application-status-rules";
import type {
  ApplicationCorrection,
  ApplicationCorrectionTargetItem,
  ApplicationDetailViewModel,
  ApplicationFormField,
} from "@/components/applications/detail/application-detail.types";
import type { ApplicationCapabilities } from "@/components/applications/actions/application-capabilities";

type ApplicationDetailScreenProps = {
  actionError?: string;
  app: ApplicationDetailViewModel;
  approveAction: (formData: FormData) => Promise<void>;
  capabilities: ApplicationCapabilities;
  corrections: ApplicationCorrection[];
  definitionId?: string;
  fields: ApplicationFormField[];
  formDetailHref?: string | null;
  isFormDetail: boolean;
  missingRequiredFields: ApplicationFormField[];
  openItems: ApplicationCorrectionTargetItem[];
  rejectAction: (formData: FormData) => Promise<void>;
  resendReturnEmailAction: () => Promise<void>;
  resubmitAction: () => Promise<void>;
  returnAction: (formData: FormData) => Promise<void>;
  spaceId: string;
  submitAction: () => Promise<void>;
};

export function ApplicationDetailScreen({
  actionError,
  app,
  approveAction,
  capabilities,
  corrections,
  definitionId,
  fields,
  formDetailHref,
  isFormDetail,
  missingRequiredFields,
  openItems,
  rejectAction,
  resendReturnEmailAction,
  resubmitAction,
  returnAction,
  spaceId,
  submitAction,
}: ApplicationDetailScreenProps) {
  const actionCapabilities = {
    ...capabilities,
    canSubmitApplication:
      capabilities.canSubmitApplication && missingRequiredFields.length === 0,
  };
  const editHref = buildSpaceApplicationEditHrefByIds(
    spaceId,
    app.id,
    definitionId,
  );
  const canResendReturnEmail =
    isReturnedApplicationStatus(app.status) && openItems.length > 0;

  return (
    <ApplicationDetailView
      title={isFormDetail ? "フォーム詳細画面" : "申請詳細"}
      description={
        isFormDetail
          ? "利用者に公開する申請フォームの項目、公開URL、公開状態を確認できます"
          : undefined
      }
      application={app}
      fields={fields}
      fieldsTitle={isFormDetail ? "フォーム項目" : undefined}
      fieldsDescription={
        isFormDetail
          ? "利用者が申請時に入力する項目を確認できます"
          : undefined
      }
      openCorrectionItems={openItems}
      corrections={corrections}
      formDetailHref={formDetailHref}
      showApplicantEmail
      showCurrentStep
      showTimestamps
      showCorrectionHistory
      showOpenCorrectionSummary
      canReturnApplication={capabilities.canReturnApplication}
      returnAction={returnAction}
      actions={
        <div className="space-y-3">
          {actionError ? (
            <Alert variant="destructive">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <ApplicantApplicationActions
              capabilities={actionCapabilities}
              editHref={editHref}
              canResendReturnEmail={canResendReturnEmail}
              resendReturnEmailAction={resendReturnEmailAction}
              submitAction={submitAction}
              resubmitAction={resubmitAction}
            />
          </div>
          {capabilities.canSubmitApplication &&
          missingRequiredFields.length > 0 ? (
            <Alert variant="warning">
              <AlertDescription>
                必須項目が未入力のため提出できません。必要な入力値を登録してから提出してください。
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      }
      reviewerActions={
        <ReviewerApplicationActions
          capabilities={capabilities}
          approveAction={approveAction}
          rejectAction={rejectAction}
        />
      }
    />
  );
}
