import {
  appendQueryParams,
  buildSpaceApplicationDetailHrefByIds,
  buildSpaceApplicationNewHref,
  buildSpaceApplicationsHref,
  buildSpaceSubmissionDetailHrefByIds,
  buildSpaceSubmissionsHref,
} from "@/components/applications/routing/application-routes";
import { getApplicationStatusLabel } from "@/components/applications/status/application-status";
import {
  isFormSetupApplication,
  isPublishedApplicationStatus,
  isReturnedApplication,
  isSpaceNeedsActionApplication,
} from "@/components/applications/status/application-status-rules";
import type {
  ApplicationRow,
  FormDefinitionRow,
} from "@/components/space/space-applications.types";
import { SPACE_ROLES } from "@/lib/constants/roles";
import { formatDateTimeJa } from "@/lib/date-format";
import type { GroupMemberSummary } from "@/lib/schema";
import type { SpaceOverviewSpace } from "../types";

export type SpaceOverviewStats = {
  memberCount: number | null;
  myNeedsActionCount: number;
  needsActionCount: number;
  publishedFormCount: number;
  returnedCount: number;
  totalApplications: number;
};

export type SpaceOverviewApplicationItem = {
  applicantEmail: string;
  href: string;
  id: string;
  name: string;
  status: string;
  statusLabel: string;
  updatedAtText: string;
};

export type SpaceOverviewFormItem = {
  fieldCount: number;
  href: string;
  id: string;
  name: string;
  updatedAtText: string;
};

export type SpaceOverviewViewModel = {
  canShowMembers: boolean;
  descriptionText: string;
  formNewHref: string;
  formsHref: string;
  membersHref: string;
  publishedForms: SpaceOverviewFormItem[];
  recentApplications: SpaceOverviewApplicationItem[];
  roleLabel: string;
  stats: SpaceOverviewStats;
  submissionsHref: string;
};

export function buildSpaceOverviewViewModel({
  applications,
  canManageSpace,
  currentUserId,
  formDefinitions,
  isTenantAdmin,
  members,
  space,
}: {
  applications: ApplicationRow[];
  canManageSpace: boolean;
  currentUserId: string | null;
  formDefinitions: FormDefinitionRow[];
  isTenantAdmin: boolean;
  members: GroupMemberSummary[];
  space: SpaceOverviewSpace;
}): SpaceOverviewViewModel {
  const submittedApplications = applications.filter(
    (row) => !isFormSetupApplication(row),
  );
  const publishedForms = formDefinitions.filter((definition) =>
    isPublishedApplicationStatus(definition.status),
  );

  return {
    canShowMembers: canManageSpace,
    descriptionText: space.description ?? "説明は未設定です。",
    formNewHref: buildSpaceApplicationNewHref(space.id),
    formsHref: buildSpaceApplicationsHref(space.id),
    membersHref: `/space/users?spaceId=${encodeURIComponent(space.id)}`,
    publishedForms: buildPublishedFormItems({
      applications,
      formDefinitions: publishedForms,
      spaceId: space.id,
    }),
    recentApplications: buildRecentApplicationItems(
      submittedApplications,
      space.id,
    ),
    roleLabel: buildRoleLabel({ isTenantAdmin, space }),
    stats: {
      memberCount: canManageSpace ? members.length : null,
      myNeedsActionCount: submittedApplications.filter((row) =>
        isAssignedToCurrentUser(row, currentUserId),
      ).length,
      needsActionCount: submittedApplications.filter(
        isSpaceNeedsActionApplication,
      ).length,
      publishedFormCount: publishedForms.length,
      returnedCount: submittedApplications.filter(isReturnedApplication).length,
      totalApplications: submittedApplications.length,
    },
    submissionsHref: buildSpaceSubmissionsHref(space.id),
  };
}

function buildRecentApplicationItems(
  applications: ApplicationRow[],
  spaceId: string,
): SpaceOverviewApplicationItem[] {
  return sortByUpdatedAtDesc(applications)
    .slice(0, 5)
    .map((row) => ({
      applicantEmail: row.applicantEmail || "-",
      href: buildSpaceSubmissionDetailHrefByIds(
        spaceId,
        row.id,
        row.formDefinitionId,
      ),
      id: row.id,
      name:
        row.applicationName?.trim() ||
        row.formDefinitionName?.trim() ||
        "名称未設定の申請",
      status: row.status,
      statusLabel: getApplicationStatusLabel(row.status),
      updatedAtText: formatDateTimeJa(row.updatedAt ?? row.createdAt),
    }));
}

function buildPublishedFormItems({
  applications,
  formDefinitions,
  spaceId,
}: {
  applications: ApplicationRow[];
  formDefinitions: FormDefinitionRow[];
  spaceId: string;
}): SpaceOverviewFormItem[] {
  const setupApplications = applications.filter(isFormSetupApplication);
  return [...formDefinitions]
    .sort((a, b) => compareDateDesc(a.updatedAt, b.updatedAt))
    .slice(0, 5)
    .map((definition) => {
      const setupApplication = setupApplications.find(
        (row) => row.formDefinitionId === definition.id,
      );
      const detailHref = setupApplication
        ? appendQueryParams(
            buildSpaceApplicationDetailHrefByIds(spaceId, setupApplication.id),
            { definitionId: definition.id, view: "form" },
          )
        : buildSpaceApplicationsHref(spaceId);
      return {
        fieldCount: definition.fields?.length ?? 0,
        href: detailHref,
        id: definition.id,
        name: definition.name || "名称未設定のフォーム",
        updatedAtText: formatDateTimeJa(definition.updatedAt),
      };
    });
}

function buildRoleLabel({
  isTenantAdmin,
  space,
}: {
  isTenantAdmin: boolean;
  space: SpaceOverviewSpace;
}): string {
  if (isTenantAdmin) {
    return "テナント管理者";
  }
  if (space.currentUserRole === SPACE_ROLES.admin) {
    return "スペース管理者";
  }
  return "スペースユーザ";
}

function isAssignedToCurrentUser(
  row: ApplicationRow,
  currentUserId: string | null,
): boolean {
  return (
    !!currentUserId &&
    isSpaceNeedsActionApplication(row) &&
    (row.currentStepAssigneeUserIds?.includes(currentUserId) ?? false)
  );
}

function sortByUpdatedAtDesc(rows: ApplicationRow[]): ApplicationRow[] {
  return [...rows].sort((a, b) => compareDateDesc(a.updatedAt, b.updatedAt));
}

function compareDateDesc(left: string, right: string): number {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
    return 0;
  }
  return rightTime - leftTime;
}
