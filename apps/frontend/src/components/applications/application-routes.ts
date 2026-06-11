export type ApplicationSpaceRouteSource = {
  formDefinitionId?: string | null;
  id: string;
  groupId?: string | null;
};

export type ApplicationRouteQueryParams = Record<
  string,
  boolean | number | string | null | undefined
>;

export function getApplicationSpaceId(
  application: ApplicationSpaceRouteSource,
): string | null {
  return application.groupId ?? null;
}

export function appendQueryParams(
  href: string,
  params: ApplicationRouteQueryParams,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    query.set(key, String(value));
  }

  const queryString = query.toString();
  if (!queryString) {
    return href;
  }
  return `${href}${href.includes("?") ? "&" : "?"}${queryString}`;
}

export function buildApplyFormHref(
  spaceId: string,
  formDefinitionId?: string | null,
): string {
  return appendQueryParams(`/apply/${encodeURIComponent(spaceId)}`, {
    formDefinitionId,
  });
}

export function buildSpaceApplicationsHref(
  spaceId: string,
  params: ApplicationRouteQueryParams = {},
): string {
  return appendQueryParams(
    `/space/${encodeURIComponent(spaceId)}/applications`,
    params,
  );
}

export function buildSpaceApplicationNewHref(spaceId: string): string {
  return `${buildSpaceApplicationsHref(spaceId)}/new`;
}

export function buildSpaceApplicationDetailHrefByIds(
  spaceId: string,
  applicationId: string,
  formDefinitionId?: string | null,
): string {
  return appendQueryParams(
    `${buildSpaceApplicationsHref(spaceId)}/${encodeURIComponent(applicationId)}`,
    { definitionId: formDefinitionId },
  );
}

export function buildSpaceApplicationDetailHref(
  application: ApplicationSpaceRouteSource,
): string | null {
  const spaceId = getApplicationSpaceId(application);
  if (!spaceId) {
    return null;
  }

  return buildSpaceApplicationDetailHrefByIds(
    spaceId,
    application.id,
    application.formDefinitionId,
  );
}

export function buildSpaceApplicationFormDetailHref({
  applicationId,
  definitionId,
  spaceId,
}: {
  applicationId: string;
  definitionId: string;
  spaceId: string;
}): string {
  return appendQueryParams(
    buildSpaceApplicationDetailHrefByIds(spaceId, applicationId),
    { view: "form", definitionId },
  );
}

export function buildSpaceSubmissionsHref(
  spaceId: string,
  params: ApplicationRouteQueryParams = {},
): string {
  return appendQueryParams(
    `/space/${encodeURIComponent(spaceId)}/submissions`,
    params,
  );
}

export function buildSpaceSubmissionDetailHrefByIds(
  spaceId: string,
  applicationId: string,
  formDefinitionId?: string | null,
): string {
  return appendQueryParams(
    `${buildSpaceSubmissionsHref(spaceId)}/${encodeURIComponent(applicationId)}`,
    { definitionId: formDefinitionId },
  );
}

export function buildSpaceSubmissionDetailHref(
  application: ApplicationSpaceRouteSource,
): string | null {
  const spaceId = getApplicationSpaceId(application);
  if (!spaceId) {
    return null;
  }

  return buildSpaceSubmissionDetailHrefByIds(
    spaceId,
    application.id,
    application.formDefinitionId,
  );
}

export function buildSpaceApplicationEditHref(
  application: ApplicationSpaceRouteSource,
): string | null {
  const spaceId = getApplicationSpaceId(application);
  if (!spaceId) {
    return null;
  }

  return buildSpaceApplicationEditHrefByIds(
    spaceId,
    application.id,
    application.formDefinitionId,
  );
}

export function buildSpaceApplicationEditHrefByIds(
  spaceId: string,
  applicationId: string,
  formDefinitionId?: string | null,
): string {
  return appendQueryParams(
    `${buildSpaceApplicationsHref(spaceId)}/${encodeURIComponent(applicationId)}/edit`,
    { definitionId: formDefinitionId },
  );
}
