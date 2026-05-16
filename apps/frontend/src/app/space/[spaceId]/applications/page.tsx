import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import { unwrapData } from "@/lib/server/api-envelope";
import {
  SpaceApplicationsPageContent,
  type ApplicationRow,
  type FormDefinitionRow,
} from "@/app/space/_components/space-applications-page-content";

type PageProps = {
  params: Promise<{ spaceId: string }>;
};
type ApiFailure = { status: number };

async function authHeadersOrRedirect(): Promise<{ Authorization: string }> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }
  return { Authorization: `Bearer ${accessToken}` };
}

function isApiFailure(error: unknown): error is ApiFailure {
  return !!error && typeof error === "object" && typeof (error as ApiFailure).status === "number";
}

export default async function SpaceApplicationsPage({
  params,
}: PageProps) {
  const { spaceId } = await params;
  const authHeaders = await authHeadersOrRedirect();

  try {
    const [applicationsRaw, formDefinitions] = await Promise.all([
      client.GET("/applications", {
        params: { query: { groupId: spaceId } },
        headers: authHeaders,
      }),
      fetchFormDefinitionsForList(spaceId, authHeaders),
    ]);
    if (!applicationsRaw.response.ok || !applicationsRaw.data) {
      throw { status: applicationsRaw.response.status };
    }

    return (
      <SpaceApplicationsPageContent
        applications={
          unwrapData<{ applications?: ApplicationRow[] }>(applicationsRaw.data)
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
        fetchErrorStatus={isApiFailure(error) ? error.status : 500}
        spaceId={spaceId}
      />
    );
  }
}

async function fetchFormDefinitionsForList(
  spaceId: string,
  headers: { Authorization: string },
): Promise<FormDefinitionRow[]> {
  try {
    const definitionsRaw = await client.GET("/form-definitions", {
      params: { query: { groupId: spaceId } },
      headers,
    });
    if (!definitionsRaw.response.ok || !definitionsRaw.data) {
      throw { status: definitionsRaw.response.status };
    }
    return (
      unwrapData<{ definitions?: FormDefinitionRow[] }>(definitionsRaw.data)
        .definitions ?? []
    );
  } catch (error) {
    if (isApiFailure(error) && error.status === 403) {
      return [];
    }
    throw error;
  }
}
