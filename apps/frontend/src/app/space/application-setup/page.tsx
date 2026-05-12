import { redirect } from "next/navigation";
import { buildSpaceApplicationNewHref } from "@/app/_components/applications/application-routes";
import { backendAuthFetchJson } from "@/lib/server/backend-fetch";

type PageProps = {
  searchParams?: Promise<{
    setupError?: string;
    setupStatus?: string;
    publishedGroupId?: string;
    publishedFormDefinitionId?: string;
    spaceId?: string;
  }>;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

export default async function AdminApplicationSetupPage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};
  const spacesRaw = await backendAuthFetchJson("/groups");
  const spaces =
    unwrapData<{ groups?: { id: string }[] }>(spacesRaw).groups ?? [];
  const spaceId = params.spaceId ?? spaces[0]?.id ?? "";
  if (!spaceId) {
    redirect("/space");
  }
  const nextParams = new URLSearchParams();

  if (params.setupError) {
    nextParams.set("setupError", params.setupError);
  }
  if (params.setupStatus) {
    nextParams.set("setupStatus", params.setupStatus);
  }
  if (params.publishedGroupId) {
    nextParams.set("publishedGroupId", params.publishedGroupId);
  }
  if (params.publishedFormDefinitionId) {
    nextParams.set("publishedFormDefinitionId", params.publishedFormDefinitionId);
  }

  const query = nextParams.toString();
  redirect(
    `${buildSpaceApplicationNewHref(spaceId)}${query.length > 0 ? `?${query}` : ""}`,
  );
}
