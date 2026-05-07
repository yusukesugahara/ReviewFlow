export type ApplicationSpaceRouteSource = {
  id: string;
  groupId?: string | null;
};

// Canonical application workspace routes are /space/[spaceId]/applications...
// Legacy /app/applications... and /review/applications... routes are compatibility entrypoints.
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

  return `${buildSpaceApplicationsHref(spaceId)}/${encodeURIComponent(application.id)}`;
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
