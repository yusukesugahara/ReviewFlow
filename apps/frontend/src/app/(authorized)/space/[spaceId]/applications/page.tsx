import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import { unwrapData } from "@/lib/server/api-envelope";
import type { ApplicationRow, FormDefinitionRow } from "@/app/(authorized)/space/_components/space-applications.types";
import type {
  ApplicationsListSuccessJson,
  FormDefinitionsListSuccessJson,
} from "@/lib/schema";
import type { SpaceApplicationsApiFailure, SpaceApplicationsPageProps } from "./types";
import { SpaceApplicationsView } from "./view";

async function authHeadersOrRedirect(): Promise<{ Authorization: string }> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }
  return { Authorization: `Bearer ${accessToken}` };
}

function isApiFailure(error: unknown): error is SpaceApplicationsApiFailure {
  return !!error && typeof error === "object" && typeof (error as SpaceApplicationsApiFailure).status === "number";
}

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
