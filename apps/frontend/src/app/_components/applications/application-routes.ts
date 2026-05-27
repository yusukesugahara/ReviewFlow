export type ApplicationSpaceRouteSource = {
  formDefinitionId?: string | null;
  id: string;
  groupId?: string | null;
};

export function getApplicationSpaceId(
  application: ApplicationSpaceRouteSource,
): string | null {
  return application.groupId ?? null;
}

export function buildSpaceApplicationsHref(spaceId: string): string {
  return `/space/${encodeURIComponent(spaceId)}/applications`;
}

export function buildSpaceApplicationNewHref(spaceId: string): string {
  return `${buildSpaceApplicationsHref(spaceId)}/new`;
}

export function buildSpaceApplicationDetailHref(
  application: ApplicationSpaceRouteSource,
): string | null {
  const spaceId = getApplicationSpaceId(application);
  if (!spaceId) {
    return null;
  }

  const href = `${buildSpaceApplicationsHref(spaceId)}/${encodeURIComponent(application.id)}`;
  return application.formDefinitionId
    ? `${href}?definitionId=${encodeURIComponent(application.formDefinitionId)}`
    : href;
}

export function buildSpaceApplicationEditHref(
  application: ApplicationSpaceRouteSource,
): string | null {
  const detailHref = buildSpaceApplicationDetailHref(application);
  return detailHref ? `${detailHref}/edit` : null;
}

export function buildSpaceApplicationEditHrefByIds(
  spaceId: string,
  applicationId: string,
): string {
  return `/space/${encodeURIComponent(spaceId)}/applications/${encodeURIComponent(applicationId)}/edit`;
}
