import {
  backendAuthFetchJson,
  BackendHttpError,
} from "@/lib/server/backend-auth-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { getCurrentSessionUser } from "@/lib/server/session";
import {
  SpaceApplicationsPageContent,
  type ApplicationRow,
  type FormDefinitionRow,
} from "@/features/spaces/components/space-applications-page-content";

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
    const [definitionsRaw, applicationsRaw, actor] = await Promise.all([
      backendAuthFetchJson(
        `/form-definitions?groupId=${encodeURIComponent(spaceId)}`,
      ),
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
        definitions={
          unwrapData<{ definitions?: FormDefinitionRow[] }>(definitionsRaw)
            .definitions ?? []
        }
        spaceId={spaceId}
        view={query.view}
      />
    );
  } catch (error) {
    return (
      <SpaceApplicationsPageContent
        applications={[]}
        definitions={[]}
        fetchErrorStatus={error instanceof BackendHttpError ? error.status : 500}
        spaceId={spaceId}
        view={query.view}
      />
    );
  }
}
