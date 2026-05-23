import { client } from "@/lib/server/backend-fetch";
import { SpaceEmptyState } from "@/app/space/_components/space-empty-state";
import { getCurrentSessionUser } from "@/app/session/actions";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import { AdminDashboardView } from "./view";
import { unwrapData } from "@/lib/server/api-envelope";
import type {
  ApplicationsListSuccessJson,
  CorrectionsListSuccessJson,
  GroupsListSuccessJson,
} from "@/lib/schema";
import type { AdminDashboardApiFailure, AdminDashboardPageProps } from "./types";

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
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
    const spaceId = params.spaceId ?? spaces[0]?.id ?? "";
    if (!spaceId) {
      return <SpaceEmptyState userRoles={me?.roles ?? []} />;
    }
    const appsRaw = await client.GET("/applications", {
      params: { query: { groupId: spaceId } },
      headers: authHeaders,
    });
    const appsData: ApplicationsListSuccessJson | undefined = appsRaw.data;
    if (!appsRaw.response.ok || !appsData) {
      throw { status: appsRaw.response.status };
    }
    const apps =
      unwrapData<ApplicationsListSuccessJson["data"]>(appsData).applications ?? [];

    let correctionCount = 0;
    let resubmitCount = 0;
    for (const app of apps) {
      const cRaw = await client.GET("/applications/{id}/corrections", {
        params: { path: { id: app.id } },
        headers: authHeaders,
      });
      const correctionsData: CorrectionsListSuccessJson | undefined = cRaw.data;
      if (!cRaw.response.ok || !correctionsData) {
        throw { status: cRaw.response.status };
      }
      const corrections =
        unwrapData<CorrectionsListSuccessJson["data"]>(correctionsData).corrections ?? [];
      correctionCount += corrections.length;
      if (
        corrections.length > 0 &&
        app.status === APPLICATION_STATUSES.inReview
      ) {
        resubmitCount += 1;
      }
    }

    const totalApplications = apps.length;
    const avgReturns =
      totalApplications > 0 ? correctionCount / totalApplications : 0;

    return (
      <AdminDashboardView
        avgReturns={avgReturns.toFixed(2)}
        resubmitCount={resubmitCount}
        spaceId={spaceId}
        totalApplications={totalApplications}
      />
    );
  } catch (error) {
    return (
      <AdminDashboardView
        avgReturns="0.00"
        fetchErrorStatus={
          error && typeof error === "object" && typeof (error as AdminDashboardApiFailure).status === "number"
            ? (error as AdminDashboardApiFailure).status
            : 500
        }
        resubmitCount={0}
        spaceId=""
        totalApplications={0}
      />
    );
  }
}
