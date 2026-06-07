import { ApplicationSetupDraftForm } from "@/components/application-setup/application-setup-draft-form";
import { submitApplicationSetupAction } from "@/app/(authorized)/space/application-setup/actions";
import {
  APPLICATION_SETUP_ERROR_MESSAGES,
  APPLICATION_SETUP_STATUS_MESSAGES,
  APPLICATION_SETUP_STATUSES,
  type ApplicationSetupError,
  type ApplicationSetupStatus,
} from "@/lib/constants/application-setup";
import type { SpaceNewApplicationViewProps } from "./types";

function setupErrorMessage(error?: string): string | null {
  return error && error in APPLICATION_SETUP_ERROR_MESSAGES
    ? APPLICATION_SETUP_ERROR_MESSAGES[error as ApplicationSetupError]
    : null;
}

function setupErrorDetailMessage(detail?: string): string | null {
  return typeof detail === "string" && detail.trim().length > 0
    ? detail.trim()
    : null;
}

function setupStatusMessage(status?: string): string | null {
  return status && status in APPLICATION_SETUP_STATUS_MESSAGES
    ? APPLICATION_SETUP_STATUS_MESSAGES[status as ApplicationSetupStatus]
    : null;
}

export function SpaceNewApplicationView({
  assignees,
  canManageSpace,
  newApplicationHref,
  publishedFormDefinitionId,
  publishedGroupId,
  setupError,
  setupErrorDetail,
  setupStatus,
  spaceId,
}: SpaceNewApplicationViewProps) {
  return (
    <div className="space-y-6">
      {canManageSpace ? (
        <div className="space-y-4">
          <ApplicationSetupDraftForm
            action={submitApplicationSetupAction}
            assignees={assignees}
            errorMessage={
              [
                setupErrorMessage(setupError),
                setupErrorDetailMessage(setupErrorDetail),
              ]
                .filter(Boolean)
                .join(" ")
            }
            publishedGroupId={
              setupStatus === APPLICATION_SETUP_STATUSES.published
                ? publishedGroupId
                : null
            }
            publishedFormDefinitionId={
              setupStatus === APPLICATION_SETUP_STATUSES.published
                ? publishedFormDefinitionId
                : null
            }
            returnPath={newApplicationHref}
            spaceId={spaceId}
            statusMessage={setupStatusMessage(setupStatus)}
          />
        </div>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-muted-foreground">
          新規申請を作成するにはスペース管理者権限が必要です。
        </p>
      )}
    </div>
  );
}
