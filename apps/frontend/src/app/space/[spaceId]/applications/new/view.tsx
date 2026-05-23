import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buildSpaceApplicationsHref } from "@/app/_components/applications/application-routes";
import { ApplicationSetupDraftForm } from "@/app/space/_components/application-setup-draft-form";
import { submitApplicationSetupAction } from "@/app/space/application-setup/actions";
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">申請作成</h2>
          <p className="text-muted-foreground">
            申請項目と承認ステップを設定し、新しい申請を作成します
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={buildSpaceApplicationsHref(spaceId)}>申請一覧へ戻る</Link>
        </Button>
      </div>

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
