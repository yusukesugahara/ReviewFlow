import "server-only";

import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import { getApplicationCapabilities } from "@/components/applications/application-capabilities";
import type { ApplicationCapabilities } from "@/components/applications/application-capabilities";
import { buildSpaceApplicationEditHrefByIds } from "@/components/applications/application-routes";
import type {
  ApplicationCorrection,
  ApplicationCorrectionTargetItem,
  ApplicationDetailViewModel,
  ApplicationFormField,
} from "@/components/applications/application-detail.types";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/server/backend-fetch";
import type {
  ApplicationSummary,
  FormDefinitionDetail,
} from "./types";

type AuthHeaders = { Authorization: string };

type ApplicationDetailBaseData = {
  application: ApplicationDetailViewModel;
  definitionId?: string;
  fields: ApplicationFormField[];
};

export type FormDetailPageData = ApplicationDetailBaseData & {
  kind: "form";
  definition: FormDefinitionDetail | null;
  editHref: string;
  publicApplicationUrlPath: string;
  relatedApplications: ApplicationSummary[];
};

export type ApplicationDetailPageData = ApplicationDetailBaseData & {
  kind: "application";
  capabilities: ApplicationCapabilities;
  corrections: ApplicationCorrection[];
  fieldMap: Array<{ id: string; key: string }>;
  formDetailHref: string | null;
  missingRequiredFields: ApplicationFormField[];
  openItems: ApplicationCorrectionTargetItem[];
};

export type SpaceApplicationDetailPageData =
  | FormDetailPageData
  | ApplicationDetailPageData;

export async function getSpaceApplicationDetailPageData({
  applicationId,
  queryDefinitionId,
  spaceId,
}: {
  applicationId: string;
  queryDefinitionId?: string;
  spaceId: string;
}): Promise<SpaceApplicationDetailPageData> {
  const authHeaders = await authHeadersOrRedirect();
  const [applicationRaw, actor] = await Promise.all([
    client.GET("/applications/{id}", {
      params: { path: { id: applicationId } },
      headers: authHeaders,
    }),
    getCurrentSessionUser(),
  ]);
  const application = unwrapResponseData<ApplicationDetailViewModel>(applicationRaw);
  const definitionId = application.formDefinitionId ?? queryDefinitionId;

  const [definition, corrections, openItems] = await Promise.all([
    getFormDefinition({ authHeaders, definitionId, spaceId }),
    getApplicationCorrections({ applicationId, authHeaders }),
    getOpenCorrectionItems({ applicationId, authHeaders }),
  ]);
  const fields = definition?.fields ?? [];

  if (isFormSetupStatus(application.status)) {
    const relatedApplications = await getRelatedSubmittedApplications({
      authHeaders,
      definitionId,
      spaceId,
    });
    return {
      kind: "form",
      application,
      definition,
      definitionId,
      editHref: buildFormSetupEditHref({ applicationId: application.id, definitionId, spaceId }),
      fields,
      publicApplicationUrlPath: buildPublicApplicationUrlPath({
        definitionId,
        spaceId,
      }),
      relatedApplications,
    };
  }

  return {
    kind: "application",
    application,
    capabilities: getApplicationCapabilities(application, actor),
    corrections,
    definitionId,
    fieldMap: fields.map((field) => ({ id: field.id, key: field.fieldKey })),
    fields,
    formDetailHref: await getFormDetailHref({
      authHeaders,
      definitionId,
      spaceId,
    }),
    missingRequiredFields: getMissingRequiredFields(fields, application.values),
    openItems,
  };
}

async function getFormDefinition({
  authHeaders,
  definitionId,
  spaceId,
}: {
  authHeaders: AuthHeaders;
  definitionId?: string;
  spaceId: string;
}): Promise<FormDefinitionDetail | null> {
  const definitionRaw = definitionId
    ? await client.GET("/form-definitions/{id}", {
        params: { path: { id: definitionId } },
        headers: authHeaders,
      })
    : await client.GET("/form-definitions", {
        params: { query: { groupId: spaceId } },
        headers: authHeaders,
      });

  return definitionId
    ? unwrapResponseData<FormDefinitionDetail>(definitionRaw)
    : (unwrapResponseData<{
        definitions?: FormDefinitionDetail[];
      }>(definitionRaw).definitions?.[0] ?? null);
}

async function getApplicationCorrections({
  applicationId,
  authHeaders,
}: {
  applicationId: string;
  authHeaders: AuthHeaders;
}): Promise<ApplicationCorrection[]> {
  const correctionsRaw = await client.GET("/applications/{id}/corrections", {
    params: { path: { id: applicationId } },
    headers: authHeaders,
  });
  return (
    unwrapResponseData<{ corrections?: ApplicationCorrection[] }>(correctionsRaw)
      .corrections ?? []
  );
}

async function getOpenCorrectionItems({
  applicationId,
  authHeaders,
}: {
  applicationId: string;
  authHeaders: AuthHeaders;
}): Promise<ApplicationCorrectionTargetItem[]> {
  const correctionTargetsRaw = await client.GET(
    "/applications/{id}/correction-targets",
    {
      params: { path: { id: applicationId } },
      headers: authHeaders,
    },
  );
  return (
    unwrapResponseData<{
      openCorrection?: { items?: ApplicationCorrectionTargetItem[] } | null;
    }>(correctionTargetsRaw).openCorrection?.items ?? []
  );
}

async function getRelatedSubmittedApplications({
  authHeaders,
  definitionId,
  spaceId,
}: {
  authHeaders: AuthHeaders;
  definitionId?: string;
  spaceId: string;
}): Promise<ApplicationSummary[]> {
  const applications = await getSpaceApplications({ authHeaders, spaceId });
  return applications.filter(
    (row) =>
      row.formDefinitionId === definitionId && !isFormSetupStatus(row.status),
  );
}

async function getFormDetailHref({
  authHeaders,
  definitionId,
  spaceId,
}: {
  authHeaders: AuthHeaders;
  definitionId?: string;
  spaceId: string;
}): Promise<string | null> {
  if (!definitionId) {
    return null;
  }

  const applications = await getSpaceApplicationsIfAvailable({
    authHeaders,
    spaceId,
  });
  const setupApplication =
    applications.find(
      (row) =>
        row.formDefinitionId === definitionId && isFormSetupStatus(row.status),
    ) ?? null;

  return setupApplication
    ? buildFormDetailHref({ applicationId: setupApplication.id, definitionId, spaceId })
    : null;
}

async function getSpaceApplications({
  authHeaders,
  spaceId,
}: {
  authHeaders: AuthHeaders;
  spaceId: string;
}): Promise<ApplicationSummary[]> {
  const applicationsRaw = await client.GET("/applications", {
    params: { query: { groupId: spaceId } },
    headers: authHeaders,
  });
  return (
    unwrapResponseData<{ applications?: ApplicationSummary[] }>(applicationsRaw)
      .applications ?? []
  );
}

async function getSpaceApplicationsIfAvailable({
  authHeaders,
  spaceId,
}: {
  authHeaders: AuthHeaders;
  spaceId: string;
}): Promise<ApplicationSummary[]> {
  const applicationsRaw = await client.GET("/applications", {
    params: { query: { groupId: spaceId } },
    headers: authHeaders,
  });
  if (!applicationsRaw.response.ok || !applicationsRaw.data) {
    return [];
  }
  return (
    unwrapResponseData<{ applications?: ApplicationSummary[] }>(applicationsRaw)
      .applications ?? []
  );
}

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

function buildPublicApplicationUrlPath({
  definitionId,
  spaceId,
}: {
  definitionId?: string;
  spaceId: string;
}): string {
  return definitionId
    ? `/apply/${encodeURIComponent(spaceId)}?formDefinitionId=${encodeURIComponent(definitionId)}`
    : `/apply/${encodeURIComponent(spaceId)}`;
}

function buildFormSetupEditHref({
  applicationId,
  definitionId,
  spaceId,
}: {
  applicationId: string;
  definitionId?: string;
  spaceId: string;
}): string {
  const editHref = buildSpaceApplicationEditHrefByIds(spaceId, applicationId);
  return definitionId
    ? `${editHref}?definitionId=${encodeURIComponent(definitionId)}`
    : editHref;
}

function buildFormDetailHref({
  applicationId,
  definitionId,
  spaceId,
}: {
  applicationId: string;
  definitionId: string;
  spaceId: string;
}): string {
  return `/space/${encodeURIComponent(spaceId)}/applications/${encodeURIComponent(
    applicationId,
  )}?${new URLSearchParams({
    view: "form",
    definitionId,
  }).toString()}`;
}
