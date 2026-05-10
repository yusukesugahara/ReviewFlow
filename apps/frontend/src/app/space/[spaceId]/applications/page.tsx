import {
  backendAuthFetchJson,
  BackendHttpError,
} from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { getCurrentSessionUser } from "@/lib/server/session";
import {
  SpaceApplicationsPageContent,
  type ApplicationRow,
} from "@/app/space/_components/space-applications-page-content";

type PageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams?: Promise<{ view?: string }>;
};

export default async function SpaceApplicationsPage({
  params,
  searchParams,
}: PageProps) {
  const [{ spaceId }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as { view?: string }),
  ]);

  try {
    const [applicationsRaw, actor] = await Promise.all([
      backendAuthFetchJson(`/applications?groupId=${encodeURIComponent(spaceId)}`),
      getCurrentSessionUser(),
    ]);

    return (
      <SpaceApplicationsPageContent
        actorEmail={actor?.email}
        applications={
          unwrapData<{ applications?: ApplicationRow[] }>(applicationsRaw)
            .applications ?? []
        }
        spaceId={spaceId}
        view={query.view}
      />
    );
  } catch (error) {
    return (
      <SpaceApplicationsPageContent
        applications={[]}
        fetchErrorStatus={error instanceof BackendHttpError ? error.status : 500}
        spaceId={spaceId}
        view={query.view}
      />
    );
  }
}
