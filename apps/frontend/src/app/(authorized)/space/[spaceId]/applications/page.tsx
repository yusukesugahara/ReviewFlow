import { client } from "@/lib/server/backend-fetch";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { isApiFailure } from "@/lib/server/api-error";
import { unwrapData } from "@/lib/server/api-envelope";
import type { ApplicationRow, FormDefinitionRow } from "@/components/space/space-applications.types";
import type {
  ApplicationsListSuccessJson,
  FormDefinitionsListSuccessJson,
} from "@/lib/schema";
import type { SpaceApplicationsPageProps } from "./types";
import { SpaceApplicationsView } from "./view";

export default async function SpaceApplicationsPage({
  params,
  searchParams,
}: SpaceApplicationsPageProps) {
  const [{ spaceId }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as Awaited<NonNullable<SpaceApplicationsPageProps["searchParams"]>>),
  ]);
  const showArchived = query.archived === "true";
  const authHeaders = await authHeadersOrRedirect();

  try {
    const [applicationsRaw, formDefinitions] = await Promise.all([
      client.GET("/applications", {
        params: { query: { groupId: spaceId } },
        headers: authHeaders,
      }),
      fetchFormDefinitionsForList(spaceId, authHeaders, showArchived),
    ]);
    const applicationsData: ApplicationsListSuccessJson | undefined = applicationsRaw.data;
    if (!applicationsRaw.response.ok || !applicationsData) {
      throw { status: applicationsRaw.response.status };
    }

    return (
      <SpaceApplicationsView
        applications={
          unwrapData<ApplicationsListSuccessJson["data"]>(applicationsData)
            .applications as ApplicationRow[]
        }
        formDefinitions={
          formDefinitions
        }
        showArchived={showArchived}
        spaceId={spaceId}
      />
    );
  } catch (error) {
    return (
      <SpaceApplicationsView
        applications={[]}
        formDefinitions={[]}
        fetchErrorStatus={isApiFailure(error) ? error.status : 500}
        showArchived={showArchived}
        spaceId={spaceId}
      />
    );
  }
}

async function fetchFormDefinitionsForList(
  spaceId: string,
  headers: { Authorization: string },
  includeArchived: boolean,
): Promise<FormDefinitionRow[]> {
  try {
    const definitionsRaw = await client.GET("/form-definitions", {
      params: { query: { groupId: spaceId, includeArchived } },
      headers,
    });
    const definitionsData: FormDefinitionsListSuccessJson | undefined = definitionsRaw.data;
    if (!definitionsRaw.response.ok || !definitionsData) {
      throw { status: definitionsRaw.response.status };
    }
    return (
      unwrapData<FormDefinitionsListSuccessJson["data"]>(definitionsData)
        .definitions as FormDefinitionRow[]
    );
  } catch (error) {
    if (isApiFailure(error) && error.status === 403) {
      return [];
    }
    throw error;
  }
}
