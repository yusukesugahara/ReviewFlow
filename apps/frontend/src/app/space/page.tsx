import { client } from "@/lib/server/backend-fetch";
import { SpaceEmptyState } from "@/app/space/_components/space-empty-state";
import { getAccessTokenFromCookie, getCurrentSessionUser } from "@/lib/server/session";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import { AdminDashboardView } from "./view";

type AppSummary = { id: string; status: string; applicantEmail: string };
type CorrectionEntry = { id: string };
type ApiFailure = { status: number };

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

type PageProps = {
  searchParams?: Promise<{ spaceId?: string }>;
};

export default async function AdminDashboardPage({ searchParams }: PageProps) {
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
    if (!spacesRaw.response.ok || !spacesRaw.data) {
      throw { status: spacesRaw.response.status };
    }
    const spaces =
      unwrapData<{ groups?: { id: string }[] }>(spacesRaw.data).groups ?? [];
    const spaceId = params.spaceId ?? spaces[0]?.id ?? "";
    if (!spaceId) {
      return <SpaceEmptyState userRoles={me?.roles ?? []} />;
    }
    const appsRaw = await client.GET("/applications", {
      params: { query: { groupId: spaceId } },
      headers: authHeaders,
    });
    if (!appsRaw.response.ok || !appsRaw.data) {
      throw { status: appsRaw.response.status };
    }
    const apps =
      unwrapData<{ applications?: AppSummary[] }>(appsRaw.data).applications ?? [];

    let correctionCount = 0;
    let resubmitCount = 0;
    for (const app of apps) {
      const cRaw = await client.GET("/applications/{id}/corrections", {
        params: { path: { id: app.id } },
        headers: authHeaders,
      });
      if (!cRaw.response.ok || !cRaw.data) {
        throw { status: cRaw.response.status };
      }
      const corrections =
        unwrapData<{ corrections?: CorrectionEntry[] }>(cRaw.data).corrections ??
        [];
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
          error && typeof error === "object" && typeof (error as ApiFailure).status === "number"
            ? (error as ApiFailure).status
            : 500
        }
        resubmitCount={0}
        spaceId=""
        totalApplications={0}
      />
    );
  }
}
