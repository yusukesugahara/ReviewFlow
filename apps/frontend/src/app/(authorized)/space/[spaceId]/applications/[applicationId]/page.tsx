import { isApiFailure } from "@/lib/server/api-failure";
import {
  approveAction,
  rejectAction,
  resendReturnEmailAction,
  resubmitAction,
  returnAction,
  submitAction,
  updateDescriptionAction,
} from "./actions";
import { getSpaceApplicationDetailPageData } from "./_data/application-detail-page-data";
import type { SpaceApplicationDetailPageProps } from "./types";
import {
  ApplicationDetailErrorView,
  ApplicationDetailScreen,
  FormDetailView,
} from "./view";

/**
 * 申請詳細またはフォーム詳細画面のデータを読み込んで表示します。
 */
export default async function SpaceApplicationDetailPage({
  params,
  searchParams,
}: SpaceApplicationDetailPageProps) {
  const [{ spaceId, applicationId }, query] = await Promise.all([
    params,
    searchParams ??
      Promise.resolve({} as { actionError?: string; definitionId?: string }),
  ]);

  try {
    const data = await getSpaceApplicationDetailPageData({
      applicationId,
      queryDefinitionId: query.definitionId,
      spaceId,
    });

    if (data.kind === "form") {
      return (
        <FormDetailView
          application={data.application}
          definition={data.definition}
          fields={data.fields}
          relatedApplications={data.relatedApplications}
          spaceId={spaceId}
          publicApplicationUrlPath={data.publicApplicationUrlPath}
          editHref={data.editHref}
          descriptionAction={updateDescriptionAction.bind(
            null,
            spaceId,
            data.application.id,
            data.definitionId ?? "",
          )}
        />
      );
    }

    return (
      <ApplicationDetailScreen
        actionError={query.actionError}
        app={data.application}
        approveAction={approveAction.bind(null, spaceId, data.application.id)}
        capabilities={data.capabilities}
        corrections={data.corrections}
        correctedFieldKeys={data.correctedFieldKeys}
        definitionId={data.definitionId}
        fields={data.fields}
        formDetailHref={data.formDetailHref}
        isFormDetail={false}
        missingRequiredFields={data.missingRequiredFields}
        openItems={data.openItems}
        rejectAction={rejectAction.bind(null, spaceId, data.application.id)}
        resendReturnEmailAction={resendReturnEmailAction.bind(
          null,
          spaceId,
          data.application.id,
        )}
        resubmissionMessages={data.resubmissionMessages}
        resubmitAction={resubmitAction.bind(null, spaceId, data.application.id)}
        returnAction={returnAction.bind(
          null,
          spaceId,
          data.application.id,
          data.fieldMap,
        )}
        spaceId={spaceId}
        submitAction={submitAction.bind(null, spaceId, data.application.id)}
      />
    );
  } catch (error) {
    if (isApiFailure(error)) {
      return <ApplicationDetailErrorView status={error.status} />;
    }
    return <ApplicationDetailErrorView />;
  }
}
