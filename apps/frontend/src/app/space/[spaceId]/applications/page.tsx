import {
  backendAuthFetchJson,
  BackendHttpError,
} from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import {
  SpaceApplicationsPageContent,
  type ApplicationRow,
  type FormDefinitionRow,
} from "@/app/space/_components/space-applications-page-content";

type PageProps = {
  params: Promise<{ spaceId: string }>;
};

export default async function SpaceApplicationsPage({
  params,
}: PageProps) {
  const { spaceId } = await params;

  try {
    const [applicationsRaw, formDefinitions] = await Promise.all([
      backendAuthFetchJson(`/applications?groupId=${encodeURIComponent(spaceId)}`),
      fetchFormDefinitionsForList(spaceId),
    ]);

    return (
      <SpaceApplicationsPageContent
        applications={
          unwrapData<{ applications?: ApplicationRow[] }>(applicationsRaw)
            .applications ?? []
        }
        formDefinitions={
          formDefinitions
        }
        spaceId={spaceId}
      />
    );
  } catch (error) {
    return (
      <SpaceApplicationsPageContent
        applications={[]}
        formDefinitions={[]}
        fetchErrorStatus={error instanceof BackendHttpError ? error.status : 500}
        spaceId={spaceId}
      />
    );
  }
}

async function fetchFormDefinitionsForList(
  spaceId: string,
): Promise<FormDefinitionRow[]> {
  try {
    const definitionsRaw = await backendAuthFetchJson(
      `/form-definitions?groupId=${encodeURIComponent(spaceId)}`,
    );
    return (
      unwrapData<{ definitions?: FormDefinitionRow[] }>(definitionsRaw)
        .definitions ?? []
    );
  } catch (error) {
    if (error instanceof BackendHttpError && error.status === 403) {
      return [];
    }
    throw error;
  }
}
