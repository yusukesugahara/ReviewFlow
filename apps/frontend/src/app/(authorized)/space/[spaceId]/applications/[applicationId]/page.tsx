import { client } from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { isApiFailure } from "@/lib/server/api-failure";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import { getApplicationCapabilities } from "@/components/applications/application-capabilities";
import {
  approveAction,
  rejectAction,
  resendReturnEmailAction,
  resubmitAction,
  returnAction,
  submitAction,
  updateDescriptionAction,
} from "./actions";
import type {
  ApplicationCorrection,
  ApplicationCorrectionTargetItem,
  ApplicationDetailViewModel,
  ApplicationFormField,
} from "@/components/applications/application-detail.types";
import { buildSpaceApplicationEditHrefByIds } from "@/components/applications/application-routes";
import type {
  ApplicationSummary,
  FormDefinitionDetail,
  SpaceApplicationDetailPageProps,
} from "./types";
import {
  ApplicationDetailErrorView,
  ApplicationDetailScreen,
  FormDetailView,
} from "./view";

function hasRequiredValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

function getMissingRequiredFields(
  fields: ApplicationFormField[],
  values: Record<string, unknown>,
): ApplicationFormField[] {
  return fields.filter(
    (field) => field.required && !hasRequiredValue(values[field.fieldKey]),
  );
}

function isFormSetupStatus(status: string): boolean {
  return (
    status === APPLICATION_STATUSES.draft ||
    status === APPLICATION_STATUSES.published
  );
}

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
    const authHeaders = await authHeadersOrRedirect();
    const [appRaw, actor] = await Promise.all([
      client.GET("/applications/{id}", {
        params: { path: { id: applicationId } },
        headers: authHeaders,
      }),
      getCurrentSessionUser(),
    ]);
    if (!appRaw.response.ok || !appRaw.data) {
      throw { status: appRaw.response.status, body: appRaw.error };
    }
    const app = unwrapData<ApplicationDetailViewModel>(appRaw.data);
    const definitionId = app.formDefinitionId ?? query.definitionId;
    const [templateRaw, correctionsRaw, correctionTargetsRaw] = await Promise.all([
      definitionId
        ? client.GET("/form-definitions/{id}", {
            params: { path: { id: definitionId } },
            headers: authHeaders,
          })
        : client.GET("/form-definitions", {
            params: { query: { groupId: spaceId } },
            headers: authHeaders,
          }),
      client.GET("/applications/{id}/corrections", {
        params: { path: { id: applicationId } },
        headers: authHeaders,
      }),
      client.GET("/applications/{id}/correction-targets", {
        params: { path: { id: applicationId } },
        headers: authHeaders,
      }),
    ]);
    if (!templateRaw.response.ok || !templateRaw.data) {
      throw { status: templateRaw.response.status, body: templateRaw.error };
    }
    if (!correctionsRaw.response.ok || !correctionsRaw.data) {
      throw { status: correctionsRaw.response.status, body: correctionsRaw.error };
    }
    if (!correctionTargetsRaw.response.ok || !correctionTargetsRaw.data) {
      throw { status: correctionTargetsRaw.response.status, body: correctionTargetsRaw.error };
    }
    const definition = definitionId
      ? unwrapData<FormDefinitionDetail>(templateRaw.data)
      : (unwrapData<{ definitions?: { fields?: ApplicationFormField[] }[] }>(
          templateRaw.data,
        ).definitions?.[0] ?? null);
    const fields = definition?.fields ?? [];
    const corrections =
      unwrapData<{ corrections?: ApplicationCorrection[] }>(correctionsRaw.data)
        .corrections ?? [];
    const openItems =
      unwrapData<{
        openCorrection?: { items?: ApplicationCorrectionTargetItem[] } | null;
      }>(correctionTargetsRaw.data).openCorrection?.items ?? [];
    const capabilities = getApplicationCapabilities(app, actor);
    const fieldMap = fields.map((field) => ({ id: field.id, key: field.fieldKey }));
    const missingRequiredFields = getMissingRequiredFields(fields, app.values);
    const publicApplicationUrlPath = definitionId
      ? `/apply/${encodeURIComponent(spaceId)}?formDefinitionId=${encodeURIComponent(definitionId)}`
      : `/apply/${encodeURIComponent(spaceId)}`;
    const isFormDetail = isFormSetupStatus(app.status);

    if (isFormDetail) {
      const applicationsRaw = await client.GET("/applications", {
        params: { query: { groupId: spaceId } },
        headers: authHeaders,
      });
      if (!applicationsRaw.response.ok || !applicationsRaw.data) {
        throw { status: applicationsRaw.response.status, body: applicationsRaw.error };
      }
      const relatedApplications =
        unwrapData<{ applications?: ApplicationSummary[] }>(applicationsRaw.data)
          .applications?.filter(
            (row) =>
              row.formDefinitionId === definitionId &&
              !isFormSetupStatus(row.status),
          ) ?? [];
      const editHref = definitionId
        ? `${buildSpaceApplicationEditHrefByIds(
            spaceId,
            app.id,
          )}?definitionId=${encodeURIComponent(definitionId)}`
        : buildSpaceApplicationEditHrefByIds(spaceId, app.id);

      return (
        <FormDetailView
          application={app}
          definition={definition as FormDefinitionDetail | null}
          fields={fields}
          relatedApplications={relatedApplications}
          spaceId={spaceId}
          publicApplicationUrlPath={publicApplicationUrlPath}
          editHref={editHref}
          descriptionAction={updateDescriptionAction.bind(
            null,
            spaceId,
            app.id,
            definitionId ?? "",
          )}
        />
      );
    }

    let formDetailHref: string | null = null;
    if (definitionId) {
      const applicationsRaw = await client.GET("/applications", {
        params: { query: { groupId: spaceId } },
        headers: authHeaders,
      });
      if (applicationsRaw.response.ok && applicationsRaw.data) {
        const setupApplication =
          unwrapData<{ applications?: ApplicationSummary[] }>(
            applicationsRaw.data,
          ).applications?.find(
            (row) =>
              row.formDefinitionId === definitionId &&
              isFormSetupStatus(row.status),
          ) ?? null;
        if (setupApplication) {
          formDetailHref = `/space/${encodeURIComponent(
            spaceId,
          )}/applications/${encodeURIComponent(
            setupApplication.id,
          )}?${new URLSearchParams({
            view: "form",
            definitionId,
          }).toString()}`;
        }
      }
    }

    return (
      <ApplicationDetailScreen
        actionError={query.actionError}
        app={app}
        approveAction={approveAction.bind(null, spaceId, app.id)}
        capabilities={capabilities}
        corrections={corrections}
        definitionId={definitionId}
        fields={fields}
        formDetailHref={formDetailHref}
        isFormDetail={isFormDetail}
        missingRequiredFields={missingRequiredFields}
        openItems={openItems}
        rejectAction={rejectAction.bind(null, spaceId, app.id)}
        resendReturnEmailAction={resendReturnEmailAction.bind(null, spaceId, app.id)}
        resubmitAction={resubmitAction.bind(null, spaceId, app.id)}
        returnAction={returnAction.bind(null, spaceId, app.id, fieldMap)}
        spaceId={spaceId}
        submitAction={submitAction.bind(null, spaceId, app.id)}
      />
    );
  } catch (error) {
    if (isApiFailure(error)) {
      return <ApplicationDetailErrorView status={error.status} />;
    }
    return <ApplicationDetailErrorView />;
  }
}
