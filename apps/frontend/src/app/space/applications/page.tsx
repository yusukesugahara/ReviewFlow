import { redirect } from "next/navigation";
import { backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";
import { unwrapData } from "@/lib/server/api-envelope";

type PageProps = {
  searchParams?: Promise<{ status?: string; spaceId?: string }>;
};

type Space = {
  id: string;
};

export default async function LegacySpaceApplicationsPage({
  searchParams,
}: PageProps) {
  const query = (await searchParams) ?? {};
  const spaceId = query.spaceId ?? (await getFallbackSpaceId());
  if (!spaceId) {
    redirect("/space");
  }
  const params = new URLSearchParams();

  if (query.status) {
    params.set("status", query.status);
  }

  redirect(
    `/space/${encodeURIComponent(spaceId)}/applications${
      params.size > 0 ? `?${params.toString()}` : ""
    }`,
  );
}

async function getFallbackSpaceId(): Promise<string> {
  const spacesRaw = await backendAuthFetchJson("/groups");
  const spaces = unwrapData<{ groups?: Space[] }>(spacesRaw).groups ?? [];
  return spaces[0]?.id ?? "";
}
