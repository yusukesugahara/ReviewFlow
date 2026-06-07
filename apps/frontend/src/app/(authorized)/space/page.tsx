import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import { SpaceEmptyState } from "@/components/space/space-empty-state";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import { unwrapData } from "@/lib/server/api-envelope";
import { client } from "@/lib/server/backend-fetch";
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
  AdminDashboardApiFailure,
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
    const spacesData: GroupsListSuccessJson | undefined = spacesRaw.data;
    if (!spacesRaw.response.ok || !spacesData) {
      throw { status: spacesRaw.response.status };
    }
    const spaces =
      unwrapData<GroupsListSuccessJson["data"]>(spacesData).groups ?? [];
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
        fetchErrorStatus={
          error &&
          typeof error === "object" &&
          typeof (error as AdminDashboardApiFailure).status === "number"
            ? (error as AdminDashboardApiFailure).status
            : 500
        }
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
  const appsData: ApplicationsListSuccessJson | undefined = appsRaw.data;
  const formsData: FormDefinitionsListSuccessJson | undefined = formsRaw.data;
  const membersData: GroupMembersListSuccessJson | undefined = membersRaw.data;
  if (!appsRaw.response.ok || !appsData) {
    throw { status: appsRaw.response.status };
  }
  if (!formsRaw.response.ok || !formsData) {
    throw { status: formsRaw.response.status };
  }
  if (!membersRaw.response.ok || !membersData) {
    throw { status: membersRaw.response.status };
  }

  const apps =
    unwrapData<ApplicationsListSuccessJson["data"]>(appsData).applications ?? [];
  const forms =
    unwrapData<FormDefinitionsListSuccessJson["data"]>(formsData).definitions ?? [];
  const members =
    unwrapData<GroupMembersListSuccessJson["data"]>(membersData).members ?? [];
  const correctionCounts = await Promise.all(
    apps.map(async (app) => {
      const cRaw = await client.GET("/applications/{id}/corrections", {
        params: { path: { id: app.id } },
        headers,
      });
      const correctionsData: CorrectionsListSuccessJson | undefined = cRaw.data;
      if (!cRaw.response.ok || !correctionsData) {
        throw { status: cRaw.response.status };
      }
      return unwrapData<CorrectionsListSuccessJson["data"]>(correctionsData)
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
    publishedFormCount: forms.filter((form) => form.status === "published").length,
    totalApplications,
    needsActionCount: apps.filter(
      (app) =>
        app.status === APPLICATION_STATUSES.submitted ||
        app.status === APPLICATION_STATUSES.inReview,
    ).length,
    returnedCount: apps.filter((app) => app.status === APPLICATION_STATUSES.returned)
      .length,
    approvedCount: apps.filter((app) => app.status === APPLICATION_STATUSES.approved)
      .length,
    rejectedCount: apps.filter((app) => app.status === APPLICATION_STATUSES.rejected)
      .length,
    correctionCount,
    resubmitCount: apps.filter(
      (app, index) =>
        (correctionCounts[index] ?? 0) > 0 &&
        app.status === APPLICATION_STATUSES.inReview,
    ).length,
    avgReturns:
      totalApplications > 0 ? (correctionCount / totalApplications).toFixed(2) : "0.00",
    latestApplicationAt,
  };
}
