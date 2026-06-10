import { buildSpaceApplicationDetailHref } from "@/components/applications/application-routes";
import type {
  ApplicationRow,
  FormDefinitionRow,
} from "@/components/space/space-applications.types";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";

export type ApplicationFormListRow = {
  definitionId: string;
  detailHref: string | null;
  pendingCount: number;
  processedCount: number;
  publicHref: string | null;
  status: string;
  title: string;
};

export function buildApplicationFormListRows({
  applications,
  formDefinitions,
  showArchived,
  spaceId,
}: {
  applications: ApplicationRow[];
  formDefinitions: FormDefinitionRow[];
  showArchived: boolean;
  spaceId: string;
}): ApplicationFormListRow[] {
  const setupApplications = applications.filter(isFormSetupApplication);
  const submittedApplications = applications.filter((row) => !isFormSetupApplication(row));
  const displayDefinitions =
    formDefinitions.length > 0
      ? formDefinitions
      : buildFallbackDefinitions(submittedApplications, spaceId);

  return displayDefinitions
    .map((definition) =>
      buildApplicationFormListRow(
        definition,
        applications,
        setupApplications,
        spaceId,
      ),
    )
    .filter((row) =>
      showArchived
        ? row.status === APPLICATION_STATUSES.archived
        : row.status !== APPLICATION_STATUSES.archived,
    );
}

export function isFormSetupApplication(row: ApplicationRow): boolean {
  return (
    row.status === APPLICATION_STATUSES.draft ||
    row.status === APPLICATION_STATUSES.published
  );
}

function buildApplicationFormListRow(
  definition: FormDefinitionRow,
  applications: ApplicationRow[],
  setupApplications: ApplicationRow[],
  spaceId: string,
): ApplicationFormListRow {
  const relatedApplications = applications.filter(
    (row) => row.formDefinitionId === definition.id && !isFormSetupApplication(row),
  );
  const setupApplication = setupApplications.find(
    (row) => row.formDefinitionId === definition.id,
  );
  const detailHref = setupApplication
    ? buildSpaceApplicationDetailHref(setupApplication) ??
      `/space/${encodeURIComponent(spaceId)}/applications/${encodeURIComponent(setupApplication.id)}`
    : null;
  const formDetailHref = detailHref ? appendQueryParam(detailHref, "view", "form") : null;
  const setupStatus =
    definition.status === APPLICATION_STATUSES.archived
      ? definition.status
      : setupApplication?.status ?? definition.status;
  const isPublished =
    definition.status === APPLICATION_STATUSES.published &&
    setupStatus === APPLICATION_STATUSES.published;

  return {
    definitionId: definition.id,
    detailHref: formDetailHref,
    pendingCount: relatedApplications.filter(isPendingApplicationStatus).length,
    processedCount: relatedApplications.filter(isProcessedApplicationStatus).length,
    publicHref: isPublished
      ? `/apply/${encodeURIComponent(definition.groupId || spaceId)}?formDefinitionId=${encodeURIComponent(definition.id)}`
      : null,
    status: setupStatus,
    title: definition.name,
  };
}

function appendQueryParam(href: string, key: string, value: string): string {
  const [pathname, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set(key, value);
  return `${pathname}?${params.toString()}`;
}

function isPendingApplicationStatus(row: ApplicationRow): boolean {
  return (
    row.status === APPLICATION_STATUSES.submitted ||
    row.status === APPLICATION_STATUSES.inReview ||
    row.status === APPLICATION_STATUSES.returned
  );
}

function isProcessedApplicationStatus(row: ApplicationRow): boolean {
  return (
    row.status === APPLICATION_STATUSES.approved ||
    row.status === APPLICATION_STATUSES.rejected
  );
}

function buildFallbackDefinitions(
  rows: ApplicationRow[],
  spaceId: string,
): FormDefinitionRow[] {
  const definitions = new Map<string, FormDefinitionRow>();
  for (const row of rows) {
    const id = row.formDefinitionId;
    if (!id || definitions.has(id)) {
      continue;
    }
    definitions.set(id, {
      id,
      groupId: row.groupId || spaceId,
      name: row.formDefinitionName?.trim() || row.applicationName?.trim() || "-",
      status: APPLICATION_STATUSES.published,
      fields: [],
      createdAt: row.createdAt,
      updatedAt: row.createdAt,
    });
  }
  return Array.from(definitions.values());
}
