import { updateApplicationSetupAction } from "@/app/(authorized)/space/application-setup/actions";
import { isApiFailure } from "@/lib/server/api-failure";
import {
  APPLICATION_SETUP_ERROR_MESSAGES,
  type ApplicationSetupError,
} from "@/lib/constants/application-setup";
import { updateReturnedApplicationAction } from "./actions";
import { getSpaceApplicationEditPageData } from "./application-edit-page-data";
import type { SpaceApplicationEditPageProps } from "./types";
import {
  ReturnedApplicationCorrectionView,
  SpaceApplicationEditErrorView,
  SpaceApplicationEditUnavailableView,
  SpaceApplicationEditView,
} from "./view";

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

export default async function SpaceApplicationEditPage({
  params,
  searchParams,
}: SpaceApplicationEditPageProps) {
  const [{ spaceId, applicationId }, query] = await Promise.all([
    params,
    searchParams ??
      Promise.resolve({} as Awaited<NonNullable<SpaceApplicationEditPageProps["searchParams"]>>),
  ]);
  try {
    const data = await getSpaceApplicationEditPageData({
      applicationId,
      queryDefinitionId: query.definitionId,
      spaceId,
    });

    if (data.kind === "unavailable") {
      return <SpaceApplicationEditUnavailableView />;
    }

    if (data.kind === "returned") {
      return (
        <ReturnedApplicationCorrectionView
          action={updateReturnedApplicationAction.bind(
            null,
            spaceId,
            applicationId,
            data.detailPath,
            data.editPath,
          )}
          correctionError={query.correctionError}
          detailPath={data.detailPath}
          fields={data.fields}
          overallComment={data.overallComment}
          targets={data.targets}
        />
      );
    }

    return (
      <SpaceApplicationEditView
        action={updateApplicationSetupAction.bind(null, applicationId)}
        assignees={data.assignees}
        currentApprovalFlowId={data.currentApprovalFlowId}
        currentFormDefinitionId={data.currentFormDefinitionId}
        detailPath={data.detailPath}
        errorMessage={
          [
            setupErrorMessage(query.setupError),
            setupErrorDetailMessage(query.setupErrorDetail),
          ]
            .filter(Boolean)
            .join(" ")
        }
        initialFields={data.initialFields}
        initialName={data.initialName}
        initialSteps={data.initialSteps}
        publishedFormDefinitionId={data.publishedFormDefinitionId}
        returnPath={data.editPath}
        spaceId={spaceId}
      />
    );
  } catch (error) {
    if (isApiFailure(error)) {
      return <SpaceApplicationEditErrorView status={error.status} />;
    }
    return <SpaceApplicationEditErrorView />;
  }
}
