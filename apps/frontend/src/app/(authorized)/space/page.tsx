import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import {
  isApprovedApplicationStatus,
  isInReviewApplicationStatus,
  isPublishedApplicationStatus,
  isRejectedApplicationStatus,
  isReturnedApplication,
  isSpaceNeedsActionApplication,
} from "@/components/applications/application-status-rules";
import { SpaceEmptyState } from "@/components/space/space-empty-state";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/server/backend-fetch";
import { isApiFailure } from "@/lib/server/api-failure";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import { AdminDashboardView } from "./view";
import type {
  ApplicationsListSuccessJson,
  CorrectionsListSuccessJson,
  FormDefinitionsListSuccessJson,
  GroupMembersListSuccessJson,
  GroupsListSuccessJson,
} from "@/lib/schema";
import type {
  AdminDashboardPageProps,
  SpaceDashboardSummary,
} from "./types";

type AuthHeaders = { Authorization: string };
type GroupSummary = GroupsListSuccessJson["data"]["groups"][number];

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  try {
    const params = (await searchParams) ?? {};
    const accessToken = await getAccessTokenFromCookie();
    if (!accessToken) {
      throw { status: 401 };
    }
    const authHeaders = { Authorization: `Bearer ${accessToken}` };
    const [spacesRaw, me] = await Promise.all([
      client.GET("/groups", { headers: authHeaders }),
      getCurrentSessionUser(),
    ]);
    const spaces =
      unwrapResponseData<GroupsListSuccessJson["data"]>(spacesRaw).groups ?? [];
    const selectedSpaceId = params.spaceId ?? spaces[0]?.id ?? "";
    if (!selectedSpaceId) {
      return <SpaceEmptyState userRoles={me?.roles ?? []} />;
    }

    const summaries = await Promise.all(
      spaces.map((space) => buildSpaceDashboardSummary(space, authHeaders)),
    );

    return (
      <AdminDashboardView
        selectedSpaceId={selectedSpaceId}
        spaces={summaries}
      />
    );
  } catch (error) {
    return (
      <AdminDashboardView
        fetchErrorStatus={isApiFailure(error) ? error.status : 500}
        selectedSpaceId=""
        spaces={[]}
      />
    );
  }
}

async function buildSpaceDashboardSummary(
  space: GroupSummary,
  headers: AuthHeaders,
): Promise<SpaceDashboardSummary> {
  const [appsRaw, formsRaw, membersRaw] = await Promise.all([
    client.GET("/applications", {
      params: { query: { groupId: space.id } },
      headers,
    }),
    client.GET("/form-definitions", {
      params: { query: { groupId: space.id } },
      headers,
    }),
    client.GET("/groups/{groupId}/members", {
      params: { path: { groupId: space.id } },
      headers,
    }),
  ]);
  const apps =
    unwrapResponseData<ApplicationsListSuccessJson["data"]>(appsRaw).applications ?? [];
  const forms =
    unwrapResponseData<FormDefinitionsListSuccessJson["data"]>(formsRaw)
      .definitions ?? [];
  const members =
    unwrapResponseData<GroupMembersListSuccessJson["data"]>(membersRaw)
      .members ?? [];
  const correctionCounts = await Promise.all(
    apps.map(async (app) => {
      const cRaw = await client.GET("/applications/{id}/corrections", {
        params: { path: { id: app.id } },
        headers,
      });
      return unwrapResponseData<CorrectionsListSuccessJson["data"]>(cRaw)
        .corrections.length;
    }),
  );
  const correctionCount = correctionCounts.reduce((sum, count) => sum + count, 0);
  const totalApplications = apps.length;
  const latestApplicationAt =
    apps
      .map((app) => app.updatedAt ?? app.createdAt)
      .filter((value): value is string => typeof value === "string")
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;

  return {
    id: space.id,
    name: space.name,
    description:
      typeof space.description === "string" && space.description.length > 0
        ? space.description
        : null,
    currentUserRole: space.currentUserRole ?? null,
    memberCount: members.length,
    formCount: forms.length,
    publishedFormCount: forms.filter((form) =>
      isPublishedApplicationStatus(form.status),
    ).length,
    totalApplications,
    needsActionCount: apps.filter(isSpaceNeedsActionApplication).length,
    returnedCount: apps.filter(isReturnedApplication).length,
    approvedCount: apps.filter((app) =>
      isApprovedApplicationStatus(app.status),
    ).length,
    rejectedCount: apps.filter((app) =>
      isRejectedApplicationStatus(app.status),
    ).length,
    correctionCount,
    resubmitCount: apps.filter(
      (app, index) =>
        (correctionCounts[index] ?? 0) > 0 &&
        isInReviewApplicationStatus(app.status),
    ).length,
    avgReturns:
      totalApplications > 0 ? (correctionCount / totalApplications).toFixed(2) : "0.00",
    latestApplicationAt,
  };
}
