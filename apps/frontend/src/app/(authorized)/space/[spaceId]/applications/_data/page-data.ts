import "server-only";

import type {
  ApplicationRow,
  FormDefinitionRow,
} from "@/components/space/space-applications.types";
import type {
  ApplicationsListSuccessJson,
  FormDefinitionsListSuccessJson,
} from "@/lib/schema";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { isApiFailure } from "@/lib/server/api-failure";
import { client } from "@/lib/server/backend-fetch";

export type SpaceApplicationsPageData = {
  applications: ApplicationRow[];
  formDefinitions: FormDefinitionRow[];
};

/**
 * スペースの申請一覧画面に必要な申請とフォーム定義を読み込みます。
 */
export async function getSpaceApplicationsPageData({
  showArchived,
  spaceId,
}: {
  showArchived: boolean;
  spaceId: string;
}): Promise<SpaceApplicationsPageData> {
  const authHeaders = await authHeadersOrRedirect();
  const [applicationsRaw, formDefinitions] = await Promise.all([
    client.GET("/applications", {
      params: { query: { groupId: spaceId } },
      headers: authHeaders,
    }),
    fetchFormDefinitionsForList(spaceId, authHeaders, showArchived),
  ]);

  return {
    applications: unwrapResponseData<ApplicationsListSuccessJson["data"]>(
      applicationsRaw,
    ).applications as ApplicationRow[],
    formDefinitions,
  };
}

/**
 * 一覧表示用のフォーム定義を取得し、権限不足時は空配列として扱います。
 */
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
    return unwrapResponseData<FormDefinitionsListSuccessJson["data"]>(
      definitionsRaw,
    ).definitions as FormDefinitionRow[];
  } catch (error) {
    if (isApiFailure(error) && error.status === 403) {
      return [];
    }
    throw error;
  }
}
