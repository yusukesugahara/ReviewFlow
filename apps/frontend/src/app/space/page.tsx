import {
  backendAuthFetchJson,
  BackendHttpError,
} from "@/lib/server/backend-auth-fetch";
import { SpaceEmptyState } from "@/app/space/_components/space-empty-state";
import { getCurrentSessionUser } from "@/lib/server/session";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import { AdminDashboardView } from "./view";

type AppSummary = { id: string; status: string; applicantEmail: string };
type CorrectionEntry = { id: string };

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
    const [spacesRaw, me] = await Promise.all([
      backendAuthFetchJson("/groups"),
      getCurrentSessionUser(),
    ]);
    const spaces =
      unwrapData<{ groups?: { id: string }[] }>(spacesRaw).groups ?? [];
    const spaceId = params.spaceId ?? spaces[0]?.id ?? "";
    if (!spaceId) {
      return <SpaceEmptyState userRoles={me?.roles ?? []} />;
    }
    const appsRaw = await backendAuthFetchJson(
      `/applications?groupId=${encodeURIComponent(spaceId)}`,
    );
    const apps =
      unwrapData<{ applications?: AppSummary[] }>(appsRaw).applications ?? [];

    let correctionCount = 0;
    let resubmitCount = 0;
    for (const app of apps) {
      const cRaw = await backendAuthFetchJson(
        `/applications/${app.id}/corrections`,
      );
      const corrections =
        unwrapData<{ corrections?: CorrectionEntry[] }>(cRaw).corrections ??
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
        fetchErrorStatus={error instanceof BackendHttpError ? error.status : 500}
        resubmitCount={0}
        spaceId=""
        totalApplications={0}
      />
    );
  }
}
